const mongoose = require("mongoose");

/**
 * What sits between a country and its villages: a state, a district or a
 * sub-district. Optional at every step — a village may hang directly off its
 * country, or off any region.
 *
 * Read it through utils/places.js, which puts countries, regions and villages
 * in one tree. Nothing else should query this collection directly.
 */
const regionSchema = new mongoose.Schema(
    {
        // Display copy, kept as typed: unlike a village's name, nothing joins
        // on it.
        name: {
            type: mongoose.Schema.Types.String,
            required: [true, "Region name is required!"],
            trim: true,
        },
        level: {
            type: mongoose.Schema.Types.String,
            enum: ["state", "district", "sub_district"],
            required: [true, "Region level is required!"],
        },
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "country",
            required: [true, "Country id is required!"],
        },
        // null = directly under the country.
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "region",
            default: null,
        },
        // The REGIONS above this one, root first, self excluded. The country
        // is not in it: utils/places.js puts it in front.
        path: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "region",
            },
        ],
        // Empty = the languages of the nearest place above that has some.
        languages: {
            type: [mongoose.Schema.Types.String],
            default: [],
        },
    },
    { timestamps: true }
);

// Two places may share a name as long as they are not side by side.
regionSchema.index({ countryId: 1, parentId: 1, name: 1 }, { unique: true });
regionSchema.index({ path: 1 });

module.exports = mongoose.model("region", regionSchema);
