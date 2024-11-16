const mongoose = require("mongoose");

const energySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        type: {
            type: String,
            default: null,
            enum: [
                "electricity",
                "petrol",
                "diesel",
                "natural_gas",
                "other",
                "general_info",
            ],
        },
        electric_grid: {
            type: Boolean,
            default: false,
        },
        yearly_electricity_consumption: {
            type: Number,
            default: null,
        },
        yearly_expenditure_electricity: {
            type: Number,
            default: null,
        },
        electricity_stable: {
            type: Boolean,
            default: false,
        },
        microgrid_installed: {
            type: Boolean,
            default: false,
        },
        microgrid_type: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: "energy-dropdown",
        },
        usage: {
            type: Number,
            default: null,
        },
        installation_cost: {
            type: Number,
            default: null,
        },
        yearly_petrol_consumption: {
            type: Number,
            default: null,
        },
        yearly_expenditure_petrol: {
            type: Number,
            default: null,
        },
        purpose_petrol_used_for: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                    ref: "energy-dropdown",
                },
                quantity: {
                    type: Number,
                    default: null,
                },
            },
        ],
        source_of_fuels_used: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                    ref: "energy-dropdown",
                },
                purpose: [
                    {
                        type: mongoose.Schema.Types.ObjectId,
                        default: null,
                        ref: "energy-dropdown",
                    },
                ],
                expenditures: {
                    type: Number,
                    default: null,
                },
                capacity: {
                    type: Number,
                    default: null,
                },
            },
        ],
        energy_sufficient: {
            type: Boolean,
            default: false,
        },
        extent: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: "energy-dropdown",
        },
        status: {
            type: mongoose.Schema.Types.Number,
            default: 1,
            enum: [0, 1],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("energy", energySchema);
