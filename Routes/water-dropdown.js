const router = require("express").Router();
const water_dropdown = require("../Controllers/water-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(water_dropdown.get_water_dropdown)
);
router.get("/get_all", water_dropdown.get_all);

router.post(
    "/add-water-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(water_dropdown.add_water_dropdown)
);

module.exports = router;
