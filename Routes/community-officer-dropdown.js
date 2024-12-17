const router = require("express").Router();
const community_officer_dropdown = require("../Controllers/community-officer-dropdown");
const { verifyToken, checkUser } = require("../Middlewares/user");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(community_officer_dropdown.get_community_officer_dropdown)
);
router.get("/get-all", community_officer_dropdown.get_all);

router.post(
    "/",
    // verifyToken,
    // checkUser,
    ControllerWrapper(community_officer_dropdown.add_community_officer_dropdown)
);

router.put(
    "/",
    // verifyToken,
    ControllerWrapper(community_officer_dropdown.edit_community_officer_data)
);
router.delete(
    "/",
    ControllerWrapper(community_officer_dropdown.delete_community_officer_data)
);

module.exports = router;
