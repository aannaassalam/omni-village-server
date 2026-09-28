const router = require("express").Router();
const responses_controller = require("../Controllers/responses");
const { verifyToken, checkUser } = require("../Middlewares/user");
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
 *      produces:
 *        - application/json
 *
 *      parameters:
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
 *          description: Successfully saved data.
 *        400:
 *          description: Validation failed
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
 *      description: Takes the same filters as the table and aggregates the whole filtered set, not just the visible page.
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
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/stats", ControllerWrapper(responses_controller.response_stats));

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
 *        only, never a $lookup into a side collection.
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
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/rows", ControllerWrapper(responses_controller.list_response_rows));

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
 *        and pagination are all server-side.
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
 *       - name: country
 *         in: query
 *         description:
 *         required: false
 *         schema:
 *           type: string
 *       - name: village
 *         in: query
 *         description: Repeatable.
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
router.get("/", ControllerWrapper(responses_controller.list_responses));

module.exports = router;
