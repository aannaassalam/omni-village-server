const router = require("express").Router();
const dashboard_controller = require("../Controllers/dashboard");
const { getCurrencies } = require("../Middlewares/user");

router.get(
  "/land_allocation_category_data",
  dashboard_controller.land_allocated_category_data
);

router.get(
  "/land_used_category_data",
  dashboard_controller.land_used_category_data
);

router.get(
  "/bifurcated_chart_label",
  getCurrencies,
  dashboard_controller.bifurcated_chart_label
);
router.get(
  "/utilization_chart",
  getCurrencies,
  dashboard_controller.utilization_chart
);

router.get(
  "/income_expenditure",
  getCurrencies,
  dashboard_controller.income_expenditure
);

router.get("/selling_channel_data", dashboard_controller.selling_channel_data);
router.get("/storage_data", dashboard_controller.storage_data);

router.get(
  "/consumption_from_production",
  dashboard_controller.consumption_from_production
);
router.get(
  "/self_grown_by_tag",
  dashboard_controller.self_grown_consumption_data
);
router.get("/self_consumed_data", dashboard_controller.self_consumed_data);
router.get(
  "/purchased_from_neighbours_consumed",
  dashboard_controller.purchased_from_neighbours_consumed
);
router.get(
  "/purchased_from_market_consumed",
  dashboard_controller.purchased_from_market_consumed
);
router.get(
  "/ideal_consumption_by_label",
  dashboard_controller.ideal_consumption_by_label
);
router.get(
  "/ideal_consumption_expected",
  dashboard_controller.ideal_consumption_expected
);

router.get("/food-balance", dashboard_controller.food_balance);

module.exports = router;
