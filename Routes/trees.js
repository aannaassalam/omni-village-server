const { checkUser, verifyToken } = require("../Middlewares/user");
const tree_controller = require("../Controllers/trees");

const router = require("express").Router();

/**
 * @swagger
 * /trees:
 *    get:
 *      tags:
 *        - Trees, Grass & Shrubs
 *      summary: Get trees.
 *      description: Get all the trees, grass & shrubs added by current user..
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
router.get("/", verifyToken, checkUser, tree_controller.get_trees);

/**
 * @swagger
 * /trees/add_tree:
 *    post:
 *      tags:
 *        - Trees, Grass & Shrubs
 *      summary: Add trees.
 *      description: Add a tree, grass or shrub to current user..
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
 *             number_of_trees:
 *               type: string
 *               example: 5
 *             avg_age_of_trees:
 *               type: string
 *               example: less than a year
 *             soil_health:
 *               type: string
 *               example: stable
 *             decreasing_rate:
 *               type: number
 *               example: 5
 *             type_of_fertilizer_used:
 *               type: string
 *               example: organic self made
 *             type_of_pesticide_used:
 *               type: string
 *               example: organic self made
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
 *                      example: Fur
 *                   production_output:
 *                      type: number
 *                      example: 70
 *                   self_consumed:
 *                      type: number
 *                      example: 25
 *                   fed_to_livestock:
 *                      type: number
 *                      example: 0
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
 *                      example: "2023-09-17"
 *                   processing_method:
 *                      type: boolean
 *                      example: true
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
router.post("/add_tree", verifyToken, checkUser, tree_controller.add_trees);

/**
 * @swagger
 * /trees/edit_tree:
 *    post:
 *      tags:
 *        - Trees, Grass & Shrubs
 *      summary: Edit trees.
 *      description: Update a tree, grass or shrub from current user..
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
 *             tree_id:
 *               type: string
 *               example: 64ee46ad2f3332cd78c7e7e2
 *             number_of_trees:
 *               type: string
 *               example: 5
 *             avg_age_of_trees:
 *               type: string
 *               example: less than a year
 *             soil_health:
 *               type: string
 *               example: stable
 *             decreasing_rate:
 *               type: number
 *               example: 5
 *             type_of_fertilizer_used:
 *               type: string
 *               example: organic self made
 *             type_of_pesticide_used:
 *               type: string
 *               example: organic self made
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
 *                   fed_to_livestock:
 *                      type: number
 *                      example: 0
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
 *                      example: "2023-09-17"
 *                   processing_method:
 *                      type: boolean
 *                      example: true
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
router.post("/edit_tree", verifyToken, checkUser, tree_controller.update_trees);

/**
 * @swagger
 * /trees/delete_tree/{id}:
 *    delete:
 *      tags:
 *        - Trees, Grass & Shrubs
 *      summary: Delete tree.
 *      description: Delete a tree, grass or shrub from current user..
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
  "/delete_tree/:id",
  verifyToken,
  checkUser,
  tree_controller.delete_tree
);

module.exports = router;
