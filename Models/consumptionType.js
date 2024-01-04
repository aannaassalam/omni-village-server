const mongoose = require("mongoose");

const consumptionTypeSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: mongoose.Schema.Types.String,
        required: [true, "Consumption Type name is required!"],
        unique: true,
        set: (value) => value.toLowerCase(),
      },
      ms: {
        type: mongoose.Schema.Types.String,
        default: "",
        set: (value) => value.toLowerCase(),
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("consumption_type", consumptionTypeSchema);
