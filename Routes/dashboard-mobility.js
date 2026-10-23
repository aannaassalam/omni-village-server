const router = require("express").Router();
const mobility_dashboard_controller = require("../Controllers/dashboard-mobility");

router.get(
  "/vehicle-type-distribution",
  mobility_dashboard_controller.getVehicleTypeDistribution
);
router.get(
  "/travel-distance-split",
  mobility_dashboard_controller.getTravelDistanceSplit
);
router.get(
  "/usage-purpose",
  mobility_dashboard_controller.getPurposeOfUsageData
);
router.get(
  "/usage-frequency",
  mobility_dashboard_controller.getFrequencyAndVehicleTypeData
);
router.get(
  "/vehicle-requirement",
  mobility_dashboard_controller.getVehicleRequirementByTypeBarChartData
);
router.get(
  "/vehicle-urgency",
  mobility_dashboard_controller.getVehicleRequirementUrgencyAndTypeWaterfallData
);
router.get(
  "/vehicle-per-hh",
  mobility_dashboard_controller.getAverageVehiclesPerUser
);
router.get(
  "/mobility-gap",
  mobility_dashboard_controller.getMobilityGapHeatmap
);

module.exports = router;
