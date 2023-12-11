const { checkUser, verifyToken } = require("../Middlewares/user");
const fishery_controller = require("../Controllers/fishery");

const router = require("express").Router();

router.get(
  "/get_all",
  // verifyToken,
  // checkUser,
  fishery_controller.get_all_fishery
);

/**
 * @swagger
 * /fishery/{fishery_type}:
 *    get:
 *      tags:
 *        - Fishery
 *      summary: Get Fisheries.
 *      description: Get all the Fishery added by current user..
 *      produces:
 *        - application/json
 *
 *      parameters:
 *        - name: fishery_type
 *          in: path
 *          required: true
 *          schema:
 *            type: string
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
  "/:fishery_type",
  verifyToken,
  checkUser,
  fishery_controller.get_fishery
);

/**
 * @swagger
 * /fishery/add_fishery:
 *    post:
 *      tags:
 *        - Fishery
 *      summary: Add Fishery.
 *      description: Add a Fishery to current user..
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
 *             fishery_type:
 *               type: string
 *               example: pond
 *             pond_name:
 *               type: string
 *               example: pond 1
 *             important_information:
 *               type: object
 *               properties:
 *                  number_of_fishes:
 *                     type: number
 *                     example: 5
 *                  type_of_feed:
 *                      type: string
 *                      example: Insects
 *             production_information:
 *                  type: object
 *                  properties:
 *                      total_feed:
 *                          type: number
 *                          example: 100
 *                      production_output:
 *                          type: number
 *                          example: 100
 *                      self_consumed:
 *                          type: number
 *                          example: 10
 *                      sold_to_neighbours:
 *                          type: number
 *                          example: 15
 *                      sold_for_industrial_use:
 *                          type: number
 *                          example: 50
 *                      wastage:
 *                          type: number
 *                          example: 5
 *                      other:
 *                          type: string
 *                          example: Retain
 *                      other_value:
 *                          type: number
 *                          example: 5
 *                      income_from_sale:
 *                          type: number
 *                          example: 1000
 *                      expenditure_on_inputs:
 *                          type: number
 *                          example: 100
 *                      yeild:
 *                          type: number
 *                          example: 10
 *             processing_method:
 *               type: boolean
 *               example: true
 *             weight_measurement:
 *                type: string
 *                example: kg
 *             status:
 *               type: number
 *               example: 1
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
  "/add_fishery",
  verifyToken,
  checkUser,
  fishery_controller.add_fishery
);

/**
 * @swagger
 * /fishery/edit_fishery:
 *    post:
 *      tags:
 *        - Fishery
 *      summary: Edit fishery.
 *      description: Update a fishery from current user..
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
 *             fishery_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             important_information:
 *               type: object
 *               properties:
 *                  number_of_fishes:
 *                     type: number
 *                     example: 5
 *                  type_of_feed:
 *                      type: string
 *                      example: Insects
 *             production_information:
 *                  type: object
 *                  properties:
 *                      total_feed:
 *                          type: number
 *                          example: 100
 *                      production_output:
 *                          type: number
 *                          example: 100
 *                      self_consumed:
 *                          type: number
 *                          example: 10
 *                      sold_to_neighbours:
 *                          type: number
 *                          example: 15
 *                      sold_for_industrial_use:
 *                          type: number
 *                          example: 50
 *                      wastage:
 *                          type: number
 *                          example: 5
 *                      other:
 *                          type: string
 *                          example: Retain
 *                      other_value:
 *                          type: number
 *                          example: 5
 *                      income_from_sale:
 *                          type: number
 *                          example: 1000
 *                      expenditure_on_inputs:
 *                          type: number
 *                          example: 100
 *                      yeild:
 *                          type: number
 *                          example: 10
 *             processing_method:
 *               type: boolean
 *               example: true
 *             weight_measurement:
 *                type: string
 *                example: kg
 *             status:
 *               type: number
 *               example: 1
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
  "/edit_fishery",
  verifyToken,
  checkUser,
  fishery_controller.update_fishery
);

/**
 * @swagger
 * /fishery/delete_fishery/{id}:
 *    delete:
 *      tags:
 *        - Fishery
 *      summary: Delete fishery.
 *      description: Delete a fishery from current user..
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
  "/delete_fishery/:id",
  // verifyToken,
  // checkUser,
  fishery_controller.delete_fishery
);

/**
 * @swagger
 * /fishery/list-all:
 *    get:
 *      tags:
 *        - Fishery
 *      summary: Get All Fishery
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
 *          description: Successfully fetched all fisheries.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/list-all", fishery_controller.fishery_list);

module.exports = router;
