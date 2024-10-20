const StorageMethod = require("../Models/storageMethod");

module.exports.get_storage_method = async (req, res) => {
    const methods = await StorageMethod.aggregate([
        {
            $group: {
                _id: "$type",
                result: {
                    $push: "$$ROOT",
                },
            },
        },
        {
            $group: {
                _id: null,
                results: {
                    $push: {
                        k: "$_id",
                        v: "$result",
                    },
                },
            },
        },
        {
            $replaceRoot: {
                newRoot: { $arrayToObject: "$results" },
            },
        },
    ]);
    return res.json(methods[0]);
};

module.exports.add_storage_method = async (req, res) => {
    const { name, type } = req.body;
    const method_doc = await StorageMethod.create({
        name,
        type,
    });
    return res.json(method_doc);
};

module.exports.edit_storage_method = async (req, res) => {
    const { name, type, storage_method_id } = req.body;
    const method_doc = await StorageMethod.findByIdAndUpdate(
        storage_method_id,
        {
            name,
            type,
        },
        { new: true, runValidators: true }
    );
    return res.json(method_doc);
};

module.exports.delete_storage_method = async (req, res) => {
    const { id } = req.params;
    const method_doc = await StorageMethod.findByIdAndDelete(id);
    return res.json(method_doc);
};
