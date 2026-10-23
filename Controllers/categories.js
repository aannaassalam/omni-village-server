const Joi = require("joi");
const Categories = require("../Models/categories");
const Questions = require("../Models/questions");
const AppError = require("../AppError");
const { resolveUserGeo } = require("../utils/geoResolver");
const { loadEffective, loadPlaceView } = require("../utils/liveQuestionnaire");
const { visibleCategoryIds } = require("../utils/effectiveQuestionnaire");
const { isTopLevel, servedTo } = require("../utils/questionTree");
const { ANSWER_TYPES_HEADER, answerTypesOf } = require("../utils/fileKinds");
const {
    audienceOf,
    categoryFilter,
    parseAudience,
} = require("../utils/audience");
const { storeFor, countAnswers } = require("../utils/responseStores");
const {
    DEFAULT_LANGUAGE,
    localise,
    normaliseLocalised,
} = require("../utils/localised");
const {
    PLACE_CANNOT_ARCHIVE,
    WITHOUT_DRAFT,
    applied,
    assertRev,
    ancestors,
    requiredText,
    writeDraft,
    writeOrder,
    overrideUpdate,
    writeOverride,
    removeUnpublished,
} = require("../utils/drafts");
const {
    PLACE_ORDER_BASE,
    assertMaster,
    assertCanChange,
    readScope,
} = require("../utils/places");

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
    if (!parentId) return { path: [], depth: 0, parent: null };
    const parent = await Categories.findById(parentId).lean();
    if (!parent) throw new AppError(0, "Parent category not found", 404);
    const path = [...(parent.path || []), parent._id];
    return { path, depth: path.length, parent };
};

/**
 * The categories the Responses page lists: what is PUBLISHED, as it is
 * published. Never-published categories and questions are left out and
 * drafts are not applied — the editor has its own endpoint
 * (GET /questionnaire/editor).
 *
 * `place` holds the list to one place: the Master's categories, those the
 * places above it added and those added in it or inside it. A regional
 * account is always held to a place — its own unless it names one inside it
 * (utils/places.js readScope).
 *
 * `audience` is whose questionnaire: the villagers' unless "officer" is
 * asked for. The officers' is the Master's alone, so every place is listed
 * the whole of it.
 */
