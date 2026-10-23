const mongoose = require("mongoose");
const {
    localisedField,
    optionalLocalisedField,
} = require("../utils/localised");
const { FILE_TYPES } = require("../utils/fileKinds");

// The ONE list of answer types: Controllers/questions.js checks a request
// against this same array.
const QUESTION_TYPES = [
    "text",
    "number",
    "single_select",
    "multi_select",
    "date",
    "boolean",
    // "photo" and "audio": answered with files, a list of their ids. The
    // names, the limits and the checks are utils/fileKinds.js
    ...FILE_TYPES,
    "repeatable_group",
    // A presentational grouping (the app renders it as an accordion). It holds
    // no value of its own; its children are answered and stored FLAT at the top
    // level, unlike repeatable_group children which nest inside rows.
    "section",
];

/**
 * `value` is the immutable identity of an option; `label` is freely editable
 * copy. That split is what makes "renamed the wording" mechanically
 * distinguishable from "changed what the option means".
 */
const optionSchema = new mongoose.Schema(
    {
        value: {
            type: mongoose.Schema.Types.String,
            required: [true, "Option value is required!"],
        },
        label: localisedField("Option label"),
        // No longer offered, but kept: answers already saved on it stay
        // readable and keep validating. Absent means "offered".
        archived: {
            type: mongoose.Schema.Types.Boolean,
        },
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        // Denormalised onto children too, so one find() returns a whole screen.
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "category",
            required: [true, "Category id is required!"],
        },
        // Non-null => this is a child of a repeatable_group.
        parentQuestionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "question",
            default: null,
        },
        label: localisedField("Question label"),
        helper_text: optionalLocalisedField(),
        type: {
            type: mongoose.Schema.Types.String,
            required: [true, "Question type is required!"],
            enum: QUESTION_TYPES,
        },
        options: {
            type: [optionSchema],
            default: [],
        },
        // Numeric range for `number`; row-count bounds for `repeatable_group`.
        // For `photo` and `audio`, `max` is how many files one answer may
        // hold (null = 1) and `min` is not used.
        min: {
            type: mongoose.Schema.Types.Number,
            default: null,
        },
        max: {
            type: mongoose.Schema.Types.Number,
            default: null,
        },
        // repeatable_group only: "inline" renders +Add row in place,
        // "screen" pushes a sub-screen. Presentation only — same stored shape.
        presentation: {
            type: mongoose.Schema.Types.String,
            enum: ["inline", "screen"],
            default: "inline",
        },
        required: {
            type: mongoose.Schema.Types.Boolean,
            default: false,
        },
        // DISPLAY ONLY. Never participates in matching an answer to a question.
        order: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
        active: {
            type: mongoose.Schema.Types.Boolean,
            default: true,
        },
        replacedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "question",
            default: null,
        },

        /* ---- Drafts and ownership. Additive: a document without these is
           the Master's and published, as every one was before them. See
           utils/drafts.js ---- */

        // null = the Master's own. A place's own question has its place here.
        ownerPlaceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        // Never published: the document itself is the draft, and nothing
        // outside the editor reads it.
        unpublished: {
            type: mongoose.Schema.Types.Boolean,
        },
        // What the next publish changes on a PUBLISHED document: only the
        // fields that differ. An empty draft is removed, never stored as {}
        // (Mongoose drops empty objects on save), so `hasDraft` is the one
        // thing that says a draft exists.
        draft: {
            type: mongoose.Schema.Types.Mixed,
        },
        hasDraft: {
            type: mongoose.Schema.Types.Boolean,
            default: false,
        },
        // Raised by every write. An edit sends the one it was shown, so two
        // people editing the same question cannot silently overwrite each other.
        rev: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
        draftBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "admin",
        },
        draftAt: {
            type: mongoose.Schema.Types.Date,
        },
        // The published question this one takes over from when it is
        // published (that one then gets active:false + replacedBy).
        replaces: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "question",
            default: null,
        },
    },
    { timestamps: true }
);

questionSchema.index({ categoryId: 1, active: 1, order: 1 });
questionSchema.index({ parentQuestionId: 1 });
questionSchema.index({ replacedBy: 1 });
questionSchema.index({ ownerPlaceId: 1 });

module.exports = mongoose.model("question", questionSchema);
module.exports.QUESTION_TYPES = QUESTION_TYPES;
