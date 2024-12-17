const router = require("express").Router();
const mobility_officer_dropdown = require("../Controllers/mobility-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(mobility_officer_dropdown.get_mobility_officer_dropdown)
);
router.get("/get-all", mobility_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(mobility_officer_dropdown.add_mobility_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(mobility_officer_dropdown.edit_mobility_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(mobility_officer_dropdown.delete_mobility_officer_data)
);

module.exports = router;
