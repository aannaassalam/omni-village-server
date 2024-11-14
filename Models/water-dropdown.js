const mongoose = require("mongoose");

const waterDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "yearly_consumption",
                "sourced_from",
                "water_quality",
                "type_of_harvesting",
                "wastewater",
                "water_recycling",
                "severity",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Water dropdown name!"],
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

module.exports = mongoose.model("water_dropdown", waterDropdownSchema);
