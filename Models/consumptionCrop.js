const mongoose = require("mongoose");

const consumptionCropSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a consumption crop name!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
    consumption_type_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "consumption_type",
      default: "",
      required: [true, "consumption type id is required!"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("consumption_crop", consumptionCropSchema);
