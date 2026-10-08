const router = require("express").Router();
const questions_controller = require("../Controllers/questions");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
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
 * /questions/add-question:
 *    post:
 *      tags:
 *        - Questions
 *      summary: Add a question (unpublished until the next publish).
 *      description: >
 *        type is one of text, number, single_select, multi_select, date,
 *        boolean, repeatable_group, section. Pass parentQuestionId to add a
 *        child to a group; groups nest two levels at most. order defaults to
 *        after the last sibling. An option value may not start with "p_".
 *        Pass replaces (the id of a published Master question) to create its
 *        successor - it takes that question's page, parent and order, and the
 *        old one is retired when the new one is published; copyChildren also
 *        copies a replaced group's fields into the new group.
 *        Pass ownerPlaceId to add it for one place only (asked there and in
 *        the places inside it) - by whoever manages that place; without it
 *        the question is the Master's and a super admin's to add. A place's
 *        question goes after everything that place can see there, and on a
 *        page that is one list it goes inside the list.
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
 *             replaces:
 *               type: string
 *             copyChildren:
 *               type: boolean
 *             ownerPlaceId:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: The created question.
 *        403:
 *          description: Not the caller's place, or the Master asked of a regional account
 *        409:
 *          description: Invalid placement, or the question to replace cannot be replaced
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/add-question",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questions_controller.add_question)
);

/**
 * @swagger
 * /questions/edit-question:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Edit a question (as a draft - nothing reaches the app until a publish).
 *      description: >
 *        Accepts label, helper_text, type, options (the whole next list, each
 *        {value, label, archived}), min, max, presentation, required, order.
 *        A question that was never published is written directly; a published
 *        one keeps its published fields and the edit joins its draft. Send the
 *        rev the editor showed - a different one is answered 409.
 *        Also 409 - changing the type of a question that has saved answers
 *        (add a replacement instead), and removing an option that has saved
 *        answers (archive it instead). A question a place added is edited by
 *        whoever manages that place, under the same rules, except that its
 *        order cannot be set.
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
 *             rev:
 *               type: number
 *             label:
 *               type: string
 *             type:
 *               type: string
 *             options:
 *               type: array
 *             required:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Returns { _id, rev }.
 *        409:
 *          description: Changed by someone else, or locked by saved answers
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/edit-question",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questions_controller.edit_question)
);

/**
 * @swagger
 * /questions/toggle-active:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Archive or restore a question (as a draft).
 *      description: Only the question itself is written - what sits under an archived group or section is hidden with it and comes back with it. The Master's questions only - a question a place added is refused (409), that place hides it with its Asked switch.
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
 *             rev:
 *               type: number
 *             active:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Returns { _id, rev }.
 *        409:
 *          description: Changed by someone else
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/toggle-active",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questions_controller.toggle_active)
);

/**
 * @swagger
 * /questions/reorder:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Reorder questions (as a draft).
 *      description: Accepts an array of question_id/order pairs. Works for group children too. No rev - order is last-write-wins. Only the Master's questions are reordered - one a place added is passed over.
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
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(questions_controller.reorder_questions)
);

/**
 * @swagger
 * /questions/move:
 *    put:
 *      tags:
 *        - Questions
 *      summary: Move a question a place added to another page (as a draft).
 *      description: >
 *        Only a top-level question that a place added, to another page that
 *        place can see - by whoever manages that place. It goes to the end
 *        of the new page and takes what is inside it along. The move waits
 *        for a publish. Refused with 409 once any response answers it or
 *        anything inside it, for a Master question, for a question inside a
 *        group, and onto a page that is one list of entries. Send the rev
 *        the editor showed - a different one is answered 409.
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
 *             rev:
 *               type: number
 *             categoryId:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Returns { _id, rev }.
 *        403:
 *          description: Not the caller's place
 *        404:
 *          description: Question or category not found
 *        409:
 *          description: Cannot be moved, or changed by someone else
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/move",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questions_controller.move_question)
);

/**
 * @swagger
 * /questions/delete-question:
 *    delete:
 *      tags:
 *        - Questions
 *      summary: Delete a question.
 *      description: >
 *        A question that was never published is deleted at once, with what
 *        was added inside it (pending false). A published one is deleted by
 *        the next publish (pending true). Refused with 409 once any response
 *        answers it or anything inside it - archive instead, so stored
 *        answers never point at nothing. A question a place added can be
 *        deleted only while it is unpublished - once published it is refused
 *        (409), that place hides it with its Asked switch.
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
 *       - name: rev
 *         in: query
 *         description: The rev the editor showed.
 *         required: false
 *         schema:
 *           type: number
 *
 *      responses:
 *        200:
 *          description: Returns { message, pending }.
 *        409:
 *          description: Question has responses, or was changed by someone else
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/delete-question",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(questions_controller.delete_question)
);

module.exports = router;
