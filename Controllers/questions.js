const Joi = require("joi");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const Responses = require("../Models/responses");
const AppError = require("../AppError");
const { resolveUserGeo } = require("../utils/geoResolver");
const {
    loadEffective,
    loadPlaceView,
    listPage,
} = require("../utils/liveQuestionnaire");
const {
    DEFAULT_LANGUAGE,
    localise,
    normaliseLocalised,
} = require("../utils/localised");
const { groupDepth, listShape } = require("../utils/questionTree");
const {
    answeredFilter,
    countAnswered,
    usageOf,
} = require("../utils/questionUsage");
const {
    TYPE_LOCKED,
    PLACE_CANNOT_ARCHIVE,
    applied,
    assertRev,
    below,
    requiredText,
    writeDraft,
    writeOrder,
    removeUnpublished,
} = require("../utils/drafts");
const {
    PLACE_ORDER_BASE,
    assertMaster,
    assertCanChange,
} = require("../utils/places");

const same = (a, b) => String(a || "") === String(b || "");

/** Accepts a plain string (English) or a {lang: text} object. */
const localisedSchema = Joi.alternatives().try(
    Joi.string(),
    Joi.object().pattern(Joi.string(), Joi.string().allow(""))
);

const QUESTION_TYPES = [
    "text",
    "number",
    "single_select",
    "multi_select",
    "date",
    "boolean",
    "repeatable_group",
    "section",
];

const SELECT_TYPES = ["single_select", "multi_select"];

const optionSchema = Joi.object({
    value: Joi.string().required(),
    label: localisedSchema.required(),
    archived: Joi.boolean().optional(),
});

/** An option as it is stored: `archived` only when it is. */
const cleanOption = (label) => (option) => ({
    value: option.value,
    label: label(option.label),
    ...(option.archived ? { archived: true } : {}),
});

/**
 * Option keys are the identity answers are saved under, so they are unique.
 * And "p_…" is how a place's own option is keyed (the server issues those):
 * a Master key may never look like one. `existing` are keys the question
 * already has, which are not being chosen now.
 */
const assertOptionKeys = (options, existing = []) => {
    const values = options.map((option) => option.value);
    if (new Set(values).size !== values.length) {
        throw new AppError(0, "Option values must be unique", 400);
    }
    const reserved = values.find(
        (value) => value.startsWith("p_") && !existing.includes(value)
    );
    if (reserved) {
        throw new AppError(
            0,
            `An option value cannot start with "p_" ("${reserved}")`,
            400
        );
    }
};

// One that can be chosen: with every option archived the question would
// still be asked, and nothing could answer it.
const assertSelectHasOptions = (type, options) => {
    if (
        SELECT_TYPES.includes(type) &&
        !(options || []).some((option) => !option.archived)
    ) {
        throw new AppError(
            0,
            `A ${type} question needs at least one option`,
            400
        );
    }
};

/** Nests children under their parent. Sorting is display-only, never binding. */
const nestChildren = (questions) => {
    const children = new Map();
    questions
        .filter((question) => question.parentQuestionId)
        .forEach((question) => {
            const key = String(question.parentQuestionId);
            children.set(key, [...(children.get(key) || []), question]);
        });

    const attach = (question) => ({
        ...question,
        children: (children.get(String(question._id)) || [])
            .sort((a, b) => a.order - b.order)
            .map(attach),
    });

    return questions
        .filter((question) => !question.parentQuestionId)
        .sort((a, b) => a.order - b.order)
        .map(attach);
};

/**
 * Validates where a question is allowed to live, and caps group nesting at two
 * levels (Livestock -> Products, which is as deep as the existing data goes).
 */
