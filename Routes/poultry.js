const { checkUser, verifyToken } = require("../Middlewares/user");
const poultry_controller = require("../Controllers/poultry");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(poultry_controller.get_poultries)
);

router.post(
    "/add_poultry",
    verifyToken,
    checkUser,
    ControllerWrapper(poultry_controller.add_poultries)
);

router.put(
    "/edit_poultry",
    verifyToken,
    checkUser,
    ControllerWrapper(poultry_controller.update_poultries)
);

router.delete(
    "/delete_poultry/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(poultry_controller.delete_poultry)
);

module.exports = router;
