const router = require("express").Router();
const poultry_crop_controller = require("../Controllers/poultryCrop");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /poultry_crop/:
 *    get:
 *      tags:
 *        - Poultry Crops
 *      summary: Get Poultry live stocks.
 *      description: Get all Poultry live stocks.
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
router.get("/", poultry_crop_controller.get_poultry_crop);

router.get("/get_all", poultry_crop_controller.get_all_poultry_crop);

/**
 * @swagger
 * /poultry_crop/add_poultry_crop:
 *    post:
 *      tags:
 *        - Poultry Crops
 *      summary: Add poultry crop.
 *      description: Add a poultry crop.
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
 *               example: hen
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
  "/add_poultry_crop",
  // verifyToken,
  poultry_crop_controller.add_poultry_crop
);

/**
 * @swagger
 * /poultry_crop/edit_poultry_crop:
 *    post:
 *      tags:
 *        - Poultry Crops
 *      summary: Edit poultry crop.
 *      description: Edit a poultry crop.
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
 *             poultry_crop_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: bamboo
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
  "/edit_poultry_crop",
  // verifyToken,
  poultry_crop_controller.edit_poultry_crop
);

/**
 * @swagger
 * /poultry_crop/{id}:
 *    delete:
 *      tags:
 *        - Poultry Crops
 *      summary: Delete poultry crop.
 *      description: Delete a poultry crop.
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
router.delete("/:id", poultry_crop_controller.delete_poultry_crop);

module.exports = router;
