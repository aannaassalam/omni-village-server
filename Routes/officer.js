const router = require("express").Router();
const officer_controller = require("../Controllers/officer");
const { verifyModeratorToken, checkModerator } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

// The field officers' questionnaire, for the officer app. An officer's token
// (an account in `moderators`) on every route: a villager's is answered 401
// here, as an officer's is on the villagers' three routes. The rest of who
// may ask - approved, and assigned the village - is the controller's.

/**
 * @swagger
 * /officer/categories/live:
 *    get:
 *      tags:
 *        - Officer questionnaire
 *      summary: The officers' category tree, as one village is asked it.
 *      description: >
 *        The same shape as GET /categories/live, of the field officers'
 *        questionnaire - with questionCount, answeredCount and hasPending per
 *        screen, counted from what is saved for that village. The caller must
 *        be an approved officer (status 1) and the village one assigned to
 *        them. Counted as this build of the app is asked - a photo or audio
 *        question whose type the X-Answer-Types header does not name is not
 *        counted, and a page left with nothing to ask is not listed.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: village_id
 *         in: query
 *         description: The village the officer is answering about - one of GET /villages/get-villages-for-moderator.
 *         required: true
 *         schema:
 *           type: string
 *       - name: lang
 *         in: query
 *         description: Language code (e.g. en, ms, dz). Missing translations fall back to English.
 *         required: false
 *         schema:
 *           type: string
 *       - name: X-Answer-Types
 *         in: header
 *         description: The file answer types this build of the app can answer, comma separated - "photo,audio".
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: village_id is missing or is not an id
 *        401:
 *          description: Unauthorized - not an officer's token
 *        403:
 *          description: The account has not been approved yet, or the village is not assigned to it
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/categories/live",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(officer_controller.get_live_categories)
);

/**
 * @swagger
 * /officer/questions/live:
 *    get:
 *      tags:
 *        - Officer questionnaire
 *      summary: The questions of one officers' page, and what is saved for the village.
 *      description: >
 *        The same shape as GET /questions/live - { questions, response } -
 *        where response is the one saved for that village and page, whichever
 *        officer saved it (null when there is none). Sections and
 *        repeatable_groups carry their children nested; the app merges
 *        questions and response by questionId. A page of the villagers'
 *        questionnaire has no questions here.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: village_id
 *         in: query
 *         description: The village the officer is answering about.
 *         required: true
 *         schema:
 *           type: string
 *       - name: categoryId
 *         in: query
 *         description: The screen (is_screen category) to load.
 *         required: true
 *         schema:
 *           type: string
 *       - name: lang
 *         in: query
 *         description: Language code for flat strings, or "all" for the full localised objects.
 *         required: false
 *         schema:
 *           type: string
 *       - name: X-Answer-Types
 *         in: header
 *         description: The file answer types this build of the app can answer, comma separated - "photo,audio". A photo or audio question whose type is not named is not served.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: village_id is missing or is not an id, or no categoryId
 *        401:
 *          description: Unauthorized - not an officer's token
 *        403:
 *          description: The account has not been approved yet, or the village is not assigned to it
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/questions/live",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(officer_controller.get_live_questions)
);

/**
 * @swagger
 * /officer/responses/submit:
 *    post:
 *      tags:
 *        - Officer questionnaire
 *      summary: Submit or update the answers about one village for a screen.
 *      description: >
 *        The same rules as POST /responses/submit, saved per village and page
 *        - one response however many officers the village has had, with
 *        moderatorId the officer who saved last. Merging with what is saved
 *        is by questionId only - an answer left out is kept, a blank one
 *        (null, "", an empty list) clears it. Pass complete:true to
 *        additionally enforce required questions. A photo or audio answer is
 *        a list of file ids from POST /files/officer - a file new to its
 *        answer must be one the caller uploaded for this village, of the
 *        question's kind.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: X-Answer-Types
 *         in: header
 *         description: The file answer types this build of the app can answer, comma separated - "photo,audio".
 *         required: false
 *         schema:
 *           type: string
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             village_id:
 *               type: string
 *             categoryId:
 *               type: string
 *             complete:
 *               type: boolean
 *             answers:
 *               type: array
 *
 *      responses:
 *        200:
 *          description: Successfully saved data. The saved response, with villageId, moderatorId and fileIds.
 *        400:
 *          description: Validation failed, or village_id is missing or is not an id
 *        401:
 *          description: Unauthorized - not an officer's token
 *        403:
 *          description: The account has not been approved yet, or the village is not assigned to it
 *        404:
 *          description: Category not found - also for a page of the villagers' questionnaire
 *        409:
 *          description: This page is no longer asked
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/responses/submit",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(officer_controller.submit_response)
);

module.exports = router;
