const Joi = require("joi");
const mongoose = require("mongoose");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const Users = require("../Models/user");
const Moderators = require("../Models/moderator");
const PlaceOverrides = require("../Models/placeOverrides");
const AppError = require("../AppError");
const { audienceOf, parseAudience } = require("../utils/audience");
const { storeFor } = require("../utils/responseStores");
const {
    validateAnswer,
    snapshotAnswer,
    collectAnsweredIds,
} = require("../utils/answerValidator");
const { resolveUserGeo } = require("../utils/geoResolver");
const { loadEffective } = require("../utils/liveQuestionnaire");
const { askedQuestionIds } = require("../utils/effectiveQuestionnaire");
const Counters = require("../Models/counters");
const { localise } = require("../utils/localised");
const { rowQuestions, isTopLevel, servedTo } = require("../utils/questionTree");
const {
    FILE_TYPES,
    ANSWER_TYPES_HEADER,
    filesIn,
    fileIdsIn,
    answerTypesOf,
} = require("../utils/fileKinds");
const { filesOf, removeUnheld, villagerFiles } = require("./files");
const {
    listPlaces,
    indexPlaces,
    chainOf,
    villagesUnder,
    readScope,
    shown,
} = require("../utils/places");

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
            return { $in: readings(raw) };
        case "in":
            return { $in: String(raw).split(",").flatMap(readings) };
        case "gte":
            return { $gte: Number(raw) };
        case "lte":
            return { $lte: Number(raw) };
        case "contains":
            return { $regex: escapeRegex(raw), $options: "i" };
        case "any":
            // multi_select / any row in a group
            return { $elemMatch: { $in: readings(raw) } };
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

// "12" may be a number answer, a text answer or an option's key: how the
// filter's text looks does not say which, so both readings are compared.
const readings = (raw) => [...new Set([raw, coerce(raw)])];

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

/**
 * "Search by user": every word has to be found in the villager's first name,
 * last name or phone number. Worked out to ids — a response keeps who
 * answered, not what they are called — and only among `among`, the people
 * who answered in the view being searched: a name is looked for where the
 * caller is looking, so nobody elsewhere can crowd a match out, or be found.
 */
const usersMatching = async (text, among) => {
    const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    if (words.length === 0) return null;
    const found = await Users.find({
        _id: { $in: among },
        $and: words.map((word) => {
            const like = escapeRegex(word);
            return {
                $or: [
                    { first_name: { $regex: like, $options: "i" } },
                    { last_name: { $regex: like, $options: "i" } },
                    // The phone is stored as a number.
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $toString: "$phone" },
                                regex: like,
                            },
                        },
                    },
                ],
            };
        }),
    })
        .select({ _id: 1 })
        .lean();
    return found.map((user) => user._id);
};

/**
 * The same search over the field officers' responses, "by village or
 * officer": every word has to be found in the village's name, or in the
 * first name, last name or phone number of the officer who saved last. One
 * condition per word, since a response is found by either: "rukha tashi" is
 * Tashi's save for Rukha.
 *
 * `among` are the officers who saved in the view being searched, as for
 * villagers.
 *
 * ponytail: those officers are read whole and matched here, one test per
 * word. There are as many as there are villages in view, at most; match them
 * in the database, as usersMatching does, if that ever runs to thousands.
 */
const officersMatching = async (text, among) => {
    const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 5);
    if (words.length === 0) return null;
    const officers = await Moderators.find({ _id: { $in: among } })
        .select({ first_name: 1, last_name: 1, phone: 1 })
        .lean();
    return words.map((word) => {
        const like = escapeRegex(word);
        const named = new RegExp(like, "i");
        return {
            $or: [
                { villageName: { $regex: like, $options: "i" } },
                {
                    moderatorId: {
                        $in: officers
                            .filter((officer) =>
                                [
                                    officer.first_name,
                                    officer.last_name,
                                    // The phone is stored as a number.
                                    officer.phone,
                                ].some((part) => named.test(String(part ?? "")))
                            )
                            .map((officer) => officer._id),
                    },
                },
            ],
        };
    });
};

