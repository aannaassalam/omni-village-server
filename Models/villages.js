const mongoose = require("mongoose");

const villageSchema = new mongoose.Schema(
    {
        country: {
            type: mongoose.Schema.Types.String,
            required: [true, "Country is required!"],
            set: (value) => value.toLowerCase(),
        },
        name: {
            type: mongoose.Schema.Types.String,
            required: [true, "Village name is required!"],
            unique: true,
            set: (value) => value.toLowerCase(),
        },
        moderator_id: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("village", villageSchema);
