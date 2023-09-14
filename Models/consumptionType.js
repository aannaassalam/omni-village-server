const mongoose = require("mongoose");

const consumptionTypeSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Consumption Type name is required!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("consumption_type", consumptionTypeSchema);