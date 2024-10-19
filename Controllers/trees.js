const Trees = require("../Models/trees");
const TreeProducts = require("../Models/treeProducts");
const Joi = require("joi");

module.exports.get_trees = async (req, res) => {
    const { user } = res.locals;

    const trees_doc = await Trees.aggregate([
        {
            $match: {
                user_id: user._id,
            },
        },
        {
            $lookup: {
                from: "crops",
                localField: "crop_id",
                foreignField: "_id",
                as: "crop",
            },
        },
        { $unwind: { path: "$crop" } },
        {
            $lookup: {
                from: "tree_products",
                localField: "products",
                foreignField: "_id",
                as: "products",
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);
    // console.log(cultivation_doc);
    return res.json(trees_doc);
};

module.exports.add_trees = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            crop_id: Joi.string().required(),
            number_of_trees: Joi.number().required(),
            average_age_of_trees: Joi.string().required(),
            soil_health: Joi.string().required(),
            decreasing_yield: Joi.when("soil_health", {
                is: "decreasing yield",
                then: Joi.number().required(),
                otherwise: Joi.number().optional().allow(null, "0"),
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
                    others_value: Joi.number().optional().allow(null),
                    month_harvested: Joi.date().required(),
                    required_processing: Joi.boolean().required(),
                })
            ),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const tree_product_docs = await TreeProducts.insertMany(
            value.harvested_products.map((p) => ({
                ...p,
                crop_id: value.crop_id,
            }))
        );
        const tree_doc = await Trees.create({
            user_id: user._id,
            ...value,
            products: tree_product_docs.map((tp) => tp._id),
        });
        return res.json(tree_doc);
    }
    const tree_product_docs = await TreeProducts.insertMany(
        req.body.harvested_products.map((p) => ({
            ...p,
            crop_id: value.crop_id,
        }))
    );
    const tree_doc = await Trees.create({
        user_id: user._id,
        ...req.body,
        products: tree_product_docs.map((tp) => tp._id),
    });
    return res.json(tree_doc);
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
    const doc = await Trees.findByIdAndDelete(id);
    await TreeProducts.deleteMany({
        _id: { $in: doc.products.map((_product) => _product._id) },
    });
    return res.json({ message: "Trees deleted!" });
};
