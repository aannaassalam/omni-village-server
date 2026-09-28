const mongoose = require("mongoose");

const countrySchema = new mongoose.Schema(
    {
        // Lowercased so it stays the join key back to the existing free-text
        // `villages.country` / `user.country` strings. Do not change the casing.
        name: {
            type: mongoose.Schema.Types.String,
            required: [true, "Country name is required!"],
            unique: true,
            set: (value) => value.toLowerCase(),
        },
        display_name: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        iso2: {
            type: mongoose.Schema.Types.String,
            default: "",
            set: (value) => (value || "").toUpperCase(),
        },
        // Digits only, no "+" — matched against user.country_code with the
        // non-digits stripped. See utils/geoResolver.js
        phone_code: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        currency: {
            type: mongoose.Schema.Types.String,
            default: "",
        },
        // Language codes questions should be authored in for this country.
        // The dashboard renders one input per language across all countries.
        languages: {
            type: [mongoose.Schema.Types.String],
            default: ["en"],
        },
        active: {
            type: mongoose.Schema.Types.Boolean,
            default: true,
        },
        order: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
    },
    { timestamps: true }
);

countrySchema.index({ phone_code: 1 });
countrySchema.index({ active: 1, order: 1 });

module.exports = mongoose.model("country", countrySchema);
