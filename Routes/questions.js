const router = require("express").Router();
const questions_controller = require("../Controllers/questions");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /questions/live:
 *    get:
 *      tags:
 *        - Questions
 *      summary: Live question set for a screen, plus the caller's response.
 *      description: Geo-filtered and nested. The app merges questions against response.answers by questionId.
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
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        401:
 *          description: Unauthorized
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/live",
    verifyToken,
    checkUser,
    ControllerWrapper(questions_controller.get_live_questions)
);

/**
 * @swagger
 * /questions:
 *    get:
 *      tags:
 *        - Questions
 *      summary: Questions for a screen, children nested under their group.
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
 *       - name: includeInactive
 *         in: query
 *         description: Pass "true" to include retired questions.
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
router.get("/", ControllerWrapper(questions_controller.get_questions));

/**
 * @swagger
 * /questions/add-question:
 *    post:
 *      tags:
 *        - Questions
 *      summary: Add a question.
 *      description: type is one of text, number, single_select, multi_select, date, boolean, repeatable_group. Pass parentQuestionId to add a child to a group; groups nest two levels at most.
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
 *             parentQuestionId:
 *               type: string
 *             label:
 *               type: string
 *             type:
 *               type: string
 *             options:
 *               type: array
 *             required:
 *               type: boolean
 *             order:
 *               type: number
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        409:
 *          description: Invalid placement
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/add-question",
    ControllerWrapper(questions_controller.add_question)
);

/**
 * @swagger
 * /questions/edit-question:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Edit a question in place (COSMETIC changes only).
 *      description: >
 *        Allowed: label, helper_text, adding or removing an option, renaming an
 *        option's label, required, order, min, max, targeting.
 *        Refused with 409: changing type, or changing an option's value key —
 *        those are structural and must go through replace-question.
 *        A judgement case the server cannot detect ("3-5 people" -> "3-4
 *        people" keeps the same value key but changes meaning) is left to the
 *        admin, who is prompted by the dashboard.
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
 *             question_id:
 *               type: string
 *             label:
 *               type: string
 *             options:
 *               type: array
 *             required:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        409:
 *          description: Structural edit — use replace-question
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/edit-question",
    ControllerWrapper(questions_controller.edit_question)
);

/**
 * @swagger
 * /questions/replace-question:
 *    post:
 *      tags:
 *        - Questions
 *      summary: Retire a question and create its structural replacement.
 *      description: The old question gets active:false and replacedBy. Existing answers stay attached to the old id. A replaced group carries deep-copied children.
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
 *             question_id:
 *               type: string
 *             label:
 *               type: string
 *             type:
 *               type: string
 *             options:
 *               type: array
 *
 *      responses:
 *        200:
 *          description: Returns { old, new }.
 *        409:
 *          description: Question already replaced
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/replace-question",
    ControllerWrapper(questions_controller.replace_question)
);

/**
 * @swagger
 * /questions/toggle-active:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Activate or deactivate a question.
 *      description: Deactivating a repeatable_group cascades to its children.
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
 *             question_id:
 *               type: string
 *             active:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/toggle-active",
    ControllerWrapper(questions_controller.toggle_active)
);

/**
 * @swagger
 * /questions/reorder:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Reorder questions.
 *      description: Accepts an array of question_id/order pairs. Works for group children too.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: array
 *
 *      responses:
 *        200:
 *          description: Successfully reordered.
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/reorder",
    ControllerWrapper(questions_controller.reorder_questions)
);

/**
 * @swagger
 * /questions/delete-question:
 *    delete:
 *      tags:
 *        - Questions
 *      summary: Delete a question.
 *      description: Refused with 409 once any response answers it — deactivate instead, so stored answers never point at nothing.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: id
 *         in: query
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully deleted data.
 *        409:
 *          description: Question has responses
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/delete-question",
    ControllerWrapper(questions_controller.delete_question)
);

module.exports = router;
