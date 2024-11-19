const router = require("express").Router();
const personal_household_dropdown = require("../Controllers/other-personal-household-items-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        personal_household_dropdown.get_personal_household_dropdown
    )
);
router.get("/get-all", personal_household_dropdown.get_all);

router.post(
    "/add-personal-household-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        personal_household_dropdown.add_personal_household_dropdown
    )
);

router.put(
    "/edit-personal-household-dropdown",
    // verifyToken,
    ControllerWrapper(personal_household_dropdown.edit_personal_household_data)
);
router.delete(
    "/delete-personal-household-dropdown",
    ControllerWrapper(
        personal_household_dropdown.delete_personal_household_data
    )
);

module.exports = router;
