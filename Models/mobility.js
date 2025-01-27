const mongoose = require("mongoose");

const mobilitySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        type: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            ref: "mobility-dropdown",
        },
        distance_travelled_within_village: {
            type: Number,
            default: null,
        },
        distance_travelled_outside: {
            type: Number,
            default: null,
        },
        purpose_use_of_vehicle: [
            {
                type: String,
                default: null,
            },
        ],
        frequency_of_usage: {
            type: String,
            default: null,
        },
        status: {
            type: Number,
            default: 1,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("mobility", mobilitySchema);
