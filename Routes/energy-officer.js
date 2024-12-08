const router = require("express").Router();
const energy_controller = require("../Controllers/energy-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(energy_controller.get_energy_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(energy_controller.add_energy_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(energy_controller.edit_energy_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(energy_controller.delete_energy_officer)
);

module.exports = router;
