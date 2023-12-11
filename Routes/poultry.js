const { checkUser, verifyToken } = require("../Middlewares/user");
const poultry_controller = require("../Controllers/poultry");

const router = require("express").Router();

/**
 * @swagger
 * /poultry:
 *    get:
 *      tags:
 *        - Poultry
 *      summary: Get Poultries.
 *      description: Get all the Poultry added by current user..
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
router.get("/", verifyToken, checkUser, poultry_controller.get_poultries);

router.get(
  "/get_all",
  // verifyToken, checkUser,
  poultry_controller.get_all_poultry
);

/**
 * @swagger
 * /poultry/add_poultry:
 *    post:
 *      tags:
 *        - Poultry
 *      summary: Add live stock.
 *      description: Add a live stock to current user..
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
 *             number:
 *               type: number
 *               example: 5
 *             avg_age_of_live_stocks:
 *               type: number
 *               example: 5
 *             avg_age_time_period:
 *               type: string
 *               example: months
 *             type_of_feed:
 *               type: string
 *               example: other
 *             other_type_of_feed:
 *               type: string
 *               example: some feed
 *             personal_information:
 *               type: object
 *               properties:
 *                 total_feed:
 *                   type: number
 *                   example: 70
 *                 self_produced:
 *                    type: number
 *                    example: 12
 *                 neighbours:
 *                    type: number
 *                    example: 15
 *                 purchased_from_market:
 *                    type: number
 *                    example: 10
 *                 other:
 *                    type: string
 *                    example: storage
 *                 other_value:
 *                    type: number
 *                    example: 17
 *             income_from_sale:
 *               type: number
 *               example: 700
 *             expenditure_on_inputs:
 *               type: number
 *               example: 500
 *             products:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                      type: string
 *                      example: skin
 *                   production_output:
 *                      type: number
 *                      example: 70
 *                   self_consumed:
 *                      type: number
 *                      example: 25
 *                   sold_to_neighbours:
 *                      type: number
 *                      example: 10
 *                   sold_for_industrial_use:
 *                      type: number
 *                      example: 30
 *                   wastage:
 *                      type: number
 *                      example: 5
 *                   other:
 *                      type: string
 *                      example: Retain
 *                   other_value:
 *                      type: number
 *                      example: 5
 *                   month_harvested:
 *                      type: string
 *                      format: date
 *                      example: "30-08-2023"
 *                   processing_method:
 *                      type: boolean
 *                      example: true
 *             steroids:
 *               type: boolean
 *               example: true
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
  "/add_poultry",
  verifyToken,
  checkUser,
  poultry_controller.add_poultries
);

/**
 * @swagger
 * /poultry/edit_poultry:
 *    post:
 *      tags:
 *        - Poultry
 *      summary: Edit poultry.
 *      description: Update a poultry from current user..
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
 *             poultry_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             number:
 *               type: number
 *               example: 5
 *             avg_age_of_live_stocks:
 *               type: number
 *               example: 5
 *             avg_age_time_period:
 *               type: string
 *               example: months
 *             type_of_feed:
 *               type: string
 *               example: other
 *             other_type_of_feed:
 *               type: string
 *               example: some feed
 *             personal_information:
 *               type: object
 *               properties:
 *                 total_feed:
 *                   type: number
 *                   example: 70
 *                 self_produced:
 *                    type: number
 *                    example: 12
 *                 neighbours:
 *                    type: number
 *                    example: 15
 *                 purchased_from_market:
 *                    type: number
 *                    example: 10
 *                 other:
 *                    type: string
 *                    example: storage
 *                 other_value:
 *                    type: number
 *                    example: 17
 *             income_from_sale:
 *               type: number
 *               example: 700
 *             expenditure_on_inputs:
 *               type: number
 *               example: 500
 *             products:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                      type: string
 *                      example: 64ee46d22f3332cd78c7e7e5
 *                   production_output:
 *                      type: number
 *                      example: 70
 *                   self_consumed:
 *                      type: number
 *                      example: 25
 *                   sold_to_neighbours:
 *                      type: number
 *                      example: 10
 *                   sold_for_industrial_use:
 *                      type: number
 *                      example: 30
 *                   wastage:
 *                      type: number
 *                      example: 5
 *                   other:
 *                      type: string
 *                      example: Retain
 *                   other_value:
 *                      type: number
 *                      example: 5
 *                   month_harvested:
 *                      type: string
 *                      format: date
 *                      example: "30-08-2023"
 *                   processing_method:
 *                      type: boolean
 *                      example: true
 *             steroids:
 *               type: boolean
 *               example: true
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
  "/edit_poultry",
  verifyToken,
  checkUser,
  poultry_controller.update_poultries
);

/**
 * @swagger
 * /poultry/delete_poultry/{id}:
 *    delete:
 *      tags:
 *        - Poultry
 *      summary: Delete poultry.
 *      description: Delete a poultry from current user..
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
  "/delete_poultry/:id",
  // verifyToken,
  // checkUser,
  poultry_controller.delete_poultry
);

/**
 * @swagger
 * /poultry/list-all:
 *    get:
 *      tags:
 *        - Poultry
 *      summary: Get All Poultries
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
 *          description: Successfully fetched all poultries.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/list-all", poultry_controller.poultry_list);

module.exports = router;
