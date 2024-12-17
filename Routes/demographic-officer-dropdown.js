const router = require("express").Router();
const demographic_officer_dropdown = require("../Controllers/demographic-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        demographic_officer_dropdown.get_demographic_officer_dropdown
    )
);
router.get("/get-all", demographic_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(
        demographic_officer_dropdown.add_demographic_officer_dropdown
    )
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(
        demographic_officer_dropdown.edit_demographic_officer_data
    )
);
router.delete(
    "/",
    ControllerWrapper(
        demographic_officer_dropdown.delete_demographic_officer_data
    )
);

module.exports = router;
