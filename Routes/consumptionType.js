const router = require("express").Router();
const consumption_type_controller = require("../Controllers/consumptionType");
const { verifyToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    ControllerWrapper(consumption_type_controller.get_consumption_type)
);

router.post(
    "/add_consumption_type",
    verifyToken,
    ControllerWrapper(consumption_type_controller.add_consumption_type)
);

router.put(
    "/edit_consumption_type",
    verifyToken,
    ControllerWrapper(consumption_type_controller.edit_consumption_type)
);

router.delete(
    "/:id",
    ControllerWrapper(consumption_type_controller.delete_consumption_type)
);

module.exports = router;
