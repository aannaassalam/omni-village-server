const mongoose = require("mongoose");

const waterOfficerSchema = new mongoose.Schema({
    moderator_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    village_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "village",
    },
    water_source_available: [
        {
            type: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            condition: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            tapped_into: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            sustainable_yearly_supply: {
                type: Number,
                default: null,
            },
            yearly_consumption: {
                type: Number,
                default: null,
            },
            storage_capacity: {
                type: Number,
                default: null,
            },
            distribution_method: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            storage_method: {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
            },
            rate_of_replenishment: {
                type: Number,
                default: null,
            },
        },
    ],
    sewage_treatment: {
        type: Boolean,
        default: false,
    },
    capacity: {
        type: Number,
        default: null,
    },
    treated_water_discharged: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    number_of_houses: {
        type: Number,
        default: null,
    },
});

module.exports = mongoose.model("water_officer", waterOfficerSchema);
