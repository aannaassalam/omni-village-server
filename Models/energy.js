const mongoose = require("mongoose");

const energySchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model("energy", energySchema);
