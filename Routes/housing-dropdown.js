const router = require("express").Router();
const housing_dropdown = require("../Controllers/housing-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(housing_dropdown.get_housing_dropdown)
);
router.get("/get-all", housing_dropdown.get_all);

router.post(
    "/add-housing-dropdown",
    // verifyToken,
    // checkUser,
    ControllerWrapper(housing_dropdown.add_housing_dropdown)
);

router.put(
    "/edit-housing-dropdown",
    // verifyToken,
    ControllerWrapper(housing_dropdown.edit_housing_data)
);
router.delete(
    "/delete-housing-dropdown",
    ControllerWrapper(housing_dropdown.delete_housing_data)
);

module.exports = router;
