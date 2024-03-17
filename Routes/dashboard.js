const router = require("express").Router();
const dashboard_controller = require("../Controllers/dashboard");
const { getCurrencies } = require("../Middlewares/user");

router.get("/all-crops", dashboard_controller.all_crops);

router.get(
  "/land_allocation_category_data",
  dashboard_controller.land_allocated_category_data
);

router.get(
  "/land_used_category_data",
  dashboard_controller.land_used_category_data
);

router.get(
  "/land_used_cultivation",
  dashboard_controller.land_used_cultivation
);

router.get(
  "/bifurcated_chart_label",
  getCurrencies,
  dashboard_controller.bifurcated_chart_label
);
router.get(
  "/bifurcated_chart_crop",
  getCurrencies,
  dashboard_controller.bifurcated_chart_crop
);
router.get("/soil-health", dashboard_controller.soil_health);
router.get("/organic-inorganic", dashboard_controller.organic_inorganic);
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
router.get("/processing_method", dashboard_controller.processing_method);
router.get(
  "/other_information_tree_fish_poultry_charts",
  dashboard_controller.other_information_tree_fish_poultry_charts
);

router.get(
  "/other_information_tree_fish_poultry_charts_all",
  dashboard_controller.other_information_tree_fish_poultry_charts_all
);

router.get("/category_wise_crops", dashboard_controller.category_wise_crops);

router.get("/harvested_products", dashboard_controller.harvested_products);

router.get(
  "/crop_based_product_names",
  dashboard_controller.crop_based_product_names
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
router.get("/consumption_by_crop", dashboard_controller.consumption_by_crop);
router.get("/processing_method", dashboard_controller.processing_method);
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

router.get("/deficiet_chart", dashboard_controller.deficiet_chart);

router.get("/food-balance", dashboard_controller.food_balance);

module.exports = router;
