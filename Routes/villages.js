const router = require("express").Router();
const villages_controller = require("../Controllers/villages");

/**
 * @swagger
 * /villages/{country_name}:
 *    get:
 *      tags:
 *        - Villages
 *      summary: Get Villages.
 *      description: Get all Villages.
 *      produces:
 *        - application/json
 *      parameters:
 *        - name: country_name
 *          in: path
 *          description:
 *          required: true
 *          schema:
 *              type: string
 *
 *
 *      responses:
 *        200:
 *          description: Successfully fetched data.
 *        400:
 *          description: Bad request
 *        500:
 *          description: Internal Server Error
 */
router.get("/:country_name", villages_controller.get_villages);

module.exports = router;
