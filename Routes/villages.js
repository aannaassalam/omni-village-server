const router = require("express").Router();
const villages_controller = require("../Controllers/villages");
const { checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/:country_name",
    checkUser,
    ControllerWrapper(villages_controller.get_villages)
);

router.get("/", villages_controller.get_all_villages);

router.post("/add_village", checkUser, villages_controller.add_village);
router.post("/edit_village", checkUser, villages_controller.edit_village);
router.delete(
    "/delete_village/:village_id",
    checkUser,
    villages_controller.delete_village
);

module.exports = router;
