const router = require("express").Router();
const weight_measurement_controller = require("../Controllers/weightMeasurement");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    ControllerWrapper(weight_measurement_controller.get_weight_measurements)
);

module.exports = router;
