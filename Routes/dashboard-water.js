const router = require("express").Router();
const water_dashboard_controller = require("../Controllers/dashboard-water");

router.get(
  "/water-consumption",
  water_dashboard_controller.getWaterConsumptionHistogram
);
router.get(
  "/water-sources",
  water_dashboard_controller.getWaterSourceDistribution
);
router.get(
  "/source-quality",
  water_dashboard_controller.getWaterSourceQualityMatrix
);
router.get(
  "/source-expense",
  water_dashboard_controller.getAverageExpensePerSource
);
router.get(
  "/harvesting-capacity",
  water_dashboard_controller.getWaterHarvestingCapacity
);
router.get(
  "/waste-disposal",
  water_dashboard_controller.getWastewaterDisposalData
);
router.get(
  "/waste-recycle",
  water_dashboard_controller.getWaterRecyclingAdoption
);
router.get(
  "/waste-scarcity",
  water_dashboard_controller.getScarcitySeverityData
);
router.get(
  "/waste-meter",
  water_dashboard_controller.getMeterCoverage
);

module.exports = router;
