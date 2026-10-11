const Mobility = require("../Models/mobility");
const MobilityByUsers = require("../Models/mobility-by-user");

const getVehicleTypeDistribution = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "mobility_dropdowns", //  assuming 'type' refers to vehicle type and is in this collection
          localField: "type",
          foreignField: "_id",
          as: "vehicleType",
        },
      },
      {
        $unwind: "$vehicleType",
      },
      {
        $group: {
          _id: "$vehicleType.name", // Group by vehicle type name
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          vehicleType: "$_id",
          count: 1,
        },
      },
      {
        $sort: { count: -1 }, // Sort by count, descending
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching vehicle type distribution:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getTravelDistanceSplit = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$userDetails.village_name",
          totalInVillage: { $sum: "$distance_travelled_within_village" },
          totalOutside: { $sum: "$distance_travelled_outside" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          inVillage: "$totalInVillage",
          outside: "$totalOutside",
        },
      },
      {
        $sort: { village: 1 },
      },
    ]);

    const chartData = result.map((item) => ({
      village: item.village,
      "Distance Travelled Within Village (KM)": item.inVillage,
      "Distance Travelled Outside (KM)": item.outside,
    }));

    const restructuredData = {
      chartData,
      keys: [
        "Distance Travelled Within Village (KM)",
        "Distance Travelled Outside (KM)",
      ],
    };

    res.status(200).json({
      status: "success",
      data: restructuredData,
    });
  } catch (error) {
    console.error("Error fetching travel distance data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getPurposeOfUsageData = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $match: matchStage,
      },
      {
        $unwind: "$purpose_use_of_vehicle",
      },
      {
        $lookup: {
          from: "mobility_dropdowns",
          let: { purposeId: "$purpose_use_of_vehicle" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$purposeId"] },
                    {
                      $eq: ["$_id", { $toObjectId: "$$purposeId" }],
                    },
                  ],
                },
              },
            },
          ],
          as: "purposeDetails",
        },
      },
      {
        $unwind: {
          path: "$purposeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$userDetails.village_name",
            purpose: "$purposeDetails.name", // Use English name
          },
          totalDistance: {
            $sum: {
              $add: [
                "$distance_travelled_within_village",
                "$distance_travelled_outside",
              ],
            },
          }, // Sum of inside and outside distances
        },
      },
      {
        $group: {
          _id: "$_id.village",
          purposes: {
            $push: {
              purpose: "$_id.purpose",
              totalDistance: { $sum: "$totalDistance" },
            },
          },
          totalVillageDistance: { $sum: "$totalDistance" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          purposes: 1,
          totalVillageDistance: 1,
        },
      },
      {
        $sort: { village: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: {
        result,
      },
    });
  } catch (error) {
    console.error("Error fetching purpose of usage data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getFrequencyAndVehicleTypeData = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $match: matchStage,
      },
      {
        $lookup: {
          from: "mobility_dropdowns",
          localField: "type",
          foreignField: "_id",
          as: "vehicleTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$vehicleTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$userDetails.village_name",
            frequency: "$frequency_of_usage",
            vehicleType: "$vehicleTypeDetails.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            village: "$_id.village",
            vehicleType: "$_id.vehicleType",
          },
          daily: {
            $sum: {
              $cond: [{ $eq: ["$_id.frequency", "Daily"] }, "$count", 0],
            },
          },
          weekly: {
            $sum: {
              $cond: [{ $eq: ["$_id.frequency", "Weekly"] }, "$count", 0],
            },
          },
          monthly: {
            $sum: {
              $cond: [{ $eq: ["$_id.frequency", "Monthly"] }, "$count", 0],
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          vehicleTypes: {
            $push: {
              vehicleType: "$_id.vehicleType",
              daily: "$daily",
              weekly: "$weekly",
              monthly: "$monthly",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          vehicleTypes: 1,
        },
      },
      {
        $sort: { village: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching frequency and vehicle type data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getVehicleRequirementByTypeBarChartData = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await MobilityByUsers.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchStage,
      },
      {
        $unwind: {
          path: "$vehicles_needed",
          //   preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "mobility_dropdowns",
          let: { vehicleTypeId: "$vehicles_needed.vehicle_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$vehicleTypeId"] },
                    { $eq: ["$_id", { $toObjectId: "$$vehicleTypeId" }] }, //convert string to objectid
                  ],
                },
              },
            },
          ],
          as: "vehicleTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$vehicleTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$userDetails.village_name",
            vehicleType: "$vehicleTypeDetails.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          vehicleTypeData: {
            $push: {
              vehicleType: "$_id.vehicleType",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          vehicleTypeData: 1,
        },
      },
      {
        $sort: { village: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching vehicle requirement data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getVehicleRequirementUrgencyAndTypeWaterfallData = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await MobilityByUsers.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchStage,
      },
      {
        $unwind: {
          path: "$vehicles_needed",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "mobility_dropdowns",
          let: { vehicleTypeId: "$vehicles_needed.vehicle_type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$vehicleTypeId"] },
                    { $eq: ["$_id", { $toObjectId: "$$vehicleTypeId" }] },
                  ],
                },
              },
            },
          ],
          as: "vehicleTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$vehicleTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$userDetails.village_name",
            urgency: "$vehicles_needed.urgency",
            vehicleType: "$vehicleTypeDetails.name", // Include vehicle type
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          urgencyData: {
            $push: {
              urgency: "$_id.urgency",
              vehicleType: "$_id.vehicleType", // Include vehicle type in push
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          urgencyData: 1,
        },
      },
      {
        $sort: { village: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error(
      "Error fetching vehicle requirement urgency and type data:",
      error
    );
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getAverageVehiclesPerUser = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            user_id: "$user_id",
            village_name: "$userDetails.village_name",
          },
          vehicleCount: { $sum: 1 },
          totalDistanceTravelled: {
            $sum: {
              $add: [
                "$distance_travelled_within_village",
                "$distance_travelled_outside",
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: "$_id.village_name",
          villageName: { $first: "$_id.village_name" },
          users: {
            $push: {
              vehicleCount: "$vehicleCount",
              user_id: "$_id.user_id",
              totalDistanceTravelled: "$totalDistanceTravelled",
            },
          },
          totalVillageDistance: { $sum: "$totalDistanceTravelled" },
          totalVehiclesInVillage: { $sum: "$vehicleCount" },
        },
      },
      {
        $project: {
          _id: 0,
          villageName: 1,
          users: 1,
          totalVillageDistance: 1,
          totalVehiclesInVillage: 1,
          averageVehiclesPerUser: {
            $divide: ["$totalVehiclesInVillage", { $size: "$users" }],
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching travel data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getMobilityGapHeatmap = async (req, res) => {
  try {
    const { country } = req.query;

    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = {
        $regex: new RegExp(`^${country}$`, "i"),
      };
    }

    const result = await Mobility.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$userDetails.village_name",
          totalVehicles: { $sum: 1 },
          totalPopulation: { $sum: 1 }, //  Simplified: Assuming each user represents 1 person.  IMPORTANT: You might need a different way to get population.
          totalDistanceTravelledWithinVillage: {
            $sum: "$distance_travelled_within_village",
          },
          totalDistanceTravelledOutside: {
            $sum: "$distance_travelled_outside",
          },
        },
      },
      {
        $project: {
          _id: 0,
          villageName: "$_id",
          totalVehicles: 1,
          totalPopulation: 1,
          totalDistanceTravelled: {
            $add: [
              "$totalDistanceTravelledWithinVillage",
              "$totalDistanceTravelledOutside",
            ],
          },
          gapIndex: {
            //  Calculate the gap index.  Adjust the formula as needed.
            $cond: [
              { $eq: ["$totalPopulation", 0] }, // Avoid division by zero.
              0,
              {
                $divide: [
                  { $subtract: ["$totalPopulation", "$totalVehicles"] },
                  "$totalPopulation",
                ],
              },
            ],
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching mobility gap data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getVehicleTypeDistribution,
  getTravelDistanceSplit,
  getPurposeOfUsageData,
  getFrequencyAndVehicleTypeData,
  getVehicleRequirementByTypeBarChartData,
  getVehicleRequirementUrgencyAndTypeWaterfallData,
  getAverageVehiclesPerUser,
  getMobilityGapHeatmap,
};