/**
 * Whose name a row carries, per audience. A villager's response is theirs
 * (`userName`). A field officer's is the village's, and says which officer
 * saved it last (`savedBy`).
 */
const WHO = {
    villager: { from: "users", id: "userId", name: "userName" },
    officer: { from: "moderators", id: "moderatorId", name: "savedBy" },
};

/**
 * The two stages that bring that person along, as `user`. Placed after the
 * page slice, never before it.
 */
const whoStages = (audience) => [
    // let/$expr rather than localField+pipeline — the latter needs
    // MongoDB 5.0+, and this deployment's version isn't pinned.
    {
        $lookup: {
            from: WHO[audience].from,
            let: { uid: `$${WHO[audience].id}` },
            pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
                { $project: { first_name: 1, last_name: 1 } },
            ],
            as: "user",
        },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
];

/** Who a row is by, as the dashboard gets it: their id and their name. */
const whoOf = (audience, row) => ({
    [WHO[audience].id]: row[WHO[audience].id],
    [WHO[audience].name]: [row.user?.first_name, row.user?.last_name]
        .filter(Boolean)
        .join(" "),
});

/**
 * One parser, shared by the table, the long-row view and the stats.
 *
 * `audience` is whose answers: the villagers' unless "officer" is asked
 * for. They are kept apart (utils/responseStores.js), and `Store` is the
 * one this request reads.
 *
 * `place` is any level, a country down to one village, and the boundary a
 * regional account cannot leave: it is always held to a place, its own
 * unless it names one inside it (utils/places.js readScope).
 *
 * A response stores the village and the country it came from, never the
 * places in between, so "under Ladakh" is worked out here from the villages
 * that are under it now. Moving a village carries its responses with it.
 */
