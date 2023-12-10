const mongoose = require("mongoose");

const huntingSchema = new mongoose.Schema(
  {
    hunting_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Hunting Crop id is required!"],
      ref: "hunting_crop",
      default: "",
    },
    hunting_crop_name: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number_hunted: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Number hunted per year is required!",
      ],
      default: "",
    },
    meat: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Meat is required",
      ],
      default: "",
    },
    self_consumed: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Self Comsumption is required!",
      ],
      default: "",
    },
    sold_to_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Sold to neighbours is required!",
      ],
      default: "",
    },
    sold_in_consumer_market: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Sold in consumer market is required!",
      ],
      default: "",
    },
    wastage: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Wastage is required!",
      ],
      default: "",
    },
    other: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    other_value: {
      type: mongoose.Schema.Types.Number,
      default: 0,
    },
    income_from_sale: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Income from sale is required!",
      ],
      default: "",
    },
    expenditure_on_inputs: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Expenditure on inputs in required!",
      ],
      default: "",
    },
    yeild: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Yeild is required!",
      ],
      default: "",
    },
    processing_method: {
      type: mongoose.Schema.Types.Boolean,
      reqired: [
        function () {
          return this.status === 1;
        },
        "Processing method is it required?",
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

module.exports = mongoose.model("Hunting", huntingSchema);
