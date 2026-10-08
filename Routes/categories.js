const router = require("express").Router();
const categories_controller = require("../Controllers/categories");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
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
 *      summary: List published categories.
 *      description: The questionnaire category tree as it is published - never-published categories are left out and drafts are not applied (the editor reads GET /questionnaire/editor). Only is_screen nodes hold questions. With no place, a super admin gets the Master's categories and those every place added.
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
 *       - name: place
 *         in: query
 *         description: A place id of any level - the Master's categories, those of the places above it, and those added in it or inside it. A regional account is always held to its own place, and may only name one inside it.
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
router.get(
    "/",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(categories_controller.get_categories)
);

/**
 * @swagger
 * /categories/add-category:
 *    post:
 *      tags:
 *        - Categories
 *      summary: Add a category (unpublished until the next publish).
 *      description: Pass parentId to nest it. is_screen is chosen here and cannot be changed afterwards. It is placed after its last sibling; path and depth are computed server-side. Pass ownerPlaceId to add it for one place only (by whoever manages that place) - at the top level or inside one of the Master's groups; active false then hides it for that place instead of archiving it. Without ownerPlaceId it is the Master's and a super admin's to add.
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
 *             active:
 *               type: boolean
 *             ownerPlaceId:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: The created category.
 *        403:
 *          description: Not the caller's place, or the Master asked of a regional account
 *        404:
 *          description: Parent category not found
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/add-category",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(categories_controller.add_category)
);

/**
 * @swagger
 * /categories/edit-category:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Edit a category (as a draft - nothing reaches the app until a publish).
 *      description: Accepts title, description and active (archive or restore). is_screen and order are not accepted here. Send the rev the editor showed - a different one is answered 409. A category a place added is renamed by whoever manages that place; active is refused for it (409), that place hides it instead.
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
 *             rev:
 *               type: number
 *             title:
 *               type: string
 *             description:
 *               type: string
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
    "/edit-category",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(categories_controller.edit_category)
);

/**
 * @swagger
 * /categories/reparent:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Move a category to a new parent (as a draft).
 *      description: The move waits for a publish, which rewrites the subtree's path and depth and the responses' categoryPath. Cycles are refused here and again at publish. order is optional. Only the Master's categories move - one a place added, or a move into one, is refused (409).
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
 *             rev:
 *               type: number
 *             parentId:
 *               type: string
 *             order:
 *               type: number
 *
 *      responses:
 *        200:
 *          description: Returns { _id, rev }.
 *        409:
 *          description: Move would create a cycle, or changed by someone else
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/reparent",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(categories_controller.reparent_category)
);

/**
 * @swagger
 * /categories/reorder:
 *    put:
 *      tags:
 *        - Categories
 *      summary: Reorder categories (as a draft).
 *      description: Accepts an array of category_id/order pairs. No rev - order is last-write-wins. Only the Master's categories are reordered - one a place added is passed over.
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
    ControllerWrapper(categories_controller.reorder_categories)
);

/**
 * @swagger
 * /categories/delete-category:
 *    delete:
 *      tags:
 *        - Categories
 *      summary: Delete a category.
 *      description: >
 *        A category that was never published is deleted at once, with what
 *        was added inside it (pending false). A published one is deleted by
 *        the next publish (pending true), and only when it has no categories,
 *        questions or responses under it - otherwise 409. A category a place
 *        added can be deleted only while it is unpublished - once published
 *        it is refused (409), that place hides it instead.
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
 *          description: Category is still in use, or was changed by someone else
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/delete-category",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(categories_controller.delete_category)
);

module.exports = router;
