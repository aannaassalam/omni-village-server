const Trees = require("../Models/trees");
const TreeProducts = require("../Models/treeProducts");
const Joi = require("joi");

module.exports.get_trees = async (req, res) => {
    const { language } = req.query;
    const { user } = res.locals;

    try {
        const trees_doc = await Trees.aggregate([
            {
                $match: {
                    user_id: user._id,
                },
            },
            {
                $lookup: {
                    from: "tree_crops",
                    localField: "tree_crop_id",
                    foreignField: "_id",
                    as: "tree_crop",
                },
            },
            { $unwind: { path: "$tree_crop" } },
            {
                $lookup: {
                    from: "tree_products",
                    localField: "products",
                    foreignField: "_id",
                    as: "products",
                },
            },
            // { $unwind: { path: "$cultivation_crop" } },
            {
                $project: { __v: 0, "tree_crop.__v": 0, "products.__v": 0 },
            },
            {
                $addFields: {
                    "tree_crop.name": `$tree_crop.name.${language}`,
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
        ]);
        // console.log(cultivation_doc);
        res.json(trees_doc);
    } catch (err) {
        res.status(400).json(handleErrors(err));
    }
};

module.exports.get_all_trees = async (req, res) => {
    try {
        const tree_doc = await Trees.aggregate([
            {
                $lookup: {
                    from: "tree_crops",
                    localField: "tree_crop_id",
                    foreignField: "_id",
                    as: "crop",
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user_id",
                    foreignField: "_id",
                    as: "user",
                },
            },
            {
                $lookup: {
                    from: "tree_products",
                    localField: "products",
                    foreignField: "_id",
                    as: "products",
                },
            },
            {
                $lookup: {
                    from: "consumption_types",
                    localField: "crop.label",
                    foreignField: "_id",
                    as: "label",
                },
            },
            { $unwind: { path: "$crop" } },
            { $unwind: { path: "$user" } },
            { $unwind: { path: "$label" } },
            {
                $addFields: {
                    label_name: "$label.name.en",
                },
            },
            {
                $project: {
                    __v: 0,
                    "crop.__v": 0,
                },
            },
        ]);
        res.json(tree_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.add_trees = async (req, res) => {
    const { user } = res.locals;

    const schema = Joi.object({
        crop_id: Joi.string().required(),
        number_of_trees: Joi.number().required(),
        average_age_of_trees: Joi.string().required(),
        soil_health: Joi.string().required(),
        decreasing_yield: Joi.when("soil_health", {
            is: "decreasing yield",
            then: Joi.number().required(),
            otherwise: Joi.number().optional(),
        }),
        type_of_fertiliser: Joi.string().required(),
        type_of_pesticide: Joi.string().required(),
        income_from_sale: Joi.number().required(),
        expenditure_on_inputs: Joi.number().required(),
        status: Joi.number().allow(0).allow(1).required(),
        harvested_products: Joi.array().items(
            Joi.object({
                product_name: Joi.string().required(),
                output: Joi.number().required(),
                self_consumed: Joi.number().required(),
                fed_to_livestock: Joi.number().required(),
                sold_to_neighbours: Joi.number().required(),
                sold_for_industrial_use: Joi.number().required(),
                wastage: Joi.number().required(),
                others: Joi.string().optional().allow(""),
                others_value: Joi.number().optional(),
                month_harvested: Joi.date().required(),
                required_processing: Joi.boolean().required(),
            })
        ),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const tree_product_docs = await TreeProducts.insertMany(
        value.harvested_products.map((p) => ({ ...p, crop_id: value.crop_id }))
    );
    const tree_doc = await Trees.create({
        user_id: user._id,
        ...value,
        products: tree_product_docs.map((tp) => tp._id),
    });
    res.json(tree_doc);
};

module.exports.update_trees = async (req, res) => {
    const {
        tree_id,
        number_of_trees,
        avg_age_of_trees,
        soil_health,
        decreasing_rate,
        type_of_fertilizer_used,
        type_of_pesticide_used,
        income_from_sale,
        expenditure_on_inputs,
        products,
        status = 1,
    } = req.body;
    try {
        const current_tree = await Trees.findById(tree_id);
        const processed_products = []; // All products send via api after adding new ones

        for await (const item of products) {
            if (item._id) {
                processed_products.push(item);
            } else {
                const new_product = await TreeProducts.create({
                    ...item,
                    tree_crop_id: current_tree.tree_crop_id,
                });
                processed_products.push(new_product);
            }
        }

        const all_products = await TreeProducts.find({
            _id: { $in: processed_products.map((p) => p._id) },
        }); // All products from products field in body

        const updated_products = await Promise.all(
            processed_products.map(async (product) => {
                const current_product = all_products.find(
                    (p) => p._id.toString() === product._id.toString()
                );

                var updated_product;

                if (current_product) {
                    updated_product = await TreeProducts.findByIdAndUpdate(
                        product._id,
                        product
                    );
                    return updated_product._id;
                }
            })
        );

        const deleted_products = current_tree.products.filter((product) => {
            return !all_products
                .map((p) => p._id.toString())
                .includes(product.toString());
        });
        const deleted = deleted_products.forEach(async (item) => {
            await TreeProducts.findByIdAndDelete(item._id);
        });
        const cultivation_doc = await Trees.findByIdAndUpdate(
            tree_id,
            {
                number_of_trees,
                avg_age_of_trees,
                soil_health,
                decreasing_rate,
                type_of_fertilizer_used,
                type_of_pesticide_used,
                income_from_sale,
                expenditure_on_inputs,
                products: updated_products,
                status,
            },
            { runValidators: true, new: true }
        );
        res.json(cultivation_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.delete_tree = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await Trees.findByIdAndDelete(id);
        if (doc?.products.length > 0) {
            for (const product of doc.products) {
                await TreeProducts.findByIdAndDelete(product);
            }
        }
        // console.log(doc, "doc");
        if (doc) {
            res.json({ message: "Trees deleted!" });
        } else {
            res.status(400).json({ message: "Something went wrong!" });
        }
    } catch (err) {
        console.log(err, "err");
        res.status(400).json(err);
    }
};

module.exports.tree_list = async (req, res) => {
    const trees = await Trees.aggregate([
        {
            $lookup: {
                from: "tree_crops",
                localField: "tree_crop_id",
                foreignField: "_id",
                as: "tree_crop",
            },
        },
        {
            $unwind: {
                path: "$tree_crop",
                preserveNullAndEmptyArrays: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "user_id",
                foreignField: "_id",
                as: "user",
            },
        },

        {
            $unwind: {
                path: "$user",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);
    // const processed_trees = {};
    // trees.forEach((tree) => {
    //   const date = moment(tree.createdAt).format("LL");
    //   processed_trees[date] = processed_trees[date]
    //     ? [...processed_trees[date], tree]
    //     : [tree];
    // });
    res.json(trees);

    // res.render("trees", {
    //   trees: processed_trees,
    // });
};
