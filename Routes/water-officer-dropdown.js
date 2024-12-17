const router = require("express").Router();
const water_officer_dropdown = require("../Controllers/water-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(water_officer_dropdown.get_water_officer_dropdown)
);
router.get("/get-all", water_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(water_officer_dropdown.add_water_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(water_officer_dropdown.edit_water_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(water_officer_dropdown.delete_water_officer_data)
);

module.exports = router;
