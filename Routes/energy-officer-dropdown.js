const router = require("express").Router();
const energy_officer_dropdown = require("../Controllers/energy-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

// What the officer app's screens read, and without a token, as before.
router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(energy_officer_dropdown.get_energy_officer_dropdown)
);

// The rest is the dashboard's Moderator Dropdowns page, and a super admin's.
// These had no guard at all: anyone could add, rename or delete an option.
router.get(
    "/get-all",
    verifyAdmin,
    requireRole("admin"),
    energy_officer_dropdown.get_all
);

router.post(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(energy_officer_dropdown.add_energy_officer_dropdown)
);

router.put(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(energy_officer_dropdown.edit_energy_officer_data)
);
router.delete(
    "/",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(energy_officer_dropdown.delete_energy_officer_data)
);

module.exports = router;
