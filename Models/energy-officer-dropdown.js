const mongoose = require("mongoose");

const energyOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "type_of_energy_sources",
                "distribution_method",
                "distance_of_fuel_pumps",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Energy officer dropdown name!",
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
    "energy_officer_dropdown",
    energyOfficerDropdownSchema
);
