const { checkUser, verifyToken } = require("../Middlewares/user");
const storage_controller = require("../Controllers/storage");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(storage_controller.get_storage)
);

router.post(
    "/add_storage",
    verifyToken,
    checkUser,
    ControllerWrapper(storage_controller.add_storage)
);

router.put(
    "/edit_storage",
    verifyToken,
    checkUser,
    ControllerWrapper(storage_controller.update_storage)
);

router.delete(
    "/delete_storage/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(storage_controller.delete_storage)
);

module.exports = router;
