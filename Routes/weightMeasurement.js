const router = require("express").Router();
const weight_measurement_controller = require("../Controllers/weightMeasurement");

/**
 * @swagger
 * /weight_measurements/:
 *    get:
 *      tags:
 *        - Weight Measurements
 *      summary: Get weight measurements.
 *      description: Get all weight measurements.
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
router.get("/", weight_measurement_controller.get_weight_measurements);

module.exports = router;
