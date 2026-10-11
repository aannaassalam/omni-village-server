const Housing = require("../Models/housing");

const getHousingRenovationUrgencyData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          from: "housing_dropdowns", // For renovation urgency
          localField: "renovation_urgency",
          foreignField: "_id",
          as: "renovationUrgencyData",
        },
      },
      {
        $unwind: {
          path: "$renovationUrgencyData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          nameOfTheHouse: "$name_of_the_house",
          builtArea: "$total_built_area",
          renovationUrgency: "$renovationUrgencyData.name",
          renovationRequirement: 1,
          noOfUnitsBuilt: "$no_of_units_built",
          noOfFloors: "$no_of_floors",
          livingArea: "$living_area",
          yearBuilt: "$year_built",
          yearRenovated: "$year_renovated",
          yearLastExpanded: "$year_last_expanded",
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching housing renovation data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getHouseTypeDonutData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          from: "housing_dropdowns",
          let: { typeValue: "$type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$typeValue"] }, // Handle ObjectId string
                    { $eq: ["$_id", { $toObjectId: "$$typeValue" }] }, // Handle string
                  ],
                },
              },
            },
          ],
          as: "houseTypeData",
        },
      },
      {
        $unwind: {
          path: "$houseTypeData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$houseTypeData.name",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          houseType: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching house type donut data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getFloorsUnitsScatterData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          _id: 1,
          units: "$no_of_units_built",
          floors: "$no_of_floors",
          builtArea: "$total_built_area",
        },
      },
      {
        $group: {
          _id: null,
          maxBuiltArea: { $max: "$builtArea" },
          minBuiltArea: { $min: "$builtArea" },
        },
      },
    ]);

    const scatterData = await Housing.aggregate([
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
          _id: 1,
          units: "$no_of_units_built",
          floors: "$no_of_floors",
          builtArea: "$total_built_area",
        },
      },
    ]);

    const densityData = scatterData.map((item) => ({
      units: item.units,
      floors: item.floors,
      builtArea: item.builtArea,
      densityUtilisation: result[0]
        ? (item.builtArea - result[0].minBuiltArea) /
          (result[0].maxBuiltArea - result[0].minBuiltArea)
        : 0,
    }));

    res.status(200).json({
      status: "success",
      data: {
        scatterData: densityData,
      },
    });
  } catch (error) {
    console.error("Error fetching floors and units scatter data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getYearBuiltRenovatedData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          _id: 1,
          year_built: 1,
          year_renovated: 1,
        },
      },
      {
        $group: {
          _id: null,
          builtYears: { $push: "$year_built" },
          renovatedYears: { $push: "$year_renovated" },
        },
      },
      {
        $project: {
          _id: 0,
          builtYears: 1,
          renovatedYears: 1,
        },
      },
    ]);

    // Flatten the arrays and create data for charting
    const chartData = [];
    if (result.length > 0) {
      const builtYears = result[0].builtYears.filter(
        (year) => typeof year === "number"
      ); // Filter out non-numeric values
      const renovatedYears = result[0].renovatedYears.filter(
        (year) => typeof year === "number"
      );
      builtYears.forEach((year) => chartData.push({ year, type: "Built" }));
      renovatedYears.forEach((year) =>
        chartData.push({ year, type: "Renovated" })
      );
    }

    res.status(200).json({
      status: "success",
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching year built/renovated data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getAmenitiesRadarData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          _id: null, // Group all houses together to get the total count
          houses: { $addToSet: "$_id" }, // Get unique house IDs
          amenitiesData: {
            // Push amenity data for each house
            $push: {
              amenities: "$amenities",
            },
          },
        },
      },
      {
        $unwind: "$amenitiesData",
      },
      {
        $unwind: {
          path: "$amenitiesData.amenities",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "housing_dropdowns", //  amenities details
          localField: "amenitiesData.amenities",
          foreignField: "_id",
          as: "amenityData",
        },
      },
      {
        $unwind: {
          path: "$amenityData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$amenityData.name", // Group by amenity name
          count: { $sum: 1 }, // Count occurrences of each amenity
          totalHouses: { $first: { $size: "$houses" } }, // Use the total number of unique houses
        },
      },
      {
        $addFields: {
          percentage: {
            $cond: [
              { $eq: ["$totalHouses", 0] },
              0,
              { $multiply: [{ $divide: ["$count", "$totalHouses"] }, 100] },
            ],
          },
        },
      },
      {
        $project: {
          amenity: "$_id",
          percentage: 1,
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching amenities radar data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getAmenityHeatmapData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          from: "housing_dropdowns",
          let: { typeValue: "$type" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$typeValue"] }, // Handle ObjectId string
                    { $eq: ["$_id", { $toObjectId: "$$typeValue" }] }, // Handle string
                  ],
                },
              },
            },
          ],
          as: "houseTypeData",
        },
      },
      {
        $unwind: {
          path: "$houseTypeData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$amenities",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "housing_dropdowns",
          localField: "amenities",
          foreignField: "_id",
          as: "amenityData",
        },
      },
      {
        $unwind: {
          path: "$amenityData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            houseType: "$houseTypeData.name",
            amenity: "$amenityData.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.houseType",
          amenities: {
            $push: {
              amenity: "$_id.amenity",
              count: "$count",
            },
          },
          totalHouses: { $sum: 1 },
        },
      },
      {
        $project: {
          houseType: "$_id",
          amenities: 1,
          totalHouses: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching amenity heatmap data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getEquipmentDemandData = async (req, res) => {
  try {
    const { village, country } = req.query;

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

    const result = await Housing.aggregate([
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
          path: "$equipment",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "housing_dropdowns", // Join with housing_dropdowns for equipment details
          localField: "equipment",
          foreignField: "_id",
          as: "equipmentData",
        },
      },
      {
        $unwind: {
          path: "$equipmentData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$equipmentData.name", // Group by equipment name
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 }, // Sort in descending order by count
      },
      {
        $limit: 10, // Limit to the top 10 equipment items
      },
      {
        $project: {
          equipment: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching equipment demand data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getExpansionDemandData = async (req, res) => {
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

    const result = await Housing.aggregate([
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
        $match: {
          expansion_requirement: true,
        },
      },
      {
        $lookup: {
          from: "housing_dropdowns",
          localField: "expansion_urgency",
          foreignField: "_id",
          as: "expansionUrgencyData",
        },
      },
      {
        $group: {
          _id: null,
          totalHouses: { $sum: 1 },
          needExpansionCount: { $sum: 1 },
          expansionUrgency: {
            $push: {
              urgencyName: {
                $ifNull: [
                  { $arrayElemAt: ["$expansionUrgencyData.name", 0] },
                  null,
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalHouses: 1,
          needExpansionCount: 1,
          expansionUrgency: 1,
        },
      },
    ]);

    // Process urgency counts and names.
    const urgencyData = result[0] || {};

    const expansionUrgencySummary = urgencyData.expansionUrgency
      ? Object.entries(
          urgencyData.expansionUrgency.reduce((acc, item) => {
            const urgencyName = item.urgencyName;
            if (
              urgencyName &&
              typeof urgencyName === "object" &&
              Object.keys(urgencyName).length > 0
            ) {
              // Assuming there's a key like 'en', 'ms', or 'dz' that holds the string value
              const urgencyValue = Object.values(urgencyName)[0];
              acc[urgencyValue] = (acc[urgencyValue] || 0) + 1;
            } else if (typeof urgencyName === "string") {
              acc[urgencyName] = (acc[urgencyName] || 0) + 1;
            }
            return acc;
          }, {})
        ).map(([level, count]) => ({
          level,
          count,
        }))
      : [];

    res.status(200).json({
      status: "success",
      data: {
        totalHouses: result[0]?.totalHouses || 0,
        needExpansion: {
          count: result[0]?.needExpansionCount || 0,
          urgency: expansionUrgencySummary,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching expansion demand data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getRenovationDemandData = async (req, res) => {
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

    const result = await Housing.aggregate([
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
        $match: {
          renovation_requirement: true,
        },
      },
      {
        $lookup: {
          from: "housing_dropdowns",
          localField: "renovation_urgency",
          foreignField: "_id",
          as: "renovationUrgencyData",
        },
      },
      {
        $group: {
          _id: null,
          totalHouses: { $sum: 1 },
          needRenovationCount: { $sum: 1 },
          renovationUrgency: {
            $push: {
              urgencyName: {
                $ifNull: [
                  { $arrayElemAt: ["$renovationUrgencyData.name", 0] },
                  null,
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalHouses: 1,
          needRenovationCount: 1,
          renovationUrgency: 1,
        },
      },
    ]);

    // Process urgency counts and names.
    const urgencyData = result[0] || {};

    const renovationUrgencySummary = urgencyData.renovationUrgency
      ? Object.entries(
          urgencyData.renovationUrgency.reduce((acc, item) => {
            const urgencyName = item.urgencyName;
            if (
              urgencyName &&
              typeof urgencyName === "object" &&
              Object.keys(urgencyName).length > 0
            ) {
              // Assuming there's a key like 'en', 'ms', or 'dz' that holds the string value
              const urgencyValue = Object.values(urgencyName)[0];
              acc[urgencyValue] = (acc[urgencyValue] || 0) + 1;
            } else if (typeof urgencyName === "string") {
              acc[urgencyName] = (acc[urgencyName] || 0) + 1;
            }
            return acc;
          }, {})
        ).map(([level, count]) => ({
          level,
          count,
        }))
      : [];

    res.status(200).json({
      status: "success",
      data: {
        totalHouses: result[0]?.totalHouses || 0,
        needRenovation: {
          count: result[0]?.needRenovationCount || 0,
          urgency: renovationUrgencySummary,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching renovation demand data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getHousingRenovationUrgencyData,
  getHouseTypeDonutData,
  getFloorsUnitsScatterData,
  getYearBuiltRenovatedData,
  getAmenitiesRadarData,
  getAmenityHeatmapData,
  getEquipmentDemandData,
  getExpansionDemandData,
  getRenovationDemandData,
};
