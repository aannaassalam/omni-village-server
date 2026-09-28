const mongoose = require("mongoose");

/**
 * A response is a FROZEN, self-contained record. label/type/options are
 * snapshotted at submit time so a later edit to the question can never change
 * what a stored answer appears to say.
 *
 * `value` is Mixed:
 *   scalar                      for text | number | date | boolean | single_select
 *   [scalar]                    for multi_select
 *   [{ rowId, answers: [...] }] for repeatable_group  (rows EMBEDDED, so every
 *                               analytics query is $unwind and never $lookup)
 *
 * The real enforcement lives in utils/answerValidator.js — the schema stays
 * permissive on purpose so one validator owns the rules for all seven types.
 */
const answerSchema = new mongoose.Schema(
    {
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "question",
            required: [true, "Question id is required!"],
        },
        // The full localised object is snapshotted, not one language, so a
        // historical answer can be read back in any language it was offered in.
        label: {
            type: mongoose.Schema.Types.Mixed,
            required: [true, "Answer label snapshot is required!"],
        },
        type: {
            type: mongoose.Schema.Types.String,
            required: [true, "Answer type snapshot is required!"],
        },
        options: {
            type: [
                new mongoose.Schema(
                    { value: String, label: mongoose.Schema.Types.Mixed },
                    { _id: false }
                ),
            ],
            default: [],
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    { _id: false }
);

const responseSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User id is required!"],
        },
        // The screen (an is_screen category).
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "category",
            required: [true, "Category id is required!"],
        },
        // Denormalised ancestors, so "everything under Production" is one
        // indexed $match rather than a recursive lookup.
        categoryPath: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "category",
            },
        ],
        // Denormalised at submit time: keeps dashboard filters an indexed
        // $match instead of a $lookup into users, and keeps geography
        // historically correct if the user later moves.
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "country",
            default: null,
        },
        villageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "village",
            default: null,
        },
        villageName: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        submittedAt: {
            type: mongoose.Schema.Types.Date,
            default: Date.now,
        },
        answers: {
            type: [answerSchema],
            default: [],
        },
    },
    { timestamps: true }
);

responseSchema.index({ "answers.questionId": 1 });
responseSchema.index({ categoryId: 1 });
responseSchema.index({ userId: 1 });
responseSchema.index({ userId: 1, categoryId: 1 }, { unique: true });
responseSchema.index({ categoryPath: 1 });
responseSchema.index({
    categoryId: 1,
    countryId: 1,
    villageId: 1,
    submittedAt: -1,
});

module.exports = mongoose.model("response", responseSchema);
