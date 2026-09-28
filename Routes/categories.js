const router = require("express").Router();
const categories_controller = require("../Controllers/categories");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /categories/live:
 *    get:
 *      tags:
 *        - Categories
 *      summary: Active category tree for the current user.
 *      description: Geo-filtered, with questionCount/answeredCount per screen for the pending-questions badge.
 *      produces:
 *        - application/json
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
    ControllerWrapper(categories_controller.get_live_categories)
);

/**
 * @swagger
 * /categories:
 *    get:
 *      tags:
 *        - Categories
 *      summary: List categories.
 *      description: The questionnaire category tree. Only is_screen nodes hold questions.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: tree
 *         in: query
 *         description: Pass "true" for a nested tree instead of a flat list.
 *         required: false
 *         schema:
 *           type: string
 *       - name: includeInactive
 *         in: query
 *         description: Pass "true" to include deactivated categories.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        500:
 *          description: Internal Server Error
 */
router.get("/", ControllerWrapper(categories_controller.get_categories));

/**
 * @swagger
 * /categories/add-category:
 *    post:
 *      tags:
 *        - Categories
 *      summary: Add a category.
 *      description: Pass parentId to nest it. path and depth are computed server-side.
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
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             parentId:
 *               type: string
 *             is_screen:
 *               type: boolean
 *             order:
 *               type: number
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        404:
 *          description: Parent category not found
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/add-category",
    ControllerWrapper(categories_controller.add_category)
);

/**
 * @swagger
 * /categories/edit-category:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Edit a category.
 *      description: Demoting a screen that already holds questions or responses is refused with 409.
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
 *             category_id:
 *               type: string
 *             title:
 *               type: string
 *             is_screen:
 *               type: boolean
 *             active:
 *               type: boolean
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        409:
 *          description: Screen still holds data
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/edit-category",
    ControllerWrapper(categories_controller.edit_category)
);

/**
 * @swagger
 * /categories/reparent:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Move a category to a new parent.
 *      description: Rewrites the whole subtree's materialised path in one bulkWrite. Cycles are refused.
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
 *             category_id:
 *               type: string
 *             parentId:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Successfully moved.
 *        409:
 *          description: Move would create a cycle
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/reparent",
    ControllerWrapper(categories_controller.reparent_category)
);

/**
 * @swagger
 * /categories/reorder:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Reorder categories.
 *      description: Accepts an array of category_id/order pairs, applied in one bulkWrite.
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
    ControllerWrapper(categories_controller.reorder_categories)
);

/**
 * @swagger
 * /categories/delete-category:
 *    delete:
 *      tags:
 *        - Categories
 *      summary: Delete a category.
 *      description: Refused with 409 when it has children, questions or responses.
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
 *          description: Category is still in use
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/delete-category",
    ControllerWrapper(categories_controller.delete_category)
);

module.exports = router;
