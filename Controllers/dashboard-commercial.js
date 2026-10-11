const BusinessCommercial = require("../Models/business-commercial");

const getBusinessTypeDistribution = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup business type details
          localField: "business_type",
          foreignField: "_id",
          as: "businessTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$businessTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Add a match stage to filter out null business types
        $match: {
          "businessTypeDetails.name.en": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$businessTypeDetails.name", // Group by English business type name
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null, // Group all types to calculate total
          total: { $sum: "$count" },
          data: {
            $push: {
              type: "$_id",
              count: "$count",
            },
          },
        },
      },
      {
        $unwind: "$data", // Unwind to calculate percentage for each type
      },
      {
        $project: {
          _id: 0,
          businessType: "$data.type",
          count: "$data.count",
          percentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$data.count", "$total"] }, 100] },
            ],
          },
        },
      },
      {
        $sort: { count: -1 }, // Sort by count in descending order
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching business type distribution data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getBusinessYearStartedTrend = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        $match: {
          year_started: { $ne: null }, // Only consider documents where year_started is not null
        },
      },
      {
        $lookup: {
          from: "business_commercials_dropdowns", // Lookup business type details
          localField: "business_type",
          foreignField: "_id",
          as: "businessTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$businessTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$year_started", // Group by the year_started field
          count: { $sum: 1 }, // Count the number of businesses started in that year
          businesses: {
            // Push details of each business into an array
            $push: {
              _id: "$_id",
              businessName: "$business_name",
              businessType: "$businessTypeDetails.name.en", // Get English name of business type
              description: "$brief_description",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id",
          count: 1,
          businesses: 1, // Include the array of businesses
        },
      },
      {
        $sort: { year: 1 }, // Sort by year in ascending order for trendline
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching business year started trend data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getLegalStructureBreakdown = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup legal structure details
          localField: "legal_structure",
          foreignField: "_id",
          as: "legalStructureDetails",
        },
      },
      {
        $unwind: {
          path: "$legalStructureDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Filter out documents where legal structure name is null or undefined
        $match: {
          "legalStructureDetails.name.en": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$legalStructureDetails.name", // Group by English name of the legal structure
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null, // Group all types to calculate total
          total: { $sum: "$count" },
          data: {
            $push: {
              legalStructure: "$_id",
              count: "$count",
            },
          },
        },
      },
      {
        $unwind: "$data", // Unwind to calculate percentage for each type
      },
      {
        $project: {
          _id: 0,
          legalStructure: "$data.legalStructure",
          count: "$data.count",
          percentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $multiply: [{ $divide: ["$data.count", "$total"] }, 100] },
            ],
          },
        },
      },
      {
        $sort: { count: -1 }, // Sort by count in descending order
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching legal structure breakdown data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getInvestmentIncomeLossData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        $group: {
          _id: "$business_name", // Group by business_name
          totalInvestmentNeed: { $sum: "$investment_need_so_far" },
          totalIncome: { $sum: "$annual_turnover" },
          totalLoss: { $sum: { $ifNull: ["$total_loss", 0] } }, // Sum total_loss, treating null as 0
        },
      },
      {
        $project: {
          _id: 0,
          businessName: "$_id", // Rename _id to businessName
          totalInvestmentNeed: 1,
          totalIncome: 1,
          totalLoss: 1,
        },
      },
      {
        $sort: { businessName: 1 }, // Sort by business name
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching investment vs income vs loss data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getManpowerSourceBreakdown = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        $group: {
          _id: "$business_name", // Group by business name
          coworkerInsideVillage: { $sum: "$coworker_inside_village" },
          coworkerOutsideVillage: { $sum: "$coworker_outside_village" },
        },
      },
      {
        $project: {
          _id: 0,
          businessName: "$_id", // Rename _id to businessName
          insideVillage: "$coworkerInsideVillage",
          outsideVillage: "$coworkerOutsideVillage",
        },
      },
      {
        $sort: { businessName: 1 }, // Sort by business name
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching manpower source breakdown data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getResourceConsumptionSummary = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      // --- Start processing raw_material_consumption ---
      // Duplicate the document for each raw_material_consumption entry
      {
        $unwind: {
          path: "$raw_material_consumption",
          preserveNullAndEmptyArrays: true, // Keep documents even if array is empty/null
        },
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for raw material item name
          localField: "raw_material_consumption.item",
          foreignField: "_id",
          as: "rawMaterialItemDetails",
        },
      },
      {
        $unwind: {
          path: "$rawMaterialItemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for raw_consumption_unit name
          let: { unitId: "$raw_material_consumption.raw_consumption_unit" },
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
                            onError: null,
                            onNull: null,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                name: "$name.en", // Project the English name of the unit
              },
            },
          ],
          as: "rawConsumptionUnitDetails",
        },
      },
      {
        $unwind: {
          path: "$rawConsumptionUnitDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // --- End processing raw_material_consumption ---

      // --- Start processing fuel_source (similar pattern) ---
      // Duplicate the document for each fuel_source entry
      {
        $unwind: {
          path: "$fuel_source",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for fuel source item name
          localField: "fuel_source.item",
          foreignField: "_id",
          as: "fuelSourceItemDetails",
        },
      },
      {
        $unwind: {
          path: "$fuelSourceItemDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for fuel_source_unit name
          let: { unitId: "$fuel_source.fuel_source_unit" },
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
                            onError: null,
                            onNull: null,
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 0,
                name: "$name.en", // Project the English name of the unit
              },
            },
          ],
          as: "fuelSourceUnitDetails",
        },
      },
      {
        $unwind: {
          path: "$fuelSourceUnitDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // --- End processing fuel_source ---

      {
        $group: {
          _id: "$business_name", // Group by business name
          totalEnergyConsumption: { $sum: { $ifNull: ["$energy_consumption", 0] } },
          totalWaterConsumption: { $sum: { $ifNull: ["$water_consumption", 0] } },
          // Group raw material quantities by unit
          rawMaterialConsumption: {
            $push: {
              item: { $ifNull: ["$rawMaterialItemDetails.name.en", null] },
              quantity: { $ifNull: ["$raw_material_consumption.quantity", 0] },
              unit: { $ifNull: ["$rawConsumptionUnitDetails.name", null] },
            },
          },
          // Group fuel source quantities by unit
          fuelConsumption: {
            $push: {
              item: { $ifNull: ["$fuelSourceItemDetails.name.en", null] },
              quantity: { $ifNull: ["$fuel_source.quantity", 0] },
              unit: { $ifNull: ["$fuelSourceUnitDetails.name", null] },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          businessName: "$_id",
          energyConsumption: "$totalEnergyConsumption",
          waterConsumption: "$totalWaterConsumption",
          // Filter out null/empty entries from rawMaterialConsumption and fuelConsumption
          rawMaterialConsumption: {
            $filter: {
              input: "$rawMaterialConsumption",
              as: "rm",
              cond: { $and: [{ $ne: ["$$rm.item", null] }, { $ne: ["$$rm.quantity", 0] }] },
            },
          },
          fuelConsumption: {
            $filter: {
              input: "$fuelConsumption",
              as: "fs",
              cond: { $and: [{ $ne: ["$$fs.item", null] }, { $ne: ["$$fs.quantity", 0] }] },
            },
          },
        },
      },
      {
        $sort: { businessName: 1 },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching resource consumption summary data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getSupportNeedsMatrix = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village filter
      },
      {
        // Group by business name
        $group: {
          _id: "$business_name",
          skillRequirementCount: {
            $sum: { $cond: [{ $eq: ["$skill_requirement", true] }, 1, 0] },
          },
          manpowerRequirementCount: {
            $sum: { $cond: [{ $eq: ["$manpower_requirement", true] }, 1, 0] },
          },
          equipmentRequirementCount: {
            $sum: { $cond: [{ $eq: ["$equipment_requirement", true] }, 1, 0] },
          },
          otherRequirementCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$other", null] }, { $ne: ["$other", ""] }] }, // Check if 'other' field is not null or empty string
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          businessName: "$_id", // Rename _id to businessName
          skillRequirement: "$skillRequirementCount",
          manpowerRequirement: "$manpowerRequirementCount",
          equipmentRequirement: "$equipmentRequirementCount",
          otherRequirement: "$otherRequirementCount",
        },
      },
      {
        $sort: { businessName: 1 } // Sort by business name for consistent output
      }
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching support needs matrix data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getBusinessDetailTableData = async (req, res) => {
  try {
    const { village, businessName } = req.query; // Get village and optional businessName from query

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }
    if (businessName) {
      matchStage["business_name"] = {
        $regex: new RegExp(`^${businessName}$`, "i"), // Filter by specific business name for drill-down
      };
    }

    const result = await BusinessCommercial.aggregate([
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
        $match: matchStage, // Apply village and/or businessName filter
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for business_type details
          localField: "business_type",
          foreignField: "_id",
          as: "businessTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$businessTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$type_of_infrastructure", // Unwind infrastructure array
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "business_dropdowns", // Lookup for type_of_infrastructure details
          localField: "type_of_infrastructure",
          foreignField: "_id",
          as: "infrastructureDetails",
        },
      },
      {
        $unwind: {
          path: "$infrastructureDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id", // Group by the original document ID to keep unique businesses
          businessName: { $first: "$business_name" },
          businessType: { $first: "$businessTypeDetails.name.en" },
          location: { $first: "$location" },
          infrastructure: { $addToSet: "$infrastructureDetails.name.en" }, // Collect unique infrastructure types
          machines: { $first: "$machine_equipment_installed" },
          // Add other relevant fields if needed
        },
      },
      {
        $project: {
          _id: 0,
          businessName: 1,
          businessType: 1,
          location: 1,
          infrastructure: { $ifNull: ["$infrastructure", []] }, // Ensure infrastructure is an array, even if empty
          machines: { $ifNull: ["$machines", "N/A"] }, // Default to N/A if no machines
        },
      },
      {
        $sort: { businessName: 1 }, // Sort by business name
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching business detail table data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getBusinessTypeDistribution,
  getBusinessYearStartedTrend,
  getLegalStructureBreakdown,
  getInvestmentIncomeLossData,
  getManpowerSourceBreakdown,
  getResourceConsumptionSummary,
  getSupportNeedsMatrix,
  getBusinessDetailTableData
};
