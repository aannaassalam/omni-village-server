const mongoose = require("mongoose");
const {
    localisedField,
    optionalLocalisedField,
} = require("../utils/localised");

const QUESTION_TYPES = [
    "text",
    "number",
    "single_select",
    "multi_select",
    "date",
    "boolean",
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
        // Exclusion-based: empty arrays mean "applies everywhere". A named
        // sub-object so excludedDistricts can be added later with no migration.
        targeting: {
            excludedCountries: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "country",
                },
            ],
            excludedVillages: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "village",
                },
            ],
        },
    },
    { timestamps: true }
);

questionSchema.index({ categoryId: 1, active: 1, order: 1 });
questionSchema.index({ parentQuestionId: 1 });
questionSchema.index({ replacedBy: 1 });

module.exports = mongoose.model("question", questionSchema);
module.exports.QUESTION_TYPES = QUESTION_TYPES;
