const router = require("express").Router();
const energy_officer_dropdown = require("../Controllers/energy-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(energy_officer_dropdown.get_energy_officer_dropdown)
);
router.get("/get-all", energy_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(energy_officer_dropdown.add_energy_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(energy_officer_dropdown.edit_energy_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(energy_officer_dropdown.delete_energy_officer_data)
);

module.exports = router;
