const Countries = require("../Models/countries");
const Villages = require("../Models/villages");
const { villageChain } = require("./places");

/**
 * Resolves a caller's geography: their village, their country, and the chain
 * of places from the country down to the village — which is what decides
 * what they are asked (utils/effectiveQuestionnaire.js).
 *
 * Nothing is written to the users collection — `user.village_name` and
 * `user.country_code` are read per request. Both joins are best-effort:
 * `user.village_name` is free text that is not constrained to match
 * `villages.name`, and country_code formats are unvalidated ("+91" / "91" /
 * "091"). scripts/backfill-country-ids.js reports the mismatch counts. A
 * caller whose village matches nothing gets `chain: []` or `[country]`, i.e.
 * the plain Master or their country's version of it.
 */
const resolveUserGeo = async (user) => {
    let village = null;
    if (user?.village_name) {
        village = await Villages.findOne({
            name: String(user.village_name).toLowerCase(),
        })
            // Without case: a few villages were stored with a capital before
            // names were lower-cased on the way in, and their villagers
            // would otherwise match nothing.
            .collation({ locale: "en", strength: 2 })
            .lean();
    }

    // Where the village sits in the tree of places decides the country too:
    // taking it from the phone code instead could put a response's countryId
    // and its place chain in two different countries.
    const chain = village ? await villageChain(village) : [];
    if (chain.length > 1) {
        return {
            country: await Countries.findById(chain[0]).lean(),
            village,
            chain,
        };
    }

    // No village, or one that is in no country: the caller's own phone code,
    // then their free-text country.
    let country = null;
    const digits = String(user?.country_code || "").replace(/\D/g, "");
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

    return {
        country,
        village,
        chain: [...(country ? [country._id] : []), ...chain],
    };
};

module.exports = { resolveUserGeo };
