const fs = require("fs");
const path = require("path");

/**
 * The React Native app's i18next bundles are the only source of GENUINE
 * translations in this project.
 *
 * The `*-dropdown` collections look translated but are not: their controllers
 * backfill `ms: value.ms || value.en`, so ~100% of ms/dz values are English
 * copies. The app bundles, by contrast, are real human translations.
 *
 * They only cover the screens the app actually has (production and
 * consumption), so census sections stay English-only until someone translates
 * them in the dashboard.
 */
const DEFAULT_BUNDLE_DIR = path.join(
    __dirname,
    "..",
    "..",
    "omnivillage",
    "src",
    "i18next",
    "translations"
);

const normalise = (value) =>
    String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

const STOP_WORDS = new Set(["of", "the", "a", "for", "to", "in", "and", "used"]);

const tokenise = (value) =>
    normalise(value)
        .split(" ")
        .filter((word) => word && !STOP_WORDS.has(word))
        .map((word) => word.replace(/ies$/, "y").replace(/s$/, ""));

const similarity = (a, b) => {
    const left = new Set(tokenise(a));
    const right = new Set(tokenise(b));
    if (!left.size || !right.size) return 0;
    let shared = 0;
    left.forEach((token) => {
        if (right.has(token)) shared += 1;
    });
    return shared / Math.max(left.size, right.size);
};

/**
 * Loads every `<lang>.json` bundle and indexes them by both the i18next key
 * and the English value, since field names tend to match the key
 * ("soil_health" -> "soil health") while authored labels match the value.
 */
const loadAppTranslations = (dir = DEFAULT_BUNDLE_DIR) => {
    if (!fs.existsSync(dir)) return null;

    const bundles = {};
    fs.readdirSync(dir)
        .filter((file) => file.endsWith(".json"))
        .forEach((file) => {
            try {
                bundles[path.basename(file, ".json")] = JSON.parse(
                    fs.readFileSync(path.join(dir, file), "utf8")
                );
            } catch (err) {
                // A malformed bundle should degrade to "no translations",
                // never abort the seed.
            }
        });

    const english = bundles.en;
    if (!english) return null;

    const languages = Object.keys(bundles).filter((code) => code !== "en");
    const index = new Map();

    Object.keys(english).forEach((key) => {
        const entry = { en: english[key] || key };
        languages.forEach((code) => {
            const translated = bundles[code]?.[key];
            // Only keep a translation that is actually different from English;
            // an identical copy is an untranslated placeholder, not a value.
            if (translated && translated.trim() && translated !== entry.en) {
                entry[code] = translated;
            }
        });
        if (Object.keys(entry).length < 2) return; // English only — no value here

        index.set(normalise(key), entry);
        if (english[key]) index.set(normalise(english[key]), entry);
    });

    const keys = [...index.keys()];

    return {
        languages,
        size: index.size,
        /**
         * Exact match first, then a high-confidence fuzzy match. The threshold
         * is deliberately strict: a wrong translation is worse than none,
         * because nobody re-reads a field that already looks filled in.
         */
        lookup(label) {
            const wanted = normalise(label);
            if (index.has(wanted)) return index.get(wanted);

            let best = null;
            let bestScore = 0;
            keys.forEach((candidate) => {
                const score = similarity(wanted, candidate);
                if (score > bestScore) {
                    bestScore = score;
                    best = candidate;
                }
            });
            return bestScore >= 0.85 ? index.get(best) : null;
        },
    };
};

module.exports = { loadAppTranslations, DEFAULT_BUNDLE_DIR };
