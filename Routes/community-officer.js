const router = require("express").Router();
const community_controller = require("../Controllers/community-officer");
const { checkModerator, verifyModeratorToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(community_controller.get_community_officer)
);
router.post(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(community_controller.add_community_officer)
);
router.put(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(community_controller.edit_community_officer)
);
router.delete(
    "/",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(community_controller.delete_community_officer)
);

module.exports = router;
