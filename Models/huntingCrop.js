const mongoose = require("mongoose");

const huntingCropSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: mongoose.Schema.Types.String,
        required: [true, "Please Enter a hunting crop name!"],
        unique: true,
        set: (value) => value.toLowerCase(),
      },

      ms: {
        type: mongoose.Schema.Types.String,
        default: "",
        // unique: true,
        set: (value) => value.toLowerCase(),
      },

      dz: {
        type: mongoose.Schema.Types.String,
        default: "",
        // unique: true,
        set: (value) => value.toLowerCase(),
      },

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
    ideal_consumption_per_person: {
      type: mongoose.Schema.Types.Number,
      default: 0,
      required: [true, "Ideal Consumption Per Person is required"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("hunting_crop", huntingCropSchema);
