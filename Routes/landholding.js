const router = require("express").Router();
const landholding = require("../Controllers/landholding");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.get_landholding_by_user)
);

router.get(
    "/get-landholding",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.get_landholding)
);

router.post(
    "/add-landholding",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.add_landholding)
);

router.put(
    "/update-landholding",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.update_landholding)
);

router.delete(
    "/delete-landholding",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.delete_landholding)
);

module.exports = router;
