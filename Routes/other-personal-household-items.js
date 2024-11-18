const router = require("express").Router();
const { checkUser, verifyToken } = require("../Middlewares/user");
const personal_household = require("../Controllers/other-personal-household-items");

router.get(
    "/",
    verifyToken,
    checkUser,
    personal_household.get_personal_household_items
);

router.post(
    "/add-personal-household-items",
    verifyToken,
    checkUser,
    personal_household.add_personal_household_items
);

router.put(
    "/edit-personal-household-items",
    verifyToken,
    checkUser,
    personal_household.edit_personal_household_items
);

module.exports = router;
