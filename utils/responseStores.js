const Responses = require("../Models/responses");
const OfficerResponses = require("../Models/officerResponses");

/**
 * Where answers are kept: the villagers' in `responses`, the field officers'
 * in `officer_responses` (Models/officerResponses.js). The two hold the same
 * answer snapshots under a different owner.
 *
 * A question, an option, a page or a place is "in use" when EITHER holds an
 * answer that depends on it, so everything that locks on saved answers asks
 * here, never one model: a lock that looked in `responses` alone would let an
 * officers' question be deleted from under its answers.
 */
const STORES = [Responses, OfficerResponses];

/** The collection one audience's answers are saved in. */
const storeFor = (audience) =>
    audience === "officer" ? OfficerResponses : Responses;

/**
 * How many responses match `filter`, in both. The filter may name only what
 * both keep (a question, a page, a village, a country, a file), never who
 * answered.
 *
 * One after the other, not side by side: a publish asks inside its
 * transaction, and a session carries a single operation at a time.
 */
const countAnswers = async (filter, session = null) => {
    let count = 0;
    for (const Store of STORES) {
        count += await Store.countDocuments(filter).session(session);
    }
    return count;
};

/** Whether any response matches `filter`, in either. */
const anyAnswer = async (filter, session = null) => {
    for (const Store of STORES) {
        if (await Store.exists(filter).session(session)) return true;
    }
    return false;
};

module.exports = { STORES, storeFor, countAnswers, anyAnswer };
