const mongoose = require("mongoose");

const demographicOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["issues_determine_villagers_vote"],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Demographic officer dropdown name!",
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
    "demographic_officer_dropdown",
    demographicOfficerDropdownSchema
);
