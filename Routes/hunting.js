const { checkUser, verifyToken } = require("../Middlewares/user");
const hunting_controller = require("../Controllers/hunting");

const router = require("express").Router();

/**
 * @swagger
 * /hunting:
 *    get:
 *      tags:
 *        - Hunting
 *      summary: Get Huntings.
 *      description: Get all the Hunting added by current user..
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
router.get("/", verifyToken, checkUser, hunting_controller.get_hunting);

/**
 * @swagger
 * /hunting/add_hunting:
 *    post:
 *      tags:
 *        - Hunting
 *      summary: Add Hunting.
 *      description: Add a Hunting to current user..
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
 *             hunting_crop_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             number_hunted:
 *               type: number
 *               example: 5
 *             meat:
 *               type: number
 *               example: 5
 *             self_consumed:
 *               type: number
 *               example: 20
 *             sold_to_neighbours:
 *               type: number
 *               example: 30
 *             sold_in_consumer_market:
 *               type: number
 *               example: 40
 *             wastage:
 *                type: number
 *                example: 5
 *             other:
 *                type: string
 *                example: Retain
 *             other_value:
 *                type: number
 *                example: 5
 *             weight_measurement:
 *               type: string
 *               example: kg
 *             income_from_sale:
 *               type: number
 *               example: 700
 *             expenditure_on_inputs:
 *               type: number
 *               example: 500
 *             yeild:
 *                type: number
 *                example: 9
 *             processing_method:
 *                type: boolean
 *                example: true
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
  "/add_hunting",
  verifyToken,
  checkUser,
  hunting_controller.add_hunting
);

/**
 * @swagger
 * /hunting/edit_hunting:
 *    post:
 *      tags:
 *        - Hunting
 *      summary: Edit hunting.
 *      description: Update a hunting from current user..
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
 *             hunting_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             number_hunted:
 *               type: number
 *               example: 5
 *             meat:
 *               type: number
 *               example: 5
 *             self_consumed:
 *               type: number
 *               example: 20
 *             sold_to_neighbours:
 *               type: number
 *               example: 30
 *             sold_in_consumer_market:
 *               type: number
 *               example: 40
 *             wastage:
 *                type: number
 *                example: 5
 *             other:
 *                type: string
 *                example: Retain
 *             other_value:
 *                type: number
 *                example: 5
 *             weight_measurement:
 *               type: string
 *               example: kg
 *             income_from_sale:
 *               type: number
 *               example: 700
 *             expenditure_on_inputs:
 *               type: number
 *               example: 500
 *             yeild:
 *                type: number
 *                example: 9
 *             processing_method:
 *                type: boolean
 *                example: true
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
  "/edit_hunting",
  verifyToken,
  checkUser,
  hunting_controller.update_hunting
);

/**
 * @swagger
 * /hunting/delete_hunting/{id}:
 *    delete:
 *      tags:
 *        - Hunting
 *      summary: Delete hunting.
 *      description: Delete a hunting from current user..
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
  "/delete_hunting/:id",
  verifyToken,
  checkUser,
  hunting_controller.delete_hunting
);

module.exports = router;
