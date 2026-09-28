const Joi = require("joi");
const mongoose = require("mongoose");
const Responses = require("../Models/responses");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const AppError = require("../AppError");
const {
    validateAnswer,
    snapshotAnswer,
} = require("../utils/answerValidator");
const { resolveUserGeo, targetingMatch } = require("../utils/geoResolver");
const { localise } = require("../utils/localised");
const { rowQuestions, isTopLevel } = require("../utils/questionTree");

const ObjectId = mongoose.Types.ObjectId;
const MAX_LIMIT = 200;

/**
 * Every id on these endpoints arrives in a query string, i.e. untrusted.
 * `new ObjectId("malaysia")` throws a BSONError that the error handler maps to
 * a 500, so validate first and answer 400. The check is a strict 24-hex match
 * because `ObjectId.isValid` also accepts ANY 12-character string.
 */
const HEX_ID = /^[a-f0-9]{24}$/i;
const toObjectId = (value, name) => {
    if (typeof value !== "string" || !HEX_ID.test(value)) {
        throw new AppError(0, `"${name}" must be a valid id`, 400);
    }
    return new ObjectId(value);
};

const asArray = (value) =>
    value === undefined ? [] : Array.isArray(value) ? value : [value];

const escapeRegex = (value) =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Builds the per-question comparison used inside an $elemMatch. */
const valueExpression = (op, raw) => {
    switch (op) {
        case "eq":
            return coerce(raw);
        case "in":
            return { $in: String(raw).split(",").map(coerce) };
        case "gte":
            return { $gte: Number(raw) };
        case "lte":
            return { $lte: Number(raw) };
        case "contains":
            return { $regex: escapeRegex(raw), $options: "i" };
        case "any":
            // multi_select / any row in a group
            return { $elemMatch: { $eq: coerce(raw) } };
        default:
            throw new AppError(0, `Unsupported filter operator "${op}"`, 400);
    }
};

const coerce = (raw) => {
    if (raw === "true") return true;
    if (raw === "false") return false;
    const asNumber = Number(raw);
    return raw !== "" && !Number.isNaN(asNumber) ? asNumber : raw;
};

/**
 * Compiles one `f=<questionId>[.<childId>]:<op>:<value>` filter.
 *
 * Every filter becomes a single $elemMatch so questionId and value must match
 * in the SAME array element. The naive {"answers.questionId": q,
 * "answers.value": v} would match a document that answered q at all AND
 * answered v to anything — a cross-element false positive, and a direct
 * violation of the questionId binding invariant.
 */
const compileFilter = (raw) => {
    const [target, op, ...rest] = String(raw).split(":");
    const value = rest.join(":");
    if (!target || !op) {
        throw new AppError(0, `Malformed filter "${raw}"`, 400);
    }

    const expression = valueExpression(op, value);

    // Recursive so a leaf at any depth is reachable: "q", "group.child", or
    // "group.innerGroup.child" (Livestock.Products.Output). Each hop descends
    // value -> row -> row.answers, and every hop is its own $elemMatch.
    const nest = (segments) => {
        const [head, ...tail] = segments;
        if (tail.length === 0) {
            return {
                $elemMatch: {
                    questionId: toObjectId(head, "f"),
                    value: expression,
                },
            };
        }
        return {
            $elemMatch: {
                questionId: toObjectId(head, "f"),
                value: { $elemMatch: { answers: nest(tail) } },
            },
        };
    };

    return { answers: nest(target.split(".")) };
};

/** One parser, shared by the table, the long-row view and the stats. */
const parseQuery = (query) => {
    const {
        categoryId,
        categoryPath,
        country,
        from,
        to,
        q,
        page = 0,
        limit = 25,
        sortBy = "submittedAt",
        sortOrder = "desc",
    } = query;

    if (!categoryId && !categoryPath) {
        throw new AppError(
            0,
            "Please provide categoryId or categoryPath",
            400
        );
    }

    const match = {};
    if (categoryId) match.categoryId = toObjectId(categoryId, "categoryId");
    if (categoryPath) match.categoryPath = toObjectId(categoryPath, "categoryPath");
    if (country) match.countryId = toObjectId(country, "country");

    const villages = asArray(query.village).filter(Boolean);
    if (villages.length > 0) {
        match.villageId = {
            $in: villages.map((v) => toObjectId(v, "village")),
        };
    }

    if (from || to) {
        match.submittedAt = {
            ...(from && { $gte: new Date(from) }),
            ...(to && { $lte: new Date(to) }),
        };
    }

    if (q) {
        match["answers.value"] = { $regex: escapeRegex(q), $options: "i" };
    }

    const filters = asArray(query.f).filter(Boolean).map(compileFilter);
    if (filters.length > 0) match.$and = filters;

    const safeLimit = Math.min(Number(limit) || 25, MAX_LIMIT);

    return {
        match,
        page: Number(page) || 0,
        limit: safeLimit,
        sort: {
            [["submittedAt", "createdAt"].includes(sortBy)
                ? sortBy
                : "submittedAt"]: sortOrder === "asc" ? 1 : -1,
        },
    };
};

