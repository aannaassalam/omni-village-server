const { types } = require("joi");
const mongoose = require("mongoose");

const mobilitySchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        methods_of_mobility: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "mobility_dropdown",
                default: null,
            },
        ],
        access_to_public_transport: {
            type: String,
            enum: ["yes", "no"],
            default: "yes",
            set: (value) => value.toLowerCase(),
        },
        number_of_vehicles: {
            type: Number,
            default: 0,
        },
        vehicle_requirement: {
            type: Boolean,
            default: false,
        },
        mobilities: [
            {
                type: mongoose.Schema.Types.ObjectId,
                default: null,
                ref: "mobility",
            },
        ],
        vehicles_needed: [
            {
                purpose: {
                    type: String,
                    default: null,
                    // ref: "mobility_dropdown",
                },
                vehicle_type: {
                    type: String,
                    default: null,
                },
                urgency: {
                    type: String,
                    default: null,
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("mobility-by-user", mobilitySchema);
