const mongoose = require("mongoose");

const businessCommercialSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        business_name: {
            type: String,
            default: null,
        },
        business_type: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_dropdown",
            default: null,
        },
        other_type: {
            type: String,
            default: null,
        },
        year_started: {
            type: Number,
            default: null,
        },
        brief_description: {
            type: String,
            default: null,
        },
        segment_served: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_dropdown",
            default: null,
        },
        location: {
            type: String,
            default: null,
        },
        land_area_utilised: {
            type: Number,
            default: null,
        },
        built_up_area: {
            type: Number,
            default: null,
        },
        total_employee: {
            type: Number,
            default: null,
        },
        coworker_inside_village: {
            type: Number,
            default: null,
        },
        coworker_outside_village: {
            type: Number,
            default: null,
        },
        legal_structure: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_dropdown",
            default: null,
        },
        annual_turnover: {
            type: Number,
            default: null,
        },
        made_profit: {
            type: Boolean,
            default: false,
        },
        total_profit: {
            type: Number,
            default: null,
        },
        total_loss: {
            type: Number,
            default: null,
        },
        investment_need_so_far: {
            type: Number,
            default: null,
        },
        water_consumption: {
            type: Number,
            default: null,
        },
        energy_consumption: {
            type: Number,
            default: null,
        },
        raw_material_consumption: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "business_dropdown",
                    default: null,
                },
                quantity: {
                    type: Number,
                    default: null,
                },
                quantity_unit: {
                    type: String,
                    default: null,
                },
                raw_consumption_unit: {
                    type: String,
                    default: null,
                },
            },
        ],
        fuel_source: [
            {
                item: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "business_dropdown",
                    default: null,
                },
                quantity: {
                    type: Number,
                    default: null,
                },
                quantity_unit: {
                    type: String,
                    default: null,
                },
                fuel_source_unit: {
                    type: String,
                    default: null,
                },
            },
        ],
        type_of_infrastructure: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "business_dropdown",
                default: null,
            },
        ],
        machine_equipment_installed: {
            type: String,
            default: null,
        },
        skill_requirement: {
            type: Boolean,
            default: false,
        },
        type_of_skill: {
            type: String,
            default: null,
        },
        skill_urgency: {
            type: String,
            default: null,
        },
        manpower_requirement: {
            type: Boolean,
            default: false,
        },
        number_of_manpower: {
            type: Number,
            default: null,
        },
        manpower_urgency: {
            type: String,
            default: null,
        },
        equipment_requirement: {
            type: Boolean,
            default: false,
        },
        equipment_type: {
            type: String,
            default: null,
        },
        equipment_urgency: {
            type: String,
            default: null,
        },
        other: {
            type: String,
            default: null,
        },
        urgency: {
            type: String,
            default: null,
        },
        status: {
            type: mongoose.Schema.Types.Number,
            default: 1,
            enum: [0, 1],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "business_commercial",
    businessCommercialSchema
);
