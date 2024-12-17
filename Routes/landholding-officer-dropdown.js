const router = require("express").Router();
const landholding_officer_dropdown = require("../Controllers/landholding-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        landholding_officer_dropdown.get_landholding_officer_dropdown
    )
);
router.get("/get-all", landholding_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        landholding_officer_dropdown.add_landholding_officer_dropdown
    )
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(
        landholding_officer_dropdown.edit_landholding_officer_data
    )
);
router.delete(
    "/",
    ControllerWrapper(
        landholding_officer_dropdown.delete_landholding_officer_data
    )
);

module.exports = router;