const parseQuery = async (query, admin) => {
    const {
        categoryId,
        categoryPath,
        from,
        to,
        user,
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

    const audience = parseAudience(query.audience);
    const Store = storeFor(audience);
    const scope = await readScope(admin, query.place);

    const match = {};
    if (categoryId) match.categoryId = toObjectId(categoryId, "categoryId");
    if (categoryPath) match.categoryPath = toObjectId(categoryPath, "categoryPath");

    if (from || to) {
        const day = (value, name) => {
            const date = new Date(value);
            if (typeof value !== "string" || Number.isNaN(date.getTime())) {
                throw new AppError(0, `"${name}" must be a date`, 400);
            }
            return date;
        };
        match.submittedAt = {
            ...(from && { $gte: day(from, "from") }),
            ...(to && { $lte: day(to, "to") }),
        };
    }

    if (user !== undefined && typeof user !== "string") {
        throw new AppError(0, '"user" must be text', 400);
    }

    const filters = asArray(query.f).filter(Boolean).map(compileFilter);
    if (scope.place) {
        const villageId = {
            $in: villagesUnder(scope.place._id, scope.places),
        };
        // A response whose village did not resolve still knows its country,
        // so it counts for the country and for nothing narrower. One whose
        // village IS a place counts where that village is, whatever country
        // an older save stamped on it.
        const placed = scope.places
            .filter((place) => place.kind === "village")
            .map((place) => place._id);
        filters.push(
            scope.place.kind === "country"
                ? {
                      $or: [
                          {
                              countryId: scope.place._id,
                              villageId: { $nin: placed },
                          },
                          { villageId },
                      ],
                  }
                : { villageId }
        );
    }
    if (filters.length > 0) match.$and = filters;

    // Last, so that the search runs inside everything above: the page, the
    // place, the dates and the filters.
    if (user && audience === "officer") {
        const words = await officersMatching(
            user,
            await Store.distinct("moderatorId", match)
        );
        if (words) match.$and = [...(match.$and || []), ...words];
    } else if (user) {
        const ids = await usersMatching(
            user,
            await Store.distinct("userId", match)
        );
        if (ids) match.userId = { $in: ids };
    }

    // Whole and in range: a negative or fractional $skip or $limit is an
    // error from the database, not an empty page.
    const whole = (value, fallback) => Math.floor(Number(value)) || fallback;
    const safeLimit = Math.min(Math.max(whole(limit, 25), 1), MAX_LIMIT);

    return {
        match,
        scope,
        audience,
        Store,
        page: Math.max(whole(page, 0), 0),
        limit: safeLimit,
        sort: {
            [["submittedAt", "createdAt"].includes(sortBy)
                ? sortBy
                : "submittedAt"]: sortOrder === "asc" ? 1 : -1,
        },
    };
};

/**
 * The columns of one page for a scope: every PUBLISHED question that belongs
 * in it (`scope.owners`), archived ones included so their answers keep a
 * home. A question that was never published has no answers and is no column
 * yet.
 *
 * Wording and options are the ones in force at the scope's place — what a
 * villager there is asked today, published changes only. A question that
 * place's chain does not reach (one a village inside it added) keeps its own.
 *
 * A page that is not part of `audience`'s questionnaire has no columns.
 */
const columnsFor = async (categoryId, scope, audience) => {
    if (!categoryId) return [];
    const { questions: stored, resolved } = await loadEffective({
        audience,
        chain: scope.place ? chainOf(scope.place) : [],
        categoryId,
    });
    const owners = scope.owners && new Set(scope.owners.map(String));
    const questions = stored.filter(
        (question) =>
            !question.unpublished &&
            (!owners || owners.has(String(question.ownerPlaceId || null)))
    );

    const childrenOf = new Map();
    questions
        .filter((question) => question.parentQuestionId)
        .forEach((question) => {
            const key = String(question.parentQuestionId);
            childrenOf.set(key, [...(childrenOf.get(key) || []), question]);
        });

    // The options places IN the view added (any place, with all of them in
    // view): the chain above holds none of those, yet answers on screen sit
    // on them and Graphs and Filters name options from this list.
    const addedBy = await PlaceOverrides.find({
        targetId: { $in: questions.map((question) => question._id) },
        "published.addedOptions.0": { $exists: true },
        ...(owners
            ? { placeId: { $in: scope.owners.filter(Boolean) } }
            : {}),
    })
        .select({ targetId: 1, "published.addedOptions": 1 })
        .lean();
    const addedTo = new Map();
    addedBy.forEach(({ targetId, published }) => {
        const key = String(targetId);
        addedTo.set(key, [...(addedTo.get(key) || []), ...published.addedOptions]);
    });

    // Archived itself, or sitting in something that is.
    const byId = new Map(questions.map((question) => [String(question._id), question]));
    const isActive = (question) => {
        let current = question;
        for (let depth = 0; current && depth < 4; depth += 1) {
            if (current.active === false) return false;
            current = byId.get(String(current.parentQuestionId));
        }
        return true;
    };

    const toColumn = (question) => {
        const here = resolved.questions.get(String(question._id));
        const options = here?.allOptions || question.options || [];
        const listed = new Set(options.map((option) => String(option.value)));
        return {
            questionId: question._id,
            label: here?.label || question.label,
            type: question.type,
            active: isActive(question),
            replacedBy: question.replacedBy,
            ownerPlaceId: question.ownerPlaceId || null,
            options: [
                ...options,
                ...(addedTo.get(String(question._id)) || []).filter(
                    (option) => !listed.has(String(option.value))
                ),
            ].map(({ value, label, archived }) => ({ value, label, archived })),
            // A section inside a group is not a column either: what it holds
            // sits directly in the row.
            children: rowQuestions(question, questions).map((child) => ({
                ...toColumn(child),
                ...(child.section ? { section: child.section } : {}),
            })),
        };
    };

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
                out.push({
                    ...toColumn(child),
                    // As the place in view words it.
                    section:
                        resolved.questions.get(String(question._id))?.label ||
                        question.label,
                })
            );
    });
    return out;
};

/**
 * An answer as the dashboard gets it. The snapshot keeps every option the
 * question had; only the ones this answer chose travel — at every depth, or
 * each entry of a crop list would bring a 115-option list along.
 */
