const mongoose = require("mongoose");

const housingSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        name_of_the_house: {
            type: String,
            default: "",
        },
        type_of_house: {
            type: Number,
            default: null,
        },
        land_utilised_for_family_housing: {
            type: Number,
            default: null,
        },
        no_of_units_built: {
            type: Number,
            default: null,
        },
        total_built_area: {
            type: Number,
            default: null,
        },
        no_of_floors: {
            type: Number,
            default: null,
        },
        living_area: {
            type: Number,
            default: false,
        },
        year_built: {
            type: Number,
            default: null,
        },
        year_renovated: {
            type: String,
            default: null,
        },
        year_last_expanded: {
            type: Date,
            default: null,
        },
        type: {
            type: String,
            default: "",
        },
        front_photo: {
            type: String,
            default: null,
        },
        back_photo: {
            type: String,
            default: null,
        },
        neighbourhood_photo: {
            type: String,
            default: null,
        },
        inside_living_photo: {
            type: String,
            default: null,
        },
        kitchen_photo: {
            type: String,
            default: null,
        },
        amenities: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "housing_dropdown",
                default: null,
            },
        ],
        equipment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "housing_dropdown",
            default: null,
        },
        furnishing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "housing_dropdown",
            default: null,
        },
        renovation_requirement: {
            type: Boolean,
            default: false,
        },
        renovation_urgency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "housing_dropdown",
            default: null,
        },
        expansion_requirement: {
            type: Boolean,
            default: false,
        },
        expansion_urgency: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "housing_dropdown",
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
