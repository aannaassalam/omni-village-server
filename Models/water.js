const mongoose = require("mongoose");

const waterSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                "cooking_and_drinking",
                "sanitation_and_bathing",
                "cleaning",
                "irrigation",
                "others",
                "water_harvesting_capacity",
                "waste_water_disposal",
                "general_information",
            ],
        },
        yearly_consumption: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        water_sourced_from: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        ],
        water_quality: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        expense: {
            type: Number,
            default: null,
        },
        other_name: {
            type: String,
            default: null,
        },
        type_of_harvesting: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                },
                capacity: {
                    type: Number,
                    default: null,
                },
            },
        ],
        other_harvesting: {
            type: String,
            default: null,
        },
        wastewater_disposal_methods: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        ],
        water_recycle: {
            type: Boolean,
            default: false,
        },
        water_recycling_methods: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
        ],
        other_recycling: {
            type: String,
            default: null,
        },
        water_meter: {
            type: Boolean,
            default: false,
        },
        water_scarcity: {
            type: Boolean,
            default: false,
        },
        water_scarcity_severity: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        months_of_year_of_scarcity: [
            {
                type: String,
                default: null,
            },
        ],
        status: {
            type: mongoose.Schema.Types.Number,
            default: 1,
            enum: [0, 1],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("water", waterSchema);
