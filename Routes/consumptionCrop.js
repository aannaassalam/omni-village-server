const router = require("express").Router();
const consumption_crop_controller = require("../Controllers/consumptionCrop");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /consumption_crop/{consumption_type_id}:
 *    get:
 *      tags:
 *        - Consumption Crops
 *      summary: Get consumption crops.
 *      description: Get all consumption crops.
 *      produces:
 *        - application/json
 *
 *      parameters:
 *       - name: consumption_type_id
 *         in: path
 *         description:
 *         required: true
 *         schema:
 *           type: string
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get(
  "/:consumption_type_id",
  consumption_crop_controller.get_consumption_crop
);

/**
 * @swagger
 * /consumption_crop/add_consumption_crop:
 *    post:
 *      tags:
 *        - Consumption Crops
 *      summary: Add consumption crop.
 *      description: Add a consumption crop.
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
 *               example: rice
 *             category:
 *               type: boolean
 *               example: false
 *             categoryId:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             consumption_type_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
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
  "/add_consumption_crop",
  verifyToken,
  consumption_crop_controller.add_consumption_crop
);

/**
 * @swagger
 * /consumption_crop/edit_consumption_crop:
 *    post:
 *      tags:
 *        - Consumption Crops
 *      summary: Edit consumption crop.
 *      description: Edit a consumption crop.
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
 *             name:
 *               type: string
 *               example: legumes
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
  "/edit_consumption_crop",
  verifyToken,
  consumption_crop_controller.edit_consumption_crop
);

/**
 * @swagger
 * /consumption_crop/{id}:
 *    delete:
 *      tags:
 *        - Consumption Crops
 *      summary: Delete consumption crop.
 *      description: Delete a consumption crop.
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
router.delete("/:id", consumption_crop_controller.delete_consumption_crop);

module.exports = router;
