const mongoose = require("mongoose");

/**
 * What ONE place changed about ONE question or category: whether it is asked
 * there, its own wording, whether an answer is required there, the options
 * it switched off and the options it added. Whatever a place has not set here it takes from the place above, and
 * in the end from the Master (utils/effectiveQuestionnaire.js).
 *
 * `published` is what the app reads. `draft` is the WHOLE next state — not a
 * patch, unlike a question's draft — and waits for a publish. A state is
 *
 *   { asked?, label?, helper_text?, required?,
 *     options?:      [{ value, asked }],
 *     addedOptions?: [{ value, label, archived? }] }
 *
 * and holds only keys that say something: an empty key is removed, never
 * stored, and a document with neither state left is deleted. A category's
 * state only ever holds `asked`. See utils/drafts.js (overrideUpdate).
 *
 * There is no `categoryId` on purpose: it would go stale the day the
 * question moved to another page.
 */
const placeOverrideSchema = new mongoose.Schema(
    {
        // A country, region or village: see utils/places.js
        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Place id is required!"],
        },
        targetType: {
            type: mongoose.Schema.Types.String,
            enum: ["question", "category"],
            required: [true, "Target type is required!"],
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "Target id is required!"],
        },
        published: {
            type: mongoose.Schema.Types.Mixed,
        },
        draft: {
            type: mongoose.Schema.Types.Mixed,
        },
        hasDraft: {
            type: mongoose.Schema.Types.Boolean,
            default: false,
        },
        // Raised by every write, as on a question: see Models/questions.js
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
    },
    // Not minimised: a draft of {} is a real draft — "take everything from
    // above again" — and dropping it would leave hasDraft pointing at nothing.
    { timestamps: true, minimize: false }
);

placeOverrideSchema.index({ placeId: 1, targetId: 1 }, { unique: true });
placeOverrideSchema.index({ targetId: 1 });

module.exports = mongoose.model(
    "place_override",
    placeOverrideSchema,
    "place_overrides"
);
