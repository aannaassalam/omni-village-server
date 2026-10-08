/**
 * Fills `responses.answeredIds` — every question a response answers, at any
 * depth — on documents saved before the field existed. From then on
 * submit_response writes it on every save.
 *
 * Until this has run, utils/questionUsage.js still finds those documents
 * through the nested `answers...questionId` paths, so nothing is wrong in the
 * meantime. Once it has run everywhere those paths can go, which leaves one
 * indexed match.
 *
 * Idempotent — safe to re-run. Run with:
 *   node scripts/backfill-answered-ids.js --dry-run   # count, write nothing
 *   node scripts/backfill-answered-ids.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

const connection_url = require("../Enviroment");
const Responses = require("../Models/responses");
const { collectAnsweredIds } = require("../utils/answerValidator");

const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
    await mongoose.connect(connection_url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        family: 4,
        // Connecting with a model loaded normally builds its missing indexes,
        // which would create the answeredIds index even on --dry-run. The
        // server builds it at its next start; this script only fills the field.
        autoIndex: false,
    });
    console.log("connected\n");

    let total = 0;
    let changed = 0;

    const cursor = Responses.find({})
        .select({ answers: 1, answeredIds: 1, updatedAt: 1 })
        .lean()
        .cursor();

    for await (const response of cursor) {
        total += 1;

        const ids = collectAnsweredIds(response.answers);
        const current = (response.answeredIds || []).map(String);
        // Order means nothing here, so compare the two as sets.
        if (ids.slice().sort().join() === current.slice().sort().join()) continue;

        changed += 1;
        if (DRY_RUN) continue;

        // Not an edit by the villager: leave updatedAt where it was.
        // ponytail: one round trip per changed document. Batch with bulkWrite
        // if a deployment ever holds enough responses for that to matter.
        await Responses.updateOne(
            // Only if nobody saved it since it was read: a save writes its own,
            // newer answeredIds and bumps updatedAt.
            { _id: response._id, updatedAt: response.updatedAt },
            { $set: { answeredIds: ids } },
            { timestamps: false }
        );
    }

    console.log(
        `${DRY_RUN ? "[dry run] would update" : "updated"}: ` +
            `${changed} of ${total} response(s)`
    );

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
