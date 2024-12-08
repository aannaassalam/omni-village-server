const router = require("express").Router();
const water_controller = require("../Controllers/water-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(water_controller.get_water_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(water_controller.add_water_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(water_controller.edit_water_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(water_controller.delete_water_officer)
);

module.exports = router;
