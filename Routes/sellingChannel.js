const { checkUser, verifyToken } = require("../Middlewares/user");
const selling_channel_controller = require("../Controllers/sellingChannel");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(selling_channel_controller.get_selling_channel)
);

router.post(
    "/add_selling_channel",
    verifyToken,
    checkUser,
    ControllerWrapper(selling_channel_controller.add_selling_channel)
);

router.put(
    "/edit_selling_channel",
    verifyToken,
    checkUser,
    ControllerWrapper(selling_channel_controller.update_selling_channel)
);

router.delete(
    "/delete_selling_channel/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(selling_channel_controller.delete_selling_channel)
);

module.exports = router;
