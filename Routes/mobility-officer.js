const router = require("express").Router();
const mobility_controller = require("../Controllers/mobility-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(mobility_controller.get_mobility_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(mobility_controller.add_mobility_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(mobility_controller.edit_mobility_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(mobility_controller.delete_mobility_officer)
);

module.exports = router;
