const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
  {
    data: mongoose.Schema.Types.Map,
  },
  { timestamps: true }
);

module.exports = mongoose.model("webhook", webhookSchema);
