const mongoose = require("mongoose");

const treeSchema = new mongoose.Schema(
  {
    tree_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Tree Crop id is required!"],
      ref: "tree_crop",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    number_of_trees: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Number of trees is required!"],
    },
    avg_age_of_trees: {
      type: mongoose.Schema.Types.String,
      required: [true, "Average age of trees is required"],
      enum: [
        "less than a year",
        "1 to 2 years",
        "2 to 3 years",
        "3 to 5 years",
      ],
    },
    soil_health: {
      type: mongoose.Schema.Types.String,
      required: [true, "Soil health is required!"],
      set: (value) => value.toLowerCase(),
      enum: ["stable", "decreasing yield"],
    },
    decreasing_rate: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          this.soil_health === "decreasing yield";
        },
        "Soil decreasing field is required!",
      ],
      default: 0,
    },
    type_of_fertilizer_used: {
      type: mongoose.Schema.Types.String,
      required: [true, "Type of fertilizer used is required!"],
      set: (value) => value.toLowerCase(),
      enum: ["organic self made", "organic purchased", "chemical based"],
    },
    type_of_pesticide_used: {
      type: mongoose.Schema.Types.String,
      required: [true, "Type of pesticide used is required!"],
      set: (value) => value.toLowerCase(),
      enum: ["organic self made", "organic purchased", "chemical based"],
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
