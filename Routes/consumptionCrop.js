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

router.get(
  "/dashboard",
  consumption_crop_controller.get_consumption_crop_dashboard
);

module.exports = router;
