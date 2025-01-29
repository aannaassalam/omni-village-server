const mongoose = require("mongoose");

const energyDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "microgrid_type",
                "purpose_petrol",
                "purpose_diesel",
                "purpose_natural_gas",
                "source_of_fuels_used",
                "type_others",
                "purpose_others",
                "extent",
                "dropdown",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Energy dropdown name!"],
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

module.exports = mongoose.model("energy_dropdown", energyDropdownSchema);
