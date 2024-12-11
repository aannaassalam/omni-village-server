const mongoose = require("mongoose");

const communityOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    village_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "village",
    },
    town_hall: {
        type: Boolean,
        default: false,
    },
    town_hall_purpose: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    market: {
        type: Boolean,
        default: false,
    },
    how_many_market: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    bank: {
        type: Boolean,
        default: false,
    },
    how_many_bank: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    how_far_from_village_bank: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    health_care: {
        type: Boolean,
        default: false,
    },
    how_many_healthcare: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    how_far_from_village_healthcare: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    library: {
        type: Boolean,
        default: false,
    },
    how_many_library: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    museum: {
        type: Boolean,
        default: false,
    },
    how_many_museum: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    sports: {
        type: Boolean,
        default: false,
    },
    kind_of_sports: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    spiritual_retreats: {
        type: Boolean,
        default: false,
    },
    how_frequently: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    spiritual_sanctums: {
        type: Boolean,
        default: false,
    },
    how_many_sanctums: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    post_office: {
        type: Boolean,
        default: false,
    },
    how_many_post_offices: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    how_far_from_village_offices: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    sewage_treatment_facility: {
        type: Boolean,
        default: false,
    },
    how_many_sewage_treatment: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    sewage_type: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    composing_facility: {
        type: Boolean,
        default: false,
    },
    how_many_composing_facility: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    composing_type: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    recycling: {
        type: Boolean,
        default: false,
    },
    recycling_type: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    water_segregation: {
        type: Boolean,
        default: false,
    },
    level_of_segregation: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    mobility: {
        type: Boolean,
        default: false,
    },
    type_of_mobility: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    water_storage: {
        type: Boolean,
        default: false,
    },
    water_capacity: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    cold_storage: {
        type: Boolean,
        default: false,
    },
    cold_storage_type: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    cold_storage_capacity: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    energy_battery_house: {
        type: Boolean,
        default: false,
    },
    energy_battery_capacity: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    energy_battery_type: [
        {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    ],
    others: {
        type: String,
        default: "",
    },
    access_to_newspaper: {
        type: Boolean,
        default: false,
    },
});

module.exports = mongoose.model("community_officer", communityOfficerSchema);
