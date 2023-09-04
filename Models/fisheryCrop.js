const mongoose = require("mongoose");

const fisheryCropSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a fish name!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("fishery_crop", fisheryCropSchema);
