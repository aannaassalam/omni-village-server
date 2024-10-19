const { checkUser, verifyToken } = require("../Middlewares/user");
const hunting_controller = require("../Controllers/hunting");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(hunting_controller.get_hunting)
);

router.post(
    "/add_hunting",
    verifyToken,
    checkUser,
    ControllerWrapper(hunting_controller.add_hunting)
);

router.put(
    "/edit_hunting",
    verifyToken,
    checkUser,
    ControllerWrapper(hunting_controller.update_hunting)
);

router.delete(
    "/delete_hunting/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(hunting_controller.delete_hunting)
);

module.exports = router;
