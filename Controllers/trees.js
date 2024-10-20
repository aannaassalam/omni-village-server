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
            crop_id: req.body.crop_id,
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
    const schema = Joi.object({
        tree_id: Joi.string().required(),
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
                _id: Joi.string().optional(),
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

    const current_tree = await Trees.findById(value.tree_id);
    const products_to_be_deleted = [];
    const products_to_be_updated = [];
    const products_to_be_added = [];
    const tree_products_ids = value.harvested_products
        .filter((_product) => _product._id)
        .map((_product) => _product._id);

    for await (const item of value.harvested_products) {
        if (item._id) {
            products_to_be_updated.push(item);
        } else {
            products_to_be_added.push({
                ...item,
                crop_id: current_tree.crop_id,
            });
        }
    }

    current_tree.products.forEach((_product) => {
        if (!tree_products_ids.includes(_product._id.toString()))
            products_to_be_deleted.push(_product._id.toString());
    });

    await TreeProducts.deleteMany({ _id: { $in: products_to_be_deleted } });
    const added_products = await TreeProducts.insertMany(products_to_be_added);
    for await (const product of products_to_be_updated) {
        await TreeProducts.findByIdAndUpdate(
            product._id,
            { ...product },
            {
                runValidators: true,
                new: true,
            }
        );
    }
    const tree_doc = await Trees.findByIdAndUpdate(
        value.tree_id,
        {
            ...value,
            products: [
                ...products_to_be_updated,
                ...added_products.map((_product) => _product._id),
            ],
        },
        { runValidators: true, new: true }
    );
    res.json(tree_doc);
};

module.exports.delete_tree = async (req, res) => {
    const { id } = req.params;
    const doc = await Trees.findByIdAndDelete(id);
    await TreeProducts.deleteMany({
        _id: { $in: doc.products.map((_product) => _product._id) },
    });
    return res.json({ message: "Trees deleted!" });
};
