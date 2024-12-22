const mongoose = require("mongoose");

const mobilityOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "mobility_requirements",
                "frequency_of_road_damage",
                "connectivity_to_healthcare_facilities",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Mobility officer dropdown name!",
                ],
                set: (value) => value.toLowerCase(),
            },

            ms: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },

            dz: {
                type: mongoose.Schema.Types.String,
                default: "",
                // unique: true,
                set: (value) => value.toLowerCase(),
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "mobility_officer_dropdown",
    mobilityOfficerDropdownSchema
);
