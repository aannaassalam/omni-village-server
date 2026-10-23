const router = require("express").Router();
const energy_dashboard_controller = require("../Controllers/dashboard-energy");

router.get("/grid-access", energy_dashboard_controller.getGridAccessData);
router.get("/kwh-consumption", energy_dashboard_controller.getKWhHistogramData);
router.get("/spend-consumption", energy_dashboard_controller.getEnergySpendVsConsumption);
router.get("/fuel-type", energy_dashboard_controller.getFuelMixDonutData);
router.get("/other-fuels", energy_dashboard_controller.getOtherFuelHeatmapData);
router.get("/micro-grid-usage", energy_dashboard_controller.getMicrogridData);
router.get("/renewable-share", energy_dashboard_controller.getRenewableAndMicrogridShare);
router.get("/energy-per-capita", energy_dashboard_controller.getEnergyIntensityRankings);

module.exports = router;
