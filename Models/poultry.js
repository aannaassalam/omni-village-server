const mongoose = require("mongoose");

const poultrySchema = new mongoose.Schema(
  {
    poultry_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Poultry Crop id is required!"],
      ref: "poultry_crop",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Number of live stocks is required!"],
    },
    avg_age_of_live_stocks: {
      type: mongoose.Schema.Types.number,
      required: [true, "Average age of live stock is required"],
    },
    avg_age_time_period: {
      type: mongoose.Schema.Types.String,
      required: [true, "Average age time period is required"],
      enum: [
        "days",
        "weeks",
        "months",
        "years",
      ],
    },
    type_of_feed: {
      type: mongoose.Schema.Types.String,
      required: [true, "Type of feed is required"],
    },
    other_type_of_feed:{
      type: mongooose.Schema.Types.String,
      default: ""
    },
    income_from_sale: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Income from sale is required!"],
    },
    expenditure_on_inputs: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Expenditure on inputs in required!"],
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poultry_product",
      },
    ],
    status: {
      type: mongoose.Schema.Types.Number,
      default: 1,
      enum: [0, 1],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Poultry", poultrySchema);
