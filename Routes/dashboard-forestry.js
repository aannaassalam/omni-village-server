const router = require("express").Router();
const forestry_dashboard_controller = require("../Controllers/dashboard-forestry");


router.get("/forest-area-by-village", forestry_dashboard_controller.getForestAreaByVillage);
router.get("/timber-split", forestry_dashboard_controller.getTimberHarvestSplit);
router.get("/other-produce", forestry_dashboard_controller.getOtherProduceByType);
router.get("/timber-requirement", forestry_dashboard_controller.getTimberNeeds);
router.get("/purpose-cloud", forestry_dashboard_controller.getPurposeWordCloudData);
router.get("/timber-need-harvested", forestry_dashboard_controller.getVillageWiseTimberData);

module.exports = router;