const assertPlacement = async ({ categoryId, parentQuestionId, type }) => {
    const category = await Categories.findById(categoryId).lean();
    if (!category) throw new AppError(0, "Category not found", 404);
    if (!category.is_screen) {
        throw new AppError(
            0,
            "Questions can only be added to a screen category",
            409
        );
    }

    if (!parentQuestionId) return { category, parent: null };

    // Types are read with drafts applied, here and for the depth below: a
    // group that is waiting to become a text question must not gain fields,
    // and the tree being checked is the one a publish produces.
    const stored = await Questions.findById(parentQuestionId).lean();
    if (!stored) throw new AppError(0, "Parent question not found", 404);
    // A field lives on its group's page — every question carries its page,
    // so that one read returns a whole one.
    if (String(stored.categoryId) !== String(categoryId).toLowerCase()) {
        throw new AppError(0, "That question is on another page", 409);
    }
    const parent = applied(stored);
    if (!["repeatable_group", "section"].includes(parent.type)) {
        throw new AppError(
            0,
            "Only a repeatable_group or section can have children",
            409
        );
    }
    if (type === "section" && parent.type === "section") {
        throw new AppError(0, "Sections cannot be nested", 400);
    }
    if (type === "repeatable_group") {
        // Count the groups above, looking through sections: a section inside a
        // group does not add a level, but must not hide one either.
        const siblings = await Questions.find({ categoryId })
            .select({ type: 1, parentQuestionId: 1, draft: 1, hasDraft: 1 })
            .lean();
        const byId = new Map(
            siblings.map((q) => [String(q._id), applied(q)])
        );
        if (groupDepth(parent, byId) >= 2) {
            throw new AppError(
                0,
                "Groups can only be nested two levels deep",
                400
            );
        }
    }

    return { category, parent };
};

/**
 * Copies every active descendant of `sourceId` under `targetId`, preserving
 * the nesting. Used when a repeatable_group is structurally replaced.
 *
 * The copies are unpublished, like the replacement they sit in: they go out
 * with it, or are discarded with it.
 *
 * Returns a Map of old id (string) -> new id for everything it copied.
 */
const copySubtree = async (sourceId, targetId, adminId, copied = new Map()) => {
    const children = await Questions.find({
        parentQuestionId: sourceId,
        // The Master's own fields only. One a place added inside this group
        // is that place's: copied here it would become a Master question,
        // asked everywhere.
        ownerPlaceId: null,
    }).lean();

    for (const stored of children) {
        // Copied as the editor shows it: a field with a rewording waiting
        // keeps the rewording, and one that is archived, or about to be
        // archived or deleted, is left behind.
        const child = applied(stored);
        if (child.active === false || child.deleted) continue;

        const copy = await Questions.create({
            categoryId: child.categoryId,
            parentQuestionId: targetId,
            label: child.label,
            helper_text: child.helper_text,
            type: child.type,
            options: child.options,
            min: child.min,
            max: child.max,
            presentation: child.presentation,
            required: child.required,
            order: child.order,
            unpublished: true,
            draftBy: adminId,
            draftAt: new Date(),
        });
        copied.set(String(child._id), copy._id);

        // Anything that can own children, not only a nested group: a group's
        // fields often sit inside its sections (Crop -> Utilisation), and
        // stopping at the section copied it empty.
        if (["repeatable_group", "section"].includes(child.type)) {
            await copySubtree(child._id, copy._id, adminId, copied);
        }
    }

    return copied;
};

/**
 * Where a PLACE's new question goes, judged as that place sees the
 * questionnaire (`view`, from loadPlaceView): on a page it can see, inside a
 * question it can see, after everything it can see there. Rewrites
 * `definition`.
 *
 * On a page that is one list it goes INSIDE the list, as a field of every
 * entry: a second top-level question would stop the app drawing the page as
 * a list. That is decided here, whatever the dashboard sent.
 */
