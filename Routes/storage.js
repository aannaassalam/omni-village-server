const { checkUser, verifyToken } = require("../Middlewares/user");
const storage_controller = require("../Controllers/storage");

const router = require("express").Router();

/**
 * @swagger
 * /storage:
 *    get:
 *      tags:
 *        - Storage
 *      summary: Get Storages.
 *      description: Get all the Storages added by current user..
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
router.get("/", verifyToken, checkUser, storage_controller.get_storage);

/**
 * @swagger
 * /storage/add_storage:
 *    post:
 *      tags:
 *        - Storage
 *      summary: Add Storage.
 *      description: Add a Storage to current user..
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
 *              storages:
 *                 type: array
 *                 items:
 *                    type: object
 *                    properties:
 *                      storage_method_id:
 *                        type: string
 *                        example: 64ee46ad2f3332cd78c7e7e2
 *                      stock_name:
 *                        type: string
 *                        example: for grains
 *                      stock_quantity:
 *                        type: number
 *                        example: 5
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
  "/add_storage",
  verifyToken,
  checkUser,
  storage_controller.add_storage
);

/**
 * @swagger
 * /storage/edit_storage:
 *    post:
 *      tags:
 *        - Storage
 *      summary: Edit storage.
 *      description: Update a storage from current user..
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
 *              storages:
 *                 type: array
 *                 items:
 *                    type: object
 *                    properties:
 *                      storage_id:
 *                        type: string
 *                        example: 64ee46ad2f3332cd78c7e7e2
 *                      storage_method_id:
 *                        type: string
 *                        example: 64ee46ad2f3332cd78c7e7e2
 *                      stock_quantity:
 *                        type: number
 *                        example: 5
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
  "/edit_storage",
  verifyToken,
  checkUser,
  storage_controller.update_storage
);

/**
 * @swagger
 * /storage/delete_storage/{id}:
 *    delete:
 *      tags:
 *        - Storage
 *      summary: Delete storage.
 *      description: Delete a storage from current user..
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
  "/delete_storage/:id",
  verifyToken,
  checkUser,
  storage_controller.delete_storage
);

/**
 * @swagger
 * /storage/list-all:
 *    get:
 *      tags:
 *        - Storage
 *      summary: Get All Storages
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
 *          description: Successfully fetched all storages.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
// router.get("/list-all", storage_controller.);

module.exports = router;
