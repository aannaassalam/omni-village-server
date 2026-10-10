const mongoose = require("mongoose");
const { AUDIENCES } = require("../utils/audience");

/**
 * What each publish changed: one document per row of the Publish dialog.
 *
 * `change` is structure (`{ kinds, counts }` from utils/changeSummary.js), not
 * a sentence. The sentence a person reads is made from it when the history is
 * read, so the wording can be improved without rewriting the past.
 *
 * `label`, `actorName` and `placeNames` are snapshots: the question may be
 * renamed or deleted, the account removed and the place renamed, and the row
 * still has to say what happened to what, and who did it.
 */
const historySchema = new mongoose.Schema(
    {
        // The publish this row belongs to (Models/counters.js).
        version: {
            type: mongoose.Schema.Types.Number,
            required: [true, "Version is required!"],
        },
        // Whose questionnaire was changed: the villagers', or the field
        // officers' (utils/audience.js). The two share this history and the
        // version counter, and each editor lists, and undoes the latest of,
        // its own rows. A row saved before this field has none and is the
        // villagers': ask with categoryFilter, never for "villager".
        audience: {
            type: mongoose.Schema.Types.String,
            enum: AUDIENCES,
            default: "villager",
        },
        at: {
            type: mongoose.Schema.Types.Date,
            default: Date.now,
        },
        actorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "admin",
        },
        actorName: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        // null = a change to the Master.
        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        placeNames: {
            type: [mongoose.Schema.Types.String],
            default: [],
        },
        targetType: {
            type: mongoose.Schema.Types.String,
            // "place": a place was moved under another one (no publish, but
            // its villagers are asked something else from then on).
            enum: ["question", "category", "place"],
            required: [true, "Target type is required!"],
        },
        // null for the one row that has no single target: categories reordered.
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        // The whole localised object, as response snapshots keep it.
        label: {
            type: mongoose.Schema.Types.Mixed,
        },
        change: {
            type: mongoose.Schema.Types.Mixed,
        },
        // Only the fields that changed. `before` is null for something new,
        // `after` is null for a deletion.
        before: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        after: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // What kind of row of the Publish dialog this was: a document that
        // was added or edited, what a place set about one (`override`), or a
        // reorder. An undo needs it to know where `before` goes back to.
        source: {
            type: mongoose.Schema.Types.String,
            enum: ["question", "category", "override", "order"],
        },
        // The row this one took back (POST /questionnaire/undo).
        undoOf: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    },
    // Not minimised: "this field was emptied" ({}) is itself the record, and
    // dropping it would make a cleared helper text look like no change.
    { timestamps: true, minimize: false }
);

historySchema.index({ version: -1, _id: -1 });
historySchema.index({ placeId: 1, version: -1 });

module.exports = mongoose.model(
    "questionnaire_history",
    historySchema,
    "questionnaire_history"
);
