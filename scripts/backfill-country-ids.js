/**
 * Seeds the `countries` collection from the distinct free-text values already
 * in `villages.country`, then links each village via the new `countryId`.
 *
 * Idempotent — safe to re-run. Run with:  node scripts/backfill-country-ids.js
 *
 * Also prints a diagnostic (no writes) for the two weak joins the questionnaire
 * targeting depends on, so their blast radius is known before anyone trusts
 * village-level targeting.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { countries: COUNTRY_DATA } = require("countries-list");

const connection_url = require("../Enviroment");
const Countries = require("../Models/countries");
const Villages = require("../Models/villages");
const User = require("../Models/user");

const lookupCountryData = (name) => {
    const match = Object.entries(COUNTRY_DATA).find(
        ([, data]) => data.name.toLowerCase() === name
    );
    if (!match) return null;
    const [iso2, data] = match;
    return {
        iso2,
        display_name: data.name,
        phone_code: String(data.phone).split(",")[0].replace(/\D/g, ""),
        currency: String(data.currency).split(",")[0],
    };
};

const run = async () => {
    await mongoose.connect(connection_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4,
    });
    console.log("connected\n");

    const names = (await Villages.distinct("country")).filter(Boolean);
    console.log(`found ${names.length} distinct country value(s) on villages`);

    for (const rawName of names) {
        const name = String(rawName).toLowerCase();
        const enriched = lookupCountryData(name);

        if (!enriched) {
            console.warn(
                `  ! "${name}" not found in countries-list — phone_code left blank, set it in the dashboard`
            );
        }

        await Countries.updateOne(
            { name },
            {
                $setOnInsert: {
                    name,
                    display_name: enriched?.display_name || name,
                    iso2: enriched?.iso2 || "",
                    phone_code: enriched?.phone_code || "",
                    currency: enriched?.currency || "",
                    active: true,
                    order: 0,
                },
            },
            { upsert: true }
        );

        const country = await Countries.findOne({ name }).lean();

        // Re-link anything unset OR pointing at a country that does not exist
        // here — a village copied between deployments keeps the source's
        // countryId, which resolves to nothing on the target.
        const validIds = (await Countries.find({}).select({ _id: 1 }).lean()).map(
            (doc) => doc._id
        );
        const { modifiedCount } = await Villages.updateMany(
            {
                country: name,
                $or: [
                    { countryId: null },
                    { countryId: { $exists: false } },
                    { countryId: { $nin: validIds } },
                ],
            },
            { $set: { countryId: country._id } }
        );
        console.log(
            `  ${name} -> ${country._id}  (${modifiedCount} village(s) linked)`
        );
    }

    const allCountryIds = (
        await Countries.find({}).select({ _id: 1 }).lean()
    ).map((doc) => doc._id);
    const unlinked = await Villages.countDocuments({
        $or: [
            { countryId: null },
            { countryId: { $exists: false } },
            { countryId: { $nin: allCountryIds } },
        ],
    });
    console.log(`\nvillages not correctly linked to a country: ${unlinked}`);

    // ---- diagnostic pass, no writes -------------------------------------
    const villageNames = new Set(
        (await Villages.distinct("name")).map((n) => String(n).toLowerCase())
    );
    const countryCodes = new Set(
        (await Countries.distinct("phone_code")).filter(Boolean)
    );

    const users = await User.find(
        {},
        { village_name: 1, country_code: 1, country: 1 }
    ).lean();

    const villageMismatch = users.filter(
        (u) =>
            !u.village_name ||
            !villageNames.has(String(u.village_name).toLowerCase())
    ).length;

    const codeMismatch = users.filter((u) => {
        const digits = String(u.country_code || "").replace(/\D/g, "");
        return !digits || !countryCodes.has(digits);
    }).length;

    console.log("\n--- targeting join diagnostics -------------------------");
    console.log(`users total                                : ${users.length}`);
    console.log(`users whose village_name matches no village: ${villageMismatch}`);
    console.log(`users whose country_code maps to no country: ${codeMismatch}`);
    console.log(
        "Village-level targeting is best-effort. A high village mismatch means\n" +
            "treat it as advisory until user.village_id exists."
    );

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
