const mongoose = require("mongoose");

const fishFeedSchema = new mongoose.Schema(
  {
    name: {
      en: {
        type: mongoose.Schema.Types.String,
        required: [true, "Please Enter a Fish Feed name!"],
        unique: true,
        set: (value) => value.toLowerCase(),
      },

      ms: {
        type: mongoose.Schema.Types.String,
        default: "",
        // unique: true,
        set: (value) => value.toLowerCase(),
      },
    },
    country: [
      {
        type: mongoose.Schema.Types.String,
        default: "India",
        required: [true, "Country of Crop origin is required!"],
        set: (value) => value.toLowerCase(),
      },
    ],
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

module.exports = mongoose.model("fish_feed", fishFeedSchema);
