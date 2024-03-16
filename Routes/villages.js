const router = require("express").Router();
const villages_controller = require("../Controllers/villages");
const { checkUser } = require("../Middlewares/user");

/**
 * @swagger
 * /villages/{country_name}:
 *    get:
 *      tags:
 *        - Villages
 *      summary: Get Villages.
 *      description: Get all Villages.
 *      produces:
 *        - application/json
 *      parameters:
 *        - name: country_name
 *          in: path
 *          description:
 *          schema:
 *              type: string
 *
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/:country_name", checkUser, villages_controller.get_villages);

router.get("/", villages_controller.get_all_villages);

/**
 * @swagger
 * /villages/add_village:
 *    post:
 *      tags:
 *        - Villages
 *      summary: Add Village.
 *      description: Add new Village.
 *      produces:
 *        - application/json
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
 *               example: Kolkata
 *             country:
 *               type: string
 *               example: India
 *
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post("/add_village", checkUser, villages_controller.add_village);
router.post("/edit_village", checkUser, villages_controller.edit_village);
router.delete(
  "/delete_village/:village_id",
  checkUser,
  villages_controller.delete_village
);

module.exports = router;
