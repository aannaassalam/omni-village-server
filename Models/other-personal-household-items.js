const mongoose = require("mongoose");

const otherPersonalHouseholdItemSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "personal_care_items",
                "cleaning_products",
                "office_supplies",
                "medicine",
                "kitchen_items",
                "other_items",
            ],
            default: null,
        },
        personal_care_item_use: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "personal_use_dropdown",
                default: null,
            },
        ],
        yearly_expense_for_personal_care: {
            type: Number,
            default: null,
        },
        items_produced_locally: {
            type: Boolean,
            default: false,
        },
        items_produces: [
            {
                type: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "personal_use_dropdown",
                    default: null,
                },
                quantity: {
                    type: Number,
                    default: null,
                },
                quantity_unit: {
                    type: String,
                    default: null,
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model(
    "other_personal_household_item",
    otherPersonalHouseholdItemSchema
);