const slimAnswer = (answer) => {
    const group = answer.type === "repeatable_group";
    const chosen = new Set(
        (Array.isArray(answer.value) ? answer.value : [answer.value]).map(String)
    );
    return {
        questionId: answer.questionId,
        label: answer.label,
        type: answer.type,
        options: group
            ? []
            : (answer.options || []).filter((option) =>
                  chosen.has(String(option.value))
              ),
        value: group
            ? (Array.isArray(answer.value) ? answer.value : []).map((row) => ({
                  ...row,
                  answers: (row.answers || []).map(slimAnswer),
              }))
            : answer.value,
        // The place whose wording this was answered under, if not the
        // Master's.
        changedIn: answer.changedIn || null,
    };
};

/** Answers keyed by question — in the DTO only; stored, they stay a list. */
const byQuestion = (answers) =>
    (answers || []).reduce((acc, answer) => {
        acc[String(answer.questionId)] = slimAnswer(answer);
        return acc;
    }, {});

module.exports.list_responses = async (req, res) => {
    const { match, scope, audience, Store, page, limit, sort } =
        await parseQuery(req.query, res.locals.admin);

    const [total, docs, columns, places] = await Promise.all([
        Store.countDocuments(match),
        Store.aggregate([
            { $match: match },
            { $sort: sort },
            { $skip: page * limit },
            { $limit: limit },
            // The lookup runs on the page slice only, never the whole set.
            ...whoStages(audience),
        ]),
        columnsFor(req.query.categoryId, scope, audience),
        scope.places || listPlaces(),
    ]);

    const byId = indexPlaces(places);
    const named = (id) => {
        const place = byId.get(String(id));
        return place ? shown(place) : null;
    };
    // Where a response came from, root first: its village's chain, or its
    // country alone when the village did not resolve.
    const pathOf = (doc) => {
        const village = byId.get(String(doc.villageId));
        return (village ? chainOf(village) : [doc.countryId])
            .map(named)
            .filter(Boolean);
    };

    const rows = docs.map((doc) => ({
        _id: doc._id,
        // userId and userName; for an officer's, moderatorId and savedBy.
        ...whoOf(audience, doc),
        villageName: doc.villageName,
        villageId: doc.villageId,
        countryId: doc.countryId,
        placeNames: pathOf(doc),
        submittedAt: doc.submittedAt,
        questionnaireVersion: doc.questionnaireVersion ?? null,
        // What was on offer at that save. null on a response older than the
        // record of it: "not asked" cannot be told from "left blank" there.
        asked: doc.asked?.length > 0 ? doc.asked : null,
        // Keyed by questionId in the DTO ONLY — the stored document keeps the
        // array-of-pairs shape so no authored label ever becomes a field name.
        answers: byQuestion(doc.answers),
    }));

    // Every place a column or an answer names, for the "Added in" and
    // "Changed in" tags.
    const mentioned = new Set();
    const collect = (columnList) =>
        columnList.forEach((column) => {
            if (column.ownerPlaceId) mentioned.add(String(column.ownerPlaceId));
            collect(column.children || []);
        });
    collect(columns);
    const noteChanged = (answers) =>
        answers.forEach((answer) => {
            if (answer.changedIn) mentioned.add(String(answer.changedIn));
            if (answer.type === "repeatable_group") {
                answer.value.forEach((row) => noteChanged(row.answers));
            }
        });
    rows.forEach((row) => noteChanged(Object.values(row.answers)));

    const brief = (place) => ({
        _id: place._id,
        name: shown(place),
        level: place.level,
    });

    return res.json({
        total,
        page,
        limit,
        place: scope.place ? brief(scope.place) : null,
        places: Object.fromEntries(
            [...mentioned]
                .map((id) => byId.get(id))
                .filter(Boolean)
                .map((place) => [String(place._id), brief(place)])
        ),
        columns,
        rows,
    });
};

/**
 * Long view: one row per group row (one row per poultry product), with the
 * respondent's context repeated. $unwind only — never a $lookup into a side
 * collection, because rows are embedded.
 */
