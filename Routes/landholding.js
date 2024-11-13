const router = require("express").Router();
const landholding = require("../Controllers/landholding");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.get_landholding)
);

router.put(
    "/update-landholding",
    verifyToken,
    checkUser,
    ControllerWrapper(landholding.update_landholding)
);

module.exports = router;
