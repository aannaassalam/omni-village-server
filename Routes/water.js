const router = require("express").Router();
const water = require("../Controllers/water");
const { checkUser, verifyToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/get-water-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(water.get_water_by_user)
);
router.get(
    "/get-water-usage-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.get_water_usage_info)
);

router.post(
    "/add-water-usage-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.add_water_usage_entry)
);
module.exports = router;
