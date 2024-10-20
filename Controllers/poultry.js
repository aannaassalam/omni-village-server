const Poultry = require("../Models/poultry");
const PoultryProducts = require("../Models/poultryProduct");
const Joi = require("joi");

module.exports.get_poultries = async (req, res) => {
    const { user } = res.locals;

    const poultries_doc = await Poultry.aggregate([
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
                from: "poultry_products",
                localField: "products",
                foreignField: "_id",
                as: "products",
            },
        },
    ]);
    return res.json(poultries_doc);
};

module.exports.add_poultries = async (req, res) => {
    const { user } = res.locals;
    if (req.body.status) {
        const schema = Joi.object({
            crop_id: Joi.string().required(),
            number: Joi.number().required(),
            average_age_of_livestocks: Joi.string().required(),
            avg_age_time_period: Joi.string().required(),
            type_of_feed: Joi.string().required(),
            create_type: Joi.string().optional().allow(null, ""),
            total_feed: Joi.number().required(),
            self_produced: Joi.number().required(),
            neighbours: Joi.number().required(),
            purchased_from_market: Joi.number().required(),
            others: Joi.string().optional().allow(""),
            others_value: Joi.number().optional().allow(null),
            income_from_sale: Joi.number().required(),
            expenditure_on_inputs: Joi.number().required(),
            steroids: Joi.boolean().required(),
            weight_measurement: Joi.string().required(),
            harvested_product: Joi.array().items({
                product_name: Joi.string().required(),
                output: Joi.number().required(),
                self_consumed: Joi.number().required(),
                sold_to_neighbours: Joi.number().required(),
                sold_for_industrial_use: Joi.number().required(),
                wastage: Joi.number().required(),
                others: Joi.string().optional().allow(""),
                others_value: Joi.number().optional().allow(null),
                month_harvested: Joi.date().required(),
                required_processing: Joi.boolean().required(),
            }),
            status: Joi.number().allow(0).allow(1).required(),
        });

        const { error, value } = schema.validate(req.body);
        if (error) throw error;

        const poultry_product_docs = await PoultryProducts.insertMany(
            value.harvested_product.map((p) => ({
                ...p,
                crop_id: value.crop_id,
            }))
        );
        const poultry_doc = await Poultry.create({
            user_id: user._id,
            ...value,
            products: poultry_product_docs.map((tp) => tp._id),
        });
        return res.json(poultry_doc);
    }
    const poultry_product_docs = await PoultryProducts.insertMany(
        req.body.harvested_product.map((p) => ({
            ...p,
            crop_id: req.body.crop_id,
        }))
    );
    const poultry_doc = await Poultry.create({
        user_id: user._id,
        ...req.body,
        products: poultry_product_docs.map((tp) => tp._id),
    });
    return res.json(poultry_doc);
};

module.exports.update_poultries = async (req, res) => {
    const schema = Joi.object({
        poultry_id: Joi.string().required(),
        number: Joi.number().required(),
        average_age_of_livestocks: Joi.string().required(),
        avg_age_time_period: Joi.string().required(),
        type_of_feed: Joi.string().required(),
        create_type: Joi.string().optional().allow(null, ""),
        total_feed: Joi.number().required(),
        self_produced: Joi.number().required(),
        neighbours: Joi.number().required(),
        purchased_from_market: Joi.number().required(),
        others: Joi.string().optional().allow(""),
        others_value: Joi.number().optional().allow(null),
        income_from_sale: Joi.number().required(),
        expenditure_on_inputs: Joi.number().required(),
        steroids: Joi.boolean().required(),
        weight_measurement: Joi.string().required(),
        harvested_product: Joi.array().items({
            _id: Joi.string().optional(),
            product_name: Joi.string().required(),
            output: Joi.number().required(),
            self_consumed: Joi.number().required(),
            sold_to_neighbours: Joi.number().required(),
            sold_for_industrial_use: Joi.number().required(),
            wastage: Joi.number().required(),
            others: Joi.string().optional().allow(""),
            others_value: Joi.number().optional().allow(null),
            month_harvested: Joi.date().required(),
            required_processing: Joi.boolean().required(),
        }),
        status: Joi.number().allow(0).allow(1).required(),
    }).options({ stripUnknown: true });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const current_poultry = await Poultry.findById(value.poultry_id);
    const products_to_be_deleted = [];
    const products_to_be_updated = [];
    const products_to_be_added = [];
    const poultry_products_ids = value.harvested_product
        .filter((_product) => _product._id)
        .map((_product) => _product._id);

    for await (const item of value.harvested_product) {
        if (item._id) {
            products_to_be_updated.push(item);
        } else {
            products_to_be_added.push({
                ...item,
                crop_id: current_poultry.crop_id,
            });
        }
    }

    current_poultry.products.forEach((_product) => {
        if (!poultry_products_ids.includes(_product._id.toString()))
            products_to_be_deleted.push(_product._id.toString());
    });

    await PoultryProducts.deleteMany({ _id: { $in: products_to_be_deleted } });
    const added_products = await PoultryProducts.insertMany(
        products_to_be_added
    );
    for await (const product of products_to_be_updated) {
        await PoultryProducts.findByIdAndUpdate(
            product._id,
            { ...product },
            {
                runValidators: true,
                new: true,
            }
        );
    }

    const poultry_doc = await Poultry.findByIdAndUpdate(
        value.poultry_id,
        {
            ...value,
            products: [
                ...products_to_be_updated,
                ...added_products.map((_product) => _product._id),
            ],
        },
        { runValidators: true, new: true }
    );
    return res.json(poultry_doc);
};

module.exports.delete_poultry = async (req, res) => {
    const { id } = req.params;
    const doc = await Poultry.findByIdAndDelete(id);
    await PoultryProducts.deleteMany({
        _id: { $in: doc.products.map((_product) => _product._id) },
    });
    return res.json({ message: "Poultry deleted!" });
};
