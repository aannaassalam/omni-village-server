const mongoose = require("mongoose");

const feedSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Feed name is required!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("feed", feedSchema);
