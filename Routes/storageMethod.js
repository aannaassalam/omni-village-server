const router = require("express").Router();
const storage_method_controller = require("../Controllers/storageMethod");
const { verifyToken } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    ControllerWrapper(storage_method_controller.get_storage_method)
);

router.post(
    "/add_storage_method",
    verifyToken,
    ControllerWrapper(storage_method_controller.add_storage_method)
);

router.post(
    "/edit_storage_method",
    verifyToken,
    ControllerWrapper(storage_method_controller.edit_storage_method)
);

router.delete(
    "/:id",
    ControllerWrapper(storage_method_controller.delete_storage_method)
);

module.exports = router;
