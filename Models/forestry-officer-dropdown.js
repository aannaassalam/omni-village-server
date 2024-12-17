const mongoose = require("mongoose");

const forestryOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "type_of_forest_accessible",
                "condition_of_forest_accessible",
                "incident_of_forest_fire",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Forestry officer dropdown name!",
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
    "forestry_officer_dropdown",
    forestryOfficerDropdownSchema
);
