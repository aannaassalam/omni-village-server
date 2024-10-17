const router = require("express").Router();
const land_measurement_controller = require("../Controllers/landMeasurement");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    ControllerWrapper(land_measurement_controller.get_land_measurements)
);

module.exports = router;
