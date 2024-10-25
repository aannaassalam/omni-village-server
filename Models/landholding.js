const mongoose = require("mongoose");

const landholdingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        total_number_of_land: {
            type: Number,
            default: null,
        },
        land_own_inside_village: {
            type: Number,
            default: null,
        },
        land_own_outside_village: {
            type: Number,
            default: null,
        },
        geotag: {
            type: String,
            default: null,
        },
        total_area: {
            type: Number,
            default: null,
        },
        land_requirement: {
            type: Boolean,
            default: false,
        },
        land_requirement_area: {
            type: Number,
            default: null,
        },
        and_requirement_purpose: {
            type: String,
            default: null,
        },
        and_requirement_urgency: {
            type: String,
            default: null,
        },
        total_village_area_allocated: {
            type: Number,
            default: null,
        },
        total_area_for_community: {
            type: Number,
            default: null,
        },
        land_own_by_residents: {
            type: Number,
            default: null,
        },
        freehold_village_land: {
            type: Number,
            default: null,
        },
        status: {
            type: mongoose.Schema.Types.Number,
            default: 0,
            required: [
                true,
                "Status is required!(0 - from user & 1 - from admin or approved)",
            ],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("landholding", landholdingSchema);
