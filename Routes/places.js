const router = require("express").Router();
const places_controller = require("../Controllers/places");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

/**
 * @swagger
 * /places:
 *    get:
 *      tags:
 *        - Places
 *      summary: Every country, region and village as one list in tree order.
 *      description: >
 *        Each place is followed by what is inside it and carries kind, level,
 *        name, parentId, path (ancestor place ids, root first), depth,
 *        countryId and languages. A regional account gets only the places
 *        above its own (managed false) and its own place with everything
 *        inside it (managed true).
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: stats
 *         in: query
 *         description: Pass "1" to add villageCount, languagesFrom, team and teamFrom to each place.
 *         required: false
 *         schema:
 *           type: string
 *       - name: diff
 *         in: query
 *         description: With stats, pass "1" to add diff to each place - how its published questionnaire differs from the Master. Super admin only.
 *         required: false
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        403:
 *          description: No place is assigned to this account
 *        500:
 *          description: Internal Server Error
 */
router.get(
    "/",
    verifyAdmin,
    requireRole("admin", "regional"),
    ControllerWrapper(places_controller.get_places)
);

/**
 * @swagger
 * /places:
 *    post:
 *      tags:
 *        - Places
 *      summary: Add a country, a region or a village.
 *      description: >
 *        level is one of country, state, district, sub_district, village.
 *        Every level but country needs parentId, a country or a region of a
 *        higher level. Answers with the new place as GET /places lists it.
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
 *             name:
 *               type: string
 *             level:
 *               type: string
 *             parentId:
 *               type: string
 *             languages:
 *               type: array
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: That level cannot sit inside that parent
 *        404:
 *          description: Place not found
 *        409:
 *          description: A place of that name already exists
 *        500:
 *          description: Internal Server Error
 */
router.post(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(places_controller.add_place)
);

/**
 * @swagger
 * /places/{id}:
 *    put:
 *      tags:
 *        - Places
 *      summary: Rename a place, set its languages or move it.
 *      description: >
 *        Renaming a country changes its display name only. A region or a
 *        village moves within its own country, and moving a region takes
 *        everything inside it along. A village is renamed only while no
 *        villager is registered in it.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *       - name: body
 *         in: body
 *         description:
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             languages:
 *               type: array
 *             parentId:
 *               type: string
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        400:
 *          description: That move is not possible
 *        404:
 *          description: Place not found
 *        409:
 *          description: Name already taken, or the village has registered villagers
 *        500:
 *          description: Internal Server Error
 */
router.put(
    "/:id",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(places_controller.edit_place)
);

/**
 * @swagger
 * /places/{id}:
 *    delete:
 *      tags:
 *        - Places
 *      summary: Delete a place.
 *      description: Refused with 409, naming what is in the way, while it has places inside it, a team, responses, registered villagers, or a questionnaire of its own (changes it made, questions or categories it added).
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: id
 *         in: path
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully deleted data.
 *        404:
 *          description: Place not found
 *        409:
 *          description: Place is still in use
 *        500:
 *          description: Internal Server Error
 */
router.delete(
    "/:id",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(places_controller.delete_place)
);

module.exports = router;
