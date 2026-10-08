const router = require("express").Router();
const villages_controller = require("../Controllers/villages");
const places_controller = require("../Controllers/places");
const {
    checkUser,
    checkModerator,
    verifyModeratorToken,
} = require("../Middlewares/user");
const { verifyAdmin, requireRole } = require("../Middlewares/admin");
const ControllerWrapper = require("../utils/ControllerWrapper");

router.get(
    "/get-villages-for-moderator",
    verifyModeratorToken,
    checkModerator,
    ControllerWrapper(villages_controller.get_villages_for_moderator)
);
router.get("/:country_name", checkUser, villages_controller.get_villages);
router.get("/", villages_controller.get_all_villages);

router.post(
    "/add_village",
    verifyAdmin,
    requireRole("admin"),
    villages_controller.add_village
);
router.post(
    "/edit_village",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(villages_controller.edit_village)
);

router.put(
    "/add-moderator-to-village",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper(villages_controller.add_moderator_to_village)
);

// A village is a place now, and can hold responses, villagers and its own
// questionnaire changes: Settings deletes it through the one guarded delete
// (Controllers/places.js), which refuses while anything depends on it.
router.delete(
    "/delete_village/:village_id",
    verifyAdmin,
    requireRole("admin"),
    ControllerWrapper((req, res) => {
        req.params.id = req.params.village_id;
        return places_controller.delete_place(req, res);
    })
);

module.exports = router;
