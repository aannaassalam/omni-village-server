const mongoose = require("mongoose");

const cultivationSchema = new mongoose.Schema({
  season: {
    type: mongoose.Schema.Types.Number,
    required: [true, "Season is required while adding cultivation data!"],
  },
  cultivation_type: {
    type: mongoose.Schema.Types.Number,
    required: [true, "Cultivation type is required!"],
  },
  crop_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: "",
    // required: [true, "Crop id is required!"],
    // ref: "Crop",
  },
  crop_name: {
    type: mongoose.Schema.Types.String,
    // required: [true, "Crop id is required!"],
    default: "",
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User id is required!"],
    ref: "User",
  },
  area_allocated: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.status === 1;
      },
      "Area allocated is required!",
    ],
    default: "",
  },
  output: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.status === 1;
      },
      "Output is required",
    ],
    default: "",
  },
  weight_measurement: {
    type: mongoose.Schema.Types.String,
    default: "kilogram",
  },
  utilization: {
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
    fed_to_livestock: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Fed to Livestock is required!",
      ],
      default: "",
    },
    sold_to_neighbours: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Sold to neighbour is required!",
      ],
      default: "",
    },
    sold_for_industrial_use: {
      type: mongoose.Schema.Types.Number,
      required: [
        function () {
          return this.status === 1;
        },
        "Sold for industrial use is required!",
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
      default: "",
    },
  },
  important_information: {
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
          return this.soil_health === "decreasing yield";
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
    description: {
      type: mongoose.Schema.Types.String,
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
    month_planted: {
      type: mongoose.Schema.Types.Date,
      required: [
        function () {
          return this.status === 1;
        },
        "Month Planted is required!",
      ],
      default: "",
    },
    month_harvested: {
      type: mongoose.Schema.Types.Date,
      required: [
        function () {
          return this.status === 1;
        },
        "Month Harvested is required!",
      ],
      default: "",
    },
    status: {
      type: mongoose.Schema.Types.Number,
      default: 1,
      enum: [0, 1],
    },
  },
});

module.exports = mongoose.model("Cultivation", cultivationSchema);
