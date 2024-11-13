const mongoose = require("mongoose");

const businessCommercialSchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model(
    "business_commercial",
    businessCommercialSchema
);
