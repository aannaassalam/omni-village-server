const router = require("express").Router();
const demographic_officer_dropdown = require("../Controllers/demographic-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

// What the officer app's screens read, and without a token, as before.
router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        demographic_officer_dropdown.get_demographic_officer_dropdown
    )
);

// The rest is the dashboard's Moderator Dropdowns page, and a super admin's.
// These had no guard at all: anyone could add, rename or delete an option.
router.get(
    "/get-all",
    verifyAdmin,
    requireRole("admin"),
    demographic_officer_dropdown.get_all
);

router.post(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(
        demographic_officer_dropdown.add_demographic_officer_dropdown
    )
);

router.put(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(
        demographic_officer_dropdown.edit_demographic_officer_data
    )
);
router.delete(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(
        demographic_officer_dropdown.delete_demographic_officer_data
    )
);

module.exports = router;
