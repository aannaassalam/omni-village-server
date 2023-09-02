const router = require("express").Router();
const selling_channel_method_controller = require("../Controllers/sellingChannelMethod");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /selling_channel_method/:
 *    get:
 *      tags:
 *        - Selling Channel Method
 *      summary: Get selling channel methods.
 *      description: Get all selling channel methods.
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
router.get("/", selling_channel_method_controller.get_selling_channel_method);

/**
 * @swagger
 * /selling_channel_method/add_selling_channel_method:
 *    post:
 *      tags:
 *        - Selling Channel Method
 *      summary: Add selling channel method.
 *      description: Add a selling channel method.
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
 *               example: Local Market
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
  "/add_selling_channel_method",
  verifyToken,
  selling_channel_method_controller.add_selling_channel_method
);

/**
 * @swagger
 * /selling_channel_method/edit_selling_channel_method:
 *    post:
 *      tags:
 *        - Selling Channel Method
 *      summary: Edit selling channel method.
 *      description: Edit a selling channel method.
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
 *             selling_channel_method_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: Export
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
  "/edit_selling_channel_method",
  verifyToken,
  selling_channel_method_controller.edit_selling_channel_method
);

/**
 * @swagger
 * /selling_channel_method/{id}:
 *    delete:
 *      tags:
 *        - Selling Channel Method
 *      summary: Delete selling channel method.
 *      description: Delete a selling channel method.
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
  "/:id",
  selling_channel_method_controller.delete_selling_channel_method
);

module.exports = router;
