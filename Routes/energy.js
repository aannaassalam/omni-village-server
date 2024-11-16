const router = require("express").Router();
const energy = require("../Controllers/energy");
const { checkUser, verifyToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/get-energy-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.get_energy_information)
);

router.post(
    "/add-electricity-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.add_electricity_information)
);
router.post(
    "/add-petrol-diesel-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.add_petrol_diesel_information)
);
router.post(
    "/add-other-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.add_other_information)
);
router.post(
    "/add-general-info",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.add_general_information)
);

router.put(
    "/edit-electricity-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.edit_electricity_information)
);
router.put(
    "/edit-petrol-diesel-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.edit_petrol_diesel_information)
);
router.put(
    "/edit-other-information",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.edit_other_information)
);
router.put(
    "/edit-general-info",
    verifyToken,
    checkUser,
    ControllerWrapper(energy.edit_general_information)
);

module.exports = router;
