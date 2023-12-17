const router = require("express").Router();
const dashboard_controller = require("../Controllers/dashboard");

router.get("/land_allocation_data", dashboard_controller.land_allocated_data);

module.exports = router;