const settleForPlace = (view, definition) => {
    const { resolved } = view;
    const pageId = String(definition.categoryId).toLowerCase();

    let parent = null;
    if (definition.parentQuestionId) {
        parent = resolved.questions.get(
            String(definition.parentQuestionId).toLowerCase()
        );
        if (!parent) throw new AppError(0, "Parent question not found", 404);
    } else {
        if (!resolved.categories.has(pageId)) {
            throw new AppError(0, "Category not found", 404);
        }
        // A page that is one list whose list is switched off here: a
        // question added beside it would turn the page into a form the day
        // the list is shown again, and one added inside it would be asked
        // nowhere.
        const whole = listShape(
            [...resolved.questions.values()].filter(
                (question) =>
                    question.active !== false &&
                    same(question.categoryId, pageId)
            )
        );
        if (whole && !whole.group.selfAsked) {
            throw new AppError(
                0,
                "The list on this page is hidden here. Show it first, or add the question to another page.",
                409
            );
        }
        parent = listPage(resolved, pageId)?.group || null;
    }

    if (parent) {
        definition.parentQuestionId = parent._id;
        // It lives on its parent's page — the one the parent is PUBLISHED
        // on, should the parent be waiting to move: what is inside a
        // question follows it when the move goes out (utils/drafts.js).
        definition.categoryId = view.questions.find((question) =>
            same(question._id, parent._id)
        ).categoryId;
    }

    // Only the Master is ordered by hand. What a place adds sits after what
    // it can see there, wherever the request asked for it.
    const siblings = [...resolved.questions.values()].filter((question) =>
        parent
            ? same(question.parentQuestionId, parent._id)
            : !question.parentQuestionId && same(question.categoryId, pageId)
    );
    definition.order =
        Math.max(
            PLACE_ORDER_BASE,
            ...siblings.map((question) => question.order || 0)
        ) + 1;
};

/**
 * Creates the question UNPUBLISHED: the editor shows it, the app does not,
 * until a publish puts it out.
 *
 * With `replaces` it is the successor of a published question that can no
 * longer be changed in place (its answer type is locked by saved answers).
 * It takes that question's page, parent and position; the old one is retired
 * by the publish itself, so until then nothing has happened to it.
 *
 * With `ownerPlaceId` it is that place's own question, asked there and in
 * the places inside it only, and added by whoever manages that place.
 * Without, it is the Master's, and a super admin's to add.
 */