module.exports.get_categories = async (req, res) => {
    const { tree, includeInactive } = req.query;
    const audience = parseAudience(req.query.audience);
    const { owners } = await readScope(res.locals.admin, req.query.place);
    const readable = owners ? { ownerPlaceId: { $in: owners } } : {};
    const query = {
        unpublished: { $ne: true },
        ...categoryFilter(audience),
        ...readable,
        ...(includeInactive === "true" ? {} : { active: true }),
    };

    const categories = await Categories.find(query)
        .select(WITHOUT_DRAFT)
        .sort({ depth: 1, order: 1 })
        .lean();

    // Question counts are only meaningful on screen nodes.
    const counts = await Questions.aggregate([
        {
            $match: {
                parentQuestionId: null,
                unpublished: { $ne: true },
                ...readable,
            },
        },
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

/**
 * Creates the category UNPUBLISHED: the editor shows it, the app does not,
 * until a publish puts it out. Whether it is a page (`is_screen`) is chosen
 * here and cannot be changed afterwards.
 *
 * With `ownerPlaceId` it is that place's own category, shown there and in
 * the places inside it only: at the top level or inside one of the Master's
 * groups, after what the place can see there. Without, it is the Master's.
 *
 * `audience` says whose questionnaire a TOP-LEVEL category starts a part of
 * (the villagers' when it is left out). Inside another category it is not
 * asked: a category is its parent's audience, so a tree is one audience's
 * from its root down.
 */
module.exports.add_category = async (req, res) => {
    const schema = Joi.object({
        title: localisedSchema.required(),
        description: localisedSchema.optional(),
        parentId: Joi.string().allow(null).optional(),
        is_screen: Joi.boolean().required(),
        active: Joi.boolean().optional(),
        // Read by parseAudience below, which has the one refusal for it.
        audience: Joi.any(),
        ownerPlaceId: Joi.string()
            .hex()
            .length(24)
            .lowercase()
            .allow(null)
            .optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;
    const { ownerPlaceId, active, audience: named, ...definition } = value;
    const atTheTop = parseAudience(named);

    // Refused here unless the caller manages that place — or, for the
    // Master, is a super admin.
    const view = ownerPlaceId ? await loadPlaceView(admin, ownerPlaceId) : null;
    if (!view) assertMaster(admin);

    // `path` and `depth` are what they would be in the published tree. A
    // publish works them out again for every category, so they only have to
    // be right from then on.
    const { path, depth, parent } = await pathFor(definition.parentId);
    const audience = parent ? audienceOf(parent) : atTheTop;
    // The officers' questionnaire is the Master's alone. Said here, before
    // the place's view is asked for the parent: that view is of the
    // villagers' tree, where an officers' category is simply "not found".
    if (view && audience === "officer") {
        throw new AppError(
            0,
            "Places cannot add to the officer questionnaire.",
            409
        );
    }
    if (view && parent) {
        // As the place sees the tree: a group of the Master's, and one that
        // is published, since the Master's unpublished work is not shown to
        // a place.
        const seen = view.resolved.categories.get(String(parent._id));
        if (!seen) throw new AppError(0, "Parent category not found", 404);
        if (seen.ownerPlaceId || seen.is_screen) {
            throw new AppError(
                0,
                "A place's category sits at the top level or inside one of the Master's groups.",
                409
            );
        }
    }
    // In a group that a place added, a Master category would be shown
    // nowhere but in that place, and yet not be that place's.
    if (!view && parent?.ownerPlaceId) {
        throw new AppError(
            0,
            "That group belongs to a place: add the category for that place.",
            409
        );
    }

    // After the last of its siblings: for the Master by the order each will
    // have once its draft is published, for a place after every one it can
    // see there. At the top level the siblings are those of its own
    // questionnaire: the two are ordered apart.
    const siblings = view
        ? [...view.resolved.categories.values()].filter(
              (category) =>
                  String(category.parentId || "") ===
                  String(parent ? parent._id : "")
          )
        : (
              await Categories.find({
                  parentId: definition.parentId || null,
                  ownerPlaceId: null,
                  ...categoryFilter(audience),
              })
                  .select({ order: 1, draft: 1, hasDraft: 1 })
                  .lean()
          ).map(applied);

    const category = await Categories.create({
        ...definition,
        title: normaliseLocalised(definition.title),
        description: normaliseLocalised(definition.description) || {},
        parentId: definition.parentId || null,
        path,
        depth,
        audience,
        // A place's own are numbered from PLACE_ORDER_BASE (utils/places.js).
        order:
            Math.max(
                view ? PLACE_ORDER_BASE : 0,
                ...siblings.map((c) => c.order || 0)
            ) + 1,
        // Archiving is the Master's; a place has its switch (below).
        ...(view ? { ownerPlaceId } : { active }),
        unpublished: true,
        draftBy: admin._id,
        draftAt: new Date(),
    });

    // "Do not show it in the app" is, for a place, its own Asked switch set
    // to off — which it can switch on again, where an archived category of
    // its own could never be restored (edit_category refuses that).
    if (view && active === false) {
        await writeOverride(
            null,
            {
                placeId: ownerPlaceId,
                targetType: "category",
                targetId: category._id,
            },
            overrideUpdate(null, { asked: false }, { asked: true }, admin._id)
        );
    }

    return res.json(category);
};

/**
 * Wording and archive / restore. On a category that was never published the
 * fields are written; on a published one the edit becomes (or joins) its
 * draft, which a publish applies. See utils/drafts.js
 */
module.exports.edit_category = async (req, res) => {
    const schema = Joi.object({
        category_id: Joi.string().required(),
        rev: Joi.number().optional(),
        title: localisedSchema.optional(),
        description: localisedSchema.optional(),
        active: Joi.boolean().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { category_id, rev, ...patch } = value;

    // A draft is Mixed: the schema's "needs English" check never sees it.
    if (patch.title !== undefined) {
        patch.title = requiredText(patch.title, "Category title");
    }
    if (patch.description !== undefined) {
        patch.description = normaliseLocalised(patch.description) || {};
    }

    const category = await Categories.findById(category_id).lean();
    if (!category) throw new AppError(0, "Category not found", 404);
    // The Master's is a super admin's; a place's own category is renamed by
    // whoever manages that place.
    await assertCanChange(res.locals.admin, category.ownerPlaceId);
    // Archiving takes a category out of every place, which only the Master
    // does; a place hides its own with its Asked switch.
    if (category.ownerPlaceId && patch.active !== undefined) {
        throw new AppError(0, PLACE_CANNOT_ARCHIVE, 409);
    }

    return res.json(
        await writeDraft(Categories, category, rev, patch, res.locals.admin._id)
    );
};

/**
 * Moves a category, as a draft: `parentId` (and `order`, when sent) wait for
 * a publish, which is what rewrites `path`, `depth` and the responses'
 * `categoryPath`. Until then the app's tree is the published one.
 */
module.exports.reparent_category = async (req, res) => {
    const schema = Joi.object({
        category_id: Joi.string().required(),
        rev: Joi.number().optional(),
        parentId: Joi.string().allow(null).required(),
        order: Joi.number().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const all = await Categories.find().lean();
    const find = (id) =>
        all.find((category) => String(category._id) === String(id).toLowerCase());

    const node = find(value.category_id);
    if (!node) throw new AppError(0, "Category not found", 404);

    const parent = value.parentId ? find(value.parentId) : null;
    if (value.parentId && !parent) {
        throw new AppError(0, "Parent category not found", 404);
    }
    if (parent && String(parent._id) === String(node._id)) {
        throw new AppError(0, "A category cannot be its own parent", 409);
    }
    // Only the Master's tree is rearranged. What a place added stays where
    // it was added, and nothing of the Master's moves inside it.
    if (node.ownerPlaceId || parent?.ownerPlaceId) {
        throw new AppError(0, "Only the Master's categories can be moved.", 409);
    }
    // Dragged under a category of the other questionnaire, a page would
    // change who answers it, and leave its saved answers in the collection
    // of those who no longer do.
    if (parent && audienceOf(parent) !== audienceOf(node)) {
        throw new AppError(
            0,
            "A category cannot be moved between the villagers' and the officers' questionnaire.",
            409
        );
    }

    // Cycle guard, in the tree as it is DRAFTED: the one the editor draws,
    // and the one publishing everything produces. A publish checks again,
    // against whatever is actually published by then.
    const parentOf = new Map(
        all.map((category) => [
            String(category._id),
            String(applied(category).parentId || ""),
        ])
    );
    if (parent && ancestors(parent._id, parentOf).includes(String(node._id))) {
        throw new AppError(
            0,
            "That move would create a cycle — the target is inside this category",
            409
        );
    }

    return res.json(
        await writeDraft(
            Categories,
            node,
            value.rev,
            {
                parentId: parent ? parent._id : null,
                ...(value.order !== undefined ? { order: value.order } : {}),
            },
            res.locals.admin._id
        )
    );
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

    // A new position is a draft too: the app keeps the published order
    // until a publish. Only the Master's categories take one: writeOrder
    // passes over what a place added.
    await writeOrder(
        Categories,
        value.map((item) => ({ id: item.category_id, order: item.order })),
        res.locals.admin._id
    );

    return res.json({ message: "Categories reordered successfully" });
};

module.exports.delete_category = async (req, res) => {
    const { id } = req.query;
    if (!id) throw new AppError(0, "Please provide id", 400);
    // The revision the caller was shown. An empty one is "none sent".
    const rev = req.query.rev ? Number(req.query.rev) : undefined;
    const { admin } = res.locals;

    const category = await Categories.findById(id).lean();
    if (!category) throw new AppError(0, "Category not found", 404);
    await assertCanChange(admin, category.ownerPlaceId);

    // Never published: nothing outside the editor has seen it. It goes now,
    // with the categories and questions that were added inside it.
    if (category.unpublished) {
        assertRev(category, rev);
        await removeUnpublished("category", category, admin._id);
        return res.json({
            message: "Category deleted successfully",
            pending: false,
        });
    }

    // Once its own category is out, a place takes it away again by hiding it.
    if (category.ownerPlaceId) {
        throw new AppError(0, PLACE_CANNOT_ARCHIVE, 409);
    }

    const [childCount, questions, responseCount] = await Promise.all([
        Categories.countDocuments({ parentId: id }),
        Questions.find({ categoryId: id })
            .select({ ownerPlaceId: 1, hasDraft: 1, "draft.deleted": 1 })
            .lean(),
        // Whoever answered: villagers and field officers alike.
        countAnswers({ categoryId: id }),
    ]);
    const questionCount = questions.length;

    if (childCount > 0 || questionCount > 0 || responseCount > 0) {
        // The Master's editor can show this page as empty while it is not:
        // it does not list what places added here, nor what is waiting to
        // be deleted. Say which, so the refusal can be acted on.
        const ofPlaces = questions.filter((q) => q.ownerPlaceId).length;
        const leaving = questions.filter(
            (q) => !q.ownerPlaceId && q.hasDraft && q.draft?.deleted
        ).length;
        const why = [
            ofPlaces > 0 && `${ofPlaces} of them added by places`,
            leaving > 0 &&
                `${leaving} waiting to be deleted: publish that first`,
        ]
            .filter(Boolean)
            .join("; ");
        throw new AppError(
            0,
            `Category has ${childCount} child categor(ies), ${questionCount} question(s)${
                why ? ` (${why})` : ""
            } and ${responseCount} response(s) — archive it instead.`,
            409
        );
    }

    // Published: it stays in the app until a publish takes it away, and that
    // publish checks again that it is still empty.
    await writeDraft(Categories, category, rev, { deleted: true }, admin._id);

    return res.json({
        message: "The category will be deleted when you publish",
        pending: true,
    });
};

/**
 * The tree one caller is asked, with per-screen progress — the doc's "pending
 * questions" badge, computed from the same rule as the questions themselves
 * rather than a second endpoint.
 *
 * One body for both apps: a villager's (get_live_categories below) and a
 * field officer's (Controllers/officer.js). What differs is who is asking:
 * `audience` is whose questionnaire, `chain` the places that decide what of
 * it is asked, and `owner.filter` what finds the responses progress is
 * counted from — a villager's own, or a village's.
 */
const liveCategories = async (req, { audience, chain, owner }) => {
    const language = req.query.lang || DEFAULT_LANGUAGE;

    // Counting needs to know what is asked, not what it says: wording and
    // option lists stay in the database.
    const { resolved } = await loadEffective({
        audience,
        chain,
        fields: {
            categoryId: 1,
            type: 1,
            parentQuestionId: 1,
            active: 1,
            ownerPlaceId: 1,
            unpublished: 1,
        },
    });

    // What this caller is served: what its place is asked, less the photo
    // and audio questions its build of the app cannot answer (the same rule
    // as get_live_questions, by the same X-Answer-Types header). Pages and
    // progress are counted from that, so an older build is not shown a
    // question pending that it will never be asked.
    const questions = servedTo(
        [...resolved.questions.values()].filter((question) => question.asked),
        answerTypesOf(req.get(ANSWER_TYPES_HEADER))
    );
    const byId = new Map(
        questions.map((question) => [String(question._id), question])
    );

    // A page with nothing left to ask here, and a group with no page left,
    // are not listed: the app would draw them as dead tiles.
    const visible = visibleCategoryIds({
        categories: resolved.categories,
        questions: byId,
    });
    const categories = [...resolved.categories.values()].filter((category) =>
        visible.has(String(category._id))
    );

    const screenIds = categories
        .filter((category) => category.is_screen)
        .map((category) => category._id);

    const responses = await storeFor(audience)
        .find({
            ...owner.filter,
            categoryId: { $in: screenIds },
        })
        .select({ categoryId: 1, "answers.questionId": 1 })
        .lean();

    // Count what a person can actually answer on the screen: a section holds
    // no value but its children do; a group is one answer however many rows,
    // and what sits inside its rows is not counted separately.
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

    return buildTree(decorated);
};
module.exports.liveCategories = liveCategories;

/** App-facing. The tree this villager's place is asked. */
module.exports.get_live_categories = async (req, res) => {
    const { user } = res.locals;
    const geo = await resolveUserGeo(user);
    return res.json(
        await liveCategories(req, {
            audience: "villager",
            chain: geo.chain,
            owner: { filter: { userId: user._id } },
        })
    );
};
