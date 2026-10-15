/**
 * The people of a household, as the questionnaire asks them: a list first on
 * the Demographics page, one entry per person. The app's registration asked
 * for them until 15 Oct, after a count that a list does not need. What was
 * given there stays on each user's document (`users.members`), which the
 * older Demographics, Energy and Landholdings dashboards read; this list is
 * answered in the questionnaire, like every other page.
 *
 * The seed puts it on Demographics (questionnaire-map.js). A database seeded
 * before that gets it from this file, run on its own, as a DRAFT of the
 * Master: it reaches the app once it is published from the dashboard.
 *
 *   node scripts/household-members.js --dry-run
 *   node scripts/household-members.js
 */
const HOUSEHOLD_MEMBERS = {
    type: "repeatable_group",
    label: { en: "Household members", ms: "Ahli isi rumah" },
    helper_text: {
        en: "Everyone who lives in the household, yourself included.",
        ms: "Semua yang tinggal dalam isi rumah, termasuk anda.",
    },
    // At least one entry, once the page is submitted as complete.
    required: true,
    options: [],
    order: 0,
    // The first field names each entry in the app ("Asha"), as the old
    // registration listed its members.
    children: [
        {
            type: "text",
            label: { en: "Name", ms: "Nama" },
            required: true,
            options: [],
            order: 1,
        },
        {
            type: "single_select",
            label: { en: "Gender", ms: "Jantina" },
            required: true,
            // The values `users.members` holds.
            options: [
                { value: "male", label: { en: "Male", ms: "Lelaki" } },
                { value: "female", label: { en: "Female", ms: "Perempuan" } },
                { value: "other", label: { en: "Other", ms: "Lain-lain" } },
            ],
            order: 2,
        },
        {
            type: "number",
            label: { en: "Age", ms: "Umur" },
            required: true,
            min: 0,
            max: 120,
            options: [],
            order: 3,
        },
    ],
};

module.exports = { HOUSEHOLD_MEMBERS };

if (require.main === module) {
    require("dotenv").config();
    const mongoose = require("mongoose");
    const connection_url = require("../Enviroment");
    const Categories = require("../Models/categories");
    const Questions = require("../Models/questions");
    const { categoryFilter } = require("../utils/audience");
    const { applied } = require("../utils/drafts");

    const DRY_RUN = process.argv.includes("--dry-run");
    const fail = (message) => {
        throw Object.assign(new Error(message), { expected: true });
    };

    const run = async () => {
        await mongoose.connect(connection_url, { family: 4 });

        // The Master's Demographics page of the villagers' questionnaire, by
        // the title the editor shows (a rename waiting to be published
        // counts).
        const pages = (
            await Categories.find({
                ...categoryFilter("villager"),
                ownerPlaceId: null,
                is_screen: true,
            }).lean()
        ).filter(
            (page) =>
                applied(page).title?.en === "Demographics" &&
                applied(page).active !== false
        );
        if (pages.length !== 1) {
            fail(
                `Expected one Master page titled "Demographics", found ${pages.length}. Nothing was added.`
            );
        }
        const [page] = pages;

        const top = (
            await Questions.find({
                categoryId: page._id,
                parentQuestionId: null,
                ownerPlaceId: null,
            }).lean()
        ).map(applied);
        if (top.some((q) => q.label?.en === HOUSEHOLD_MEMBERS.label.en)) {
            console.log(
                `"${HOUSEHOLD_MEMBERS.label.en}" is already on Demographics. Nothing was added.`
            );
            return;
        }
        // First on the page: before the Master's first question, by the
        // order each will have once its draft is published.
        const order = Math.min(1, ...top.map((q) => q.order ?? 1)) - 1;

        const fields = HOUSEHOLD_MEMBERS.children
            .map((child) => child.label.en)
            .join(", ");
        if (DRY_RUN) {
            console.log(
                `Would add "${HOUSEHOLD_MEMBERS.label.en}" (${fields}) first on Demographics, as a draft. --dry-run: nothing written.`
            );
            return;
        }

        // Written as the editor writes a new question: never published yet,
        // so the app does not see it until a publish.
        const add = async ({ children = [], ...definition }, parentQuestionId) => {
            const created = await Questions.create({
                ...definition,
                categoryId: page._id,
                parentQuestionId,
                replaces: null,
                ownerPlaceId: null,
                unpublished: true,
                draftAt: new Date(),
            });
            for (const child of children) await add(child, created._id);
        };
        await add({ ...HOUSEHOLD_MEMBERS, order }, null);
        console.log(
            `Added "${HOUSEHOLD_MEMBERS.label.en}" (${fields}) first on Demographics, as a draft.\n` +
                "Publish it from the Master questionnaire in the dashboard to send it to the app."
        );
    };

    run()
        .catch((err) => {
            console.error(err.expected ? err.message : err);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}
