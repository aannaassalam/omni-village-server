const Joi = require("joi");
const Categories = require("../Models/categories");
const Questions = require("../Models/questions");
const Responses = require("../Models/responses");
const AppError = require("../AppError");
const { resolveUserGeo, targetingMatch } = require("../utils/geoResolver");
const { isTopLevel } = require("../utils/questionTree");
const {
    DEFAULT_LANGUAGE,
    localise,
    normaliseLocalised,
} = require("../utils/localised");

const localisedSchema = Joi.alternatives().try(
    Joi.string(),
    Joi.object().pattern(Joi.string(), Joi.string().allow(""))
);

/** Nests a flat list into a tree by parentId, each level sorted by order. */
const buildTree = (categories) => {
    const byParent = new Map();
    categories.forEach((category) => {
        const key = String(category.parentId || "root");
        byParent.set(key, [...(byParent.get(key) || []), category]);
    });

    const attach = (parentKey) =>
        (byParent.get(parentKey) || [])
            .sort(
                (a, b) =>
                    a.order - b.order ||
                    localise(a.title).localeCompare(localise(b.title))
            )
            .map((category) => ({
                ...category,
                children: attach(String(category._id)),
            }));

    return attach("root");
};

/** Resolves a parent into the child's `path` and `depth`. */
const pathFor = async (parentId) => {
    if (!parentId) return { path: [], depth: 0 };
    const parent = await Categories.findById(parentId).lean();
    if (!parent) throw new AppError(0, "Parent category not found", 404);
    const path = [...(parent.path || []), parent._id];
    return { path, depth: path.length };
};

