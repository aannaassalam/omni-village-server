const { checkUser, verifyToken } = require("../Middlewares/user");
const tree_controller = require("../Controllers/trees");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get(
    "/",
    verifyToken,
    checkUser,
    ControllerWrapper(tree_controller.get_trees)
);

router.post(
    "/add_tree",
    verifyToken,
    checkUser,
    ControllerWrapper(tree_controller.add_trees)
);

router.put(
    "/edit_tree",
    verifyToken,
    checkUser,
    ControllerWrapper(tree_controller.update_trees)
);

router.delete(
    "/delete_tree/:id",
    verifyToken,
    checkUser,
    ControllerWrapper(tree_controller.delete_tree)
);

module.exports = router;
