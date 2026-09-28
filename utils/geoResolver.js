const Countries = require("../Models/countries");
const Villages = require("../Models/villages");

/**
 * Resolves a caller's geography for question targeting.
 *
 * Nothing is written to the users collection — `user.country_code` and
 * `user.village_name` are read per request. Both joins are best-effort:
 * country_code formats are unvalidated ("+91" / "91" / "091"), and
 * `user.village_name` is free text that is not constrained to match
 * `villages.name`. scripts/backfill-country-ids.js reports the mismatch
 * counts so the blast radius is known before village targeting is trusted.
 */
const resolveUserGeo = async (user) => {
    const digits = String(user?.country_code || "").replace(/\D/g, "");

    let country = null;
    if (digits) {
        country = await Countries.findOne({
            phone_code: digits,
            active: true,
        }).lean();
    }
    if (!country && user?.country) {
        country = await Countries.findOne({
            name: String(user.country).toLowerCase(),
        }).lean();
    }

    let village = null;
    if (user?.village_name) {
        village = await Villages.findOne({
            name: String(user.village_name).toLowerCase(),
        }).lean();
    }

    return { country, village };
};

/**
 * Exclusion-based targeting: unresolved geography omits the clause entirely,
 * because something we cannot identify cannot be on an exclusion list.
 */
const targetingMatch = ({ country, village }) => ({
    ...(country && {
        "targeting.excludedCountries": { $ne: country._id },
    }),
    ...(village && {
        "targeting.excludedVillages": { $ne: village._id },
    }),
});

module.exports = { resolveUserGeo, targetingMatch };