/** Columns include retired questions, so historical answers keep a home. */
const columnsFor = async (categoryId) => {
    if (!categoryId) return [];
    const questions = await Questions.find({ categoryId })
        .select({
            label: 1,
            type: 1,
            active: 1,
            replacedBy: 1,
            order: 1,
            parentQuestionId: 1,
            options: 1,
        })
        .lean();

    const childrenOf = new Map();
    questions
        .filter((question) => question.parentQuestionId)
        .forEach((question) => {
            const key = String(question.parentQuestionId);
            childrenOf.set(key, [...(childrenOf.get(key) || []), question]);
        });

    const toColumn = (question) => ({
        questionId: question._id,
        label: question.label,
        type: question.type,
        active: question.active,
        replacedBy: question.replacedBy,
        options: question.options,
        // A section inside a group is not a column either: what it holds
        // sits directly in the row.
        children: rowQuestions(question, questions).map((child) => ({
            ...toColumn(child),
            ...(child.section ? { section: child.section } : {}),
        })),
    });

    // A section is not a column: its children are answered at the top level, so
    // they surface as ordinary columns carrying the section name for context.
    const roots = questions
        .filter((question) => !question.parentQuestionId)
        .sort((a, b) => a.order - b.order);

    const out = [];
    roots.forEach((question) => {
        if (question.type !== "section") {
            out.push(toColumn(question));
            return;
        }
        (childrenOf.get(String(question._id)) || [])
            .sort((a, b) => a.order - b.order)
            .forEach((child) =>
                out.push({ ...toColumn(child), section: question.label })
            );
    });
    return out;
};

