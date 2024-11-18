const router = require("express").Router();
const { checkUser, verifyToken } = require("../Middlewares/user");
const forestry = require("../Controllers/forestry");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.get_forestry_info)
);

router.post(
    "/add-general-information",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.add_general_information)
);
router.post(
    "/add-timber-needs",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.add_timber_needs)
);
router.post(
    "/add-other-needs",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.add_other_needs)
);

router.put(
    "/edit-general-information",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.edit_general_information)
);
router.put(
    "/edit-timber-needs",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.edit_timber_needs)
);
router.put(
    "/edit-other-needs",
    verifyToken,
    checkUser,
    ControllerWrapper(forestry.edit_other_needs)
);

module.exports = router;
