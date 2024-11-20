const router = require("express").Router();
const business_commercial = require("../Controllers/business-commercial");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.get_business)
);

router.put(
    "/update-business",
    verifyToken,
    checkUser,
    ControllerWrapper(business_commercial.update_business)
);

module.exports = router;
