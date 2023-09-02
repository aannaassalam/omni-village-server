const mongoose = require("mongoose");

const sellingChannelMethodSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Selling Channel name is required!"],
      unique: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "selling_channel_methods",
  sellingChannelMethodSchema
);
