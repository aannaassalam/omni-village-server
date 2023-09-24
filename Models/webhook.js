const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema(
  {
    data: mongoose.Schema.Types.String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("webhook", webhookSchema);
