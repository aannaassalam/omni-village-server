const router = require("express").Router();
const landholding_dashboard_controller = require("../Controllers/dashboard-landholding");

router.get("/parcel-data", landholding_dashboard_controller.getParcelMapData);

router.get(
  "/parcel-size",
  landholding_dashboard_controller.getParcelSizeDistribution
);

router.get(
  "/location-split",
  landholding_dashboard_controller.getLandUseDistribution
);

router.get(
  "/utilisation-split",
  landholding_dashboard_controller.getUtilisationStatus
);

router.get(
  "/usage-purpose",
  landholding_dashboard_controller.getUsagePurposeTreeMap
);

router.get(
  "/land-idle-sankey",
  landholding_dashboard_controller.getIdleLandReasonSankey
);

router.get(
  "/purchase-timeline",
  landholding_dashboard_controller.getYearPurchaseTimeline
);

router.get(
  "/landholding-declaration-vs-use",
  landholding_dashboard_controller.getLandDeclarationVsUse
);

module.exports = router;
