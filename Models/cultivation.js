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
    required: [true, "Crop id is required!"],
    ref: "Crop",
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User id is required!"],
    ref: "User",
  },
  area_allocated: {
    type: mongoose.Schema.Types.Number,
    required: [true, "Area allocated is required!"],
  },
  output: {
    type: mongoose.Schema.Types.Number,
    required: [true, "Output is required"],
  },
  weight_measurement: {
    type: mongoose.Schema.Types.String,
    default: "kg",
    enum: ["kg", "ton", "quintol"],
  },
  utilization: {
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
  },
  important_information: {
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
    description: {
      type: mongoose.Schema.Types.String,
      default: "",
    },
    yeild: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Yeild is required!"],
    },
    month_planted: {
      type: mongoose.Schema.Types.Date,
      required: [true, "Month Planted is required!"],
    },
    month_harvested: {
      type: mongoose.Schema.Types.Date,
      required: [true, "Month Harvested is required!"],
    },
    status: {
      type: mongoose.Schema.Types.Number,
      default: 1,
      enum: [0, 1],
    },
  },
});

module.exports = mongoose.model("Cultivation", cultivationSchema);
