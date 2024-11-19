const router = require("express").Router();
const energy_dropdown = require("../Controllers/energy-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(energy_dropdown.get_energy_dropdown)
);
router.get("/get-all", energy_dropdown.get_all);

router.post(
    "/add-energy-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(energy_dropdown.add_energy_dropdown)
);

module.exports = router;
