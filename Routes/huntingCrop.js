const router = require("express").Router();
const hunting_crop_controller = require("../Controllers/huntingCrop");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /hunting_crop/:
 *    get:
 *      tags:
 *        - Hunting Crops
 *      summary: Get hunting live stocks.
 *      description: Get all hunting live stocks.
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
router.get("/", hunting_crop_controller.get_hunting_crop);

/**
 * @swagger
 * /hunting_crop/add_hunting_crop:
 *    post:
 *      tags:
 *        - Hunting Crops
 *      summary: Add hunting crop.
 *      description: Add a hunting crop.
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
 *               example: deer
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
  "/add_hunting_crop",
  verifyToken,
  hunting_crop_controller.add_hunting_crop
);

/**
 * @swagger
 * /hunting_crop/edit_hunting_crop:
 *    post:
 *      tags:
 *        - Hunting Crops
 *      summary: Edit hunting crop.
 *      description: Edit a hunting crop.
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
 *             name:
 *               type: string
 *               example: deer
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
  "/edit_hunting_crop",
  verifyToken,
  hunting_crop_controller.edit_hunting_crop
);

/**
 * @swagger
 * /hunting_crop:
 *    delete:
 *      tags:
 *        - Hunting Crops
 *      summary: Delete hunting crop.
 *      description: Delete a hunting crop.
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
 *
 *      responses:
 *        200:
 *          description: Successfully deleted data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.delete("/", hunting_crop_controller.delete_hunting_crop);

module.exports = router;
