const router = require("express").Router();
const admin_controller = require("../Controllers/admin");
const Admin = require("../Models/admin");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

// Nobody can vouch for the very first account, so register is open while the
// admins collection is empty. From then on only an admin may add accounts.
const firstAccountOrAdmin = async (req, res, next) => {
  try {
    if (!(await Admin.exists({}))) return next();
  } catch (error) {
    return next(error);
  }
  verifyAdmin(req, res, (error) =>
    error ? next(error) : requireRole("admin")(req, res, next)
  );
};

router.post("/register", firstAccountOrAdmin, admin_controller.register);
router.post("/login", admin_controller.login);
router.post("/forgot-password", admin_controller.forgot_password);
router.post("/change-password", verifyAdmin, admin_controller.change_password);

// Regional teams: who may work in which place. Only a super admin hands
// out, moves or takes away that access.
router.get(
  "/team",
  verifyAdmin,
  requireRole("admin"),
  ControllerWrapper(admin_controller.get_team)
);
router.put(
  "/assign",
  verifyAdmin,
  requireRole("admin"),
  ControllerWrapper(admin_controller.assign_team)
);
router.post(
  "/team/:id/resend",
  verifyAdmin,
  requireRole("admin"),
  ControllerWrapper(admin_controller.resend_team_password)
);
router.delete(
  "/team/:id",
  verifyAdmin,
  requireRole("admin"),
  ControllerWrapper(admin_controller.remove_team_member)
);

module.exports = router;
