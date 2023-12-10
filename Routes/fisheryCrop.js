const router = require("express").Router();
const fishery_crop_controller = require("../Controllers/fisheryCrop");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /fishery_crop/:
 *    get:
 *      tags:
 *        - Fishery Crops
 *      summary: Get fishery crops.
 *      description: Get all fishery crops.
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
router.get("/", fishery_crop_controller.get_fishery_crop);

router.get("/get_all", fishery_crop_controller.get_all_fishery_crop);

/**
 * @swagger
 * /fishery_crop/add_fishery_crop:
 *    post:
 *      tags:
 *        - Fishery Crops
 *      summary: Add fishery crop.
 *      description: Add a fishery crop.
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
 *               example: salmon
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
  "/add_fishery_crop",
  verifyToken,
  fishery_crop_controller.add_fishery_crop
);

/**
 * @swagger
 * /fishery_crop/edit_fishery_crop:
 *    post:
 *      tags:
 *        - Fishery Crops
 *      summary: Edit fishery crop.
 *      description: Edit a fishery crop.
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
 *             fishery_crop_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: tuna
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
  "/edit_fishery_crop",
  verifyToken,
  fishery_crop_controller.edit_fishery_crop
);

/**
 * @swagger
 * /fishery_crop/{id}:
 *    delete:
 *      tags:
 *        - Fishery Crops
 *      summary: Delete fishery crop.
 *      description: Delete a fishery crop.
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
router.delete("/:id", fishery_crop_controller.delete_fishery_crop);

module.exports = router;
