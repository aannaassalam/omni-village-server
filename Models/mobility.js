const mongoose = require("mongoose");

const mobilitySchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model("mobility", mobilitySchema);
