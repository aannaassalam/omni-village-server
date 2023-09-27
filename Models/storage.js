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
  },
  storage_method_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "storage_method",
  },
  storage_method_name: {
    type: mongoose.Schema.Types.String,
    default: "",
  },
  stock_quantity: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.storage_method_name.length > 0;
      },
      "Stock quantity is required!",
    ],
  },
});

module.exports = mongoose.model("storage", storageSchema);
