const router = require("express").Router();
const commercial_dashboard_controller = require("../Controllers/dashboard-commercial");

router.get(
  "/business-type-distribution",
  commercial_dashboard_controller.getBusinessTypeDistribution
);
router.get(
  "/business-started",
  commercial_dashboard_controller.getBusinessYearStartedTrend
);
router.get(
  "/legal-structure",
  commercial_dashboard_controller.getLegalStructureBreakdown
);
router.get(
  "/investment-income",
  commercial_dashboard_controller.getInvestmentIncomeLossData
);
router.get(
  "/manpower-source",
  commercial_dashboard_controller.getManpowerSourceBreakdown
);
router.get(
  "/resource-consumption",
  commercial_dashboard_controller.getResourceConsumptionSummary
);
router.get(
  "/support-need",
  commercial_dashboard_controller.getSupportNeedsMatrix
);
router.get(
  "/business-details",
  commercial_dashboard_controller.getBusinessDetailTableData
);

module.exports = router;
