const mongoose = require("mongoose");

const treeSchema = new mongoose.Schema(
  {
    tree_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      // required: [true, "Tree Crop id is required!"],
      // ref: "tree_crop",
      default: "",
    },
    tree_crop_name: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number_of_trees: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Number of trees is required!",
      ],
      default: "",
    },
    avg_age_of_trees: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Average age of trees is required",
      ],
      enum: [
        "",
        "less than a year",
        "1 to 2 years",
        "2 to 3 years",
        "3 to 5 years",
      ],
      default: "",
    },
    soil_health: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Soil health is required!",
      ],
      set: (value) => value.toLowerCase(),
      enum: ["", "stable", "decreasing yield"],
      default: "",
    },
    decreasing_rate: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          this.soil_health === "decreasing yield";
        },
        "Soil decreasing field is required!",
      ],
      default: "",
    },
    type_of_fertilizer_used: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Type of fertilizer used is required!",
      ],
      set: (value) => value.toLowerCase(),
      enum: ["", "organic self made", "organic purchased", "chemical based"],
      default: "",
    },
    type_of_pesticide_used: {
      type: mongoose.Schema.Types.String,
      required: [
        function () {
          return this.status === 1;
        },
        "Type of pesticide used is required!",
      ],
      set: (value) => value.toLowerCase(),
      enum: ["", "organic self made", "organic purchased", "chemical based"],
      default: "",
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
        ref: "Tree_product",
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

module.exports = mongoose.model("Tree", treeSchema);
