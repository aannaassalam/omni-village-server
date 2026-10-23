const router = require("express").Router();
const responses_controller = require("../Controllers/responses");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /responses/submit:
 *    post:
 *      tags:
 *        - Responses
 *      summary: Submit or update the current user's answers for a screen.
 *      description: >
 *        Answers are validated against each question's CURRENT type and options,
 *        then frozen with a label/type/options snapshot. Merging with any
 *        existing response is by questionId only, never by array position.
 *        Pass complete:true to additionally enforce required questions.
 *        Each answer is { questionId, value } - a scalar for text, number,
 *        date, boolean and single_select; a list of option values for
 *        multi_select; a list of rows { rowId, answers } for a
 *        repeatable_group; and for photo and audio a list of file ids (the
 *        _id that POST /files returned), at most the question's max of them
 *        (one when it has no max). A file id new to its answer must be a file
 *        the caller uploaded, of the question's kind. A blank value (null,
 *        "", an empty list) clears the saved answer, and a file that an
 *        answer no longer holds after the save is deleted.
 *        A build that does not name photo or audio in its X-Answer-Types
 *        header was not served such a question - it is then not required of
 *        it, an answer sent for it is skipped, and what another build saved
 *        for it is kept as it is.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: X-Answer-Types
 *         in: header
 *         description: The file answer types this build of the app can answer, comma separated - "photo,audio". The same value as on GET /questions/live.
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
 *             categoryId:
 *               type: string
 *             complete:
 *               type: boolean
 *             answers:
 *               type: array
 *
 *      responses:
 *        200:
 *          description: Successfully saved data. The saved response, with fileIds (every file its answers hold, at any depth).
 *        400:
 *          description: Validation failed - for a photo or audio answer also a file that is not the caller's, or not of the question's kind
 *        409:
 *          description: This page is no longer asked in the caller's place
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/submit",
    verifyToken,
    checkUser,
    ControllerWrapper(responses_controller.submit_response)
);

/**
 * @swagger
 * /responses/stats:
 *    get:
 *      tags:
 *        - Responses
 *      summary: Aggregates for the graphs tab.
 *      description: Takes the same filters as the table and aggregates the whole filtered set, not just the visible page. A list is counted by how many entries each response holds, and a photo or audio question by how many files. With audience=officer, of the field officers' responses.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: categoryId
 *         in: query
 *         description: Required unless categoryPath is given.
 *         required: false
 *         schema:
 *           type: string
 *       - name: f
 *         in: query
 *         description: Repeatable per-question filter, "questionId[.childId]:op:value".
 *         required: false
 *         schema:
 *           type: string
 *       - name: audience
 *         in: query
 *         description: villager (the default) or officer - whose responses.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/stats",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(responses_controller.response_stats)
);

/**
 * @swagger
 * /responses/rows:
 *    get:
 *      tags:
 *        - Responses
 *      summary: Long view — one row per repeatable_group row.
 *      description: >
 *        groupPath is "parentQuestionId" or "parentQuestionId.childGroupId".
 *        Because rows are embedded in the response document this is $unwind
 *        only, never a $lookup into a side collection. With audience=officer,
 *        of the field officers' responses - each row then carries moderatorId
 *        and savedBy where a villager's carries userId and userName.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: categoryId
 *         in: query
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *       - name: groupPath
 *         in: query
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *       - name: audience
 *         in: query
 *         description: villager (the default) or officer - whose responses.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/rows",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(responses_controller.list_response_rows)
);

/**
 * @swagger
 * /responses:
 *    get:
 *      tags:
 *        - Responses
 *      summary: Paginated, filterable responses for the dashboard table.
 *      description: >
 *        Returns dynamic columns (including retired questions, so historical
 *        answers keep a column) alongside the page of rows. Filtering, sorting
 *        and pagination are all server-side. Each row carries the questions
 *        that were on offer when it was saved (asked), the questionnaire
 *        version, and with each answer only the options it chose. A photo or
 *        audio answer is a list of file ids - the bytes of each are read with
 *        GET /files/admin/{id}.
 *        With audience=officer it is the field officers' responses - one per
 *        village and page, held to the same place filter. A row then carries
 *        villageName, moderatorId and savedBy (the officer who saved last)
 *        where a villager's carries userId and userName, and user searches
 *        the village's name and that officer's name or phone number.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: categoryId
 *         in: query
 *         description: Required unless categoryPath is given.
 *         required: false
 *         schema:
 *           type: string
 *       - name: categoryPath
 *         in: query
 *         description: Any ancestor category id — matches every screen beneath it.
 *         required: false
 *         schema:
 *           type: string
 *       - name: place
 *         in: query
 *         description: A place id of any level - matches every village inside it, and decides which questions are columns (the Master's, those of the places above, and those added in it or inside it). A regional account is always held to its own place, and may only name one inside it.
 *         required: false
 *         schema:
 *           type: string
 *       - name: user
 *         in: query
 *         description: Search by villager - every word must be found in the first name, last name or phone number. For audience=officer, in the village's name or in the name or phone number of the officer who saved last.
 *         required: false
 *         schema:
 *           type: string
 *       - name: audience
 *         in: query
 *         description: villager (the default) or officer - whose responses.
 *         required: false
 *         schema:
 *           type: string
 *       - name: from
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *       - name: to
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *       - name: f
 *         in: query
 *         description: Repeatable per-question filter, "questionId[.childId]:op:value". Ops - eq, in, gte, lte, contains, any.
 *         required: false
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: number
 *       - name: limit
 *         in: query
 *         description: Capped at 200.
 *         required: false
 *         schema:
 *           type: number
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(responses_controller.list_responses)
);

module.exports = router;
