const mongoose = require("mongoose");
const Responses = require("./responses");

/**
 * What a field officer answered about a VILLAGE: one document per (village,
 * page) of the officers' questionnaire, where Models/responses.js keeps one
 * per (villager, page).
 *
 * It is that schema with the owner changed, and built from it so the two
 * cannot drift: the same frozen answers and the same flat copies of them
 * (`answeredIds`, `fileIds`, `asked`, `categoryPath`), which is why every lock
 * and every dashboard query can be asked of either collection
 * (utils/responseStores.js).
 *
 * A collection of its own, and not officer documents among the villagers':
 * that one's unique index is (villager, page), and an index already built on
 * a deployed database is never changed by a schema. So nothing existing has
 * to be migrated.
 */
const officerResponseSchema = Responses.schema.clone();

// Nobody "owns" these answers: the village is assigned to one officer today
// and may be given to another tomorrow, who then carries on in the same
// document. So the key is the village, and the officer is only who saved last.
officerResponseSchema.remove("userId");
officerResponseSchema.add({
    villageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "village",
        required: [true, "Village id is required!"],
    },
    moderatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "moderator",
        default: null,
    },
});

// The villagers' indexes came along with the schema, (villager, page) among
// them. These are the same ones, with the village where the villager was.
officerResponseSchema.clearIndexes();
officerResponseSchema.index({ "answers.questionId": 1 });
officerResponseSchema.index({ answeredIds: 1 });
officerResponseSchema.index({ fileIds: 1 });
officerResponseSchema.index({ categoryId: 1 });
officerResponseSchema.index({ villageId: 1, categoryId: 1 }, { unique: true });
officerResponseSchema.index({ categoryPath: 1 });
officerResponseSchema.index({
    categoryId: 1,
    countryId: 1,
    villageId: 1,
    submittedAt: -1,
});

module.exports = mongoose.model(
    "officer_response",
    officerResponseSchema,
    "officer_responses"
);
