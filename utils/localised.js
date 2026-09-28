const mongoose = require("mongoose");

const DEFAULT_LANGUAGE = "en";

/**
 * A localised string: `{ en: "...", ms: "...", dz: "..." }`.
 *
 * Stored as Mixed rather than a fixed {en,ms,dz} triple (the convention in the
 * 17 existing *-dropdown collections) so a new language is a data change, not a
 * schema migration — questions are targeted per country, and countries carry
 * their own `languages` list.
 *
 * `en` is required as the fallback: every other language may be missing, and a
 * missing translation renders in English rather than rendering blank.
 */
const localisedField = (fieldName) => ({
    type: mongoose.Schema.Types.Mixed,
    required: [true, `${fieldName} is required!`],
    validate: {
        validator(value) {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                return false;
            }
            if (
                typeof value[DEFAULT_LANGUAGE] !== "string" ||
                !value[DEFAULT_LANGUAGE].trim()
            ) {
                return false;
            }
            return Object.values(value).every(
                (entry) => typeof entry === "string"
            );
        },
        message: `${fieldName} must be an object of language codes with at least "${DEFAULT_LANGUAGE}"`,
    },
});

/** Same, but optional — used for helper text and descriptions. */
const optionalLocalisedField = () => ({
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
    validate: {
        validator(value) {
            if (value === null || value === undefined) return true;
            if (typeof value !== "object" || Array.isArray(value)) return false;
            return Object.values(value).every(
                (entry) => typeof entry === "string"
            );
        },
        message: "must be an object of language codes to strings",
    },
});

/**
 * Accepts either a plain string (treated as English) or an object, and returns
 * a clean localised object. Blank translations are dropped rather than stored,
 * so "missing" and "deliberately empty" never look the same.
 */
const normaliseLocalised = (input) => {
    if (input === null || input === undefined) return undefined;
    if (typeof input === "string") {
        return input.trim() ? { [DEFAULT_LANGUAGE]: input.trim() } : undefined;
    }
    if (typeof input !== "object" || Array.isArray(input)) return undefined;

    const out = {};
    Object.entries(input).forEach(([language, text]) => {
        if (typeof text === "string" && text.trim()) {
            out[language] = text.trim();
        }
    });
    return Object.keys(out).length > 0 ? out : undefined;
};

/** Resolves a localised value to one language, falling back to English. */
const localise = (value, language = DEFAULT_LANGUAGE) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return value[language] || value[DEFAULT_LANGUAGE] || "";
};

module.exports = {
    DEFAULT_LANGUAGE,
    localisedField,
    optionalLocalisedField,
    normaliseLocalised,
    localise,
};
