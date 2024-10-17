const { checkUser, verifyToken } = require("../Middlewares/user");
const tree_controller = require("../Controllers/trees");
const ControllerWrapper = require("../utils/ControllerWrapper");

const router = require("express").Router();

router.get("/", verifyToken, checkUser, tree_controller.get_trees);

router.get(
    "/get_all",
    // verifyToken, checkUser,
    tree_controller.get_all_trees
);

router.post(
    "/add_tree",
    verifyToken,
    checkUser,
    ControllerWrapper(tree_controller.add_trees)
);

router.post("/edit_tree", verifyToken, checkUser, tree_controller.update_trees);

router.delete(
    "/delete_tree/:id",
    // verifyToken,
    // checkUser,
    tree_controller.delete_tree
);

router.get("/list-all", tree_controller.tree_list);

module.exports = router;
