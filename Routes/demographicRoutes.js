const { checkUser, verifyToken } = require("../Middlewares/user");
const demographic_controller = require("../Controllers/demographicInfo");

const router = require("express").Router();

router.get(
    "/get_demographic_info_by_id",
    verifyToken,
    checkUser,
    demographic_controller.get_demographic_info_by_user_id
);

router.post(
    "/add_demographic_info",
    verifyToken,
    checkUser,
    demographic_controller.add_demographic_info
);

router.put(
    "/update_demographic_info_by_id",
    verifyToken,
    checkUser,
    demographic_controller.update_demographic_info_by_user_id
);

router.delete(
    "/delete_demographic_info_by_id",
    verifyToken,
    checkUser,
    demographic_controller.delete_demographic_info_by_user_id
);

module.exports = router;
