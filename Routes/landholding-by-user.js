const router = require("express").Router();
const landholding_by_user = require("../Controllers/landholding-by-user");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/landholding-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding_by_user.get_landholding_requirements)
);

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding_by_user.get_landholding_by_user_data)
);

router.post(
    "/add-landholding-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding_by_user.add_landholding_by_user_data)
);

router.put(
    "/edit-landholding-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding_by_user.edit_landholding_by_user_data)
);

router.put(
    "/edit-landholding-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding_by_user.edit_landholding_requirements)
);

module.exports = router;
