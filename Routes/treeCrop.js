const router = require("express").Router();
const tree_crop_controller = require("../Controllers/treeCrop");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /tree_crop/:
 *    get:
 *      tags:
 *        - Tree Crops
 *      summary: Get tree crops.
 *      description: Get all tree crops.
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
router.get("/", tree_crop_controller.get_tree_crop);

/**
 * @swagger
 * /tree_crop/add_tree_crop:
 *    post:
 *      tags:
 *        - Tree Crops
 *      summary: Add tree crop.
 *      description: Add a tree crop.
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
 *               example: coconut
 *
 *      responses:
 *        200:
 *          description: Successfully added data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.post("/add_tree_crop", verifyToken, tree_crop_controller.add_tree_crop);

/**
 * @swagger
 * /tree_crop/edit_tree_crop:
 *    post:
 *      tags:
 *        - Tree Crops
 *      summary: Edit tree crop.
 *      description: Edit a tree crop.
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
 *             tree_crop_id:
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
  "/edit_tree_crop",
  verifyToken,
  tree_crop_controller.edit_tree_crop
);

/**
 * @swagger
 * /tree_crop/{id}:
 *    delete:
 *      tags:
 *        - Tree Crops
 *      summary: Delete tree crop.
 *      description: Delete a tree crop.
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
router.delete("/:id", tree_crop_controller.delete_tree_crop);

module.exports = router;
