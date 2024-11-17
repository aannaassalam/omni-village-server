const router = require("express").Router();
const { checkUser, verifyToken } = require("../Middlewares/user");
const mobility = require("../Controllers/mobility");
const mobilityByUser = require("../Controllers/mobility-by-user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/get-mobility-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.get_mobility_by_user)
);
router.get(
    "/get-mobility-details",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.get_mobility_details)
);
router.get(
    "/get-mobility-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.get_mobility_requirements)
);

router.post(
    "add-mobility-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.add_mobility_by_user)
);

router.put(
    "/update-mobility-details",
    verifyToken,
    checkUser,
    ControllerWrapper(mobility.update_mobility_details)
);
router.put(
    "edit-mobility-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(mobilityByUser.edit_mobility_requirements)
);

module.exports = router;
