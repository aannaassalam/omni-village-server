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
router.get("/get_all", mobility_dropdown.get_all);

router.post(
    "/add-mobility-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(mobility_dropdown.add_mobility_dropdown)
);

module.exports = router;
