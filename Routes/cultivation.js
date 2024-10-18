const { checkUser, verifyToken } = require("../Middlewares/user");
const cultivation_controller = require("../Controllers/cultivation");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.post(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(cultivation_controller.get_cultivation)
);

router.post(
    "/add_cultivation",
    verifyToken,
    checkUser,
    ControllerWrapper(cultivation_controller.add_cultivation)
);
router.put(
    "/edit_cultivation",
    verifyToken,
    checkUser,
    ControllerWrapper(cultivation_controller.update_cultivation)
);
router.delete(
    "/delete_cultivation/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(cultivation_controller.delete_cultivation)
);

module.exports = router;