module.exports.add_question = async (req, res) => {
    const schema = Joi.object({
        // With `replaces` the page is the old question's, whatever is sent.
        // (`required()` on the condition: a bare Joi.string() also matches
        // a missing `replaces`.)
        categoryId: Joi.string().when("replaces", {
            is: Joi.string().required(),
            then: Joi.optional(),
            otherwise: Joi.required(),
        }),
        parentQuestionId: Joi.string().allow(null).optional(),
        label: localisedSchema.required(),
        helper_text: localisedSchema.optional(),
        type: Joi.string()
            .valid(...QUESTION_TYPES)
            .required(),
        options: Joi.array().items(optionSchema).optional(),
        min: Joi.number().allow(null).optional(),
        max: Joi.number().allow(null).optional(),
        presentation: Joi.string().valid("inline", "screen").optional(),
        required: Joi.boolean().optional(),
        order: Joi.number().optional(),
        replaces: Joi.string().allow(null).optional(),
        copyChildren: Joi.boolean().optional(),
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
    const { copyChildren, ownerPlaceId, ...definition } = value;

    if (ownerPlaceId) {
        // Replacing is how the Master gets round its own type lock; a
        // place's question is not locked against the place.
        if (definition.replaces) {
            throw new AppError(0, "Only the Master can replace a question", 409);
        }
        // Refused here unless the caller manages that place.
        settleForPlace(await loadPlaceView(admin, ownerPlaceId), definition);
    } else {
        assertMaster(admin);
    }

    let old = null;
    if (definition.replaces) {
        old = await Questions.findById(definition.replaces).lean();
        if (!old) throw new AppError(0, "Question not found", 404);
        if (old.unpublished || old.ownerPlaceId) {
            throw new AppError(
                0,
                "Only a published Master question can be replaced",
                409
            );
        }
        // Published already (replacedBy) or still waiting (another question
        // names it): either way it has its successor.
        if (old.replacedBy || (await Questions.exists({ replaces: old._id }))) {
            throw new AppError(
                0,
                "This question has already been replaced — edit its replacement instead",
                409
            );
        }
        definition.categoryId = old.categoryId;
        definition.parentQuestionId = old.parentQuestionId;
        definition.order = applied(old).order;
    }

    // Fields are copied from a repeating group into a repeating group and
    // nowhere else (a group's sections cannot sit inside a section). Asked
    // for anything else, the answer must not be "done".
    if (
        copyChildren &&
        !(old?.type === "repeatable_group" && definition.type === "repeatable_group")
    ) {
        throw new AppError(
            0,
            "Fields can only be copied from a repeating group into a repeating group.",
            409
        );
    }

    const { category, parent } = await assertPlacement(definition);
    // On a page or in a group that a place added, a Master question would
    // be asked nowhere but in that place, and yet not be that place's.
    if (!ownerPlaceId && (category.ownerPlaceId || parent?.ownerPlaceId)) {
        throw new AppError(
            0,
            "That belongs to a place: add the question for that place.",
            409
        );
    }

    if (definition.options) assertOptionKeys(definition.options);
    assertSelectHasOptions(definition.type, definition.options);

    if (definition.order === undefined) {
        // After the last of the Master's own there, where the editor draws
        // them: by the order each will have once its draft is published.
        // What places added keeps its own numbers, after all of these.
        const siblings = await Questions.find({
            categoryId: definition.categoryId,
            parentQuestionId: definition.parentQuestionId || null,
            ownerPlaceId: null,
        })
            .select({ order: 1, draft: 1, hasDraft: 1 })
            .lean();
        definition.order =
            Math.max(0, ...siblings.map((q) => applied(q).order || 0)) + 1;
    }

    const question = await Questions.create({
        ...definition,
        label: normaliseLocalised(definition.label),
        helper_text: normaliseLocalised(definition.helper_text) || {},
        options: (definition.options || []).map(cleanOption(normaliseLocalised)),
        parentQuestionId: definition.parentQuestionId || null,
        replaces: old ? old._id : null,
        ownerPlaceId: ownerPlaceId || null,
        unpublished: true,
        draftBy: admin._id,
        draftAt: new Date(),
    });

    // A group replaced by a group keeps its fields — as copies, because the
    // originals stay with the answers they hold. Recurses: a group can hold a
    // nested group (Livestock -> Products -> Output).
    if (
        old &&
        copyChildren &&
        old.type === "repeatable_group" &&
        question.type === "repeatable_group"
    ) {
        await copySubtree(old._id, question._id, admin._id);
    }

    return res.json(question);
};

/**
 * An edit never reaches the app by itself. On a question that was never
 * published the fields are written; on a published one the edit becomes (or
 * joins) its draft, which a publish applies. See utils/drafts.js
 *
 * Two things are refused, both because saved answers depend on them:
 * changing the answer type of an answered question (add a replacement
 * instead), and removing an option answers were saved on (archive it).
 */
module.exports.edit_question = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
        rev: Joi.number().optional(),
        label: localisedSchema.optional(),
        helper_text: localisedSchema.optional(),
        type: Joi.string()
            .valid(...QUESTION_TYPES)
            .optional(),
        options: Joi.array().items(optionSchema).optional(),
        min: Joi.number().allow(null).optional(),
        max: Joi.number().allow(null).optional(),
        presentation: Joi.string().valid("inline", "screen").optional(),
        required: Joi.boolean().optional(),
        order: Joi.number().optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { question_id, rev, ...patch } = value;

    const question = await Questions.findById(question_id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);
    // The Master's is a super admin's; a place's own question is for whoever
    // manages that place, and is edited under the same rules.
    await assertCanChange(res.locals.admin, question.ownerPlaceId);
    if (question.ownerPlaceId && patch.order !== undefined) {
        throw new AppError(0, "Only the Master can be reordered.", 409);
    }

    // What the editor shows, and so what this edit is an edit OF.
    const current = applied(question);

    // A draft is Mixed: none of this passes through the schema's validators.
    if (patch.label !== undefined) {
        patch.label = requiredText(patch.label, "Question label");
    }
    if (patch.helper_text !== undefined) {
        patch.helper_text = normaliseLocalised(patch.helper_text) || {};
    }

    // Measured against the PUBLISHED type: sending that one back is how a
    // waiting type change is withdrawn, and is always allowed.
    if (
        patch.type !== undefined &&
        patch.type !== question.type &&
        !question.unpublished &&
        (await countAnswered(question._id)) > 0
    ) {
        throw new AppError(0, TYPE_LOCKED, 409);
    }
    if (patch.type !== undefined && patch.type !== current.type) {
        // What is inside it was built for the type it has: fields of a group
        // are answered in its rows, a section's at the top level, and
        // nothing else can hold any.
        if (await Questions.exists({ parentQuestionId: question._id })) {
            throw new AppError(
                0,
                "Remove the questions inside it before changing its answer type.",
                409
            );
        }
        await assertPlacement({
            categoryId: question.categoryId,
            parentQuestionId: question.parentQuestionId,
            type: patch.type,
        });
    }

    if (patch.options !== undefined) {
        patch.options = patch.options.map(
            cleanOption((label) => requiredText(label, "Option label"))
        );
        assertOptionKeys(
            patch.options,
            [...(question.options || []), ...(current.options || [])].map(
                (option) => option.value
            )
        );

        // An option answers were saved on stays (archived), so those answers
        // keep a name and keep validating. One nobody chose can simply go.
        const kept = new Set(patch.options.map((option) => option.value));
        const removed = question.unpublished
            ? []
            : (question.options || []).filter(
                  (option) => !kept.has(option.value)
              );
        if (removed.length > 0) {
            const { usedOptions } = await usageOf(question._id);
            const used = removed.find((option) =>
                usedOptions.includes(option.value)
            );
            if (used) {
                throw new AppError(
                    0,
                    `“${localise(used.label)}” has saved answers. Archive it instead.`,
                    409
                );
            }
        }
    }
    // An edit may not leave a select with nothing to choose. One that
    // already has no options (the seed makes those when it finds no list to
    // take them from) can still be reworded on its way to getting some.
    const alreadyEmpty =
        SELECT_TYPES.includes(current.type) &&
        (current.options || []).length === 0;
    if (!alreadyEmpty) {
        assertSelectHasOptions(
            patch.type ?? current.type,
            patch.options ?? current.options
        );
    }

    return res.json(
        await writeDraft(Questions, question, rev, patch, res.locals.admin._id)
    );
};

/** Archive (`active: false`) or restore — as a draft, like any other edit. */
module.exports.toggle_active = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
        rev: Joi.number().optional(),
        active: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const question = await Questions.findById(value.question_id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);
    await assertCanChange(res.locals.admin, question.ownerPlaceId);
    // Archiving takes a question out of EVERY place, which only the Master
    // does. A place's own question is switched off with its Asked switch —
    // also before it is published: archived then, it could never be
    // restored afterwards.
    if (question.ownerPlaceId) {
        throw new AppError(0, PLACE_CANNOT_ARCHIVE, 409);
    }

    // Only the question itself is written. What sits under an archived
    // group or section is hidden by the resolver, and comes back with it.
    return res.json(
        await writeDraft(
            Questions,
            question,
            value.rev,
            { active: value.active },
            res.locals.admin._id
        )
    );
};

