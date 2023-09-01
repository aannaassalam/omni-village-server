const mongoose = require("mongoose");

const huntingSchema = new mongoose.Schema(
  {
    hunting_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Tree Crop id is required!"],
      ref: "hunting_crop",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number_hunted: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Number hunted per year is required!"],
    },
    meat: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Meat is required"],
    },
    self_consumed: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Self Comsumption is required!"],
    },
    sold_to_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Sold to neighbours is required!"],
    },
    sold_in_consumer_market: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Sold in consumer market is required!"],
    },
    wastage: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Wastage is required!"],
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
      required: [true, "Income from sale is required!"],
    },
    expenditure_on_inputs: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Expenditure on inputs in required!"],
    },
    yeild: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Yeild is required!"],
    },
    processing_method: {
      type: mongoose.Schema.Types.Boolean,
      reqired: [true, "Processing method is it required?"],
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
