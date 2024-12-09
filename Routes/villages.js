const router = require("express").Router();
const villages_controller = require("../Controllers/villages");
const {
    checkUser,
    checkModerator,
    verifyModeratorToken,
} = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/get-villages-for-moderator",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(villages_controller.get_villages_for_moderator)
);
router.get("/:country_name", checkUser, villages_controller.get_villages);
router.get("/", villages_controller.get_all_villages);

router.post("/add_village", checkUser, villages_controller.add_village);
router.post("/edit_village", checkUser, villages_controller.edit_village);

router.put(
    "/add-moderator-to-village",
    ControllerWrapper(villages_controller.add_moderator_to_village)
);

router.delete(
    "/delete_village/:village_id",
    checkUser,
    villages_controller.delete_village
);

module.exports = router;
