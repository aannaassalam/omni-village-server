const mongoose = require("mongoose");

const otherPersonalHouseholdItemSchema = new mongoose.Schema(
    {},
    { timestamps: true }
);

module.exports = mongoose.model(
    "other_personal_household_item",
    otherPersonalHouseholdItemSchema
);
