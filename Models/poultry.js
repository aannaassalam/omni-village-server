const mongoose = require("mongoose");

const poultrySchema = new mongoose.Schema(
  {
    poultry_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Poultry Crop id is required!"],
      ref: "poultry_crop",
      default: "",
    },
    poultry_crop_name: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Number of live stocks is required!",
      ],
      default: "",
    },
    avg_age_of_live_stocks: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Average age of live stock is required",
      ],
      default: "",
    },
    avg_age_time_period: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Average age time period is required",
      ],
      enum: ["days", "weeks", "months", "years"],
      default: "months",
    },
    type_of_feed: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Type of feed is required",
      ],
      default: "",
    },
    other_type_of_feed: {
      type: mongoose.Schema.Types.String,
      default: "",
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
    personal_information: {
      total_feed: {
        type: mongoose.Schema.Types.Number,
        required: [
          function () {
            return this.status === 1;
          },
          "Total feed is required!",
        ],
        default: "",
      },
      self_produced: {
        type: mongoose.Schema.Types.Number,
        required: [
          function () {
            return this.status === 1;
          },
          "Self produced is required!",
        ],
        default: "",
      },
      neighbours: {
        type: mongoose.Schema.Types.Number,
        required: [
          function () {
            return this.status === 1;
          },
          "Neighbours is required!",
        ],
        default: "",
      },
      purchased_from_market: {
        type: mongoose.Schema.Types.Number,
        required: [
          function () {
            return this.status === 1;
          },
          "Purchased from market is required!",
        ],
        default: "",
      },
      other: {
        type: mongoose.Schema.Types.String,
        default: "",
      },
      other_value: {
        type: mongoose.Schema.Types.Number,
        default: "",
      },
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
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Poultry_product",
      },
    ],
    steroids: {
      type: mongoose.Schema.Types.Boolean,
      required: [
        function () {
          return this.status === 1;
        },
        "Steroids used field is required!",
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

module.exports = mongoose.model("Poultry", poultrySchema);
