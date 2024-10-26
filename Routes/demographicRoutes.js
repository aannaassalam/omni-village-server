const { checkUser, verifyToken } = require("../Middlewares/user");
const demographic_controller = require("../Controllers/demographicInfo");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.post(
    "/add_demographic_info",
    verifyToken,
    checkUser,
    ControllerWrapper(demographic_controller.add_demographic_info)
);

router.get(
    "/get_demographic_info_by_id",
    verifyToken,
    checkUser,
    ControllerWrapper(demographic_controller.get_demographic_info_by_user_id)
);

router.put(
    "/update_demographic_info_by_id",
    verifyToken,
    checkUser,
    ControllerWrapper(demographic_controller.update_demographic_info_by_user_id)
);

router.delete(
    "/delete_demographic_info_by_id",
    verifyToken,
    checkUser,
    ControllerWrapper(demographic_controller.delete_demographic_info_by_user_id)
);

module.exports = router;
