const mongoose = require("mongoose");

const businessOfficerSchema = new mongoose.Schema(
    {
        moderator_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        village_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "village",
        },
        organisation_not_owned_by_villagers: {
            type: Boolean,
            default: false,
        },
        how_many_establishment: [
            {
                name: {
                    type: String,
                    default: "",
                },
                type: {
                    type: String,
                    default: "",
                },
                purpose: {
                    type: String,
                    default: "",
                },
                year_started: {
                    type: Number,
                    default: null,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("business_officer", businessOfficerSchema);
