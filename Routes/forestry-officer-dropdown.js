const router = require("express").Router();
const forestry_officer_dropdown = require("../Controllers/forestry-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(forestry_officer_dropdown.get_forestry_officer_dropdown)
);
router.get("/get-all", forestry_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(forestry_officer_dropdown.add_forestry_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(forestry_officer_dropdown.edit_forestry_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(forestry_officer_dropdown.delete_forestry_officer_data)
);

module.exports = router;
