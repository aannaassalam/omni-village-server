const Joi = require("joi");
const Questions = require("../Models/questions");
const Categories = require("../Models/categories");
const Responses = require("../Models/responses");
const AppError = require("../AppError");
const { diffIsStructural } = require("../utils/answerValidator");
const { resolveUserGeo, targetingMatch } = require("../utils/geoResolver");
const {
    DEFAULT_LANGUAGE,
    localise,
    normaliseLocalised,
} = require("../utils/localised");
const { groupDepth } = require("../utils/questionTree");

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

const optionSchema = Joi.object({
    value: Joi.string().required(),
    label: localisedSchema.required(),
});

const targetingSchema = Joi.object({
    excludedCountries: Joi.array().items(Joi.string()).optional(),
    excludedVillages: Joi.array().items(Joi.string()).optional(),
});

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

    const parent = await Questions.findById(parentQuestionId).lean();
    if (!parent) throw new AppError(0, "Parent question not found", 404);
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
            .select({ type: 1, parentQuestionId: 1 })
            .lean();
        const byId = new Map(siblings.map((q) => [String(q._id), q]));
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
 */
const copySubtree = async (sourceId, targetId) => {
    const children = await Questions.find({
        parentQuestionId: sourceId,
        active: true,
    }).lean();

    for (const child of children) {
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
            targeting: child.targeting,
        });

        if (child.type === "repeatable_group") {
            await copySubtree(child._id, copy._id);
        }
    }
};

/**
 * Activates/deactivates every descendant of `questionId`. Recurses for the
 * same reason copySubtree does — a group can hold a nested group, and a
 * one-level cascade leaves grandchildren in a state their parent isn't in.
 */
const setSubtreeActive = async (questionId, active) => {
    const children = await Questions.find({ parentQuestionId: questionId })
        .select({ _id: 1, type: 1 })
        .lean();

    if (children.length === 0) return;

    await Questions.updateMany(
        { parentQuestionId: questionId },
        { $set: { active } }
    );

    for (const child of children) {
        if (child.type === "repeatable_group") {
            await setSubtreeActive(child._id, active);
        }
    }
};

module.exports.get_questions = async (req, res) => {
    const { categoryId, includeInactive } = req.query;
    if (!categoryId) throw new AppError(0, "Please provide categoryId", 400);

    const query = {
        categoryId,
        ...(includeInactive === "true" ? {} : { active: true }),
    };

    const questions = await Questions.find(query).lean();
    return res.json(nestChildren(questions));
};

