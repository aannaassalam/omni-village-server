const Fishery = require("../Models/fishery");
const FisheryCrop = require("../Models/fisheryCrop");
const mongoose = require("mongoose");
const moment = require("moment");

const handleErrors = (err) => {
  let errors = {};
  return err;
};

// fishery_type === "pond"
//         ? [
//             {
//               $match: {
//                 user_id: user._id,
//                 fishery_type,
//               },
//             },
//             {
//               $lookup: {
//                 from: "fishery_crops",
//                 localField: "fishery_crop_id",
//                 foreignField: "_id",
//                 as: "fishery_crop",
//               },
//             },
//             { $unwind: { path: "$fishery_crop" } },
//             {
//               $project: { __v: 0, "fishery_crop.__v": 0 },
//             },
//             {
//               $group: {
//                 _id: "$pond_name",
//                 result: {
//                   $push: "$$ROOT",
//                 },
//               },
//             },
//             {
//               $group: {
//                 _id: null,
//                 results: {
//                   $push: {
//                     k: "$_id",
//                     v: "$result",
//                   },
//                 },
//               },
//             },
//             {
//               $replaceRoot: {
//                 newRoot: { $arrayToObject: "$results" },
//               },
//             },
//           ]
// : [
//     {
//       $match: {
//         user_id: user._id,
//         fishery_type,
//       },
//     },
//     {
//       $lookup: {
//         from: "fishery_crops",
//         localField: "fishery_crop_id",
//         foreignField: "_id",
//         as: "fishery_crop",
//       },
//     },
//     { $unwind: { path: "$fishery_crop" } },
//     {
//       $project: { __v: 0, "fishery_crop.__v": 0 },
//     },
//   ]

module.exports.get_fishery = async (req, res) => {
  const { fishery_type } = req.params;
  const { language } = req.query;
  const { user } = res.locals;

  try {
    const fishery_doc = await Fishery.aggregate([
      {
        $match: {
          user_id: user._id,
          fishery_type,
        },
      },
      {
        $lookup: {
          from: "fishery_crops",
          localField: "fishery_crop_id",
          foreignField: "_id",
          as: "fishery_crop",
        },
      },
      { $unwind: { path: "$fishery_crop" } },
      {
        $project: { __v: 0, "fishery_crop.__v": 0 },
      },
      {
        $addFields: {
          "fishery_crop.name": `$fishery_crop.name.${language}`,
        },
      },
    ]);
    res.json(fishery_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_all_fishery = async (req, res) => {
  try {
    const fishery_doc = await Fishery.aggregate([
      {
        $lookup: {
          from: "fishery_crops",
          localField: "fishery_crop_id",
          foreignField: "_id",
          as: "crop",
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
      { $unwind: { path: "$crop" } },
      { $unwind: { path: "$user" } },
      {
        $project: {
          __v: 0,
          "crop.__v": 0,
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    res.json(fishery_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.add_fishery = async (req, res) => {
  const {
    fishery_crop_id,
    fishery_type,
    important_information,
    production_information,
    processing_method,
    weight_measurement = "kg",
    status = 1,
  } = req.body;
  const { user } = res.locals;

  try {
    // if (parseInt(season) <= parseInt(cultivation_type)) {
    const fishery_doc = await Fishery.create({
      user_id: user._id,
      fishery_crop_id,
      fishery_type,
      important_information,
      production_information,
      processing_method,
      weight_measurement,
      status,
    });
    res.json(fishery_doc);
    // } else {
    //   res.status(400).json({
    //     message: `Season ${season} is not valid for type ${cultivation_type} cultivation`,
    //   });
    // }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.update_fishery = async (req, res) => {
  const {
    fishery_id,
    important_information,
    production_information,
    processing_method,
    weight_measurement = "kg",
    status = 1,
  } = req.body;

  try {
    const fishery_doc = await Fishery.findByIdAndUpdate(
      fishery_id,
      {
        important_information,
        production_information,
        processing_method,
        weight_measurement,
        status,
      },
      { runValidators: true, new: true }
    );
    res.json(fishery_doc);
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.delete_fishery = async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await Fishery.findByIdAndDelete(id);
    if (doc) {
      res.json({ message: "Fishery deleted!" });
    } else {
      res.status(400).json({ message: "Something went wrong!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.fishery_list = async (req, res) => {
  const fisheries = await Fishery.aggregate([
    {
      $lookup: {
        from: "fishery_crop",
        localField: "fishery_crop_id",
        foreignField: "_id",
        as: "fishery_crop",
      },
    },
    {
      $unwind: {
        path: "$fishery_crop",
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
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  // const processed_fisheries = {};
  // fisheries.forEach((fishery) => {
  //   const date = moment(fishery.createdAt).format("LL");
  //   processed_fisheries[date] = processed_fisheries[date]
  //     ? [...processed_fisheries[date], fishery]
  //     : [fishery];
  // });
  res.json(fisheries);

  // res.render("fishery", {
  //   fisheries: processed_fisheries,
  // });
};
