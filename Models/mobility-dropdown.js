const mongoose = require("mongoose");

const mobilityDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["methods_of_mobility", "type_of_vehicles"],
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

module.exports = mongoose.model("mobility_dropdown", mobilityDropdownSchema);
