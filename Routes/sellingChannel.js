const { checkUser, verifyToken } = require("../Middlewares/user");
const selling_channel_controller = require("../Controllers/sellingChannel");

const router = require("express").Router();

/**
 * @swagger
 * /selling_channel:
 *    get:
 *      tags:
 *        - Selling Channels
 *      summary: Get Selling Channels.
 *      description: Get all the Selling Channels added by current user..
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
router.get(
  "/",
  verifyToken,
  checkUser,
  selling_channel_controller.get_selling_channel
);

/**
 * @swagger
 * /selling_channel/add_selling_channel:
 *    post:
 *      tags:
 *        - Selling Channels
 *      summary: Add Selling Channel.
 *      description: Add a Selling Channel to current user..
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
 *             selling_channel_methods:
 *               type: array
 *               items:
 *                 type: string
 *                 example: 64ee46ad2f3332cd78c7e7e2
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
  "/add_selling_channel",
  verifyToken,
  checkUser,
  selling_channel_controller.add_selling_channel
);

/**
 * @swagger
 * /selling_channel/edit_selling_channel:
 *    post:
 *      tags:
 *        - Selling Channels
 *      summary: Edit Selling Channel.
 *      description: Update a Selling Channel from current user..
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
 *             selling_channel_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             selling_channel_methods:
 *               type: array
 *               items:
 *                  type: string
 *                  example: 64f3acb27652c6eb816ac6db
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
  "/edit_selling_channel",
  verifyToken,
  checkUser,
  selling_channel_controller.update_selling_channel
);

/**
 * @swagger
 * /selling_channel/delete_selling_channel/{id}:
 *    delete:
 *      tags:
 *        - Selling Channels
 *      summary: Delete Selling Channel.
 *      description: Delete a Selling Channels from current user..
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
  "/delete_selling_channel/:id",
  verifyToken,
  checkUser,
  selling_channel_controller.delete_selling_channel
);

/**
 * @swagger
 * /selling_channel/list-all:
 *    get:
 *      tags:
 *        - Selling Channels
 *      summary: Get All Selling Channels
 *      description: Currently Pagination is not working.
 *      produces:
 *        - application/json
 *      parameters:
 *        - in: query
 *          name: limit
 *          schema:
 *            type: integer
 *
 *        - in: query
 *          name: page
 *          schema:
 *            type: integer
 *
 *      responses:
 *        200:
 *          description: Successfully fetched all selling channels.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/list-all", selling_channel_controller.selling_channels_list);

module.exports = router;
