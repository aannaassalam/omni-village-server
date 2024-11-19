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
router.get("/get-all", water_dropdown.get_all);

router.post(
    "/add-water-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(water_dropdown.add_water_dropdown)
);

router.put(
    "/edit-water-dropdown",
    // verifyToken,
    ControllerWrapper(water_dropdown.edit_water_data)
);
router.delete(
    "/delete-water-dropdown",
    ControllerWrapper(water_dropdown.delete_water_data)
);

module.exports = router;