module.exports.reorder_questions = async (req, res) => {
    const schema = Joi.array()
        .items(
            Joi.object({
                question_id: Joi.string().required(),
                order: Joi.number().required(),
            })
        )
        .min(1)
        .required();

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    // A new position is a draft too: the app keeps the published order
    // until a publish. Only the Master's questions take one: writeOrder
    // passes over what a place added.
    await writeOrder(
        Questions,
        value.map((item) => ({ id: item.question_id, order: item.order })),
        res.locals.admin._id
    );

    return res.json({ message: "Questions reordered successfully" });
};

/**
 * Moves a question a PLACE added to another page that place can see, where
 * it sits at the end, as on the page it was added to. As a draft, like any
 * other edit; the Master's questions do not change page.
 *
 * Only a top-level question, which takes what is inside it along, and only
 * while none of it is answered: a response is one page's, so the answers
 * would stay behind on the old one.
 */
module.exports.move_question = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
        rev: Joi.number().optional(),
        categoryId: Joi.string().hex().length(24).lowercase().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { admin } = res.locals;

    const question = await Questions.findById(value.question_id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);
    if (!question.ownerPlaceId) {
        // Not for a regional account at all; not movable for anyone.
        assertMaster(admin);
        throw new AppError(
            0,
            "Only a question a place added can be moved to another category.",
            409
        );
    }
    // The questionnaire as the question's OWN place sees it — refused
    // unless the caller manages that place.
    const view = await loadPlaceView(admin, question.ownerPlaceId);

    if (question.parentQuestionId) {
        throw new AppError(
            0,
            "Only a top-level question can be moved to another category.",
            409
        );
    }

    const page = view.resolved.categories.get(value.categoryId);
    if (!page) throw new AppError(0, "Category not found", 404);
    if (!page.is_screen) {
        throw new AppError(
            0,
            "Questions can only be added to a screen category",
            409
        );
    }
    // Back to the page it is published on is always possible: that is how a
    // move is withdrawn.
    const home = same(page._id, question.categoryId);
    // A page that is one list has to stay one (see settleForPlace), and a
    // question cannot be moved INTO its list: only its page is drafted.
    if (!home && listPage(view.resolved, page._id)) {
        throw new AppError(
            0,
            "That page is a list of entries: add the question there instead.",
            409
        );
    }

    const inside = below(question._id, view.questions, "parentQuestionId");
    const answered = await Responses.countDocuments({
        $or: [question, ...inside].map((one) => answeredFilter(one._id)),
    });
    if (answered > 0) {
        throw new AppError(
            0,
            `${answered} response(s) answer this question or one inside it, so it stays on its page.`,
            409
        );
    }

    const last = Math.max(
        PLACE_ORDER_BASE,
        ...[...view.resolved.questions.values()]
            .filter(
                (other) =>
                    !other.parentQuestionId &&
                    same(other.categoryId, page._id) &&
                    !same(other._id, question._id)
            )
            .map((other) => other.order || 0)
    );
    const saved = await writeDraft(
        Questions,
        question,
        value.rev,
        // Its place in the order is the page's to give, there and back.
        { categoryId: page._id, order: home ? question.order : last + 1 },
        admin._id
    );

    // Never published, the question itself was just written, so what is
    // inside it (as new as it is) is too: every question carries its page.
    // A published one moves when its draft is published, with all of it.
    if (question.unpublished && inside.length > 0) {
        await Questions.updateMany(
            { _id: { $in: inside.map((one) => one._id) } },
            { $set: { categoryId: page._id } }
        );
    }

    return res.json(saved);
};

