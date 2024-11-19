const router = require("express").Router();
const mobility_dropdown = require("../Controllers/mobility-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(mobility_dropdown.get_mobility_dropdown)
);
router.get("/get-all", mobility_dropdown.get_all);

router.post(
    "/add-mobility-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(mobility_dropdown.add_mobility_dropdown)
);

router.put(
    "/edit-mobility-dropdown",
    // verifyToken,
    ControllerWrapper(mobility_dropdown.edit_mobility_data)
);
router.delete(
    "/delete-mobility-dropdown",
    ControllerWrapper(mobility_dropdown.delete_mobility_data)
);

module.exports = router;
