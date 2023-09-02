const router = require("express").Router();
const storage_method_controller = require("../Controllers/storageMethod");
const { verifyToken } = require("../Middlewares/user");

/**
 * @swagger
 * /storage_method/:
 *    get:
 *      tags:
 *        - Storage Method
 *      summary: Get storage methods.
 *      description: Get all storage methods.
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
router.get("/", storage_method_controller.get_storage_method);

/**
 * @swagger
 * /storage_method/add_storage_method:
 *    post:
 *      tags:
 *        - Storage Method
 *      summary: Add storage method.
 *      description: Add a storage method.
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
 *               example: Cold Storage
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
  "/add_storage_method",
  verifyToken,
  storage_method_controller.add_storage_method
);

/**
 * @swagger
 * /storage_method/edit_storage_method:
 *    post:
 *      tags:
 *        - Storage Method
 *      summary: Edit storage method.
 *      description: Edit a storage method.
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
 *             storage_method_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             name:
 *               type: string
 *               example: Pallet Racking
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
  "/edit_storage_method",
  verifyToken,
  storage_method_controller.edit_storage_method
);

/**
 * @swagger
 * /storage_method/{id}:
 *    delete:
 *      tags:
 *        - Storage Method
 *      summary: Delete storage method.
 *      description: Delete a storage method.
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
router.delete("/:id", storage_method_controller.delete_storage_method);

module.exports = router;
