const router = require("express").Router();
const land_measurement_controller = require("../Controllers/landMeasurement");

/**
 * @swagger
 * /land_measurements/:
 *    get:
 *      tags:
 *        - Land Measurements
 *      summary: Get land measurements.
 *      description: Get all land measurements.
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
router.get("/", land_measurement_controller.get_land_measurements);

module.exports = router;
