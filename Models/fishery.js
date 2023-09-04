const mongoose = require("mongoose");

const fisherySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User id is required!"],
  },
  fishery_type: {
    type: mongoose.Schema.Types.String,
    required: [true, "Fishery type is required!"],
    enum: ["pond", "river"],
  },
  pond_name: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.fisher_type === "pond";
      },
      "Pond name is required!",
    ],
    default: "",
  },
  fish_crop_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "fish_crop",
    required: [true, "Fish Crop is required!"],
  },
  important_information: {
    number_of_fishes: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Number of fishes is required!"],
    },
    type_of_feed: {
      type: mongoose.Schema.Types.String,
      required: [true, "Type of feed is required!"],
    },
  },
  production_information: {
    total_feed: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Total Feed is required!"],
    },
    production_output: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Production output is required!"],
    },
    self_consumed: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Self consumed is required!"],
    },
    sold_to_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Sold to neighbours is required!"],
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
      type: mongoose.Schema.Types.Number,
      default: "",
    },
    other_value: {
      type: mongoose.Schema.Types.Number,
      default: "",
    },
    income_from_sale: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Income from sale is required!"],
    },
    expenditure_on_inputs: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Expenditure on inputs is required!"],
    },
    yeild: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Yeild is required!"],
    },
  },
  processing_method: {
    type: mongoose.Schema.Types.Boolean,
    required: [true, "Processing method is required!"],
  },
  status: {
    type: mongoose.Schema.Types.Number,
    default: 1,
    enum: [0, 1],
  },
});

module.exports = mongoose.model("fishery", fisherySchema);
