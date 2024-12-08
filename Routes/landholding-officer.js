const router = require("express").Router();
const landholding_controller = require("../Controllers/landholding-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(landholding_controller.get_landholding_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(landholding_controller.add_landholding_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(landholding_controller.edit_landholding_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(landholding_controller.delete_landholding_officer)
);

module.exports = router;
