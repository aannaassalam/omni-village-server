const mongoose = require("mongoose");

const sellingChannelsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User id is required!"],
      ref: "User",
    },
    selling_channel_names: [
      { type: mongoose.Schema.Types.String, default: "" },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("selling_channels", sellingChannelsSchema);
