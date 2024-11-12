const mongoose = require("mongoose");

const housingDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["type", "amenities", "urgency", "equipment", "furnishing"],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Housing dropdown name!"],
                unique: true,
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

module.exports = mongoose.model("housing_dropdown", housingDropdownSchema);
