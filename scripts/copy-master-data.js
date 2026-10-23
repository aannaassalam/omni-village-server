/**
 * Copies the master/reference collections the questionnaire seeder reads from
 * one deployment to another. Nothing else is copied — in particular NOT
 * `users`, which holds phone numbers, addresses and identity numbers.
 *
 *   SOURCE_URL=... TARGET_URL=... node scripts/copy-master-data.js [--dry-run]
 *
 * `_id`s are preserved, which is not cosmetic: the seeder uses each dropdown
 * document's `_id` as the option `value`, and the existing survey collections
 * reference those same ids. Re-generating them would silently decouple the two.
 *
 * A target collection that already has documents is SKIPPED, never merged or
 * overwritten — reconciling two divergent copies is a decision for a human.
 */
const mongoose = require("mongoose");

const COLLECTIONS = [
    // master option sources
    "crops",
    "tree_crops",
    "poultry_crops",
    "fishery_crops",
    "hunting_crops",
    "storage_methods",
    "consumptioncrops",
    "consumption_types",
    // geography
    "villages",
    // dropdown option lists
    "demographic_dropdowns",
    "landholding_dropdowns",
    "housing_dropdowns",
    "water_dropdowns",
    "energy_dropdowns",
    "mobility_dropdowns",
    "forestry_dropdowns",
    "business_dropdowns",
    "other_personal_household_item_dropdowns",
    // lists the existing app's own forms read (registration, production)
    "land_measurements",
    "weight_measurements",
    "feeds",
    "fish_feeds",
    "selling_channel_methods",
    // officer option lists
    "business_officer_dropdowns",
    "community_officer_dropdowns",
    "demographic_officer_dropdowns",
    "energy_officer_dropdowns",
    "forestry_officer_dropdowns",
    "landholding_officer_dropdowns",
    "mobility_officer_dropdowns",
    "water_officer_dropdowns",
];

const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
    const { SOURCE_URL, TARGET_URL } = process.env;
    if (!SOURCE_URL || !TARGET_URL) {
        console.error("SOURCE_URL and TARGET_URL are both required");
        process.exit(1);
    }

    const source = await mongoose.createConnection(SOURCE_URL).asPromise();
    const target = await mongoose.createConnection(TARGET_URL).asPromise();

    console.log(`source: ${source.name}`);
    console.log(`target: ${target.name}`);
    console.log(DRY_RUN ? "\n[dry run — nothing will be written]\n" : "");

    let copied = 0;
    let skipped = 0;

    for (const name of COLLECTIONS) {
        const docs = await source.db.collection(name).find({}).toArray();
        const existing = await target.db.collection(name).countDocuments();

        if (docs.length === 0) {
            console.log(`  ${name.padEnd(42)} source empty — nothing to copy`);
            continue;
        }
        if (existing > 0) {
            console.log(
                `  ${name.padEnd(42)} SKIPPED — target already has ${existing} doc(s)`
            );
            skipped += 1;
            continue;
        }

        if (!DRY_RUN) {
            await target.db.collection(name).insertMany(docs, { ordered: false });
        }
        console.log(
            `  ${name.padEnd(42)} ${DRY_RUN ? "would copy" : "copied"} ${docs.length}`
        );
        copied += docs.length;
    }

    console.log(
        `\n${DRY_RUN ? "would copy" : "copied"} ${copied} document(s)` +
            (skipped ? `, skipped ${skipped} non-empty collection(s)` : "")
    );
    console.log(
        "\nNot copied by design: users, moderators, admins, and every survey\n" +
            "response collection — this script moves reference data only."
    );

    await source.close();
    await target.close();
};

run().catch(async (err) => {
    console.error(err);
    process.exit(1);
});