module.exports.add_question = async (req, res) => {
    const schema = Joi.object({
        categoryId: Joi.string().required(),
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
        targeting: targetingSchema.optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    await assertPlacement(value);

    if (["single_select", "multi_select"].includes(value.type)) {
        if (!value.options || value.options.length === 0) {
            throw new AppError(
                0,
                `A ${value.type} question needs at least one option`,
                400
            );
        }
        const values = value.options.map((o) => o.value);
        if (new Set(values).size !== values.length) {
            throw new AppError(0, "Option values must be unique", 400);
        }
    }

    const question = await Questions.create({
        ...value,
        label: normaliseLocalised(value.label),
        helper_text: normaliseLocalised(value.helper_text) || {},
        options: (value.options || []).map((option) => ({
            value: option.value,
            label: normaliseLocalised(option.label),
        })),
        parentQuestionId: value.parentQuestionId || null,
    });

    return res.json(question);
};

/**
 * Cosmetic edits only. `type` changes and option-key changes are refused with
 * 409 and routed to replace-question, so retiring a question is always an
 * explicit act rather than one flag away from an in-place overwrite.
 */
module.exports.edit_question = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
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
        targeting: targetingSchema.optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { question_id, ...patch } = value;

    const question = await Questions.findById(question_id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);

    // 409 from this handler always means "structural" — it is the only 409 here,
    // so the dashboard can branch on the status alone.
    const structural = diffIsStructural(question, patch);
    if (structural) {
        throw new AppError(
            0,
            `${structural}. Use POST /api/questions/replace-question instead.`,
            409
        );
    }

    // type is only ever equal-to-current by this point; drop it rather than
    // writing it back.
    delete patch.type;

    if (patch.label !== undefined) patch.label = normaliseLocalised(patch.label);
    if (patch.helper_text !== undefined) {
        patch.helper_text = normaliseLocalised(patch.helper_text) || {};
    }
    if (patch.options !== undefined) {
        patch.options = patch.options.map((option) => ({
            value: option.value,
            label: normaliseLocalised(option.label),
        }));
    }

    const updated = await Questions.findByIdAndUpdate(question_id, patch, {
        new: true,
        runValidators: true,
    }).lean();

    return res.json(updated);
};

/**
 * Structural change: a NEW question, with the old one retired via
 * active:false + replacedBy. Existing answers stay attached to the old id.
 */
module.exports.replace_question = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
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
        targeting: targetingSchema.optional(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const { question_id, ...definition } = value;

    const old = await Questions.findById(question_id).lean();
    if (!old) throw new AppError(0, "Question not found", 404);
    if (old.replacedBy) {
        throw new AppError(
            0,
            "This question has already been replaced — edit its replacement instead",
            409
        );
    }

    const created = await Questions.create({
        ...definition,
        label: normaliseLocalised(definition.label),
        helper_text: normaliseLocalised(definition.helper_text) || {},
        options: (definition.options || []).map((option) => ({
            value: option.value,
            label: normaliseLocalised(option.label),
        })),
        categoryId: old.categoryId,
        parentQuestionId: old.parentQuestionId,
        order: definition.order ?? old.order,
        targeting: definition.targeting ?? old.targeting,
    });

    // Replacing a group without carrying its children would silently orphan
    // them. Recurses, because a group can hold a nested group (Livestock ->
    // Products -> Output) and copying only one level strands the grandchildren.
    if (old.type === "repeatable_group" && created.type === "repeatable_group") {
        await copySubtree(old._id, created._id);
    }

    // Consistent with toggle-active: a retired group takes its whole subtree.
    await setSubtreeActive(old._id, false);

    const retired = await Questions.findByIdAndUpdate(
        old._id,
        { active: false, replacedBy: created._id },
        { new: true }
    ).lean();

    return res.json({ old: retired, new: created });
};

module.exports.toggle_active = async (req, res) => {
    const schema = Joi.object({
        question_id: Joi.string().required(),
        active: Joi.boolean().required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const question = await Questions.findByIdAndUpdate(
        value.question_id,
        { active: value.active },
        { new: true }
    ).lean();
    if (!question) throw new AppError(0, "Question not found", 404);

    // A group's children have no meaning without their parent.
    if (question.type === "repeatable_group") {
        await setSubtreeActive(question._id, value.active);
    }

    return res.json(question);
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

    await Questions.bulkWrite(
        value.map((item) => ({
            updateOne: {
                filter: { _id: item.question_id },
                update: { $set: { order: item.order } },
            },
        }))
    );

    return res.json({ message: "Questions reordered successfully" });
};

module.exports.delete_question = async (req, res) => {
    const { id } = req.query;
    if (!id) throw new AppError(0, "Please provide id", 400);

    const question = await Questions.findById(id).lean();
    if (!question) throw new AppError(0, "Question not found", 404);

    // Hard-deleting an answered question is what breaks the questionId
    // invariant — existing answers would point at nothing.
    const answered = await Responses.countDocuments({
        "answers.questionId": id,
    });
    if (answered > 0) {
        throw new AppError(
            0,
            `${answered} response(s) answer this question — deactivate it instead.`,
            409
        );
    }

    await Questions.deleteMany({
        $or: [{ _id: id }, { parentQuestionId: id }],
    });

    return res.json({ message: "Question deleted successfully" });
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

    const [questions, response] = await Promise.all([
        Questions.find({
            categoryId,
            active: true,
            ...targetingMatch(geo),
        })
            .select({
                label: 1,
                helper_text: 1,
                type: 1,
                options: 1,
                min: 1,
                max: 1,
                presentation: 1,
                required: 1,
                order: 1,
                parentQuestionId: 1,
            })
            .lean(),
        Responses.findOne({ userId: user._id, categoryId })
            .select({ answers: 1, submittedAt: 1, categoryId: 1 })
            .lean(),
    ]);

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
