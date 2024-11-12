const mongoose = require("mongoose");

const housingByUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        total_numbers_of_house: {
            type: Number,
            default: null,
        },
        house_requirements: {
            type: Boolean,
            default: false,
        },
        housings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
                ref: "housing",
            },
        ],
        need_new_unit: {
            type: Boolean,
            default: false,
        },
        new_unit_purpose: {
            type: String,
            default: "",
        },
        new_unit_urgency: {
            type: String,
            default: "",
        },
        land_for_new_unit: {
            type: Boolean,
            default: false,
        },
        required_area: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("housing_by_user", housingByUserSchema);
