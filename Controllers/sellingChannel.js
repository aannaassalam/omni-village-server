const SellingChannel = require("../Models/sellingChannel");
const Joi = require("joi");

module.exports.get_selling_channel = async (req, res) => {
    const { user } = res.locals;

    const selling_channel_doc = await SellingChannel.findOne({
        user_id: user._id,
    });
    return res.json(selling_channel_doc);
};

module.exports.add_selling_channel = async (req, res) => {
    const { user } = res.locals;

    const schema = Joi.object({
        local_market: Joi.boolean().required(),
        broker: Joi.boolean().required(),
        ecommerce: Joi.boolean().required(),
        export: Joi.boolean().required(),
        none: Joi.boolean().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const selling_channel_doc = await SellingChannel.create({
        user_id: user._id,
        ...value,
    });
    return res.json(selling_channel_doc);
};

module.exports.update_selling_channel = async (req, res) => {
    const schema = Joi.object({
        selling_channel_id: Joi.string().required(),
        local_market: Joi.boolean().required(),
        broker: Joi.boolean().required(),
        ecommerce: Joi.boolean().required(),
        export: Joi.boolean().required(),
        none: Joi.boolean().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const selling_channel_doc = await SellingChannel.findByIdAndUpdate(
        value.selling_channel_id,
        value,
        { runValidators: true, new: true }
    );
    return res.json(selling_channel_doc);
};

module.exports.delete_selling_channel = async (req, res) => {
    const { id } = req.params;
    const doc = await SellingChannel.findByIdAndDelete(id);
    return res.json({ message: "Selling Channel deleted!" });
};
