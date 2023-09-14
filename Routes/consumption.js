const { checkUser, verifyToken } = require("../Middlewares/user");
const consumption_controller = require("../Controllers/consumption");

const router = require("express").Router();

/**
 * @swagger
 * /consumption:
 *    get:
 *      tags:
 *        - Consumption
 *      summary: Get Consumptions.
 *      description: Get all the Consumption added by current user..
 *      produces:
 *        - application/json
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/", verifyToken, checkUser, consumption_controller.get_consumption);

/**
 * @swagger
 * /consumption/add_consumption:
 *    post:
 *      tags:
 *        - Consumption
 *      summary: Add Consumption.
 *      description: Add a Consumption to current user..
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
 *             consumption_crop_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             total_quantity:
 *               type: number
 *               example: 50
 *             purchased_from_market:
 *               type: number
 *               example: 5
 *             purchased_from_neighbours:
 *               type: number
 *               example: 20
 *             self_grown:
 *               type: number
 *               example: 30
 *             status:
 *               type: number
 *               example: 1
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post(
  "/add_consumption",
  verifyToken,
  checkUser,
  consumption_controller.add_consumption
);

/**
 * @swagger
 * /consumption/edit_consumption:
 *    post:
 *      tags:
 *        - Consumption
 *      summary: Edit consumption.
 *      description: Update a consumption from current user..
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
 *             consumption_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             total_quantity:
 *               type: number
 *               example: 50
 *             purchased_from_market:
 *               type: number
 *               example: 5
 *             purchased_from_neighbours:
 *               type: number
 *               example: 20
 *             self_grown:
 *               type: number
 *               example: 30
 *             status:
 *               type: number
 *               example: 1
 *
 *      responses:
 *        200:
 *          description: Successfully updated data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post(
  "/edit_consumption",
  verifyToken,
  checkUser,
  consumption_controller.update_consumption
);

/**
 * @swagger
 * /consumption/delete_consumption/{id}:
 *    delete:
 *      tags:
 *        - Consumption
 *      summary: Delete consumption.
 *      description: Delete a consumption from current user..
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
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.delete(
  "/delete_consumption/:id",
  verifyToken,
  checkUser,
  consumption_controller.delete_consumption
);

module.exports = router;
