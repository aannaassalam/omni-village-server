const mongoose = require("mongoose");

const forestrySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        type: {
            type: String,
            default: null,
            enum: ["general", "timber_needs", "other_needs"],
        },
        land_owned_under_forest_cover: {
            type: Number,
            default: null,
        },
        timber_logs_harvested: {
            type: Number,
            default: null,
        },
        own_forest_cover_land: {
            type: Number,
            default: null,
        },
        community_forest: {
            type: Number,
            default: null,
        },
        other_produced_harvested_from_forest: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "forestry_dropdown",
                    default: null,
                },
                quantity: {
                    type: Number,
                    default: null,
                },
                purpose: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "forestry_dropdown",
                        default: null,
                    },
                ],
            },
        ],
        timber_needs: {
            type: Boolean,
            default: false,
        },
        quantity: {
            type: Number,
            default: null,
        },
        purpose: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "forestry_dropdown",
                default: null,
            },
        ],
        urgency: {
            type: String,
            default: null,
        },
        unfulfilled_forest_needs: {
            type: Boolean,
            default: false,
        },
        forestry_type: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "forestry_dropdown",
                    default: null,
                },
                quantity: {
                    type: Number,
                    default: null,
                },
                purpose: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "forestry_dropdown",
                        default: null,
                    },
                ],
                urgency: {
                    type: String,
                    default: null,
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("forestry", forestrySchema);
