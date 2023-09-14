const router = require("express").Router();
const consumption_type_controller = require("../Controllers/consumptionType");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /consumption_type/:
 *    get:
 *      tags:
 *        - Consumption Types
 *      summary: Get consumption types.
 *      description: Get all consumption types.
 *      produces:
 *        - application/json
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/", consumption_type_controller.get_consumption_type);

/**
 * @swagger
 * /consumption_type/add_consumption_type:
 *    post:
 *      tags:
 *        - Consumption Types
 *      summary: Add consumption type.
 *      description: Add a consumption type.
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
 *               example: Grains
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
  "/add_consumption_type",
  verifyToken,
  consumption_type_controller.add_consumption_type
);

/**
 * @swagger
 * /consumption_type/edit_consumption_type:
 *    post:
 *      tags:
 *        - Consumption Types
 *      summary: Edit consumption type.
 *      description: Edit a consumption type.
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
 *             consumption_type_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: Nuts
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
  "/edit_consumption_type",
  verifyToken,
  consumption_type_controller.edit_consumption_type
);

/**
 * @swagger
 * /consumption_type/{id}:
 *    delete:
 *      tags:
 *        - Consumption Types
 *      summary: Delete consumption type.
 *      description: Delete a consumption type.
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
router.delete("/:id", consumption_type_controller.delete_consumption_type);

module.exports = router;
