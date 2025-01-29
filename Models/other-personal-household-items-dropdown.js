const mongoose = require("mongoose");

const PersonalHouseholdDropdownSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: [
                "personal_care",
                "personal_care_produce",
                "cleaning_products",
                "cleaning_products_produce",
                "office_supplies",
                "office_supplies_produce",
                "medicine",
                "medicine_produce",
                "kitchen_items",
                "kitchen_items_produce",
                "other_items",
                "other_items_produce",
                "dropdown",
            ],
            required: true,
        },
        name: {
            en: {
                type: mongoose.Schema.Types.String,
                required: [
                    true,
                    "Please Enter a Personal household dropdown name!",
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
    "other_personal_household_item_dropdown",
    PersonalHouseholdDropdownSchema
);