module.exports.list_response_rows = async (req, res) => {
    const { match, audience, Store, page, limit, sort } = await parseQuery(
        req.query,
        res.locals.admin
    );
    const { groupPath } = req.query;
    if (typeof groupPath !== "string" || !groupPath) {
        throw new AppError(0, "Please provide groupPath", 400);
    }

    const [parentId, childId] = groupPath.split(".");
    toObjectId(parentId, "groupPath");
    if (childId) toObjectId(childId, "groupPath");

    // Only a nested group can be unwound a second level. A scalar child would
    // produce meaningless rows, so refuse rather than guess.
    if (childId) {
        // Looked up on the page in view, and answered one way whatever the
        // id is: this is not a way to ask whether a question exists.
        const child = await Questions.exists({
            _id: childId,
            type: "repeatable_group",
            ...(match.categoryId ? { categoryId: match.categoryId } : {}),
        });
        if (!child) {
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
                // userId, or for an officer's response moderatorId.
                [WHO[audience].id]: 1,
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
        { $limit: limit },
        // Whose entry each row is — on the page slice only, as in the list.
        ...whoStages(audience)
    );

    const rows = await Store.aggregate(pipeline);

    return res.json({
        page,
        limit,
        groupPath,
        rows: rows.map(({ user, ...row }) => ({
            ...row,
            ...whoOf(audience, { ...row, user }),
            answers: byQuestion(row.answers),
        })),
    });
};

/**
 * Graphs. Aggregates the WHOLE filtered set, not the visible page — which is
 * why filtering is server-side in the first place.
 */
module.exports.response_stats = async (req, res) => {
    const { match, scope, audience, Store } = await parseQuery(
        req.query,
        res.locals.admin
    );

    const [total, overTime, flat, columns, offered, unrecorded] = await Promise.all([
        Store.countDocuments(match),
        Store.aggregate([
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
        Store.aggregate([
            { $match: match },
            { $unwind: "$answers" },
            // Only how many entries a list has is charted. Carrying the
            // entries (each with its pickers' whole option lists) put every
            // response's into one document, past what MongoDB holds.
            // Photos and recordings likewise: how many files each response
            // holds, not their ids, which would be one bar per response.
            {
                $addFields: {
                    "answers.value": {
                        $cond: [
                            {
                                $in: [
                                    "$answers.type",
                                    ["repeatable_group", ...FILE_TYPES],
                                ],
                            },
                            {
                                $size: {
                                    $cond: [
                                        { $isArray: "$answers.value" },
                                        "$answers.value",
                                        [],
                                    ],
                                },
                            },
                            "$answers.value",
                        ],
                    },
                },
            },
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
        columnsFor(req.query.categoryId, scope, audience),
        // Who was OFFERED each question: a response that was never asked it
        // (hidden in its place, or another place's own) did not skip it.
        Store.aggregate([
            { $match: match },
            { $unwind: "$asked" },
            { $group: { _id: "$asked", count: { $sum: 1 } } },
        ]),
        // Saved before that record was kept: taken as asked everything.
        Store.countDocuments({ ...match, "asked.0": { $exists: false } }),
    ]);
    const offeredTo = new Map(
        offered.map((entry) => [String(entry._id), entry.count])
    );

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
            skipped: Math.max(
                (offeredTo.get(String(entry._id)) || 0) +
                    unrecorded -
                    entry.answered,
                0
            ),
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

/**
 * Saves one page of answers. Merges by questionId — never by position.
 *
 * One body for both apps: a villager's (submit_response below) and a field
 * officer's (Controllers/officer.js), so that "an answer binds by
 * questionId" is enforced in one place. What differs is who is asking:
 *
 *   `audience`      whose questionnaire the page has to be part of;
 *   `chain`         the places that decide what of it is asked;
 *   `owner.filter`  what finds the response being saved: a villager's own
 *                   (one per villager and page), or a village's (one per
 *                   village and page);
 *   `owner.stamp`   what the save records about where it came from;
 *   `files`         whose files may be put in the answers
 *                   (Controllers/files.js villagerFiles, officerFiles).
 */
const submitAnswers = async (req, { audience, chain, owner, files: whose }) => {
    const Store = storeFor(audience);

    const schema = Joi.object({
        categoryId: Joi.string().required(),
        complete: Joi.boolean().optional(),
        // One answer per question: a repeated id would be stored, and
        // counted, as often as it was sent.
        answers: Joi.array()
            .items(
                Joi.object({
                    questionId: Joi.string().required(),
                    value: Joi.any(),
                })
            )
            .unique("questionId")
            .required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const category = await Categories.findById(value.categoryId).lean();
    // A page of the other questionnaire is no page of this caller's.
    if (!category || audienceOf(category) !== audience) {
        throw new AppError(0, "Category not found", 404);
    }
    if (!category.is_screen) {
        throw new AppError(0, "That category is not a screen", 409);
    }

    // What this caller's place is asked on this page, with that place's
    // wording and options — the same rule /questions/live served them by.
    const { questions: everyQuestion, resolved } = await loadEffective({
        audience,
        chain,
        categoryId: value.categoryId,
    });
    if (!resolved.categories.get(String(category._id))?.asked) {
        throw new AppError(0, "This page is no longer asked in your place", 409);
    }
    // …and of that, what this caller's build of the app can answer. A photo
    // or audio question its X-Answer-Types header does not name was never
    // served to it (get_live_questions), so from here on it is a question
    // hidden for this caller: skipped if sent, not required, not recorded
    // as asked, and carried inside the entries that hold it.
    const live = servedTo(
        [...resolved.questions.values()].filter((question) => question.asked),
        answerTypesOf(req.get(ANSWER_TYPES_HEADER))
    );

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

    // Every question of this screen in any state — hidden, retired or excluded
    // for the caller's place as well as live. An answer for one of these that
    // is not served right now is "unserved", which is not "unknown".
    const known = new Set(everyQuestion.map((question) => String(question._id)));

    // …and neither is a question that a publish DELETED while this form was
    // open: it is no question any more, here or anywhere, and refusing its
    // answer would refuse everything else typed on the page with it. What
    // still exists but belongs to another page stays unknown, and refused.
    const sentIds = (answers) =>
        (Array.isArray(answers) ? answers : []).flatMap((answer) =>
            answer && typeof answer === "object"
                ? [
                      String(answer.questionId),
                      ...(Array.isArray(answer.value)
                          ? answer.value.flatMap((row) => sentIds(row?.answers))
                          : []),
                  ]
                : []
        );
    const strangers = [...new Set(sentIds(value.answers))].filter(
        (id) => !known.has(id) && HEX_ID.test(id)
    );
    if (strangers.length > 0) {
        const elsewhere = await Questions.find({ _id: { $in: strangers } })
            .select({ _id: 1 })
            .lean();
        const exists = new Set(elsewhere.map((question) => String(question._id)));
        strangers.filter((id) => !exists.has(id)).forEach((id) => known.add(id));
    }

    // Loaded before validating, not after: what is already saved decides what
    // may be resent (an answer on a since-removed option) and what a rebuilt
    // row must not lose (fields hidden since they were filled in).
    const existing = await Store.findOne({
        ...owner.filter,
        categoryId: value.categoryId,
    }).lean();
    const savedById = new Map(
        (existing?.answers || []).map((answer) => [
            String(answer.questionId),
            answer,
        ])
    );

    // An explicitly empty value CLEARS a saved answer. Without this, blanking
    // a field in the app would be undone by the merge below. Whether the
    // question is required is enforced further down, and only on `complete`.
    const isBlank = (entry) =>
        entry === null ||
        entry === undefined ||
        entry === "" ||
        (Array.isArray(entry) && entry.length === 0);
    const cleared = new Set();

    // What this response carries inside its rows for forms that were not
    // served a field (utils/answerValidator.js keptFor): as it was, and as
    // this save leaves it.
    const carry = {
        was: new Set((existing?.carried || []).map(String)),
        now: new Set((existing?.carried || []).map(String)),
    };

    // One sent answer against the rules. Asked twice of an answer when the
    // save holds files: `files` is only known once the answers have been
    // read (see "Files" below).
    const check = (question, sent, files) =>
        validateAnswer(question, sent, question.childMap || new Map(), 1, {
            saved: savedById.get(String(question._id))?.value,
            known,
            complete: Boolean(value.complete),
            carried: carry.was,
            files,
        });

    const snapshots = value.answers.flatMap((answer) => {
        const question = byId.get(String(answer.questionId));
        // Never silently drop an unknown answer — that is how the invariant rots.
        if (!question) {
            // Unserved is different: a question of this screen that was hidden
            // after the form was opened. Skipping it — not snapshotted, not
            // cleared — leaves the saved answer as it is and lets the form save.
            if (known.has(String(answer.questionId))) return [];
            throw new AppError(
                0,
                `Unknown question ${answer.questionId} for this screen`,
                400
            );
        }
        // Live, but its parent is not served (hiding or excluding a section
        // leaves its fields active), so /questions/live does not send it
        // either: unserved, as above.
        if (question.parentQuestionId && !byId.has(String(question.parentQuestionId))) return [];
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
        check(question, answer.value);
        return [
            snapshotAnswer(
                question,
                answer.value,
                question.childMap || new Map(),
                savedById.get(String(question._id)),
                carry
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

    // Merge by questionId: replace what was re-answered, keep the rest.
    const incoming = new Map(
        snapshots.map((snapshot) => [String(snapshot.questionId), snapshot])
    );

    // Files. So far a photo or audio answer has only been checked for its
    // shape: the validator cannot read the database. A file that is new to
    // its answer has to be one this caller uploaded, of the kind the
    // question takes — nothing else ties an id to a person, and the
    // dashboard shows whatever an answer holds. What the response already
    // held needs no lookup: it was checked when it was saved, and its saved
    // answer says which kind it is. The rest is looked up once.
    const held = filesIn(existing?.answers);
    const sent = fileIdsIn(snapshots);
    if (sent.length > 0) {
        const brought = sent.filter((id) => !held.has(id));
        const files =
            brought.length > 0 ? await filesOf(brought, whose) : new Map();
        held.forEach((kind, id) => files.set(id, { kind, mine: true }));
        value.answers
            .filter((answer) => incoming.has(String(answer.questionId)))
            .forEach((answer) =>
                check(byId.get(String(answer.questionId)), answer.value, files)
            );
    }

    const merged = (existing?.answers || [])
        .filter(
            (answer) =>
                !incoming.has(String(answer.questionId)) &&
                !cleared.has(String(answer.questionId))
        )
        .concat(snapshots);
    const fileIds = fileIdsIn(merged);

    const version = await Counters.findById("questionnaireVersion").lean();

    const saved = await Store.findOneAndUpdate(
        { ...owner.filter, categoryId: value.categoryId },
        {
            $set: {
                answers: merged,
                // Flat, every depth — see utils/questionUsage.js
                answeredIds: collectAnsweredIds(merged),
                // Likewise flat: every file the answers hold.
                fileIds,
                carried: [...carry.now].map((id) => new ObjectId(id)),
                // What was on offer at this save, and under which publish:
                // what the place is asked, less what this caller's build
                // was not served.
                asked: askedQuestionIds(resolved, value.categoryId).filter(
                    (id) => byId.has(id)
                ),
                questionnaireVersion: version?.seq || 1,
                submittedAt: new Date(),
                categoryPath: [...(category.path || []), category._id],
                // Where it came from, and for an officer who saved it.
                ...owner.stamp,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // A file this save took out of the response (its answer cleared, the
    // photo replaced, its entry removed) is no answer's any more, and is
    // deleted unless another of this caller's answers holds it too. If
    // that fails, the save has still succeeded.
    const lost = [...held.keys()].filter((id) => !fileIds.includes(id));
    if (lost.length > 0) {
        await removeUnheld(whose, { _id: { $in: lost } }).catch(() => {});
    }

    return saved;
};
module.exports.submitAnswers = submitAnswers;

/** App-facing submit, for a villager: the answers are their own. */
module.exports.submit_response = async (req, res) => {
    const { user } = res.locals;
    const geo = await resolveUserGeo(user);
    return res.json(
        await submitAnswers(req, {
            audience: "villager",
            chain: geo.chain,
            owner: {
                filter: { userId: user._id },
                stamp: {
                    countryId: geo.country?._id || null,
                    villageId: geo.village?._id || null,
                    villageName: user.village_name || "",
                },
            },
            files: villagerFiles(user),
        })
    );
};
