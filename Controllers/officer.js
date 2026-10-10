const Villages = require("../Models/villages");
const AppError = require("../AppError");
const { villageChain } = require("../utils/places");
const { liveCategories } = require("./categories");
const { liveQuestions } = require("./questions");
const { submitAnswers } = require("./responses");
const { officerFiles, takeIn, sendOfficerFile } = require("./files");

/**
 * The field officers' side of the questionnaire: what the officer of a
 * village is asked about that village, and what they answer.
 *
 * An officer is an account in `moderators` (res.locals.user on these routes:
 * Middlewares/user.js checkModerator), and answers for the villages assigned
 * to them, one response per village and page. Nothing is decided here about
 * WHAT is asked or how an answer is saved: each handler settles who is
 * asking, then runs the villagers' own code with that (liveCategories,
 * liveQuestions, submitAnswers, takeIn), so the two apps cannot come to
 * follow different rules.
 */

const NOT_APPROVED = "Your account has not been approved yet.";
const NOT_YOURS = "This village is not assigned to you.";

/**
 * Only an approved officer (`status: 1`; 0 is waiting, 2 was turned down).
 * The token alone says no more than that somebody registered.
 */
const assertApproved = (moderator) => {
    if (moderator?.status !== 1) throw new AppError(0, NOT_APPROVED, 403);
};

/**
 * Who is asking, and about which village: what the shared handlers are
 * handed. `villageId` is what the request named; the village has to be one
 * that is assigned to this officer NOW, so a village taken from them is out
 * of their reach from the next request on.
 *
 * The village is asked what its place is asked (`chain`), as its villagers
 * are. Its response is found by the village alone, not by the officer: one
 * who takes a village over carries on in the same answers, and is recorded
 * as who saved last.
 */
const officerVillage = async (moderator, villageId) => {
    assertApproved(moderator);
    // From a query string or a body: text, or nothing we know.
    if (typeof villageId !== "string" || !/^[a-f0-9]{24}$/i.test(villageId)) {
        throw new AppError(0, '"village_id" must be a valid id', 400);
    }
    const village = await Villages.findOne({
        _id: villageId,
        moderator_id: moderator._id,
    }).lean();
    // One answer for "no such village" and "somebody else's".
    if (!village) throw new AppError(0, NOT_YOURS, 403);

    const chain = await villageChain(village);
    return {
        audience: "officer",
        chain,
        owner: {
            filter: { villageId: village._id },
            stamp: {
                // A village that sits in no country is its own whole chain.
                countryId: chain.length > 1 ? chain[0] : null,
                villageName: village.name,
                moderatorId: moderator._id,
            },
        },
        files: officerFiles(moderator, village),
    };
};

/** The officers' tree as this village is asked it, with its progress. */
module.exports.get_live_categories = async (req, res) =>
    res.json(
        await liveCategories(
            req,
            await officerVillage(res.locals.user, req.query.village_id)
        )
    );

/** One page of it, and what is saved for this village. */
module.exports.get_live_questions = async (req, res) =>
    res.json(
        await liveQuestions(
            req,
            await officerVillage(res.locals.user, req.query.village_id)
        )
    );

/** Saves one page for this village. Merges by questionId, as a villager's. */
module.exports.submit_response = async (req, res) =>
    res.json(
        await submitAnswers(
            req,
            await officerVillage(res.locals.user, req.body.village_id)
        )
    );

/** A photo or a recording for one of this village's answers. */
module.exports.upload_file = async (req, res) => {
    const { files } = await officerVillage(
        res.locals.user,
        req.body.village_id
    );
    return res.json(await takeIn(req, files));
};

/**
 * The bytes of a file: one this officer uploaded, or one an answer about a
 * village of theirs holds (Controllers/files.js sendOfficerFile).
 */
module.exports.get_file = async (req, res) => {
    const { user } = res.locals;
    assertApproved(user);
    const villages = await Villages.find({ moderator_id: user._id })
        .select({ _id: 1 })
        .lean();
    return sendOfficerFile(
        req,
        res,
        user,
        villages.map((village) => village._id)
    );
};
