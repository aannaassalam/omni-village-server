const Cultivation = require("../Models/cultivation");
const Fishery = require("../Models/fishery");
const Poultry = require("../Models/poultry");
const Tree = require("../Models/trees");
const PoultryProduct = require("../Models/poultryProduct");
const TreeProduct = require("../Models/treeProducts");
const storage = require("../Models/storage");
const Hunting = require("../Models/hunting");
const Users = require("../Models/user");
const SellingChannel = require("../Models/sellingChannel");
const Consumption = require("../Models/consumption");

const Crop = require("../Models/crop");
const FisheryCrop = require("../Models/fisheryCrop");
const PoultryCrop = require("../Models/poultryCrop");
const TreeCrop = require("../Models/treeCrop");
const HuntingCrop = require("../Models/huntingCrop");

const ObjectId = require("mongoose").Types.ObjectId;

const { landMeaurementConverter } = require("../utils/landConverter");
const { weightConverter } = require("../utils/weightConverter");

var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

module.exports.land_allocated_category_data = async (req, res) => {
  try {
    const data = await Users.aggregate([
      {
        $project: {
          cultivation: "$sub_area.cultivation.land",
          poultry: "$sub_area.poultry",
          fishery: "$sub_area.fishery",
          storage: "$sub_area.storage",
          trees: "$sub_area.trees",
          land_measurement: 1,
        },
      },
    ]);

    const aggregated_data = {
      cultivation: 0,
      poultry: 0,
      fishery: 0,
      storage: 0,
      trees: 0,
    };

    data.forEach((_data) => {
      aggregated_data.cultivation += landMeaurementConverter(
        _data.cultivation,
        _data.land_measurement
      );
      aggregated_data.fishery += landMeaurementConverter(
        _data.fishery,
        _data.land_measurement
      );
      aggregated_data.storage += landMeaurementConverter(
        _data.storage,
        _data.land_measurement
      );
      aggregated_data.poultry += landMeaurementConverter(
        _data.poultry,
        _data.land_measurement
      );
      aggregated_data.trees += landMeaurementConverter(
        _data.trees,
        _data.land_measurement
      );
    });

    res.json(aggregated_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.land_used_category_data = async (req, res) => {
  try {
    const cultivation_data = await Cultivation.aggregate([
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          area_allocated: 1,
          land_measurement: "$user.land_measurement",
        },
      },
    ]);
    const fishery_data = await Users.aggregate([
      {
        $project: {
          area_allocated: "$sub_area.fishery",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const poultry_data = await Users.aggregate([
      {
        $project: {
          area_allocated: "$sub_area.poultry",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const tree_data = await Users.aggregate([
      {
        $project: {
          area_allocated: "$sub_area.trees",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const storage_data = await Users.aggregate([
      {
        $project: {
          area_allocated: "$sub_area.storage",
          land_measurement: "$land_measurement",
        },
      },
    ]);

    const aggregated_data = {
      cultivation: 0,
      poultry: 0,
      fishery: 0,
      storage: 0,
      trees: 0,
    };

    cultivation_data.forEach((_data) => {
      aggregated_data.cultivation += landMeaurementConverter(
        _data.area_allocated,
        _data.land_measurement
      );
    });
    poultry_data.forEach((_data) => {
      aggregated_data.poultry += landMeaurementConverter(
        _data.area_allocated,
        _data.land_measurement
      );
    });
    fishery_data.forEach((_data) => {
      aggregated_data.fishery += landMeaurementConverter(
        _data.area_allocated,
        _data.land_measurement
      );
    });
    tree_data.forEach((_data) => {
      aggregated_data.trees += landMeaurementConverter(
        _data.area_allocated,
        _data.land_measurement
      );
    });
    storage_data.forEach((_data) => {
      aggregated_data.storage += landMeaurementConverter(
        _data.area_allocated,
        _data.land_measurement
      );
    });

    res.json(aggregated_data);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

module.exports.selling_channel_data = async (req, res) => {
  const aggregated_data = {
    local_market: 0,
    agent: 0,
    ecommerce: 0,
    export: 0,
    none: 0,
  };

  const selling_channel_data = (
    await SellingChannel.aggregate([
      {
        $project: {
          selling_channel_names: 1,
        },
      },
    ])
  )
    .flatMap((_item) => _item.selling_channel_names)
    .map((_item) => _item.replaceAll(" ", "_"));

  selling_channel_data.forEach((_channel) => {
    console.log(aggregated_data[_channel], _channel);
    aggregated_data[_channel] += 1;
  });

  res.json(aggregated_data);
};

module.exports.storage_data = async (req, res) => {
  const grouped_data = await storage.aggregate([
    {
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "user_id",
        as: "user",
      },
    },
    {
      $addFields: {
        land_measurement: "$user.land_measurement",
      },
    },
    {
      $unwind: {
        path: "$land_measurement",
      },
    },
    {
      $project: {
        land_measurement: 1,
        stock_name: 1,
        stock_quantity: { $toString: "$stock_quantity" },
        storage_method_name: 1,
      },
    },
    // {
    //   $group: {
    //     _id: "$stock_name",
    //     doc: { $push: "$$ROOT" },
    //   },
    // },
    // {
    //   $set: {
    //     dynamicKey: [
    //       {
    //         k: "$_id",
    //         v: "$doc",
    //       },
    //     ],
    //   },
    // },
    // {
    //   $replaceRoot: {
    //     newRoot: {
    //       $mergeObjects: { $arrayToObject: "$dynamicKey" },
    //     },
    //   },
    // },
    // {
    //   $unset: "dynamicKey",
    // },
  ]);

  // const processed_grouped_data = grouped_data.reduce((prev, current) => {
  //   const item = Object.entries(current)[0];
  //   prev[item[0]] = item[1];
  //   return prev;
  // }, {});

  const aggregated_data = {
    grain: {},
    poultry: {},
    meat: {},
    fruits: {},
  };

  grouped_data.forEach((_data) => {
    if (_data.stock_name.includes("grain")) {
      aggregated_data.grain[_data.storage_method_name] = aggregated_data.grain[
        _data.storage_method_name
      ]
        ? aggregated_data.grain[_data.storage_method_name] +
          landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          )
        : landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          );
    } else if (_data.stock_name.includes("poultry")) {
      aggregated_data.poultry[_data.storage_method_name] = aggregated_data
        .poultry[_data.storage_method_name]
        ? aggregated_data.poultry[_data.storage_method_name] +
          landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          )
        : landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          );
    } else if (_data.stock_name.includes("meat")) {
      aggregated_data.meat[_data.storage_method_name] = aggregated_data.meat[
        _data.storage_method_name
      ]
        ? aggregated_data.meat[_data.storage_method_name] +
          landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          )
        : landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          );
    } else {
      aggregated_data.fruits[_data.storage_method_name] = aggregated_data
        .fruits[_data.storage_method_name]
        ? aggregated_data.fruits[_data.storage_method_name] +
          landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          )
        : landMeaurementConverter(
            parseFloat(_data.stock_quantity),
            _data.land_measurement
          );
    }
  });

  res.json(aggregated_data);
};

module.exports.self_grown_consumption_data = async (req, res) => {
  const { type_id } = req.query;
  try {
    const cultivation_data = await Cultivation.aggregate([
      {
        $lookup: {
          from: "crops",
          foreignField: "_id",
          localField: "crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
        },
      },
      {
        $group: {
          _id: { crop_id: "$crop._id", label: "$crop.label" },
          output: { $sum: "$output" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { aggregated_output: "$output" }],
          },
        },
      },
      {
        $project: {
          output: "$aggregated_output",
          crop_name: "$crop.name.en",
        },
      },
    ]);
    const fishery_data = await Fishery.aggregate([
      {
        $lookup: {
          from: "fishery_crops",
          foreignField: "_id",
          localField: "fishery_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
        },
      },
      {
        $group: {
          _id: { crop_id: "$crop._id", label: "$crop.label" },
          output: { $sum: "$production_information.production_output" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { aggregated_output: "$output" }],
          },
        },
      },
      {
        $project: {
          output: "$aggregated_output",
          crop_name: "$crop.name.en",
        },
      },
    ]);
    const hunting_data = await Hunting.aggregate([
      {
        $lookup: {
          from: "hunting_crops",
          foreignField: "_id",
          localField: "hunting_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
        },
      },
      {
        $group: {
          _id: { crop_id: "$crop._id", label: "$crop.label" },
          output: { $sum: "$meat" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { aggregated_output: "$output" }],
          },
        },
      },
      {
        $project: {
          output: "$aggregated_output",
          crop_name: "$crop.name.en",
        },
      },
    ]);
    const poultry_data = await PoultryProduct.aggregate([
      {
        $lookup: {
          from: "poultry_crops",
          foreignField: "_id",
          localField: "poultry_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
        },
      },
      {
        $group: {
          _id: { crop_id: "$crop._id", label: "$crop.label" },
          output: { $sum: "$production_output" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { aggregated_output: "$output" }],
          },
        },
      },
      {
        $project: {
          output: "$aggregated_output",
          crop_name: "$crop.name.en",
        },
      },
    ]);
    const tree_data = await TreeProduct.aggregate([
      {
        $lookup: {
          from: "tree_crops",
          foreignField: "_id",
          localField: "tree_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
        },
      },
      {
        $group: {
          _id: { crop_id: "$crop._id", label: "$crop.label" },
          output: { $sum: "$production_output" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$doc", { aggregated_output: "$output" }],
          },
        },
      },
      {
        $project: {
          output: "$aggregated_output",
          crop_name: "$crop.name.en",
        },
      },
    ]);

    // console.log(cultivation_data);
    // console.log(fishery_data);
    // console.log(hunting_data);
    // console.log(poultry_data);
    // console.log(tree_data);
    res.json([
      ...cultivation_data,
      ...fishery_data,
      ...hunting_data,
      ...poultry_data,
      ...tree_data,
    ]);
    // res.json(fishery_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.self_consumed_data = async (req, res) => {
  const { type_id } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new ObjectId(type_id),
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.en`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.en`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.en`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.en`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.en`,
        },
      },
    ]);

    const new_consumption_docs = consumption_docs.map((_consumption) => {
      _consumption.output = weightConverter(
        _consumption.total_quantity,
        _consumption.user.land_measurement
      );
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      }
      return _consumption;
    });

    const grouped_by_crop_data = groupBy(
      new_consumption_docs,
      "consumption_crop_id"
    );

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        crop_name: _item[1]?.[0]?.consumption_crop.name,
      };
      const total_output = _item[1].reduce(
        (prev, current) => (prev += current.output),
        0
      );
      structured_data.output = total_output;
      return structured_data;
    });
    res.json(processed_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.purchased_from_neighbours_consumed = async (req, res) => {
  const { type_id } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new ObjectId(type_id),
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.en`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.en`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.en`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.en`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.en`,
        },
      },
    ]);

    const new_consumption_docs = consumption_docs.map((_consumption) => {
      _consumption.output = weightConverter(
        _consumption.purchased_from_neighbours,
        _consumption.user.land_measurement
      );
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      }
      return _consumption;
    });

    const grouped_by_crop_data = groupBy(
      new_consumption_docs,
      "consumption_crop_id"
    );

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        crop_name: _item[1]?.[0]?.consumption_crop.name,
      };
      const total_output = _item[1].reduce(
        (prev, current) => (prev += current.output),
        0
      );
      structured_data.output = total_output;
      return structured_data;
    });
    res.json(processed_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.purchased_from_market_consumed = async (req, res) => {
  const { type_id } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new ObjectId(type_id),
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.en`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.en`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.en`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.en`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.en`,
        },
      },
    ]);

    const new_consumption_docs = consumption_docs.map((_consumption) => {
      _consumption.output = weightConverter(
        _consumption.purchased_from_market,
        _consumption.user.land_measurement
      );
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      }
      return _consumption;
    });

    const grouped_by_crop_data = groupBy(
      new_consumption_docs,
      "consumption_crop_id"
    );

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        crop_name: _item[1]?.[0]?.consumption_crop.name,
      };
      const total_output = _item[1].reduce(
        (prev, current) => (prev += current.output),
        0
      );
      structured_data.output = total_output;
      return structured_data;
    });
    res.json(processed_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.ideal_consumption_expected = async (req, res) => {
  const { type_id } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new ObjectId(type_id),
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "tree_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$tree_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "poultry_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$poultry_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "fishery_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$fishery_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "hunting_crops",
          localField: "consumption_crop_id",
          foreignField: "_id",
          as: "hunting_consumption_crop",
        },
      },
      {
        $unwind: {
          path: "$hunting_consumption_crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: { __v: 0, "consumption_crop.__v": 0 },
      },
      {
        $addFields: {
          "consumption_crop.name": `$consumption_crop.name.en`,
          "tree_consumption_crop.name": `$tree_consumption_crop.name.en`,
          "poultry_consumption_crop.name": `$poultry_consumption_crop.name.en`,
          "hunting_consumption_crop.name": `$hunting_consumption_crop.name.en`,
          "fishery_consumption_crop.name": `$fishery_consumption_crop.name.en`,
        },
      },
    ]);

    const new_consumption_docs = consumption_docs.map((_consumption) => {
      _consumption.output = weightConverter(
        _consumption.total_quantity,
        _consumption.user.land_measurement
      );
      if (_consumption.consumption_crop._id) return _consumption;
      else if (_consumption.tree_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.tree_consumption_crop;
      } else if (_consumption.poultry_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.poultry_consumption_crop;
      } else if (_consumption.hunting_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.hunting_consumption_crop;
      } else if (_consumption.fishery_consumption_crop._id) {
        _consumption.consumption_crop = _consumption.fishery_consumption_crop;
      }
      return _consumption;
    });

    const grouped_by_crop_data = groupBy(
      new_consumption_docs,
      "consumption_crop_id"
    );

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        crop_name: _item[1]?.[0]?.consumption_crop.name,
      };
      const total_consumed = _item[1].reduce(
        (prev, current) => (prev += current.output),
        0
      );
      const total_ideal_consumption = _item[1].reduce(
        (prev, current) =>
          (prev += current.consumption_crop.ideal_consumption_per_person),
        0
      );
      structured_data.total_consumed = total_consumed;
      structured_data.ideal_consumption = total_ideal_consumption;
      return structured_data;
    });

    res.json(processed_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.food_balance = async (req, res) => {
  const { type_id } = req.query;
  try {
    const type_based_cultivation = await Cultivation.aggregate([
      {
        $lookup: {
          from: "crops",
          foreignField: "_id",
          localField: "crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $addFields: {
      //     self_consumed: "$utilization.self_consumed",
      //     crop_name: "$crop.name.en",
      //     land_measurement: "$user.land_measurement",
      //   },
      // },
      {
        $project: {
          self_consumed: "$utilization.self_consumed",
          output: 1,
          area_allocated: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          type: "cultivation",
          crop_ideal_consumption: "$crop.ideal_consumption_per_person",
        },
      },
    ]);

    const type_based_fishery = await Fishery.aggregate([
      {
        $lookup: {
          from: "fishery_crops",
          foreignField: "_id",
          localField: "fishery_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$production_information.self_consumed" },
          output: { $sum: "$production_information.production_output" },
          number: { $sum: "$important_information.number_of_fishes" },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
              { output: "$output" },
              { number: "$number" },
              {
                count: "$count",
              },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: {
            $divide: [{ $toInt: "$output" }, { $toInt: "$number" }],
          },
          // count: 1,
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
          type: "fishery",
        },
      },
    ]);

    const type_based_poultry = await Poultry.aggregate([
      {
        $lookup: {
          from: "poultry_crops",
          foreignField: "_id",
          localField: "poultry_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "poultry_products",
          foreignField: "_id",
          localField: "products",
          as: "products",
        },
      },
      {
        $unwind: {
          path: "$products",
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$products.self_consumed" },
          output: { $sum: "$products.production_output" },
          number: { $sum: "$number" },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
              { output: "$output" },
              {
                number: "$number",
              },
              { count: "$count" },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: { $divide: [{ $toInt: "$output" }, { $toInt: "$number" }] },
          type: "poultry",
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
        },
      },
    ]);

    const type_based_tree = await Tree.aggregate([
      {
        $lookup: {
          from: "tree_crops",
          foreignField: "_id",
          localField: "tree_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "tree_products",
          foreignField: "_id",
          localField: "products",
          as: "products",
        },
      },
      {
        $unwind: {
          path: "$products",
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$products.self_consumed" },
          output: { $sum: "$products.production_output" },
          number: { $sum: "$number_of_trees" },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
              { output: "$output" },
              {
                number: "$number",
              },
              {
                count: "$count",
              },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: {
            $divide: [{ $toInt: "$output" }, { $toInt: "$number" }],
          },
          type: "trees",
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
        },
      },
    ]);

    const type_based_hunting = await Hunting.aggregate([
      {
        $lookup: {
          from: "hunting_crops",
          foreignField: "_id",
          localField: "hunting_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          // preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
        },
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$self_consumed" },
          output: { $sum: "$meat" },
          number: { $sum: "$number_hunted" },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
              { output: "$output" },
              { number: "$number" },
              { count: "$count" },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: { $divide: [{ $toInt: "$output" }, { $toInt: "$number" }] },
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
          type: "hunting",
        },
      },
    ]);

    const processed_cultivation_data = type_based_cultivation.map((_item) => {
      const area_allocated = landMeaurementConverter(
        _item.area_allocated,
        _item.land_measurement
      );
      return {
        ..._item,
        area_allocated,
      };
    });

    const new_obj = groupBy(processed_cultivation_data, "crop_id");

    const processed_cultivation_arr = [];

    Object.entries(new_obj).forEach((_item) => {
      let self_consumed = 0;
      let output = 0;
      let area_allocated = 0;
      _item[1].forEach((_cultivation) => {
        self_consumed += _cultivation.self_consumed;
        output += _cultivation.output;
        area_allocated += _cultivation.area_allocated;
      });
      processed_cultivation_arr.push({
        ...(_item[1][0] || []),
        self_consumed,
        output,
        area_allocated,
        yeild: output / area_allocated,
        ideal_consumption:
          _item[1][0]?.crop_ideal_consumption * _item[1].length,
      });
    });

    res.json([
      ...processed_cultivation_arr,
      ...type_based_fishery,
      ...type_based_hunting,
      ...type_based_poultry,
      ...type_based_tree,
    ]);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