module.exports.delete_question = async (req, res) => {
    const { id } = req.query;
    if (!id) throw new AppError(0, "Please provide id", 400);
    // The revision the caller was shown. An empty one is "none sent".
    const rev = req.query.rev ? Number(req.query.rev) : undefined;
    const { admin } = res.locals;

    const question = await Questions.findById(id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);
    await assertCanChange(admin, question.ownerPlaceId);

    // Never published: nothing outside the editor has seen it and nothing
    // can have answered it. It goes now, with what was added inside it.
    if (question.unpublished) {
        assertRev(question, rev);
        await removeUnpublished("question", question, admin._id);
        return res.json({
            message: "Question deleted successfully",
            pending: false,
        });
    }

    // Once its own question is out, a place takes it away again with the
    // Asked switch: the answers saved on it keep their question.
    if (question.ownerPlaceId) {
        throw new AppError(0, PLACE_CANNOT_ARCHIVE, 409);
    }

    // Everything under it, level by level: a group holds sections and nested
    // groups, and those hold fields. All of it is deleted with the question,
    // so all of it has to be unanswered first.
    const descendants = [];
    let level = [question._id];
    while (level.length > 0) {
        const children = await Questions.find({
            parentQuestionId: { $in: level },
        })
            .select({ _id: 1 })
            .lean();
        level = children.map((child) => child._id);
        descendants.push(...level);
    }

    // Hard-deleting an answered question is what breaks the questionId
    // invariant — existing answers would point at nothing.
    const answered = await countAnswered(id);
    if (answered > 0) {
        throw new AppError(
            0,
            `${answered} response(s) answer this question — archive it instead.`,
            409
        );
    }
    // A section is never answered itself, so for one this is the check that
    // fires. One query for the lot rather than a count per descendant.
    const answeredInside =
        descendants.length > 0
            ? await Responses.countDocuments({
                  $or: descendants.map(answeredFilter),
              })
            : 0;
    if (answeredInside > 0) {
        throw new AppError(
            0,
            `${answeredInside} response(s) answer a question inside this one — archive it instead.`,
            409
        );
    }

    // Published: the app keeps asking it until a publish takes it away, with
    // everything under it. Both checks above are made again at that moment.
    await writeDraft(Questions, question, rev, { deleted: true }, admin._id);

    return res.json({
        message: "The question will be deleted when you publish",
        pending: true,
    });
};

