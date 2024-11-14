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
router.get(
    "/get-water-harvesting-capacity",
    verifyToken,
    checkUser,
    ControllerWrapper(water.get_water_harvesting_capacity)
);
router.get(
    "/get-wastewater-disposal",
    verifyToken,
    checkUser,
    ControllerWrapper(water.get_wastewater_disposal)
);
router.get(
    "/get-general-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.get_general_info)
);

router.post(
    "/add-water-usage-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.add_water_usage_entry)
);
router.post(
    "/add-water-harvesting-capacity",
    verifyToken,
    checkUser,
    ControllerWrapper(water.add_water_harvesting_capacity)
);
router.post(
    "/add-wastewater-disposal",
    verifyToken,
    checkUser,
    ControllerWrapper(water.add_wastewater_disposal)
);
router.post(
    "/add-general-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.add_general_info)
);

router.put(
    "/edit-water-usage-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.edit_water_usage_entry)
);
router.put(
    "/edit-water-harvesting-capacity",
    verifyToken,
    checkUser,
    ControllerWrapper(water.edit_water_harvesting_capacity)
);
router.put(
    "/edit-wastewater-disposal",
    verifyToken,
    checkUser,
    ControllerWrapper(water.edit_wastewater_disposal)
);
router.put(
    "/edit-general-info",
    verifyToken,
    checkUser,
    ControllerWrapper(water.edit_general_info)
);

module.exports = router;