module.exports.get_categories = async (req, res) => {
    const { tree, includeInactive } = req.query;
    const query = includeInactive === "true" ? {} : { active: true };

    const categories = await Categories.find(query)
        .sort({ depth: 1, order: 1 })
        .lean();

    // Question counts are only meaningful on screen nodes.
    const counts = await Questions.aggregate([
        { $match: { parentQuestionId: null } },
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(
        counts.map((c) => [String(c._id), c.count])
    );

    const decorated = categories.map((category) => ({
        ...category,
        questionCount: category.is_screen
            ? countByCategory.get(String(category._id)) || 0
            : 0,
    }));

    return res.json(tree === "true" ? buildTree(decorated) : decorated);
};

module.exports.add_category = async (req, res) => {
    const schema = Joi.object({
        title: localisedSchema.required(),
        description: localisedSchema.optional(),
        parentId: Joi.string().allow(null).optional(),
        is_screen: Joi.boolean().optional(),
        order: Joi.number().optional(),
        active: Joi.boolean().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { path, depth } = await pathFor(value.parentId);

    const category = await Categories.create({
        ...value,
        title: normaliseLocalised(value.title),
        description: normaliseLocalised(value.description) || {},
        parentId: value.parentId || null,
        path,
        depth,
    });

    return res.json(category);
};

module.exports.edit_category = async (req, res) => {
    const schema = Joi.object({
        category_id: Joi.string().required(),
        title: localisedSchema.optional(),
        description: localisedSchema.optional(),
        is_screen: Joi.boolean().optional(),
        order: Joi.number().optional(),
        active: Joi.boolean().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { category_id, ...patch } = value;

    if (patch.title !== undefined) patch.title = normaliseLocalised(patch.title);
    if (patch.description !== undefined) {
        patch.description = normaliseLocalised(patch.description) || {};
    }

    // Demoting a screen that already holds data would strand its questions and
    // responses under a node that can no longer own them.
    if (patch.is_screen === false) {
        const [questionCount, responseCount] = await Promise.all([
            Questions.countDocuments({ categoryId: category_id }),
            Responses.countDocuments({ categoryId: category_id }),
        ]);
        if (questionCount > 0 || responseCount > 0) {
            throw new AppError(
                0,
                `This screen holds ${questionCount} question(s) and ${responseCount} response(s) — move or delete them first.`,
                409
            );
        }
    }

    const category = await Categories.findByIdAndUpdate(category_id, patch, {
        new: true,
        runValidators: true,
    }).lean();
    if (!category) throw new AppError(0, "Category not found", 404);

    return res.json(category);
};

module.exports.reparent_category = async (req, res) => {
    const schema = Joi.object({
        category_id: Joi.string().required(),
        parentId: Joi.string().allow(null).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const node = await Categories.findById(value.category_id).lean();
    if (!node) throw new AppError(0, "Category not found", 404);

    if (value.parentId && String(value.parentId) === String(node._id)) {
        throw new AppError(0, "A category cannot be its own parent", 409);
    }

    const { path: newPath, depth: newDepth } = await pathFor(value.parentId);

    // Cycle guard: the proposed parent must not sit inside this node's subtree.
    if (newPath.some((ancestor) => String(ancestor) === String(node._id))) {
        throw new AppError(
            0,
            "That move would create a cycle — the target is inside this category",
            409
        );
    }

    const descendants = await Categories.find({ path: node._id }).lean();

    const writes = [
        {
            updateOne: {
                filter: { _id: node._id },
                update: {
                    $set: {
                        parentId: value.parentId || null,
                        path: newPath,
                        depth: newDepth,
                    },
                },
            },
        },
        // Every descendant keeps its suffix below this node; only the prefix moves.
        ...descendants.map((descendant) => {
            const suffix = descendant.path.slice(node.depth);
            const path = [...newPath, ...suffix];
            return {
                updateOne: {
                    filter: { _id: descendant._id },
                    update: { $set: { path, depth: path.length } },
                },
            };
        }),
    ];

    await Categories.bulkWrite(writes);

    return res.json({
        message: `Category moved (${descendants.length} descendant(s) updated)`,
    });
};

module.exports.reorder_categories = async (req, res) => {
    const schema = Joi.array()
        .items(
            Joi.object({
                category_id: Joi.string().required(),
                order: Joi.number().required(),
            })
        )
        .min(1)
        .required();

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    await Categories.bulkWrite(
        value.map((item) => ({
            updateOne: {
                filter: { _id: item.category_id },
                update: { $set: { order: item.order } },
            },
        }))
    );

    return res.json({ message: "Categories reordered successfully" });
};

module.exports.delete_category = async (req, res) => {
    const { id } = req.query;
    if (!id) throw new AppError(0, "Please provide id", 400);

    const [childCount, questionCount, responseCount] = await Promise.all([
        Categories.countDocuments({ parentId: id }),
        Questions.countDocuments({ categoryId: id }),
        Responses.countDocuments({ categoryId: id }),
    ]);

    if (childCount > 0 || questionCount > 0 || responseCount > 0) {
        throw new AppError(
            0,
            `Category has ${childCount} child categor(ies), ${questionCount} question(s) and ${responseCount} response(s) — deactivate it instead.`,
            409
        );
    }

    const category = await Categories.findByIdAndDelete(id);
    if (!category) throw new AppError(0, "Category not found", 404);

    return res.json({ message: "Category deleted successfully" });
};

/**
 * App-facing. The active tree with per-screen progress, already geo-filtered
 * for this caller — that is the doc's "pending questions" badge, computed from
 * the same filter rather than a second endpoint.
 */
module.exports.get_live_categories = async (req, res) => {
    const { user } = res.locals;
    const language = req.query.lang || DEFAULT_LANGUAGE;
    const geo = await resolveUserGeo(user);

    const categories = await Categories.find({ active: true })
        .sort({ depth: 1, order: 1 })
        .lean();

    const screenIds = categories
        .filter((category) => category.is_screen)
        .map((category) => category._id);

    const [questions, responses] = await Promise.all([
        Questions.find({
            categoryId: { $in: screenIds },
            active: true,
            ...targetingMatch(geo),
        })
            .select({ categoryId: 1, type: 1, parentQuestionId: 1 })
            .lean(),
        Responses.find({
            userId: user._id,
            categoryId: { $in: screenIds },
        })
            .select({ categoryId: 1, "answers.questionId": 1 })
            .lean(),
    ]);

    // Count what a person can actually answer on the screen: a section holds
    // no value but its children do; a group is one answer however many rows,
    // and what sits inside its rows is not counted separately.
    const byId = new Map(
        questions.map((question) => [String(question._id), question])
    );
    const answerable = new Set();
    const questionCounts = new Map();
    questions.forEach((question) => {
        if (!isTopLevel(question, byId)) return;
        answerable.add(String(question._id));
        const key = String(question.categoryId);
        questionCounts.set(key, (questionCounts.get(key) || 0) + 1);
    });

    // Answers to retired questions stay stored but must not count as progress.
    const answeredCounts = new Map();
    responses.forEach((response) => {
        answeredCounts.set(
            String(response.categoryId),
            (response.answers || []).filter((answer) =>
                answerable.has(String(answer.questionId))
            ).length
        );
    });

    const decorated = categories.map((category) => {
        const key = String(category._id);
        const questionCount = category.is_screen
            ? questionCounts.get(key) || 0
            : 0;
        const answeredCount = category.is_screen
            ? answeredCounts.get(key) || 0
            : 0;
        return {
            _id: category._id,
            title: localise(category.title, language),
            description: localise(category.description, language),
            parentId: category.parentId,
            is_screen: category.is_screen,
            order: category.order,
            questionCount,
            answeredCount,
            hasPending: category.is_screen && answeredCount < questionCount,
        };
    });

    return res.json(buildTree(decorated));
};
