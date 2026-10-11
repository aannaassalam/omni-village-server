const router = require("express").Router();
const housing_dashboard_controller = require("../Controllers/dashboard-housing");

router.get(
  "/renovation-urgency",
  housing_dashboard_controller.getHousingRenovationUrgencyData
);

router.get("/housing-type", housing_dashboard_controller.getHouseTypeDonutData);

router.get(
  "/unit-floor-data",
  housing_dashboard_controller.getFloorsUnitsScatterData
);

router.get(
  "/built-renovated",
  housing_dashboard_controller.getYearBuiltRenovatedData
);

router.get("/amenities", housing_dashboard_controller.getAmenitiesRadarData);

router.get(
  "/amenities-heatmap",
  housing_dashboard_controller.getAmenityHeatmapData
);

router.get(
  "/equipment-data",
  housing_dashboard_controller.getEquipmentDemandData
);

router.get(
  "/expansion-demand",
  housing_dashboard_controller.getExpansionDemandData
);

router.get(
  "/renovation-demand",
  housing_dashboard_controller.getRenovationDemandData
);

module.exports = router;
