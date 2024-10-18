const { checkUser, verifyToken } = require("../Middlewares/user");
const fishery_controller = require("../Controllers/fishery");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/:fishery_type",
    verifyToken,
    checkUser,
    ControllerWrapper(fishery_controller.get_fishery)
);

router.post(
    "/add_fishery",
    verifyToken,
    checkUser,
    ControllerWrapper(fishery_controller.add_fishery)
);

router.put(
    "/edit_fishery",
    verifyToken,
    checkUser,
    ControllerWrapper(fishery_controller.update_fishery)
);

router.delete(
    "/delete_fishery/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(fishery_controller.delete_fishery)
);

module.exports = router;
