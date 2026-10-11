const Water = require("../Models/water");

const getWaterConsumptionHistogram = async (req, res) => {
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

    const validTypes = [
      "sanitation_and_bathing",
      "cooking_and_drinking",
      "irrigation",
      "others",
      "cleaning",
    ];

    const pipeline = [
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
          from: "water_dropdowns",
          localField: "yearly_consumption",
          foreignField: "_id",
          as: "consumptionDetails",
        },
      },
      {
        $unwind: {
          path: "$consumptionDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          type: { $in: validTypes },
        },
      },
      {
        $group: {
          _id: {
            type: "$type", // Group by water type
            consumptionRange: "$consumptionDetails.name", //and consumption range
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id.type",
          consumptionRange: "$_id.consumptionRange",
          count: 1,
        },
      },
      {
        $sort: {
          type: 1,
          consumptionRange: 1,
        },
      },
    ];

    const result = await Water.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching water consumption histogram:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getWaterSourceDistribution = async (req, res) => {
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

    const pipeline = [
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
        $unwind: "$water_sourced_from", // Unwind the water_sourced_from array
      },
      {
        $lookup: {
          from: "water_dropdowns", //  assuming water source details are in this collection
          localField: "water_sourced_from",
          foreignField: "_id",
          as: "sourceDetails",
        },
      },
      {
        $unwind: "$sourceDetails", // Unwind the sourceDetails
      },
      {
        $group: {
          _id: "$sourceDetails.name", // Group by source name
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          count: 1,
        },
      },
      {
        $sort: {
          count: -1, // Sort by count in descending order
        },
      },
    ];

    const result = await Water.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching water source distribution:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getWaterSourceQualityMatrix = async (req, res) => {
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

    const pipeline = [
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
          from: "water_dropdowns",
          localField: "water_sourced_from",
          foreignField: "_id",
          as: "sourceDetails",
        },
      },
      {
        $unwind: "$sourceDetails",
      },
      {
        $lookup: {
          from: "water_dropdowns",
          localField: "water_quality",
          foreignField: "_id",
          as: "qualityDetails",
        },
      },
      {
        $unwind: "$qualityDetails",
      },
      {
        $group: {
          _id: {
            source: "$sourceDetails.name.en",
            quality: "$qualityDetails.name.en",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id.source",
          quality: "$_id.quality",
          count: 1,
        },
      },
      {
        $group: {
          _id: "$source",
          qualities: {
            $push: { quality: "$quality", count: "$count" },
          },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          qualities: 1,
        },
      },
    ];

    const result = await Water.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching water source quality matrix:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getAverageExpensePerSource = async (req, res) => {
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

    const pipeline = [
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
        $unwind: "$water_sourced_from",
      },
      {
        $lookup: {
          from: "water_dropdowns",
          localField: "water_sourced_from",
          foreignField: "_id",
          as: "sourceDetails",
        },
      },
      {
        $unwind: "$sourceDetails",
      },
      {
        $group: {
          _id: "$sourceDetails.name.en",
          totalExpense: { $sum: "$expense" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          averageExpense: { $divide: ["$totalExpense", "$count"] },
        },
      },
      {
        $sort: { averageExpense: -1 },
      },
    ];

    const result = await Water.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching average expense per source:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getWaterHarvestingCapacity = async (req, res) => {
  try {
    const { country, village } = req.query;

    const matchStage = {
      type: "water_harvesting_capacity",
    };

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

    const pipeline = [
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
        $project: {
          _id: 0,
          village: "$userDetails.village_name",
          type_of_harvesting: 1,
        },
      },
      {
        $unwind: "$type_of_harvesting", // Add this unwind stage
      },
      {
        $lookup: {
          from: "water_dropdowns", // Add this lookup stage
          localField: "type_of_harvesting.type",
          foreignField: "_id",
          as: "harvesting_capacity_details",
        },
      },
      {
        $unwind: {
          path: "$harvesting_capacity_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$village",
          totalCapacity: { $sum: "$type_of_harvesting.capacity" },
          count: { $sum: 1 },
          harvestingDetails: {
            $push: {
              type: "$harvesting_capacity_details.name.en", // Get the English name
              capacity: "$type_of_harvesting.capacity",
            },
          }, // Include details in the result
        },
      },
      {
        $project: {
          village: "$_id",
          totalCapacity: 1,
          count: 1,
          _id: 0,
          harvestingDetails: {
            $filter: {
              input: "$harvestingDetails",
              as: "detail",
              cond: { $ne: ["$$detail.type", "none"] }, // Exclude 'none' types
            },
          },
        },
      },
      {
        $sort: {
          totalCapacity: -1,
        },
      },
    ];

    const result = await Water.aggregate(pipeline);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching water harvesting capacity:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getWastewaterDisposalData = async (req, res) => {
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

    const result = await Water.aggregate([
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
        $unwind: {
          path: "$wastewater_disposal_methods",
          // Removed preserveNullAndEmptyArrays: true
        },
      },
      {
        $lookup: {
          from: "water_dropdowns",
          localField: "wastewater_disposal_methods",
          foreignField: "_id",
          as: "disposalMethodDetails",
        },
      },
      {
        $unwind: {
          path: "$disposalMethodDetails",
          // Removed preserveNullAndEmptyArrays: true
        },
      },
      {
        $group: {
          _id: {
            village: "$userDetails.village_name",
            method: "$disposalMethodDetails.name.en",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          disposalMethods: {
            $push: { method: "$_id.method", count: "$count" },
          },
          total: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          disposalMethods: {
            $map: {
              input: "$disposalMethods",
              as: "item",
              in: {
                method: "$$item.method",
                percentage: {
                  $multiply: [{ $divide: ["$$item.count", "$total"] }, 100],
                },
              },
            },
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching wastewater disposal data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getWaterRecyclingAdoption = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(village, "i"),
      };
    }

    const result = await Water.aggregate([
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
          totalHouseholds: { $sum: 1 }, //simplified since every document represents a household
          recyclingHouseholds: {
            $sum: {
              $cond: [{ $eq: ["$water_recycle", true] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          totalHouseholds: 1,
          recyclingPercentage: {
            $multiply: [
              { $divide: ["$recyclingHouseholds", "$totalHouseholds"] },
              100,
            ],
          },
        },
      },
    ]);

    if (result.length > 0) {
      res.status(200).json({
        status: "success",
        data: result[0],
      });
    } else {
      res.status(200).json({
        status: "success",
        data: {
          village: village,
          totalHouseholds: 0,
          recyclingPercentage: 0,
        },
      });
    }
  } catch (error) {
    console.error("Error fetching water recycling adoption data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getScarcitySeverityData = async (req, res) => {
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

    const result = await Water.aggregate([
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
          _id: "$water_scarcity_severity",
          count: { $sum: 1 },
          months_of_year_of_scarcity: { $first: "$months_of_year_of_scarcity" },
        },
      },
      {
        $lookup: {
          from: "water_dropdowns",
          localField: "_id",
          foreignField: "_id",
          as: "severityDetails",
        },
      },
      {
        $unwind: {
          path: "$severityDetails",
        },
      },
      {
        $project: {
          _id: 0,
          severity: "$severityDetails.name",
          count: 1,
          months_of_year_of_scarcity: 1,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching water scarcity severity data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getMeterCoverage = async (req, res) => {
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

    const result = await Water.aggregate([
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
          _id: null,
          totalHouseholds: { $sum: 1 },
          meteredHouseholds: {
            $sum: { $cond: ["$water_meter", 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          meterCoveragePercentage: {
            $multiply: [
              { $divide: ["$meteredHouseholds", "$totalHouseholds"] },
              100,
            ],
          },
        },
      },
    ]);

    if (result.length > 0) {
      res.status(200).json({
        status: "success",
        data: result[0].meterCoveragePercentage,
      });
    } else {
      res.status(200).json({
        status: "success",
        data: 0,
      });
    }
  } catch (error) {
    console.error("Error fetching meter coverage:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getWaterConsumptionHistogram,
  getWaterSourceDistribution,
  getWaterSourceQualityMatrix,
  getAverageExpensePerSource,
  getScarcitySeverityData,
  getWaterHarvestingCapacity,
  getWastewaterDisposalData,
  getWaterRecyclingAdoption,
  getMeterCoverage,
};
