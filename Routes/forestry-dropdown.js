const router = require("express").Router();
const forestry_dropdown = require("../Controllers/forestry-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(forestry_dropdown.get_forestry_dropdown)
);
router.get("/get-all", forestry_dropdown.get_all);

router.post(
    "/add-forestry-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(forestry_dropdown.add_forestry_dropdown)
);

router.put(
    "/edit-forestry-dropdown",
    // verifyToken,
    ControllerWrapper(forestry_dropdown.edit_forestry_data)
);
router.delete(
    "/delete-forestry-dropdown",
    ControllerWrapper(forestry_dropdown.delete_forestry_data)
);

module.exports = router;
