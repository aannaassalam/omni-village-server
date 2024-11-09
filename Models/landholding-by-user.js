const mongoose = require("mongoose");

const landholdingByUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        total_numbers_of_lands: {
            type: Number,
            default: null,
        },
        land_requirements: {
            type: Boolean,
            default: false,
        },
        landholdings: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
                ref: "landholding",
            },
        ],
        required_area: {
            type: Number,
            default: null,
        },
        purpose_for_required_land: {
            type: String,
            default: "",
        },
        urgency_required_land: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("landholding_by_user", landholdingByUserSchema);