/**
 * App-facing. Returns the geo-filtered live question set AND the caller's
 * frozen response in one round trip; the app merges them by questionId locally.
 */
module.exports.get_live_questions = async (req, res) => {
    const { user } = res.locals;
    const { categoryId, lang } = req.query;
    if (!categoryId) throw new AppError(0, "Please provide categoryId", 400);

    // The app asks for one language and gets flat strings; omit `lang` (or ask
    // for "all") to get the full localised objects instead.
    const language = lang || DEFAULT_LANGUAGE;
    const flatten = language !== "all";

    const geo = await resolveUserGeo(user);

    const [{ resolved }, response] = await Promise.all([
        loadEffective({ chain: geo.chain, categoryId }),
        Responses.findOne({ userId: user._id, categoryId })
            .select({ answers: 1, submittedAt: 1, categoryId: 1 })
            .lean(),
    ]);

    // The options this villager's OWN saved answers sit on, at every depth.
    // One that a place has switched off since, or that the Master archived,
    // is not on offer any more — but the app can only draw (and untick) a
    // choice it is given the option for. So whoever made that choice still
    // gets the option, and nobody else does.
    const chosen = new Map();
    const collect = (answers) =>
        (answers || []).forEach((answer) => {
            if (answer.type === "repeatable_group") {
                [].concat(answer.value ?? []).forEach((row) => collect(row?.answers));
                return;
            }
            if (!SELECT_TYPES.includes(answer.type)) return;
            const key = String(answer.questionId);
            if (!chosen.has(key)) chosen.set(key, new Map());
            [].concat(answer.value ?? []).forEach((value) =>
                chosen.get(key).set(
                    String(value),
                    // As it was called when it was chosen.
                    (answer.options || []).find(
                        (option) => String(option.value) === String(value)
                    )?.label
                )
            );
        });
    collect(response?.answers);

    const optionsFor = (question) => {
        const offered = question.options.map(({ value, label }) => ({
            value,
            label,
        }));
        const mine = SELECT_TYPES.includes(question.type)
            ? chosen.get(String(question._id))
            : null;
        if (!mine) return offered;

        const have = new Set(offered.map((option) => String(option.value)));
        mine.forEach((savedLabel, value) => {
            if (have.has(value)) return;
            // Today's wording when the question still knows the option
            // (switched off, archived), else the wording it was saved with.
            const known = question.allOptions.find(
                (option) => String(option.value) === value
            );
            const label = known?.label || savedLabel;
            if (label) offered.push({ value: known ? known.value : value, label });
        });
        return offered;
    };

    // Only what this caller's place is asked, with that place's wording and
    // options. A page that is not asked there yields nothing, whatever its
    // questions say: the resolver already folded that in.
    const questions = [...resolved.questions.values()]
        .filter((question) => question.asked)
        .map((question) => ({
            _id: question._id,
            label: question.label,
            helper_text: question.helper_text,
            type: question.type,
            options: optionsFor(question),
            min: question.min,
            max: question.max,
            presentation: question.presentation,
            required: question.required,
            order: question.order,
            parentQuestionId: question.parentQuestionId,
        }));

    // parentQuestionId is only needed to nest; strip it from the payload.
    const nested = nestChildren(questions).map(function strip(question) {
        const { parentQuestionId, children, ...rest } = question;
        return {
            ...rest,
            ...(flatten
                ? {
                      label: localise(rest.label, language),
                      helper_text: localise(rest.helper_text, language),
                      options: (rest.options || []).map((option) => ({
                          value: option.value,
                          label: localise(option.label, language),
                      })),
                  }
                : {}),
            ...(children && children.length
                ? { children: children.map(strip) }
                : {}),
        };
    });

    return res.json({ questions: nested, response: response || null });
};
