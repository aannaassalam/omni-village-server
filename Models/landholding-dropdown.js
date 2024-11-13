const mongoose = require("mongoose");

const landholdingDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "purpose",
                "status",
                "purpose_requirement",
                "urgency_requirement",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [true, "Please Enter a Landholding dropdown name!"],
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
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "landholding_dropdown",
    landholdingDropdownSchema
);
