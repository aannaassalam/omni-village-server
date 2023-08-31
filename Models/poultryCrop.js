const mongoose = require("mongoose");

const poultryCropSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a live stock name!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("poultry_crop", poultryCropSchema);
