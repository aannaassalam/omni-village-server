const router = require("express").Router();
const landholding_dropdown = require("../Controllers/landholding-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(landholding_dropdown.get_landholding_dropdown)
);
router.get("/get-all", landholding_dropdown.get_all);

router.post(
    "/add-landholding-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(landholding_dropdown.add_landholding_dropdown)
);

module.exports = router;
