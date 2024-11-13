const mongoose = require("mongoose");

const forestrySchema = new mongoose.Schema({}, { timestamps: true });

module.exports = mongoose.model("forestry", forestrySchema);
