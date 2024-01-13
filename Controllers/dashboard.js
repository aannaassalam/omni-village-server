const Cultivation = require("../Models/cultivation");
const Fishery = require("../Models/fishery");
const Poultry = require("../Models/poultry");
const Tree = require("../Models/trees");
const storage = require("../Models/storage");
const Users = require("../Models/user");
const SellingChannel = require("../Models/sellingChannel");

const { landMeaurementConverter } = require("../utils/landConverter");

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

// module.exports.land_used_tags_data = async (req, res) => {
//   try {
//     const cultivation_data = await Cultivation.aggregate([
//       {
//         $lookup: {
//           from: "users",
//           foreignField: "_id",
//           localField: "user_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: {
//           path: "$user",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "crops",
//           foreignField: "_id",
//           localField: "crop_id",
//           as: "crop",
//         },
//       },
//       {
//         $unwind: {
//           path: "$crop",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "consumption_types",
//           foreignField: "_id",
//           localField: "crop.label",
//           as: "crop.label",
//         },
//       },
//       {
//         $unwind: {
//           path: "$crop.label",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           area_allocated: 1,
//           label: "$crop.label.name.en",
//           land_measurement: "$user.land_measurement",
//         },
//       },
//     ]);
//     const fishery_data = await Fishery.aggregate([
//       {
//         $lookup: {
//           from: "users",
//           foreignField: "_id",
//           localField: "user_id",
//           as: "user",
//         },
//       },
//       {
//         $unwind: {
//           path: "$user",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "fishery_crops",
//           foreignField: "_id",
//           localField: "fishery_crop_id",
//           as: "crop",
//         },
//       },
//       {
//         $unwind: {
//           path: "$crop",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "consumption_types",
//           foreignField: "_id",
//           localField: "crop.label",
//           as: "crop.label",
//         },
//       },
//       {
//         $unwind: {
//           path: "$crop.label",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           area_allocated: 1,
//           label: "$crop.label.name.en",
//           land_measurement: "$user.land_measurement",
//         },
//       },
//     ]);
//     // const poultry_data = await Users.aggregate([
//     //   {
//     //     $project: {
//     //       area_allocated: "$sub_area.poultry",
//     //       land_measurement: "$land_measurement",
//     //     },
//     //   },
//     // ]);
//     // const tree_data = await Users.aggregate([
//     //   {
//     //     $project: {
//     //       area_allocated: "$sub_area.trees",
//     //       land_measurement: "$land_measurement",
//     //     },
//     //   },
//     // ]);
//     // const storage_data = await Users.aggregate([
//     //   {
//     //     $project: {
//     //       area_allocated: "$sub_area.storage",
//     //       land_measurement: "$land_measurement",
//     //     },
//     //   },
//     // ]);

//     res.json(fishery_data);
//   } catch (err) {
//     res.status(500).json(err);
//   }
// };

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
