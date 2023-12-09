const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: mongoose.Schema.Types.String,
        required: [true, "Please Enter a cultivation crop name!"],
        unique: true,
        set: (value) => value.toLowerCase(),
      },

      ms: {
        type: mongoose.Schema.Types.String,
        default: "",
        // unique: true,
        set: (value) => value.toLowerCase(),
      },

      // dz: {
      //   type: mongoose.Schema.Types.String,
      //   default: "",
      //   // unique: true,
      //   set: (value) => value.toLowerCase(),
      // },

      // hi: {
      //   type: mongoose.Schema.Types.String,
      //   default: "",
      //   // unique: true,
      //   set: (value) => value.toLowerCase(),
      // },
    },
    // name: {
    //   type: mongoose.Schema.Types.String,
    //   required: [true, "Please Enter a consumption crop name!"],
    //   // unique: true,
    //   set: (value) => value.toLowerCase(),
    // },
    // category: {
    //   type: mongoose.Schema.Types.Boolean,
    //   required: [true, "Please specify if its a category or not!"],
    // },
    // categoryId: {
    //   type: mongoose.Schema.Types.String,
    //   ref: "Crop",
    //   default: "",
    //   required: [
    //     function () {
    //       return this.category === 0;
    //     },
    //     "Crop category id is required!",
    //   ],
    // },
    country: [
      {
        type: mongoose.Schema.Types.String,
        default: "India",
        required: [true, "Country of Crop origin is required!"],
        set: (value) => value.toLowerCase(),
      },
    ],
    label: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "consumption_type",
    },
    status: {
      type: mongoose.Schema.Types.Number,
      default: 0,
      required: [
        true,
        "Status is required!(0 - from user & 1 - from admin or approved)",
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
