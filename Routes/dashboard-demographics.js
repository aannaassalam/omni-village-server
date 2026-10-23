const router = require("express").Router();
const demographic_dashboard_controller = require("../Controllers/dashboard-demographics");

router.get("/marital-status", demographic_dashboard_controller.getMaritalStatusByVillage);
router.get("/diet-pattern", demographic_dashboard_controller.getDietShareByVillageAndOptionalGender);
router.get("/bmi-distribution", demographic_dashboard_controller.getBMIDistributionByVillageAndOptionalGender);
router.get("/language-heatmap", demographic_dashboard_controller.getLanguageProficiencyHeatMap);
router.get("/chronic-disease-prevalence", demographic_dashboard_controller.getChronicDiseasePrevalence);
router.get("/income-range", demographic_dashboard_controller.getIncomeRangeByAgeAndOptionalGender);
router.get("/motor-disability", demographic_dashboard_controller.getMotorDisabilityPrevalenceByVillageAndOptionalGender);
router.get("/population-snapshot", demographic_dashboard_controller.getVillagePopulationSnapshot);
router.get("/occupation-tree", demographic_dashboard_controller.getOccupationTreeMapData);
router.get("/savings-investments", demographic_dashboard_controller.getDualKPISavings);
router.get("/habits-data", demographic_dashboard_controller.getHabitsData);
router.get("/education-aspirations", demographic_dashboard_controller.getEducationSankeyData);
module.exports = router;
