const router = require("express").Router();
const { checkUser, verifyToken } = require("../Middlewares/user");
const personal_household = require("../Controllers/other-personal-household-items");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(personal_household.get_personal_household_items)
);

router.post(
    "/add-personal-household-items",
    verifyToken,
    checkUser,
    ControllerWrapper(personal_household.add_personal_household_items)
);

router.put(
    "/edit-personal-household-items",
    verifyToken,
    checkUser,
    ControllerWrapper(personal_household.edit_personal_household_items)
);

module.exports = router;
