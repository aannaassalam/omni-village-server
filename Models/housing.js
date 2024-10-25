const mongoose = require("mongoose");

const housingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        land_utilised_main_family_housing: {
            type: Number,
            default: null,
        },
        number_of_units_built: {
            type: Number,
            default: null,
        },
        total_built_up_area: {
            type: Number,
            default: null,
        },
        no_of_floors: {
            type: Number,
            default: null,
        },
        living_area: {
            type: Number,
            default: null,
        },
        year_built: {
            type: Number,
            default: false,
        },
        year_last_renovated: {
            type: Number,
            default: null,
        },
        year_last_expanded: {
            type: String,
            default: null,
        },
        photos: [
            {
                type: String,
                default: null,
            },
        ],
        amenities: [
            {
                type: String,
                default: null,
            },
        ],
        household_needs: {
            type: String,
            default: null,
        },
        land_utilised_for_farmhouses: {
            type: Number,
            default: null,
        },
        land_utilised_for_farmhouses: {
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

module.exports = mongoose.model("housing", housingSchema);
