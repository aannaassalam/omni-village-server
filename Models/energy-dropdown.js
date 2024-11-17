const mongoose = require("mongoose");

const waterDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "microgrid_type",
                "purpose_petrol",
                "type_others",
                "purpose_others",
                "extent",
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

module.exports = mongoose.model("water_dropdown", waterDropdownSchema);
