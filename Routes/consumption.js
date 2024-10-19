const { checkUser, verifyToken } = require("../Middlewares/user");
const consumption_controller = require("../Controllers/consumption");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/:consumption_type_id",
    verifyToken,
    checkUser,
    ControllerWrapper(consumption_controller.get_consumptions)
);

router.post(
    "/add_consumption",
    verifyToken,
    checkUser,
    ControllerWrapper(consumption_controller.add_consumption)
);

router.put(
    "/edit_consumption",
    verifyToken,
    checkUser,
    ControllerWrapper(consumption_controller.update_consumption)
);

router.delete(
    "/delete_consumption/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(consumption_controller.delete_consumption)
);

module.exports = router;
