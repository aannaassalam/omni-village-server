const mongoose = require("mongoose");

const businessByUserSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        other_business_apart_farming: {
            type: Boolean,
            default: false,
        },
        plan_to_start_business: {
            type: Boolean,
            default: false,
        },
        business_wish_to_start: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "business_dropdown",
            default: null,
        },
        require_land: {
            type: String,
            default: "no",
            enum: ["yes", "no"],
        },
        land_already_owned: {
            type: String,
            default: "no",
            enum: ["yes", "no"],
        },
        purpose_of_business: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("business_by_user", businessByUserSchema);
