const mongoose = require("mongoose");

const landMeasurementSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Land Measurement name is required!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
    symbol: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("land_measurement", landMeasurementSchema);
