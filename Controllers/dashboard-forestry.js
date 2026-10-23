const Forestry = require("../Models/forestry");

const getForestAreaByVillage = async (req, res) => {
  try {
    const { village } = req.query; // Get the village name from the query

    const matchStage = {}; // Initialize an empty match stage
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"), // Use a regex for case-insensitive matching
      };
    }

    const result = await Forestry.aggregate([
      {
        $match: {
          type: "general", // Filter for documents with type "general"
        },
      },
      {
        $lookup: {
          from: "users", //  Join with the users collection to get village information
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true, // Handle cases where user details might be missing
        },
      },
      {
        $match: matchStage, // Use the village match stage here
      },
      {
        $group: {
          _id: "$userDetails.village_name", // Group by village name from the user details
          totalForestArea: {
            $sum: "$land_owned_under_forest_cover", // Sum the forest area
          },
          totalTimberLogsHarvested: {
            $sum: "$timber_logs_harvested",
          },
          villageName: { $first: "$userDetails.village_name" }, // Get the village name
        },
      },
      {
        $project: {
          _id: 0, // Exclude the _id field from the result
          villageName: 1,
          totalForestArea: 1,
          totalTimberLogsHarvested: 1,
        },
      },
      {
        $sort: {
          totalForestArea: -1,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching forest area data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getTimberHarvestSplit = async (req, res) => {
  try {
    const { village } = req.query; // Get the village name from the query

    const matchStage = {}; // Initialize an empty match stage
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"), // Use a regex for case-insensitive matching
      };
    }

    const result = await Forestry.aggregate([
      {
        $match: {
          type: "general", // Filter for relevant documents
        },
      },
      {
        $lookup: {
          from: "users", // Join with users to get village info
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
        $match: matchStage, // Use the village match stage here
      },
      {
        $group: {
          _id: "$userDetails.village_name", // Group by village
          villageName: { $first: "$userDetails.village_name" },
          totalTimberLogsHarvested: { $sum: "$timber_logs_harvested" },
          totalCommunityForest: { $sum: "$community_forest" },
          totalOwnForestCoverLand: { $sum: "$own_forest_cover_land" }, // Add this field
        },
      },
      {
        $project: {
          _id: 0,
          villageName: 1,
          totalTimberLogsHarvested: 1,
          totalCommunityForest: 1,
          totalOwnForestCoverLand: 1, // And this one
          totalTimber: {
            //redundant, same as totalTimberLogsHarvested
            $sum: ["$totalTimberLogsHarvested"],
          },
          ownTimberHarvest: {
            // Calculate timber from own forest.  Assumed to be the difference
            $subtract: ["$totalTimberLogsHarvested", "$totalCommunityForest"],
          },
        },
      },
      {
        $sort: {
          villageName: 1, // Sort by village name
        },
      },
    ]);

    // Prepare the data for the stacked bar chart format.  Restructure.
    const chartData = result.map((item) => ({
      villageName: item.villageName,
      totalTimberLogsHarvested: item.totalTimberLogsHarvested,
      communityForestTimber: item.totalCommunityForest,
      ownForestTimber: item.ownTimberHarvest,
      totalOwnForestCoverLand: item.totalOwnForestCoverLand,
    }));

    res.status(200).json({
      status: "success",
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching timber harvest data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getOtherProduceByType = async (req, res) => {
  try {
    const { village } = req.query; // Get the village name from the query

    const matchStage = {}; // Initialize an empty match stage
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"), // Use a regex for case-insensitive matching
      };
    }

    const result = await Forestry.aggregate([
      {
        $match: {
          type: "general", // Filter for relevant documents
          other_produced_harvested_from_forest: {
            $exists: true,
            $ne: [],
          }, // Only documents with other_produced_harvested_from_forest
        },
      },
      {
        $lookup: {
          from: "users", // Join with users to get village info
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
        $match: matchStage, // Use the village match stage here
      },
      {
        $unwind: "$other_produced_harvested_from_forest", // Deconstruct the other_produced_harvested_from_forest array
      },
      {
        $lookup: {
          from: "forestry_dropdowns", // Lookup for 'type'
          localField: "other_produced_harvested_from_forest.type",
          foreignField: "_id",
          as: "produceTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$produceTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "forestry_dropdowns",
          let: {
            unitId: "$other_produced_harvested_from_forest.quantity_unit",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$_id", "$$unitId"] },
                    {
                      $eq: [
                        "$_id",
                        {
                          $convert: {
                            input: "$$unitId",
                            to: "objectId",
                            onError: null, // Avoid crash if conversion fails
                            onNull: null, // Handle null safely
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "quantityUnitDetails",
        },
      },
      {
        $unwind: {
          path: "$quantityUnitDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$other_produced_harvested_from_forest.type", // Group by the 'type'
          totalQuantity: {
            $sum: "$other_produced_harvested_from_forest.quantity",
          },
          typeName: { $first: "$produceTypeDetails.name" },
          quantityUnit: {
            $first: "$quantityUnitDetails.name",
          },
        },
      },
      {
        $sort: {
          totalQuantity: -1, // Sort in descending order of quantity
        },
      },
      {
        $project: {
          _id: 0,
          typeName: 1, // Include the type name
          totalQuantity: 1,
          quantityUnit: 1,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching other produce data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getTimberNeeds = async (req, res) => {
  try {
    const { village } = req.query; // Get the village name from the query

    const matchStage = {
      type: "timber_needs",
    };

    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Forestry.aggregate([
     
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
        $project: {
          _id: 1,
          quantity: 1,
          createdAt: 1,
          userDetails: 1,
          purpose: 1,
          year: { $year: "$createdAt" },
        },
      },
      {
        $unwind: {
          path: "$purpose",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "forestry_dropdowns",
          localField: "purpose",
          foreignField: "_id",
          as: "timber_need_purpose",
        },
      },
      {
        $unwind: {
          path: "$timber_need_purpose",
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $project: {
          _id: 1,
          quantity: 1,
          year: 1,
          purpose: "$timber_need_purpose.name",
        },
      },
    ]);

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error("Error fetching timber needs data:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error", details: error.message });
  }
};

const getPurposeWordCloudData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Forestry.aggregate([
      {
        $match: {
          purpose: { $exists: true, $ne: [] }, // Only documents with purpose
        },
      },
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
        $unwind: "$purpose", // Deconstruct the purpose array
      },
      {
        $lookup: {
          from: "forestry_dropdowns",
          localField: "purpose",
          foreignField: "_id",
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
          _id: "$purposeDetails.name.en", // Group by the English name of the purpose
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          count: "$count",
          text: "$_id",
        },
      },
    ]);

    res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error("Error fetching purpose data for word cloud:", error);
    res
      .status(500)
      .json({ status: "error", message: "Internal server error", details: error.message });
  }
};

const getVillageWiseTimberData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const timberNeedsData = await Forestry.aggregate([
      {
        $match: {
          type: "timber_needs",
        },
      },
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
        $match: matchStage, // Added village filter
      },
      {
        $group: {
          _id: "$userDetails.village_name",
          totalTimberNeed: { $sum: "$quantity" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          totalTimberNeed: 1,
        },
      },
    ]);

    const generalData = await Forestry.aggregate([
      {
        $match: {
          type: "general",
        },
      },
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
        $match: matchStage, // Added village filter
      },
      {
        $group: {
          _id: "$userDetails.village_name",
          totalTimberHarvested: { $sum: "$timber_logs_harvested" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          totalTimberHarvested: 1,
        },
      },
    ]);

    // Combine the results
    const villageWiseData = timberNeedsData.map((need) => {
      const harvest = generalData.find((h) => h.village === need.village);
      return {
        village: need.village,
        totalTimberNeed: need.totalTimberNeed,
        totalTimberHarvested: harvest ? harvest.totalTimberHarvested : 0,
      };
    });

    res.status(200).json({ status: "success", data: villageWiseData });
  } catch (error) {
    console.error("Error fetching village-wise timber data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getForestAreaByVillage,
  getTimberHarvestSplit,
  getOtherProduceByType,
  getTimberNeeds,
  getPurposeWordCloudData,getVillageWiseTimberData
};
