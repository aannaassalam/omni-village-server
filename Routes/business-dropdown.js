const router = require("express").Router();
const business_dropdown = require("../Controllers/business-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(business_dropdown.get_business_dropdown)
);
router.get("/get-all", business_dropdown.get_all);

router.post(
    "/add-business-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(business_dropdown.add_business_dropdown)
);

router.put(
    "/edit-business-dropdown",
    // verifyToken,
    ControllerWrapper(business_dropdown.edit_business_data)
);
router.delete(
    "/delete-business-dropdown",
    ControllerWrapper(business_dropdown.delete_business_data)
);

module.exports = router;
