const mongoose = require("mongoose");

const weightMeasurementSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Weight Measurement name is required!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
    unit_to_cm: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Weight Measurement unit is required!"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("weight_measurement", weightMeasurementSchema);
