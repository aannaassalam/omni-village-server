const mongoose = require("mongoose");
const {
    localisedField,
    optionalLocalisedField,
} = require("../utils/localised");
const { AUDIENCES } = require("../utils/audience");

/**
 * A tree: category -> subcategory -> screen. Only `is_screen` nodes carry
 * questions and produce response documents; everything above is navigation.
 *
 * `path` is a materialised path (ancestors, root-first, excluding self) so
 * "everything under X" is one indexed $match instead of a $graphLookup.
 */
const categorySchema = new mongoose.Schema(
    {
        // Display copy — deliberately NOT lowercased, unlike dropdown names.
        title: localisedField("Category title"),
        description: optionalLocalisedField(),
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "category",
            default: null,
        },
        path: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "category",
            },
        ],
        depth: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
        is_screen: {
            type: mongoose.Schema.Types.Boolean,
            default: false,
        },
        order: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
        active: {
            type: mongoose.Schema.Types.Boolean,
            default: true,
        },
        // Whose questionnaire it is part of: the villagers', or the field
        // officers' (utils/audience.js). Set when a top-level category is
        // created and never changed; a category inside another takes its
        // parent's, so a whole tree is one audience's. A category saved
        // before this field has none and is the villagers': every reader is
        // lean, so ask audienceOf / categoryFilter, never the field itself.
        // Not indexed on purpose: there are a few dozen categories, and a
        // filtered read then comes back in the order an unfiltered one does.
        audience: {
            type: mongoose.Schema.Types.String,
            enum: AUDIENCES,
            default: "villager",
        },

        /* ---- Drafts and ownership: the same fields, with the same meaning,
           as Models/questions.js. See utils/drafts.js ---- */

        ownerPlaceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        unpublished: {
            type: mongoose.Schema.Types.Boolean,
        },
        draft: {
            type: mongoose.Schema.Types.Mixed,
        },
        hasDraft: {
            type: mongoose.Schema.Types.Boolean,
            default: false,
        },
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
    { timestamps: true }
);

categorySchema.index({ parentId: 1, order: 1 });
categorySchema.index({ path: 1 });
categorySchema.index({ active: 1, is_screen: 1 });

module.exports = mongoose.model("category", categorySchema);