module.exports.list_responses = async (req, res) => {
    const { match, page, limit, sort } = parseQuery(req.query);

    const [total, docs, columns] = await Promise.all([
        Responses.countDocuments(match),
        Responses.aggregate([
            { $match: match },
            { $sort: sort },
            { $skip: page * limit },
            { $limit: limit },
            // The lookup runs on the page slice only, never the whole set.
            // let/$expr rather than localField+pipeline — the latter needs
            // MongoDB 5.0+, and this deployment's version isn't pinned.
            {
                $lookup: {
                    from: "users",
                    let: { uid: "$userId" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
                        {
                            $project: {
                                first_name: 1,
                                last_name: 1,
                                phone: 1,
                                country_code: 1,
                            },
                        },
                    ],
                    as: "user",
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        ]),
        columnsFor(req.query.categoryId),
    ]);

    const rows = docs.map((doc) => ({
        _id: doc._id,
        userId: doc.userId,
        userName: [doc.user?.first_name, doc.user?.last_name]
            .filter(Boolean)
            .join(" "),
        phone: doc.user
            ? `${doc.user.country_code || ""}${doc.user.phone || ""}`
            : "",
        villageName: doc.villageName,
        villageId: doc.villageId,
        countryId: doc.countryId,
        submittedAt: doc.submittedAt,
        // Keyed by questionId in the DTO ONLY — the stored document keeps the
        // array-of-pairs shape so no authored label ever becomes a field name.
        answers: (doc.answers || []).reduce((acc, answer) => {
            acc[String(answer.questionId)] = {
                label: answer.label,
                type: answer.type,
                options: answer.options,
                value: answer.value,
            };
            return acc;
        }, {}),
    }));

    return res.json({ total, page, limit, columns, rows });
};

/**
 * Long view: one row per group row (one row per poultry product), with the
 * respondent's context repeated. $unwind only — never a $lookup into a side
 * collection, because rows are embedded.
 */
module.exports.list_response_rows = async (req, res) => {
    const { match, page, limit, sort } = parseQuery(req.query);
    const { groupPath } = req.query;
    if (!groupPath) throw new AppError(0, "Please provide groupPath", 400);

    const [parentId, childId] = groupPath.split(".");
    toObjectId(parentId, "groupPath");
    if (childId) toObjectId(childId, "groupPath");

    // Only a nested group can be unwound a second level. A scalar child would
    // produce meaningless rows, so refuse rather than guess.
    if (childId) {
        const child = await Questions.findById(childId)
            .select({ type: 1 })
            .lean();
        if (!child) throw new AppError(0, "Child question not found", 404);
        if (child.type !== "repeatable_group") {
            throw new AppError(
                0,
                "groupPath may only descend into a repeatable_group child",
                400
            );
        }
    }

    const pipeline = [
        { $match: match },
        { $sort: sort },
        { $unwind: "$answers" },
        { $match: { "answers.questionId": toObjectId(parentId, "groupPath") } },
        { $unwind: "$answers.value" },
    ];

    if (childId) {
        pipeline.push(
            { $unwind: "$answers.value.answers" },
            {
                $match: {
                    "answers.value.answers.questionId": toObjectId(
                        childId,
                        "groupPath"
                    ),
                },
            },
            { $unwind: "$answers.value.answers.value" }
        );
    }

    pipeline.push(
        {
            $project: {
                responseId: "$_id",
                userId: 1,
                villageName: 1,
                countryId: 1,
                villageId: 1,
                submittedAt: 1,
                rowId: childId
                    ? "$answers.value.answers.value.rowId"
                    : "$answers.value.rowId",
                answers: childId
                    ? "$answers.value.answers.value.answers"
                    : "$answers.value.answers",
            },
        },
        { $skip: page * limit },
        { $limit: limit }
    );

    const rows = await Responses.aggregate(pipeline);

    return res.json({
        page,
        limit,
        groupPath,
        rows: rows.map((row) => ({
            ...row,
            answers: (row.answers || []).reduce((acc, answer) => {
                acc[String(answer.questionId)] = {
                    label: answer.label,
                    type: answer.type,
                    value: answer.value,
                };
                return acc;
            }, {}),
        })),
    });
};

/**
 * Graphs. Aggregates the WHOLE filtered set, not the visible page — which is
 * why filtering is server-side in the first place.
 */
module.exports.response_stats = async (req, res) => {
    const { match } = parseQuery(req.query);

    const [total, overTime, flat, columns] = await Promise.all([
        Responses.countDocuments(match),
        Responses.aggregate([
            { $match: match },
            {
                // $dateToString rather than $dateTrunc — the latter needs
                // MongoDB 5.0+ and this deployment's version isn't pinned.
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$submittedAt",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Responses.aggregate([
            { $match: match },
            { $unwind: "$answers" },
            {
                $group: {
                    _id: "$answers.questionId",
                    type: { $first: "$answers.type" },
                    label: { $first: "$answers.label" },
                    answered: { $sum: 1 },
                    values: { $push: "$answers.value" },
                },
            },
        ]),
        columnsFor(req.query.categoryId),
    ]);

    const bucketise = (entry) => {
        const counts = new Map();
        const numbers = [];

        entry.values.forEach((value) => {
            if (entry.type === "multi_select" && Array.isArray(value)) {
                value.forEach((v) =>
                    counts.set(String(v), (counts.get(String(v)) || 0) + 1)
                );
                return;
            }
            if (entry.type === "number" && typeof value === "number") {
                numbers.push(value);
                return;
            }
            if (entry.type === "date" && value) {
                const key = new Date(value).toISOString().slice(0, 7);
                counts.set(key, (counts.get(key) || 0) + 1);
                return;
            }
            if (entry.type === "repeatable_group" && Array.isArray(value)) {
                const key = String(value.length);
                counts.set(key, (counts.get(key) || 0) + 1);
                return;
            }
            counts.set(String(value), (counts.get(String(value)) || 0) + 1);
        });

        const buckets = [...counts.entries()]
            .map(([key, count]) => ({ key, count }))
            .sort((a, b) => b.count - a.count);

        if (entry.type === "number" && numbers.length > 0) {
            const sorted = [...numbers].sort((a, b) => a - b);
            const min = sorted[0];
            const max = sorted[sorted.length - 1];

            // Histogram is bucketed here, not shipped raw — the client gets ~10
            // bins regardless of how many responses there are.
            const binCount = Math.min(10, new Set(sorted).size);
            const width = (max - min) / binCount || 1;
            const bins = new Map();
            sorted.forEach((n) => {
                const index = Math.min(
                    Math.floor((n - min) / width),
                    binCount - 1
                );
                const lo = Math.round((min + index * width) * 100) / 100;
                const hi = Math.round((min + (index + 1) * width) * 100) / 100;
                const key = `${lo} – ${hi}`;
                bins.set(key, (bins.get(key) || 0) + 1);
            });

            return {
                buckets: [...bins.entries()].map(([key, count]) => ({
                    key,
                    count,
                })),
                stats: {
                    min,
                    max,
                    avg:
                        Math.round(
                            (sorted.reduce((s, n) => s + n, 0) /
                                sorted.length) *
                                100
                        ) / 100,
                    median: sorted[Math.floor(sorted.length / 2)],
                },
            };
        }

        return {
            buckets: entry.type === "text" ? buckets.slice(0, 10) : buckets,
            stats: null,
        };
    };

    // Resolve labels from the LIVE question so legends stay current; the
    // snapshot is still what the table shows per row.
    const liveLabels = new Map();
    const walk = (cols) =>
        cols.forEach((col) => {
            liveLabels.set(String(col.questionId), col);
            walk(col.children || []);
        });
    walk(columns);

    const perQuestion = flat.map((entry) => {
        const live = liveLabels.get(String(entry._id));
        const { buckets, stats } = bucketise(entry);
        return {
            questionId: entry._id,
            label: localise(live?.label || entry.label),
            type: entry.type,
            active: live?.active ?? false,
            answered: entry.answered,
            skipped: Math.max(total - entry.answered, 0),
            buckets: buckets.map((bucket) => ({
                ...bucket,
                label:
                    localise(
                        (live?.options || []).find(
                            (o) => o.value === bucket.key
                        )?.label
                    ) || bucket.key,
            })),
            stats,
        };
    });

    return res.json({
        total,
        submissionsOverTime: overTime.map((point) => [
            new Date(point._id).getTime(),
            point.count,
        ]),
        perQuestion,
    });
};

/** App-facing submit. Merges by questionId — never by position. */
module.exports.submit_response = async (req, res) => {
    const { user } = res.locals;

    const schema = Joi.object({
        categoryId: Joi.string().required(),
        complete: Joi.boolean().optional(),
        answers: Joi.array()
            .items(
                Joi.object({
                    questionId: Joi.string().required(),
                    value: Joi.any(),
                })
            )
            .required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const category = await Categories.findById(value.categoryId).lean();
    if (!category) throw new AppError(0, "Category not found", 404);
    if (!category.is_screen) {
        throw new AppError(0, "That category is not a screen", 409);
    }

    const geo = await resolveUserGeo(user);

    const live = await Questions.find({
        categoryId: value.categoryId,
        active: true,
        ...targetingMatch(geo),
    }).lean();

    const byId = new Map(live.map((question) => [String(question._id), question]));

    // Attach each group's children so the validator can bind rows by questionId.
    live.forEach((question) => {
        if (question.type !== "repeatable_group") return;
        question.childMap = new Map(
            rowQuestions(question, live).map((child) => [
                String(child._id),
                // The live document itself, so a nested group keeps the
                // childMap this same loop gives it.
                byId.get(String(child._id)),
            ])
        );
    });

    // An explicitly empty value CLEARS a saved answer. Without this, blanking
    // a field in the app would be undone by the merge below. Whether the
    // question is required is enforced further down, and only on `complete`.
    const isBlank = (entry) =>
        entry === null ||
        entry === undefined ||
        entry === "" ||
        (Array.isArray(entry) && entry.length === 0);
    const cleared = new Set();

    const snapshots = value.answers.flatMap((answer) => {
        const question = byId.get(String(answer.questionId));
        // Never silently drop an unknown answer — that is how the invariant rots.
        if (!question) {
            throw new AppError(
                0,
                `Unknown question ${answer.questionId} for this screen`,
                400
            );
        }
        // A section's children ARE answered at the top level; a repeatable
        // group's children are only answerable inside one of its rows.
        if (question.type !== "section" && !isTopLevel(question, byId)) {
            throw new AppError(
                0,
                `"${localise(question.label)}" can only be answered inside one of its group's entries`,
                400
            );
        }
        if (question.type !== "section" && isBlank(answer.value)) {
            cleared.add(String(question._id));
            return [];
        }
        validateAnswer(question, answer.value, question.childMap || new Map());
        return [
            snapshotAnswer(
                question,
                answer.value,
                question.childMap || new Map()
            ),
        ];
    });

    if (value.complete) {
        live
            .filter((question) => question.required && isTopLevel(question, byId))
            .forEach((question) => {
                const answered = snapshots.some(
                    (snapshot) =>
                        String(snapshot.questionId) === String(question._id)
                );
                if (!answered) {
                    throw new AppError(
                        0,
                        `"${localise(question.label)}" is required`,
                        400
                    );
                }
            });
    }

    const existing = await Responses.findOne({
        userId: user._id,
        categoryId: value.categoryId,
    }).lean();

    // Merge by questionId: replace what was re-answered, keep the rest.
    const incoming = new Map(
        snapshots.map((snapshot) => [String(snapshot.questionId), snapshot])
    );
    const merged = (existing?.answers || [])
        .filter(
            (answer) =>
                !incoming.has(String(answer.questionId)) &&
                !cleared.has(String(answer.questionId))
        )
        .concat(snapshots);

    const saved = await Responses.findOneAndUpdate(
        { userId: user._id, categoryId: value.categoryId },
        {
            $set: {
                answers: merged,
                submittedAt: new Date(),
                categoryPath: [...(category.path || []), category._id],
                countryId: geo.country?._id || null,
                villageId: geo.village?._id || null,
                villageName: user.village_name || "",
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json(saved);
};
