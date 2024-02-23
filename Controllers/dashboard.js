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
// const CC = require("currency-converter-lt");
const fx = require("money");

const { landMeaurementConverter } = require("../utils/landConverter");
const { weightConverter } = require("../utils/weightConverter");

var groupBy = function (xs, key) {
  return xs.reduce(function (rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

// Production

module.exports.land_allocated_category_data = async (req, res) => {
  const { village } = req.query;
  try {
    const data = await Users.aggregate([
      {
        $match: {
          village_name: village,
        },
      },
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
  const { village } = req.query;
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
        $match: {
          "user.village_name": village,
          status: 1,
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
        $match: {
          village_name: village,
        },
      },
      {
        $project: {
          area_allocated: "$sub_area.fishery",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const poultry_data = await Users.aggregate([
      {
        $match: {
          village_name: village,
        },
      },
      {
        $project: {
          area_allocated: "$sub_area.poultry",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const tree_data = await Users.aggregate([
      {
        $match: {
          village_name: village,
        },
      },
      {
        $project: {
          area_allocated: "$sub_area.trees",
          land_measurement: "$land_measurement",
        },
      },
    ]);
    const storage_data = await Users.aggregate([
      {
        $match: {
          village_name: village,
        },
      },
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

module.exports.bifurcated_chart_label = async (req, res) => {
  const { type_id, village } = req.query;
  fx.rates = res.locals.currencies;
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          preserveNullAndEmptyArrays: true,
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
        $match: type_id
          ? {
              "crop.label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : { "user.village_name": village, status: 1 },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      {
        $project: {
          label: "$crop.label._id",
          label_name: "$crop.label.name.en",
          crop_id: "$crop._id",
          crop_name: "$crop.name.en",
          land_allocated: "$area_allocated",
          self_consumed: "$utilization.self_consumed",
          sold_to_neighbour: "$utilization.sold_to_neighbours",
          sold_to_market: "$utilization.sold_for_industrial_use",
          fed_to_livestock: "$utilization.fed_to_livestock",
          wastage: "$utilization.wastage",
          output: "$output",
          soil_health: "$important_information.soil_health",
          fertilizer_used: "$important_information.type_of_fertilizer_used",
          pesticide_used: "$important_information.type_of_pesticide_used",
          income: "$important_information.income_from_sale",
          expenditure: "$important_information.expenditure_on_inputs",
          land_measurement: "$user.land_measurement",
          currency: "$user.currency",
          type: "Cultivation",
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          preserveNullAndEmptyArrays: true,
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
        $match: type_id
          ? {
              "crop.label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : { "user.village_name": village, status: 1 },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      // {
      {
        $project: {
          label: "$crop.label._id",
          label_name: "$crop.label.name.en",
          crop_id: "$crop._id",
          crop_name: "$crop.name.en",
          land_allocated: null,
          self_consumed: "$production_information.self_consumed",
          sold_to_neighbour: "$production_information.sold_to_neighbours",
          sold_to_market: "$production_information.sold_for_industrial_use",
          fed_to_livestock: null,
          wastage: "$production_information.wastage",
          output: "$production_information.production_output",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$production_information.income_from_sale",
          expenditure: "$production_information.expenditure_on_inputs",
          currency: "$user.currency",
          type: "Fishery",
        },
      },
    ]);
    const poultry_data = await Poultry.aggregate([
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          preserveNullAndEmptyArrays: true,
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
        $match: type_id
          ? {
              "crop.label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : { "user.village_name": village, status: 1 },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.poultry_crop_id",
          output: { $sum: "$products.production_output" },
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                output: "$output",
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                wastage: "$wastage",
              },
            ],
          },
        },
      },
      {
        $project: {
          label: "$crop.label._id",
          label_name: "$crop.label.name.en",
          crop_id: "$crop._id",
          crop_name: "$crop.name.en",
          land_allocated: null,
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: null,
          wastage: "$wastage",
          output: "$output",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          type: "Poultry",
        },
      },
    ]);
    const tree_data = await Tree.aggregate([
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          preserveNullAndEmptyArrays: true,
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
        $match: type_id
          ? {
              "crop.label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : { "user.village_name": village, status: 1 },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.tree_crop_id",
          output: { $sum: "$products.production_output" },
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          fed_to_livestock: { $sum: "$products.fed_to_livestock" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                output: "$output",
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                wastage: "$wastage",
                fed_to_livestock: "$fed_to_livestock",
              },
            ],
          },
        },
      },
      {
        $project: {
          label: "$crop.label._id",
          label_name: "$crop.label.name.en",
          crop_id: "$crop._id",
          crop_name: "$crop.name.en",
          land_allocated: null,
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: "$fed_to_livestock",
          wastage: "$wastage",
          output: "$output",
          soil_health: "$soil_health",
          fertilizer_used: "$type_of_fertilizer_used",
          pesticide_used: "$type_of_pesticide_used",
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          type: "Tree",
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
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          preserveNullAndEmptyArrays: true,
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
        $match: type_id
          ? {
              "crop.label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : { "user.village_name": village, status: 1 },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      // {
      {
        $project: {
          label: "$crop.label._id",
          label_name: "$crop.label.name.en",
          crop_id: "$crop._id",
          crop_name: "$crop.name.en",
          land_allocated: null,
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbours",
          sold_to_market: "$sold_in_consumer_market",
          fed_to_livestock: null,
          wastage: "$wastage",
          output: "$meat",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          type: "Hunting",
        },
      },
    ]);

    const merged_arr = [
      ...cultivation_data,
      ...hunting_data,
      ...fishery_data,
      ...poultry_data,
      ...tree_data,
    ];

    let grouped_data = {};
    if (type_id) {
      grouped_data = groupBy(merged_arr, "crop_id");
    } else {
      grouped_data = groupBy(merged_arr, "label");
    }

    // console.log(merged_arr);

    const processed_grouped_data = Object.entries(grouped_data).reduce(
      (prev, current) => {
        const obj = {};
        current[1].forEach((_item) => {
          obj.name = type_id ? _item.crop_name : _item.label_name;
          // if (type_id) {
          //   obj.crop_name = _item.crop_name;
          // } else {
          //   obj.label_name = _item.label_name;
          // }
          if (_item.land_allocated) {
            obj.land_allocated =
              (obj.land_allocated || 0) +
              landMeaurementConverter(
                _item.land_allocated,
                _item.land_measurement
              );
          }

          if (_item.fed_to_livestock) {
            obj.fed_to_livestock =
              (obj.fed_to_livestock || 0) + _item.fed_to_livestock;
          }

          obj.output = (obj.output || 0) + _item.output;
          obj.self_consumed = (obj.self_consumed || 0) + _item.self_consumed;
          obj.sold_to_neighbour =
            (obj.sold_to_neighbour || 0) + _item.sold_to_neighbour;
          obj.sold_to_market = (obj.sold_to_market || 0) + _item.sold_to_market;
          obj.wastage = (obj.wastage || 0) + _item.wastage;
          obj.income =
            (obj.income || 0) +
            fx.convert(_item.income, { from: _item.currency, to: "USD" });
          obj.expenditure =
            (obj.expenditure || 0) +
            fx.convert(_item.expenditure, { from: _item.currency, to: "USD" });
        });

        return [...prev, obj];
      },
      []
    );

    const land_allocated = [];
    const fed_to_livestock = [];
    const output = [];
    const self_consumed = [];
    const sold_to_neighbour = [];
    const sold_to_market = [];
    const wastage = [];
    const income = [];
    const expenditure = [];
    // const soil_health_stable = [];
    // const soil_health_decreasing_yeild = [];
    // const fertilizer_used_organic_purchased = [];
    // const fertilizer_used_organic_self_made = [];
    // const fertilizer_used_chemical_based = [];
    // const fertilizer_used_none = [];
    // const pesticide_used_organic_purchased = [];
    // const pesticide_used_organic_self_made = [];
    // const pesticide_used_chemical_based = [];
    // const pesticide_used_none = [];

    processed_grouped_data.forEach((_data) => {
      if (_data.land_allocated) {
        land_allocated.push({
          name: _data.name,
          land_allocated: _data.land_allocated,
        });
      }
      if (_data.fed_to_livestock) {
        fed_to_livestock.push({
          name: _data.name,
          fed_to_livestock: _data.fed_to_livestock,
        });
      }
      // if (_data.soil_health.stable || _data.soil_health.decreasing_yeild) {
      //   soil_health_stable.push({
      //     crop_name: _data.crop_name,
      //     count: _data.soil_health.stable,
      //   });
      //   soil_health_decreasing_yeild.push({
      //     crop_name: _data.crop_name,
      //     count: _data.soil_health.decreasing_yeild,
      //   });
      // }
      // if (
      //   _data.pesticide_used.organic_purchased ||
      //   _data.pesticide_used.organic_self_made ||
      //   _data.pesticide_used.chemical_based ||
      //   _data.pesticide_used.none
      // ) {
      //   pesticide_used_organic_self_made.push({
      //     crop_name: _data.crop_name,
      //     count: _data.pesticide_used.organic_self_made,
      //   });
      //   pesticide_used_organic_purchased.push({
      //     crop_name: _data.crop_name,
      //     count: _data.pesticide_used.organic_purchased,
      //   });
      //   pesticide_used_chemical_based.push({
      //     crop_name: _data.crop_name,
      //     count: _data.pesticide_used.chemical_based,
      //   });
      //   pesticide_used_none.push({
      //     crop_name: _data.crop_name,
      //     count: _data.pesticide_used.none,
      //   });
      // }
      // if (
      //   _data.fertilizer_used.organic_purchased ||
      //   _data.fertilizer_used.organic_self_made ||
      //   _data.fertilizer_used.chemical_based ||
      //   _data.fertilizer_used.none
      // ) {
      //   fertilizer_used_organic_self_made.push({
      //     crop_name: _data.crop_name,
      //     count: _data.fertilizer_used.organic_self_made,
      //   });
      //   fertilizer_used_organic_purchased.push({
      //     crop_name: _data.crop_name,
      //     count: _data.fertilizer_used.organic_purchased,
      //   });
      //   fertilizer_used_chemical_based.push({
      //     crop_name: _data.crop_name,
      //     count: _data.fertilizer_used.chemical_based,
      //   });
      //   fertilizer_used_none.push({
      //     crop_name: _data.crop_name,
      //     count: _data.fertilizer_used.none,
      //   });
      // }
      output.push({
        name: _data.name,
        output: _data.output,
      });
      self_consumed.push({
        name: _data.name,
        self_consumed: _data.self_consumed,
      });
      sold_to_neighbour.push({
        name: _data.name,
        sold_to_neighbour: _data.sold_to_neighbour,
      });
      sold_to_market.push({
        name: _data.name,
        sold_to_market: _data.sold_to_market,
      });
      wastage.push({
        name: _data.name,
        wastage: _data.wastage,
      });
      income.push({
        name: _data.name,
        income: _data.income,
      });
      expenditure.push({
        name: _data.name,
        expenditure: _data.expenditure,
      });
    });

    const final_object = {
      land_allocated,
      fed_to_livestock,
      output,
      self_consumed,
      sold_to_market,
      sold_to_neighbour,
      wastage,
      income,
      expenditure,
      // soil_health_decreasing_yeild,
      // soil_health_stable,
      // fertilizer_used_chemical_based,
      // fertilizer_used_none,
      // fertilizer_used_organic_purchased,
      // fertilizer_used_organic_self_made,
      // pesticide_used_chemical_based,
      // pesticide_used_none,
      // pesticide_used_organic_purchased,
      // pesticide_used_organic_self_made,
    };

    res.json(final_object);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.bifurcated_chart_crop = async (req, res) => {
  const { crop_id, village } = req.query;
  fx.rates = res.locals.currencies;
  try {
    const cultivation_data = await Cultivation.aggregate([
      // {
      //   $lookup: {
      //     from: "crops",
      //     foreignField: "_id",
      //     localField: "crop_id",
      //     as: "crop",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$crop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
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
        $match: {
          crop_id: new ObjectId(crop_id),
          "user.village_name": village,
          status: 1,
        },
      },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      {
        $project: {
          output: "$output",
          self_consumed: "$utilization.self_consumed",
          sold_to_neighbour: "$utilization.sold_to_neighbours",
          sold_to_market: "$utilization.sold_for_industrial_use",
          fed_to_livestock: "$utilization.fed_to_livestock",
          wastage: "$utilization.wastage",
          soil_health: "$important_information.soil_health",
          fertilizer_used: "$important_information.type_of_fertilizer_used",
          pesticide_used: "$important_information.type_of_pesticide_used",
          income: "$important_information.income_from_sale",
          expenditure: "$important_information.expenditure_on_inputs",
          currency: "$user.currency",
          yeild: "$important_information.yeild",
          area_allocated: 1,
          land_measurement: "$user.land_measurement",
          type: "cultivation",
        },
      },
    ]);
    const fishery_data = await Fishery.aggregate([
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
        $match: {
          fishery_crop_id: new ObjectId(crop_id),
          "user.village_name": village,
          status: 1,
        },
      },
      // {
      //   $lookup: {
      //     from: "fishery_crops",
      //     foreignField: "_id",
      //     localField: "fishery_crop_id",
      //     as: "crop",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$crop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      {
        $project: {
          self_consumed: "$production_information.self_consumed",
          sold_to_neighbour: "$production_information.sold_to_neighbours",
          sold_to_market: "$production_information.sold_for_industrial_use",
          fed_to_livestock: null,
          wastage: "$production_information.wastage",
          output: "$production_information.production_output",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$production_information.income_from_sale",
          expenditure: "$production_information.expenditure_on_inputs",
          currency: "$user.currency",
          yeild: "$production_information.yeild",
          number: "$important_information.number_of_fishes",
          type: "fish",
        },
      },
    ]);
    const poultry_data = await Poultry.aggregate([
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
        $match: {
          poultry_crop_id: new ObjectId(crop_id),
          "user.village_name": village,
          status: 1,
        },
      },
      // {
      //   $lookup: {
      //     from: "poultry_crops",
      //     foreignField: "_id",
      //     localField: "poultry_crop_id",
      //     as: "crop",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$crop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.poultry_crop_id",
          output: { $sum: "$products.production_output" },
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                output: "$output",
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                wastage: "$wastage",
              },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: null,
          wastage: "$wastage",
          output: "$output",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          yeild: { $divide: ["$output", "$number"] },
          number: 1,
          type: "poultry",
        },
      },
    ]);
    const tree_data = await Tree.aggregate([
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
        $match: {
          tree_crop_id: new ObjectId(crop_id),
          "user.village_name": village,
          status: 1,
        },
      },
      // {
      //   $lookup: {
      //     from: "tree_crops",
      //     foreignField: "_id",
      //     localField: "tree_crop_id",
      //     as: "crop",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$crop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.tree_crop_id",
          output: { $sum: "$products.production_output" },
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          fed_to_livestock: { $sum: "$products.fed_to_livestock" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                output: "$output",
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                fed_to_livestock: "$fed_to_livestock",
                wastage: "$wastage",
              },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: "$fed_to_livestock",
          wastage: "$wastage",
          output: "$output",
          soil_health: "$soil_health",
          fertilizer_used: "$type_of_fertilizer_used",
          pesticide_used: "$type_of_pesticide_used",
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          yeild: { $divide: ["$output", "$number_of_trees"] },
          number: "$number_of_trees",
          type: "tree",
        },
      },
    ]);
    const hunting_data = await Hunting.aggregate([
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
        $match: {
          hunting_crop_id: new ObjectId(crop_id),
          "user.village_name": village,
          status: 1,
        },
      },
      // {
      //   $lookup: {
      //     from: "hunting_crops",
      //     foreignField: "_id",
      //     localField: "hunting_crop_id",
      //     as: "crop",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$crop",
      //     preserveNullAndEmptyArrays: true,
      //   },
      // },
      // {
      //   $lookup: {
      //     from: "consumption_types",
      //     foreignField: "_id",
      //     localField: "crop.label",
      //     as: "label",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$label",
      //   },
      // },
      {
        $project: {
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbours",
          sold_to_market: "$sold_in_consumer_market",
          fed_to_livestock: null,
          wastage: "$wastage",
          output: "$meat",
          soil_health: null,
          fertilizer_used: null,
          pesticide_used: null,
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
          yeild: 1,
          number: "$number_hunted",
          type: "hunting",
        },
      },
    ]);

    const merged_arr = [
      ...cultivation_data,
      ...fishery_data,
      ...poultry_data,
      ...tree_data,
      ...hunting_data,
    ];

    // res.json(merged_arr);

    const obj = {
      self_consumed: 0,
      fed_to_livestock: 0,
      sold_to_neighbour: 0,
      sold_to_market: 0,
      wastage: 0,
      soil_health: {
        stable: 0,
        decreasing_yeild: 0,
      },
      fertilizer_used: {
        organic_purchased: 0,
        organic_self_made: 0,
        chemical_based: 0,
        none: 0,
      },
      pesticide_used: {
        organic_purchased: 0,
        organic_self_made: 0,
        chemical_based: 0,
        none: 0,
      },
      income: 0,
      expenditure: 0,
      yeild: 0,
      area_allocated: 0,
      avg_number: null,
    };

    merged_arr.forEach((_item) => {
      if (_item.fed_to_livestock) {
        obj.fed_to_livestock += _item.fed_to_livestock;
      }
      obj.self_consumed += _item.self_consumed;
      obj.sold_to_market += _item.sold_to_market;
      obj.sold_to_neighbour += _item.sold_to_neighbour;
      obj.wastage += _item.wastage;
      obj.income += fx.convert(_item.income, {
        from: _item.currency,
        to: "USD",
      });
      obj.expenditure += fx.convert(_item.expenditure, {
        from: _item.currency,
        to: "USD",
      });
      if (_item.area_allocated) {
        obj.area_allocated += landMeaurementConverter(
          _item.area_allocated,
          _item.land_measurement
        );
      }
      if (_item.soil_health) {
        if (_item.type === "cultivation") {
          if (_item.soil_health === "stable") {
            obj.soil_health["stable"] =
              (obj.soil_health.stable || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.soil_health === "decreasing yield") {
            obj.soil_health["decreasing_yeild"] =
              (obj.soil_health.decreasing_yeild || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
        } else if (_item.type === "tree") {
          if (_item.soil_health === "stable") {
            obj.soil_health["stable"] =
              (obj.soil_health.stable || 0) + _item.number;
          }
          if (_item.soil_health === "decreasing yield") {
            obj.soil_health["decreasing_yeild"] =
              (obj.soil_health.decreasing_yeild || 0) + _item.number;
          }
        }
      }
      if (_item.fertilizer_used) {
        if (_item.type === "cultivation") {
          if (_item.fertilizer_used === "organic self made") {
            obj["fertilizer_used"]["organic_self_made"] =
              (obj["fertilizer_used"]["organic_self_made"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.fertilizer_used === "organic purchased") {
            obj["fertilizer_used"]["organic_purchased"] =
              (obj["fertilizer_used"]["organic_purchased"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.fertilizer_used === "chemical based") {
            obj["fertilizer_used"]["chemical_based"] =
              (obj["fertilizer_used"]["chemical_based"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.fertilizer_used === "none") {
            obj["fertilizer_used"]["none"] =
              (obj["fertilizer_used"]["none"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
        } else if (_item.type === "tree") {
          if (_item.fertilizer_used === "organic self made") {
            obj["fertilizer_used"]["organic_self_made"] =
              (obj["fertilizer_used"]["organic_self_made"] || 0) + _item.number;
          }
          if (_item.fertilizer_used === "organic purchased") {
            obj["fertilizer_used"]["organic_purchased"] =
              (obj["fertilizer_used"]["organic_purchased"] || 0) + _item.number;
          }
          if (_item.fertilizer_used === "chemical based") {
            obj["fertilizer_used"]["chemical_based"] =
              (obj["fertilizer_used"]["chemical_based"] || 0) + _item.number;
          }
          if (_item.fertilizer_used === "none") {
            obj["fertilizer_used"]["none"] =
              (obj["fertilizer_used"]["none"] || 0) + _item.number;
          }
        }
      }
      if (_item.pesticide_used) {
        if (_item.type === "cultivation") {
          if (_item.pesticide_used === "organic self made") {
            obj["pesticide_used"]["organic_self_made"] =
              (obj["pesticide_used"]["organic_self_made"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.pesticide_used === "organic purchased") {
            obj["pesticide_used"]["organic_purchased"] =
              (obj["pesticide_used"]["organic_purchased"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.pesticide_used === "chemical based") {
            obj["pesticide_used"]["chemical_based"] =
              (obj["pesticide_used"]["chemical_based"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
          if (_item.pesticide_used === "none") {
            obj["pesticide_used"]["none"] =
              (obj["pesticide_used"]["none"] || 0) +
              landMeaurementConverter(
                _item.area_allocated,
                _item.land_measurement
              );
          }
        } else if (_item.type === "tree") {
          if (_item.pesticide_used === "organic self made") {
            obj["pesticide_used"]["organic_self_made"] =
              (obj["pesticide_used"]["organic_self_made"] || 0) + _item.number;
          }
          if (_item.pesticide_used === "organic purchased") {
            obj["pesticide_used"]["organic_purchased"] =
              (obj["pesticide_used"]["organic_purchased"] || 0) + _item.number;
          }
          if (_item.pesticide_used === "chemical based") {
            obj["pesticide_used"]["chemical_based"] =
              (obj["pesticide_used"]["chemical_based"] || 0) + _item.number;
          }
          if (_item.pesticide_used === "none") {
            obj["pesticide_used"]["none"] =
              (obj["pesticide_used"]["none"] || 0) + _item.number;
          }
        }
      }
    });

    const yeild_sum = merged_arr.reduce((prev, current) => {
      return prev + current.yeild;
    }, 0);

    obj.yeild = yeild_sum / merged_arr.length;

    const number_sum = merged_arr.reduce((prev, current) => {
      return prev + current.number;
    }, 0);

    obj.avg_number = number_sum / merged_arr.length;

    res.json(obj);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.utilization_chart = async (req, res) => {
  const { village } = req.query;
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
        $match: {
          "user.village_name": village,
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $project: {
          label: "$label.name.en",
          soil_health: "$important_information.soil_health",
          self_consumed: "$utilization.self_consumed",
          sold_to_neighbour: "$utilization.sold_to_neighbours",
          sold_to_market: "$utilization.sold_for_industrial_use",
          fed_to_livestock: "$utilization.fed_to_livestock",
          wastage: "$utilization.wastage",
        },
      },
    ]);
    const fishery_data = await Fishery.aggregate([
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
        $match: {
          "user.village_name": village,
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $project: {
          label: "$label.name.en",
          soil_health: null,
          self_consumed: "$production_information.self_consumed",
          sold_to_neighbour: "$production_information.sold_to_neighbours",
          sold_to_market: "$production_information.sold_for_industrial_use",
          fed_to_livestock: null,
          wastage: "$production_information.wastage",
        },
      },
    ]);
    const poultry_data = await Poultry.aggregate([
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
        $match: {
          "user.village_name": village,
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.poultry_crop_id",
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                wastage: "$wastage",
              },
            ],
          },
        },
      },
      {
        $project: {
          label: "$label.name.en",
          soil_health: null,
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: null,
          wastage: "$wastage",
        },
      },
    ]);
    const tree_data = await Tree.aggregate([
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
        $match: {
          "user.village_name": village,
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$products.tree_crop_id",
          self_consumed: { $sum: "$products.self_consumed" },
          sold_to_neighbour: { $sum: "$products.sold_to_neighbours" },
          sold_to_market: { $sum: "$products.sold_for_industrial_use" },
          fed_to_livestock: { $sum: "$products.fed_to_livestock" },
          wastage: { $sum: "$products.wastage" },
          doc: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              {
                self_consumed: "$self_consumed",
                sold_to_neighbour: "$sold_to_neighbour",
                sold_to_market: "$sold_to_market",
                fed_to_livestock: "$fed_to_livestock",
                wastage: "$wastage",
              },
            ],
          },
        },
      },
      {
        $project: {
          label: "$label.name.en",
          soil_health: "$soil_health",
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbour",
          sold_to_market: "$sold_to_market",
          fed_to_livestock: "$fed_to_livestock",
          wastage: "$wastage",
        },
      },
    ]);
    const hunting_data = await Hunting.aggregate([
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
        $match: {
          "user.village_name": village,
        },
      },
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $project: {
          label: "$label.name.en",
          soil_health: null,
          self_consumed: "$self_consumed",
          sold_to_neighbour: "$sold_to_neighbours",
          sold_to_market: "$sold_in_consumer_market",
          fed_to_livestock: null,
          wastage: "$wastage",
        },
      },
    ]);

    const merged_arr = [
      ...cultivation_data,
      ...fishery_data,
      ...poultry_data,
      ...tree_data,
      ...hunting_data,
    ];

    let grouped_data = groupBy(merged_arr, "label");

    grouped_data = Object.entries(grouped_data).reduce((prev, current) => {
      const obj = {
        self_consumed: 0,
        soil_health: {
          stable: 0,
          decreasing_yeild: 0,
        },
        fed_to_livestock: 0,
        sold_to_market: 0,
        sold_to_neighbour: 0,
        wastage: 0,
      };

      const reduced_obj = current[1].reduce((_prev, _current) => {
        _prev.self_consumed += _current.self_consumed;
        _prev.sold_to_market += _current.sold_to_market;
        _prev.sold_to_neighbour += _current.sold_to_neighbour;
        _prev.wastage += _current.wastage;
        if (_current.fed_to_livestock) {
          _prev.fed_to_livestock += _current.fed_to_livestock;
        }
        if (_current.soil_health === "stable") {
          _prev.soil_health.stable += 1;
        } else if (_current.soil_health === "decreasing yield") {
          _prev.soil_health.decreasing_yeild += 1;
        }
        return _prev;
      }, obj);

      prev[current[0]] = reduced_obj;

      return prev;
    }, {});

    const utilization_object = {
      soil_health: [],
      self_consumed: [],
      sold_to_market: [],
      sold_to_neighbours: [],
      fed_to_livestock: [],
      wastage: [],
    };

    Object.entries(grouped_data).forEach((_object) => {
      utilization_object.soil_health.push({
        label: _object[0],
        value: _object[1].soil_health,
      });
      utilization_object.self_consumed.push({
        label: _object[0],
        value: _object[1].self_consumed,
      });
      utilization_object.sold_to_market.push({
        label: _object[0],
        value: _object[1].sold_to_market,
      });
      utilization_object.sold_to_neighbours.push({
        label: _object[0],
        value: _object[1].sold_to_neighbour,
      });
      utilization_object.fed_to_livestock.push({
        label: _object[0],
        value: _object[1].fed_to_livestock,
      });
      utilization_object.wastage.push({
        label: _object[0],
        value: _object[1].wastage,
      });
    });

    res.json(utilization_object);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

module.exports.processing_method = async (req, res) => {
  const { crop_id, village } = req.query;
  try {
    const cultivation = await Cultivation.aggregate([
      {
        $match: {
          crop_id: new ObjectId(crop_id),
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
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
        $project: {
          processing_method: "$important_information.description",
          user_first_name: "$user.first_name",
          user_last_name: "$user.last_name",
          crop_name: "$crop.name.en",
        },
      },
    ]);
    res.json(cultivation);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.income_expenditure = async (req, res) => {
  const { village, type_id } = req.query;
  fx.rates = res.locals.currencies;
  try {
    const cultivation = await Cultivation.aggregate([
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
          from: "crops",
          foreignField: "_id",
          localField: "crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $match: type_id
          ? {
              "label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : {
              "user.village_name": village,
              status: 1,
            },
      },
      {
        $project: {
          crop: "$crop.name.en",
          label: "$label.name.en",
          income: "$important_information.income_from_sale",
          expenditure: "$important_information.expenditure_on_inputs",
          currency: "$user.currency",
        },
      },
    ]);
    const fishery = await Fishery.aggregate([
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
          from: "crops",
          foreignField: "_id",
          localField: "fishery_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $match: type_id
          ? {
              "label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : {
              "user.village_name": village,
              status: 1,
            },
      },
      {
        $project: {
          crop: "$crop.name.en",
          label: "$label.name.en",
          income: "$production_information.income_from_sale",
          expenditure: "$production_information.expenditure_on_inputs",
          currency: "$user.currency",
        },
      },
    ]);
    const poultry = await Poultry.aggregate([
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
          from: "poultry_crops",
          foreignField: "_id",
          localField: "poultry_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $match: type_id
          ? {
              "label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : {
              "user.village_name": village,
              status: 1,
            },
      },
      {
        $project: {
          crop: "$crop.name.en",
          label: "$label.name.en",
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
        },
      },
    ]);
    const tree = await Tree.aggregate([
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
          from: "tree_crops",
          foreignField: "_id",
          localField: "tree_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $match: type_id
          ? {
              "label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : {
              "user.village_name": village,
              status: 1,
            },
      },
      {
        $project: {
          crop: "$crop.name.en",
          label: "$label.name.en",
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
        },
      },
    ]);
    const hunting = await Hunting.aggregate([
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
          from: "hunting_crops",
          foreignField: "_id",
          localField: "hunting_crop_id",
          as: "crop",
        },
      },
      {
        $unwind: {
          path: "$crop",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "label",
        },
      },
      {
        $unwind: {
          path: "$label",
        },
      },
      {
        $match: type_id
          ? {
              "label._id": new ObjectId(type_id),
              "user.village_name": village,
              status: 1,
            }
          : {
              "user.village_name": village,
              status: 1,
            },
      },
      {
        $project: {
          crop: "$crop.name.en",
          label: "$label.name.en",
          income: "$income_from_sale",
          expenditure: "$expenditure_on_inputs",
          currency: "$user.currency",
        },
      },
    ]);

    const merged_arr = [
      ...cultivation,
      ...fishery,
      ...poultry,
      ...tree,
      ...hunting,
    ];

    const grouped_arr = type_id
      ? groupBy(merged_arr, "crop")
      : groupBy(merged_arr, "label");

    const income_expenditure_data = Object.entries(grouped_arr).reduce(
      (prev, current) => {
        const income_expenditure_obj = current[1].reduce(
          (_prev, _current) => {
            _prev.income += fx.convert(_current.income, {
              from: _current.currency,
              to: "USD",
            });
            _prev.expenditure += fx.convert(_current.expenditure, {
              from: _current.currency,
              to: "USD",
            });
            return _prev;
          },
          { income: 0, expenditure: 0 }
        );
        return [...prev, { name: current[0], ...income_expenditure_obj }];
      },
      []
    );

    res.json(income_expenditure_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.selling_channel_data = async (req, res) => {
  const { village } = req.query;

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
        $match: {
          "user.village_name": village,
        },
      },
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
  const { village } = req.query;
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
      $match: {
        "user.village_name": village,
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

module.exports.other_information_tree_fish_poultry_charts = async (
  req,
  res
) => {
  const { crop_id, village } = req.query;
  try {
    const tree = await Tree.aggregate([
      {
        $match: {
          tree_crop_id: new ObjectId(crop_id),
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$avg_age_of_trees",
          count: { $count: {} },
        },
      },
    ]);
    const obj = {};
    tree.forEach((_tree) => {
      obj[_tree._id] = _tree.count;
    });

    const tree_products = await TreeProduct.aggregate([
      {
        $match: {
          tree_crop_id: new ObjectId(crop_id),
        },
      },
      // {
      //   $lookup: {
      //     from: "trees"
      //   }
      // },
      // {
      //   $lookup: {
      //     from: "users",
      //     foreignField: "_id",
      //     localField: "user_id",
      //     as: "user",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$user",
      //   },
      // },
      // {
      //   $match: {
      //     "user.village_name": village,
      //   },
      // },
    ]);

    if (tree.length) {
      res.json({
        data: obj,
        products: tree_products,
        type: "chart",
        crop_type: "tree",
      });
      return;
    }
    const fish_from_river = await Fishery.aggregate([
      {
        $match: {
          fishery_crop_id: new ObjectId(crop_id),
          fishery_type: "river",
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$fishery_crop_id",
          count: { $sum: "$important_information.number_of_fishes" },
        },
      },
    ]);
    if (fish_from_river.length) {
      res.json({ data: fish_from_river, crop_type: "fish river" });
      return;
    }
    const fish_from_pond = await Fishery.aggregate([
      {
        $match: {
          fishery_crop_id: new ObjectId(crop_id),
          fishery_type: "pond",
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$fishery_crop_id",
          count: { $sum: "$important_information.number_of_fishes" },
        },
      },
    ]);
    if (fish_from_pond.length) {
      res.json({ data: fish_from_pond, crop_type: "fish pond" });
      return;
    }
    const huntings = await Hunting.aggregate([
      {
        $match: {
          hunting_crop_id: new ObjectId(crop_id),
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$hunting_crop_id",
          count: { $sum: "$number_hunted" },
        },
      },
    ]);
    if (huntings.length) {
      res.json({ data: huntings, crop_type: "hunting" });
      return;
    }
    const poultry = await Poultry.aggregate([
      {
        $match: {
          poultry_crop_id: new ObjectId(crop_id),
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
        },
      },
      {
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$poultry_crop_id",
          count: { $sum: "$number" },
          average: { $avg: "$avg_age_of_live_stocks" },
        },
      },
    ]);
    const poultry_products = await PoultryProduct.aggregate([
      {
        $match: {
          poultry_crop_id: new ObjectId(crop_id),
        },
      },
      // {
      //   $lookup: {
      //     from: "trees"
      //   }
      // },
      // {
      //   $lookup: {
      //     from: "users",
      //     foreignField: "_id",
      //     localField: "user_id",
      //     as: "user",
      //   },
      // },
      // {
      //   $unwind: {
      //     path: "$user",
      //   },
      // },
      // {
      //   $match: {
      //     "user.village_name": village,
      //   },
      // },
    ]);
    if (poultry.length) {
      res.json({
        data: poultry,
        products: poultry_products,
        crop_type: "poultry",
      });
      return;
    }
    res.json({});
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

// Consumptions

module.exports.consumption_from_production = async (req, res) => {
  const { type_id, crop_id, village } = req.query;
  if (!type_id || !crop_id) {
    res.status(400).json({
      message: "Incomplete data provided",
    });
    return;
  }
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_type_id: new ObjectId(type_id),
          consumption_crop_id: new ObjectId(crop_id),
          status: 1,
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
        $match: {
          "user.village_name": village,
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

    const structured_data = consumption_docs.reduce((prev, current) => {
      const self_grown = weightConverter(
        current.self_grown,
        current.weight_measurement
      );
      const purchased_from_neighbours = weightConverter(
        current.purchased_from_neighbours,
        current.weight_measurement
      );
      const purchased_from_market = weightConverter(
        current.purchased_from_market,
        current.weight_measurement
      );
      const self_consumed = weightConverter(
        current.total_quantity,
        current.weight_measurement
      );
      prev.self_grown = (prev.self_grown || 0) + self_grown;
      prev.purchased_from_neighbours =
        (prev.purchased_from_neighbours || 0) + purchased_from_neighbours;
      prev.purchased_from_market =
        (prev.purchased_from_market || 0) + purchased_from_market;
      prev.self_consumed = (prev.self_consumed || 0) + self_consumed;
      return prev;
    }, {});

    res.json(structured_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.self_grown_consumption_data = async (req, res) => {
  const { type_id, village } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: type_id
          ? {
              consumption_type_id: new ObjectId(type_id),
              status: 1,
            }
          : { status: 1 },
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
      _consumption.self_grown = weightConverter(
        _consumption.self_grown,
        _consumption.weight_measurement
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

    const grouped_by_crop_data = type_id
      ? groupBy(new_consumption_docs, "consumption_crop_id")
      : groupBy(new_consumption_docs, "consumption_type_id");

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        name: type_id
          ? _item[1]?.[0]?.consumption_crop.name
          : _item[1]?.[0]?.consumption_type.name.en,
      };
      const total_self_grown = _item[1].reduce(
        (prev, current) => (prev += current.self_grown),
        0
      );
      structured_data.output = total_self_grown;
      return structured_data;
    });
    res.json(processed_data);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.self_consumed_data = async (req, res) => {
  const { type_id, village } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: type_id
          ? {
              consumption_type_id: new ObjectId(type_id),
              status: 1,
            }
          : { status: 1 },
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
        _consumption.weight_measurement
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

    const grouped_by_crop_data = type_id
      ? groupBy(new_consumption_docs, "consumption_crop_id")
      : groupBy(new_consumption_docs, "consumption_type_id");

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        name: type_id
          ? _item[1]?.[0]?.consumption_crop.name
          : _item[1]?.[0]?.consumption_type.name.en,
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
  const { type_id, village } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: type_id
          ? {
              consumption_type_id: new ObjectId(type_id),
              status: 1,
            }
          : { status: 1 },
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
        _consumption.weight_measurement
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

    const grouped_by_crop_data = type_id
      ? groupBy(new_consumption_docs, "consumption_crop_id")
      : groupBy(new_consumption_docs, "consumption_type_id");

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        name: type_id
          ? _item[1]?.[0]?.consumption_crop.name
          : _item[1]?.[0]?.consumption_type.name.en,
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
  const { type_id, village } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: type_id
          ? {
              consumption_type_id: new ObjectId(type_id),
              status: 1,
            }
          : { status: 1 },
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
        _consumption.weight_measurement
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

    const grouped_by_crop_data = type_id
      ? groupBy(new_consumption_docs, "consumption_crop_id")
      : groupBy(new_consumption_docs, "consumption_type_id");

    const processed_data = Object.entries(grouped_by_crop_data).map((_item) => {
      const structured_data = {
        _id: _item[0],
        name: type_id
          ? _item[1]?.[0]?.consumption_crop.name
          : _item[1]?.[0]?.consumption_type.name.en,
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

module.exports.consumption_by_crop = async (req, res) => {
  const { crop_id, village } = req.query;
  try {
    const consumption_docs = await Consumption.aggregate([
      {
        $match: {
          consumption_crop_id: new ObjectId(crop_id),
          status: 1,
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
        _consumption.weight_measurement
      );
      _consumption.self_grown = weightConverter(
        _consumption.self_grown,
        _consumption.weight_measurement
      );
      _consumption.purchased_from_market = weightConverter(
        _consumption.purchased_from_market,
        _consumption.weight_measurement
      );
      _consumption.purchased_from_neighbours = weightConverter(
        _consumption.purchased_from_neighbours,
        _consumption.weight_measurement
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
    const final_obj = {
      self_grown: 0,
      output: 0,
      purchased_from_market: 0,
      purchased_from_neighbours: 0,
    };
    new_consumption_docs.forEach((_consumption) => {
      final_obj.name = _consumption.consumption_crop.name;
      final_obj.output += _consumption.output;
      final_obj.self_grown += _consumption.self_grown;
      final_obj.purchased_from_market += _consumption.purchased_from_market;
      final_obj.purchased_from_neighbours +=
        _consumption.purchased_from_neighbours;
    });
    res.json(final_obj);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports.ideal_consumption_by_label = async (req, res) => {
  const { village } = req.query;
  try {
    const consumption_aggregated = await Consumption.aggregate([
      // {
      //   $match: {
      //     consumption_type_id: new ObjectId(type_id),
      //   },
      // },
      {
        $lookup: {
          from: "consumption_types",
          localField: "consumption_type_id",
          foreignField: "_id",
          as: "consumption_type",
        },
      },
      {
        $unwind: {
          path: "$consumption_type",
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
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "user.village_name": village,
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
          "consumption_type.name": "$consumption_type.name.en",
        },
      },
    ]);

    const new_consumption_docs = consumption_aggregated.map((_consumption) => {
      _consumption.output = weightConverter(
        _consumption.total_quantity,
        _consumption.weight_measurement
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

    const grouped_by_label = groupBy(
      new_consumption_docs,
      "consumption_type_id"
    );

    const processed_data = Object.entries(grouped_by_label).map((_item) => {
      const structured_data = {
        _id: _item[0],
        label_name: _item[1]?.[0]?.consumption_type.name,
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

module.exports.ideal_consumption_expected = async (req, res) => {
  const { type_id, village } = req.query;
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
        $match: {
          "user.village_name": village,
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
        _consumption.weight_measurement
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

// Food Balance

<<<<<<< HEAD
module.exports.deficient_chart = async (req, res) => {
  const { type_id, village } = req.query;
  try {
    const type_based_cultivation = await Cultivation.aggregate([
      {
=======
module.exports.deficiet_chart = async (req, res) => {
  const { village } = req.query;
  try {
    const type_based_cultivation = await Cultivation.aggregate([
      {
        $match: {
          status: 1,
        },
      },
      {
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
        $match: {
          status: 1,
=======
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          // preserveNullAndEmptyArrays: true,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
        $match: {
          "user.village_name": village,
        },
      },
<<<<<<< HEAD
=======
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$utilization.self_consumed" },
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
              {
                count: "$count",
              },
            ],
          },
        },
      },
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
      // {
      //   $addFields: {
      //     self_consumed: "$utilization.self_consumed",
      //     crop_name: "$crop.name.en",
      //     land_measurement: "$user.land_measurement",
      //   },
      // },
      {
        $project: {
<<<<<<< HEAD
          self_consumed: "$utilization.self_consumed",
          output: 1,
          area_allocated: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          type: "cultivation",
          crop_ideal_consumption: "$crop.ideal_consumption_per_person",
=======
          self_consumed: "$self_consumed",
          label: "$crop.label.name.en",
          type: "cultivation",
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
        },
      },
    ]);

    const type_based_fishery = await Fishery.aggregate([
      {
<<<<<<< HEAD
=======
        $match: {
          status: 1,
        },
      },
      {
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
=======
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          // preserveNullAndEmptyArrays: true,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$production_information.self_consumed" },
<<<<<<< HEAD
          output: { $sum: "$production_information.production_output" },
          number: { $sum: "$important_information.number_of_fishes" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
<<<<<<< HEAD
              { output: "$output" },
              { number: "$number" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: {
            $divide: [{ $toInt: "$output" }, { $toInt: "$number" }],
          },
=======
          label: "$crop.label.name.en",
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
=======
        $match: {
          status: 1,
        },
      },
      {
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
=======
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          // preserveNullAndEmptyArrays: true,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
        $match: {
          "user.village_name": village,
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
<<<<<<< HEAD
          output: { $sum: "$products.production_output" },
          number: { $sum: "$number" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
<<<<<<< HEAD
              { output: "$output" },
              {
                number: "$number",
              },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
              { count: "$count" },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
<<<<<<< HEAD
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: { $divide: [{ $toInt: "$output" }, { $toInt: "$number" }] },
=======
          label: "$crop.label.name.en",
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          type: "poultry",
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
        },
      },
    ]);

    const type_based_tree = await Tree.aggregate([
      {
<<<<<<< HEAD
=======
        $match: {
          status: 1,
        },
      },
      {
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
=======
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          // preserveNullAndEmptyArrays: true,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
        $match: {
          "user.village_name": village,
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
<<<<<<< HEAD
          output: { $sum: "$products.production_output" },
          number: { $sum: "$number_of_trees" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
<<<<<<< HEAD
              { output: "$output" },
              {
                number: "$number",
              },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: {
            $divide: [{ $toInt: "$output" }, { $toInt: "$number" }],
          },
=======
          label: "$crop.label.name.en",
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          type: "trees",
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
        },
      },
    ]);

    const type_based_hunting = await Hunting.aggregate([
      {
<<<<<<< HEAD
=======
        $match: {
          status: 1,
        },
      },
      {
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
<<<<<<< HEAD
        $match: {
          "crop.label": new ObjectId(type_id),
          status: 1,
=======
        $lookup: {
          from: "consumption_types",
          foreignField: "_id",
          localField: "crop.label",
          as: "crop.label",
        },
      },
      {
        $unwind: {
          path: "$crop.label",
          // preserveNullAndEmptyArrays: true,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
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
        $match: {
          "user.village_name": village,
        },
      },
      {
        $group: {
          _id: "$crop._id",
          doc: { $mergeObjects: "$$ROOT" },
          self_consumed: { $sum: "$self_consumed" },
<<<<<<< HEAD
          output: { $sum: "$meat" },
          number: { $sum: "$number_hunted" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          count: { $sum: 1 },
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$doc",
              { self_consumed: "$self_consumed" },
<<<<<<< HEAD
              { output: "$output" },
              { number: "$number" },
=======
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
              { count: "$count" },
            ],
          },
        },
      },
      {
        $project: {
          self_consumed: 1,
<<<<<<< HEAD
          output: 1,
          number: 1,
          land_measurement: "$user.land_measurement",
          crop_name: "$crop.name.en",
          crop_id: "$crop._id",
          yeild: { $divide: [{ $toInt: "$output" }, { $toInt: "$number" }] },
=======
          label: "$crop.label.name.en",
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
          ideal_consumption: {
            $multiply: ["$crop.ideal_consumption_per_person", "$count"],
          },
          type: "hunting",
        },
      },
    ]);

<<<<<<< HEAD
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
=======
    const new_arr = [
      ...type_based_cultivation,
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
      ...type_based_fishery,
      ...type_based_hunting,
      ...type_based_poultry,
      ...type_based_tree,
<<<<<<< HEAD
    ]);
=======
    ];
    const processed_cultivation_arr = {};

    new_arr.forEach((_item) => {
      processed_cultivation_arr[_item.label] = {
        self_consumed:
          (processed_cultivation_arr[_item.label]?.["self_consumed"] || 0) +
          _item.self_consumed,
        ideal_consumption:
          (processed_cultivation_arr[_item.label]?.["ideal_consumption"] || 0) +
          _item.ideal_consumption,
      };
    });

    Object.entries(processed_cultivation_arr).forEach((_item) => {
      if (_item[1].ideal_consumption - _item[1].self_consumed > 0) {
        processed_cultivation_arr[_item[0]] =
          _item[1].ideal_consumption - _item[1].self_consumed;
      } else {
        delete processed_cultivation_arr[_item[0]];
      }
    });

    res.json(processed_cultivation_arr);
>>>>>>> 92229093e33f5b323f5dd2b08f6fefb63407b6fc
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};

module.exports.food_balance = async (req, res) => {
  const { type_id, village } = req.query;
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
      {
        $match: {
          "user.village_name": village,
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
        $match: {
          "user.village_name": village,
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
        $match: {
          "user.village_name": village,
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
        $match: {
          "user.village_name": village,
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
        $match: {
          "user.village_name": village,
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
