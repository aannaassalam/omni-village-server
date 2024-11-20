const router = require("express").Router();
const business_by_user = require("../Controllers/business-by-user");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(business_by_user.get_business_by_user)
);
router.get(
    "/business-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(business_by_user.get_business_requirements)
);

router.post(
    "/add-business-by-user",
    verifyToken,
    checkUser,
    ControllerWrapper(business_by_user.add_business_by_user)
);

router.put(
    "/edit-business-requirements",
    verifyToken,
    checkUser,
    ControllerWrapper(business_by_user.edit_business_requirements)
);

module.exports = router;
