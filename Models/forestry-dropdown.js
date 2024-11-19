const mongoose = require("mongoose");

const forestryDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "other_produce_from_forest",
                "general_purpose",
                "timber_needs_purpose",
                "timber_needs_urgency",
                "other_needs_purpose",
                "other_needs_urgency",
                "other_needs_type",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a forestry dropdown name!"],
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

module.exports = mongoose.model("forestry_dropdown", forestryDropdownSchema);
