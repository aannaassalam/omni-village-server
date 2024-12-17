const mongoose = require("mongoose");

const businessOfficerDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["loan_lending_organizations", "main_use_of_loans"],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Business officer dropdown name!",
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
    "business_officer_dropdown",
    businessOfficerDropdownSchema
);
