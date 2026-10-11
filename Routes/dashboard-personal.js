const router = require("express").Router();
const personal_dashboard_controller = require("../Controllers/dashboard-personal");

router.get(
  "/personal-expense",
  personal_dashboard_controller.getExpenseByCategory
);
router.get(
  "/local-stacked",
  personal_dashboard_controller.getItemTypeQuantityStackedBar
);
router.get(
  "/local-market",
  personal_dashboard_controller.getLocalVsMarketPrepByProduct
);
router.get(
  "/local-produce-share",
  personal_dashboard_controller.getHouseholdsProducingItems
);

module.exports = router;
