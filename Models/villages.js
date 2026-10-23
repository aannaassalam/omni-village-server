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
        // existing aggregation; this is what places it in the tree of places
        // (utils/places.js) and so decides which questionnaire it is asked.
        // Backfilled by scripts/backfill-country-ids.js
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "country",
            default: null,
        },
        // Additive. null = directly under its country, which is where every
        // village was before regions existed. See utils/places.js
        regionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "region",
            default: null,
        },
        // Empty = the languages of the nearest place above that has some.
        languages: {
            type: [mongoose.Schema.Types.String],
            default: [],
        },
    },
    { timestamps: true }
);

villageSchema.index({ countryId: 1 });
villageSchema.index({ regionId: 1 });

module.exports = mongoose.model("village", villageSchema);
