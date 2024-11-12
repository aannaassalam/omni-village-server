const router = require("express").Router();
const housing_dropdown = require("../Controllers/housing-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    housing_dropdown.get_housing_dropdown
);

router.post(
    "/add-housing-dropdown",
    // verifyToken,
    // checkUser,
    housing_dropdown.add_housing_dropdown
);

module.exports = router;
