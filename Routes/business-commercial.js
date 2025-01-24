const router = require("express").Router();
const business_commercial = require("../Controllers/business-commercial");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.get_business_by_user)
);

router.get(
    "/get-business",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.get_business)
);

router.post(
    "/add-business",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.add_business)
);

router.put(
    "/update-business",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.update_business)
);

router.delete(
    "/delete-business",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.delete_business)
);

module.exports = router;
