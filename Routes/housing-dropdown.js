const router = require("express").Router();
const housing_dropdown = require("../Controllers/housing-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(housing_dropdown.get_housing_dropdown)
);

router.post(
    "/add-housing-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(housing_dropdown.add_housing_dropdown)
);

module.exports = router;
