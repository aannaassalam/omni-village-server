const Joi = require("joi");
const Storage = require("../Models/storage");
const StorageMethod = require("../Models/storageMethod");
const mongoose = require("mongoose");

const handleErrors = (err) => {
    let errors = {};
    return err;
};

module.exports.get_storage = async (req, res) => {
    const { user } = res.locals;

    const storage_doc = await Storage.aggregate([
        {
            $match: { user_id: user._id },
        },
        {
            $addFields: {
                storage_quantity: { $toString: "$storage_quantity" },
            },
        },
    ]);
    return res.json(storage_doc);
};

module.exports.add_storage = async (req, res) => {
    const { user } = res.locals;

    const schema = Joi.array().items({
        storage_name: Joi.string().required(),
        storage_method_name: Joi.string().required(),
        storage_quantity: Joi.number().required(),
        storage_method_id: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const storage_docs = [];

    for await (const storage of value) {
        const storage_doc = await Storage.create({
            user_id: user._id,
            storage_name: storage.storage_name,
            storage_method_name: storage.storage_method_name,
            storage_quantity: storage.storage_quantity,
            storage_method_id: storage.storage_method_id,
        });
        storage_docs.push(storage_doc);
    }
    res.json(storage_docs);
};

module.exports.update_storage = async (req, res) => {
    const schema = Joi.array().items({
        _id: Joi.string().required(),
        storage_name: Joi.string().required(),
        storage_method_name: Joi.string().required(),
        storage_quantity: Joi.number().required(),
        storage_method_id: Joi.string().required(),
    });

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const storage_docs = [];
    for await (const storage of value) {
        const storage_doc = await Storage.findByIdAndUpdate(
            storage._id,
            storage,
            { runValidators: true, new: true }
        );
        storage_docs.push(storage_doc);
    }

    return res.json(storage_docs);
};

module.exports.delete_storage = async (req, res) => {
    const { id } = req.params;
    const doc = await Storage.findByIdAndDelete(id);
    return res.json({ message: "Storage deleted!" });
};
