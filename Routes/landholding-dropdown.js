const router = require("express").Router();
const landholding_dropdown = require("../Controllers/landholding-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    landholding_dropdown.get_landholding_dropdown
);

router.post(
    "/add-landholding-dropdown",
    // verifyToken,
    // checkUser,
    landholding_dropdown.add_landholding_dropdown
);

module.exports = router;
