const mongoose = require("mongoose");

const sellingChannelsSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            required: [true, "User id is required!"],
            ref: "User",
        },
        local_market: { type: mongoose.Schema.Types.Boolean, default: false },
        broker: { type: mongoose.Schema.Types.Boolean, default: false },
        ecommerce: { type: mongoose.Schema.Types.Boolean, default: false },
        export: { type: mongoose.Schema.Types.Boolean, default: false },
        none: { type: mongoose.Schema.Types.Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("selling_channels", sellingChannelsSchema);
