const mongoose = require("mongoose");

const waterOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "water_source",
                "condition",
                "tapped_into",
                "distribution_method",
                "storage_method",
                "treated_water_discharged",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Water officer dropdown name!"],
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
    "water_officer_dropdown",
    waterOfficerDropdownSchema
);
