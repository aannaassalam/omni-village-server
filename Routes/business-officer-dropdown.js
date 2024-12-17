const router = require("express").Router();
const business_officer_dropdown = require("../Controllers/business-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(business_officer_dropdown.get_business_officer_dropdown)
);
router.get("/get-all", business_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(business_officer_dropdown.add_business_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(business_officer_dropdown.edit_business_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(business_officer_dropdown.delete_business_officer_data)
);

module.exports = router;
