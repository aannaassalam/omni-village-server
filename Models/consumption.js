const mongoose = require("mongoose");

const consumptionSchema = new mongoose.Schema(
  {
    consumption_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: "",
      // ref: "poultry_crop",
    },
    weight_measurement: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Weight measurement is required!",
      ],
      default: "",
    },
    consumption_crop_name: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    consumption_type_name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Consummption type name is required!"],
      default: "",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    total_quantity: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Number of live stocks is required!",
      ],
      default: "",
    },
    purchased_from_market: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Purchase from market is required",
      ],
      default: "",
    },
    purchased_from_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Purchase from neighbours is required",
      ],
      enum: ["days", "weeks", "months", "years"],
      default: "months",
    },
    self_grown: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Self grown is required is required",
      ],
      default: "",
    },
    status: {
      type: mongoose.Schema.Types.Number,
      default: 1,
      enum: [0, 1],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("consumption", consumptionSchema);
