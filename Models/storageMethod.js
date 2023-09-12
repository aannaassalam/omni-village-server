const mongoose = require("mongoose");

const storageMethodSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a Storage method name!"],
      // unique: true,
      set: (value) => value.toLowerCase(),
    },
    type: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a Storage method type!"],
      // unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("storage_method", storageMethodSchema);
