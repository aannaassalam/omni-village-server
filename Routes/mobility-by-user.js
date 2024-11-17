const router = require("express").Router();
const mobilityByUser = require("../Controllers/mobility-by-user");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.get_mobility_by_user)
);
router.get(
    "/mobility-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.get_mobility_requirements)
);

router.post(
    "/add-mobility-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.add_mobility_by_user)
);

router.put(
    "/edit-mobility-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.edit_mobility_requirements)
);

module.exports = router;
