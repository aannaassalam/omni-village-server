const mongoose = require("mongoose");

const businessDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "type_of_business",
                "segment_served",
                "legal_structure",
                "raw_materials",
                "fuel_sources",
                "type_of_infrastructure",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Mobility dropdown name!"],
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

module.exports = mongoose.model("business_dropdown", businessDropdownSchema);
