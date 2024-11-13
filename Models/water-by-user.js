const mongoose = require("mongoose");

const waterByUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            unique: true,
            required: true,
        },
        cooking_and_drinking: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        sanitation_and_bathing: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        cleaning: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        irrigation: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        others: [
            {
                water_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "water",
                    default: null,
                },
                isDrafted: {
                    type: Boolean,
                    default: true,
                },
            },
        ],
        water_harvesting_capacity: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        waste_water_disposal: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
        general_information: {
            water_id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "water",
                default: null,
            },
            isDrafted: {
                type: Boolean,
                default: true,
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("water_by_user", waterByUserSchema);
