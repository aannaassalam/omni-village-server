const mongoose = require("mongoose");

const treeProductSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Product name is required!"],
    },
    production_output: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Production output is required!"],
    },
    tree_crop_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Tree Crop id is required!"],
      ref: "tree_crop",
    },
    self_consumed: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Self Comsumption is required!"],
    },
    fed_to_livestock: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Fed to Livestock is required!"],
    },
    sold_to_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Sold to neighbour is required!"],
    },
    sold_for_industrial_use: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Sold for industrial use is required!"],
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
    month_harvested: {
      type: mongoose.Schema.Types.Date,
      required: [true, "Month Harvested is required!"],
    },
    processing_method: {
      type: mongoose.Schema.Types.Boolean,
      reqired: [true, "Processing method is it required?"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tree_product", treeProductSchema);
