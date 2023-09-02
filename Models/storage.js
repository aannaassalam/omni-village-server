const mongoose = require("mongoose");

const storageSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User id is required!"],
    ref: "User",
  },
  stock_name: {
    type: mongoose.Schema.Types.String,
    required: [true, "Stock name is required!"],
    unique: true,
  },
  storage_method_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "Storage method id is required!"],
    ref: "storage_method",
  },
  stock_quantity: {
    type: mongoose.Schema.Types.Number,
    required: [true, "Stock quantity is required!"],
  },
});

module.exports = mongoose.model("storage", storageSchema);
