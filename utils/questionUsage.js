const mongoose = require("mongoose");
const Responses = require("../Models/responses");
const { collectAnsweredIds } = require("./answerValidator");

/**
 * "Does any response hold an answer to this question?" — at ANY depth.
 *
 * `answeredIds` is the real answer: flat, indexed, written at every submit.
 * The three dotted paths ask the same of a document saved before that field
 * existed (top level, in a row, in a nested row), so a response that has not
 * been backfilled still counts.
 *
 * The id is cast here because Mongoose cannot do it: everything under
 * `answers.value` is Mixed, and a string never equals a stored ObjectId.
 *
 * ponytail: the two nested paths have no index, so while they are in the $or
 * this is a collection scan. Drop all three dotted paths once
 * scripts/backfill-answered-ids.js has run on every deployment.
 */
const answeredFilter = (id) => {
    const questionId = new mongoose.Types.ObjectId(String(id));
    return {
        $or: [
            { answeredIds: questionId },
            { "answers.questionId": questionId },
            { "answers.value.answers.questionId": questionId },
            { "answers.value.answers.value.answers.questionId": questionId },
        ],
    };
};

/** How many responses answer this question, wherever in them it sits. */
const countAnswered = (id) => Responses.countDocuments(answeredFilter(id));

/**
 * Every answered question id, as strings: one read for a whole editor's
 * worth of "has answers" flags. `answeredIds` is the flat, indexed answer;
 * a response saved before that field existed is walked instead.
 */
const answeredSet = async () => {
    const [flat, older] = await Promise.all([
        Responses.distinct("answeredIds"),
        // Responses the backfill has not reached yet are read whole, so the
        // editor does not offer "Delete" for a question that the exact
        // check (answeredFilter) will then refuse to delete. Nothing
        // matches here once scripts/backfill-answered-ids.js has run.
        Responses.find({
            answeredIds: { $exists: false },
            "answers.0": { $exists: true },
        })
            .select({ answers: 1 })
            .lean(),
    ]);
    const ids = new Set(flat.map(String));
    older.forEach((response) =>
        collectAnsweredIds(response.answers).forEach((id) => ids.add(id))
    );
    return ids;
};

/**
 * How much one question is used: the responses that answer it and, for a
 * select, which option keys they hold. That is what decides whether an
 * option may be deleted or only archived.
 *
 * ponytail: walks every response that answers the question. Fine for a
 * dashboard call at this scale; an aggregation if a question ever has tens of
 * thousands of answers.
 */
const usageOf = async (id) => {
    const responses = await Responses.find(answeredFilter(id))
        .select({ answers: 1 })
        .lean();

    const used = new Set();
    const walk = (answers) =>
        (answers || []).forEach((answer) => {
            const values = [].concat(answer.value ?? []);
            if (String(answer.questionId) === String(id)) {
                // The snapshot's type, not today's: a value is an option key
                // only if it was saved as one.
                if (["single_select", "multi_select"].includes(answer.type)) {
                    values.forEach((value) => used.add(String(value)));
                }
                return;
            }
            // Only a group's value is a list of rows; anything else has no
            // answers and falls straight through.
            values.forEach((row) => walk(row?.answers));
        });
    responses.forEach((response) => walk(response.answers));

    return { answerCount: responses.length, usedOptions: [...used] };
};

/** How many responses are saved for a page. */
const usageOfCategory = async (categoryId) => ({
    answerCount: await Responses.countDocuments({ categoryId }),
});

module.exports = {
    answeredFilter,
    countAnswered,
    answeredSet,
    usageOf,
    usageOfCategory,
};
