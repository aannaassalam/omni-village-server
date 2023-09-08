const mongoose = require("mongoose");

const fishFeedSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Fish Feed name is required!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("fish_feed", fishFeedSchema);
