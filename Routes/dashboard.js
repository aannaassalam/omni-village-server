const router = require("express").Router();
const dashboard_controller = require("../Controllers/dashboard");

router.get(
  "/land_allocation_category_data",
  dashboard_controller.land_allocated_category_data
);

router.get(
  "/land_used_category_data",
  dashboard_controller.land_used_category_data
);

// router.get("/land_used_tags_data", dashboard_controller.land_used_tags_data);

router.get("/selling_channel_data", dashboard_controller.selling_channel_data);
router.get("/storage_data", dashboard_controller.storage_data);

router.get("/food-balance", dashboard_controller.food_balance);

module.exports = router;
