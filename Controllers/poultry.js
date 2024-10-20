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
        req.body.products.map((p) => ({ ...p, crop_id: value.crop_id }))
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
            month_harvested: new Date(),
            required_processing: Joi.boolean().required(),
        }),
        status: Joi.number().allow(0).allow(1).required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    try {
        const current_poultry = await Poultry.findById(value.poultry_id);
        const processed_products = []; // All products send via api after adding new ones

        for await (const item of products) {
            if (item._id) {
                processed_products.push(item);
            } else {
                const new_product = await PoultryProducts.create({
                    ...item,
                    crop_id: current_poultry.crop_id,
                });
                processed_products.push(new_product);
            }
        }

        const all_products = await PoultryProducts.find({
            _id: { $in: processed_products.map((p) => p._id) },
        }); // All products from products field in body

        const updated_products = await Promise.all(
            processed_products.map(async (product) => {
                const current_product = all_products.find(
                    (p) => p._id.toString() === product._id.toString()
                );

                var updated_product;

                if (current_product) {
                    updated_product = await PoultryProducts.findByIdAndUpdate(
                        product._id,
                        product
                    );
                    return updated_product._id;
                }
            })
        );
        const deleted_products = current_poultry.products.filter((product) => {
            return !all_products
                .map((p) => p._id.toString())
                .includes(product.toString());
        });
        const deleted = deleted_products.forEach(async (item) => {
            await PoultryProducts.findByIdAndDelete(item._id);
        });
        const poultry_doc = await Poultry.findByIdAndUpdate(
            poultry_id,
            {
                number,
                avg_age_of_live_stocks,
                avg_age_time_period,
                type_of_feed,
                other_type_of_feed,
                weight_measurement,
                personal_information,
                income_from_sale,
                expenditure_on_inputs,
                steroids,
                products: updated_products,
                status,
            },
            { runValidators: true, new: true }
        );
        res.json(poultry_doc);
    } catch (err) {
        console.log(err);
        res.status(400).json(handleErrors(err));
    }
};

module.exports.delete_poultry = async (req, res) => {
    const { id } = req.params;
    const doc = await Poultry.findByIdAndDelete(id);
    await PoultryProducts.deleteMany({
        _id: { $in: doc.products.map((_product) => _product._id) },
    });
    return res.json({ message: "Poultry deleted!" });
};
