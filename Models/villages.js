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
        // Additive. The `country` string above stays the join key for every
        // existing aggregation; this is only used by questionnaire targeting.
        // Backfilled by scripts/backfill-country-ids.js
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "country",
            default: null,
        },
    },
    { timestamps: true }
);

villageSchema.index({ countryId: 1 });

module.exports = mongoose.model("village", villageSchema);
