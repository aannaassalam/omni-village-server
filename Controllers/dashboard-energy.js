const Energy = require("../Models/energy");

const getGridAccessData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Energy.aggregate([
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
          totalHouseholds: { $sum: 1 },
          gridAccessHouseholds: {
            $sum: { $cond: ["$electric_grid", 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          gridAccessPercentage: {
            $multiply: [
              { $divide: ["$gridAccessHouseholds", "$totalHouseholds"] },
              100,
            ],
          },
        },
      },
      {
        $project: {
          village: 1,
          gridAccessPercentage: 1,
          color: {
            $switch: {
              branches: [
                { case: { $lt: ["$gridAccessPercentage", 60] }, then: "Red" },
                {
                  case: {
                    $and: [
                      { $gte: ["$gridAccessPercentage", 60] },
                      { $lte: ["$gridAccessPercentage", 90] },
                    ],
                  },
                  then: "Yellow",
                },
                { case: { $gt: ["$gridAccessPercentage", 90] }, then: "Green" },
              ],
              default: "Red", // Default to Red if percentage is invalid
            },
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
          gridAccessPercentage: 0,
          color: "Red",
        },
      });
    }
  } catch (error) {
    console.error("Error fetching grid access data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getKWhHistogramData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    // 2.  Aggregate to create the histogram data
    const histogramResult = await Energy.aggregate([
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
          _id: "$yearly_electricity_consumption",
          count: { $sum: 1 },
          households: {
            $push: {
              firstName: "$userDetails.first_name",
              lastName: "$userDetails.last_name",
              numberOfMembers: "$userDetails.number_of_members",
              consumption: "$yearly_electricity_consumption",
            },
          },
        },
      },
      {
        $project: {
          consumption: "$_id",
          count: 1,
          households: 1,
          _id: 0,
        },
      },
      {
        $sort: { consumption: 1 },
      },
    ]);

    const filteredHistogramResult = histogramResult.filter(
      (item) => item.consumption !== null
    );

    res.status(200).json({
      status: "success",
      data: {
        histogram: filteredHistogramResult,
      },
    });
  } catch (error) {
    console.error("Error fetching kWh histogram data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getEnergySpendVsConsumption = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Energy.aggregate([
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
          yearly_electricity_consumption: 1,
          yearly_expenditure_electricity: 1, // Changed to the correct field
          number_of_members: "$userDetails.members_count", // Include number of members
        },
      },
      {
        $group: {
          _id: null,
          data: {
            $push: {
              _id: "$_id",
              consumption: "$yearly_electricity_consumption",
              spend: "$yearly_expenditure_electricity", // Changed to the correct field
              members: "$number_of_members",
            },
          },
          maxConsumption: { $max: "$yearly_electricity_consumption" },
          minConsumption: { $min: "$yearly_electricity_consumption" },
          maxSpend: { $max: "$yearly_expenditure_electricity" }, // Changed to the correct field
          minSpend: { $min: "$yearly_expenditure_electricity" }, // Changed to the correct field
        },
      },
    ]);

    if (result.length === 0) {
      return res.status(200).json({
        status: "success",
        data: {
          scatterData: [],
          outliers: [],
          maxConsumption: 0,
          minConsumption: 0,
          maxSpend: 0,
          minSpend: 0,
        },
      });
    }

    let { maxConsumption, minConsumption, maxSpend, minSpend } = result[0];
    maxSpend = maxSpend || 0;
    minSpend = minSpend || 0;

    // Define a threshold for affordability.  Now it's spend per member.
    const affordabilityThreshold = 500;

    const scatterData = result[0].data
      .map((item) => {
        const spend = item.spend || 0;
        const members = item.members || 1; // Ensure at least 1 to avoid division by zero.
        const spendPerMember = spend / members;
        return {
          _id: item._id,
          consumption: item.consumption,
          spend: spend,
          members: members,
          spendPerMember: spendPerMember, // Calculate spend per member
        };
      })
      .filter((item) => item.consumption != null && item.spend != null);

    const outliers = scatterData.filter(
      (item) => item.spendPerMember > affordabilityThreshold
    );

    res.status(200).json({
      status: "success",
      data: {
        scatterData,
        outliers,
        maxConsumption,
        minConsumption,
        maxSpend,
        minSpend,
      },
    });
  } catch (error) {
    console.error("Error fetching energy spend vs. consumption data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getFuelMixDonutData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Energy.aggregate([
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
          // Add this $match stage
          type: {
            $in: ["electricity", "petrol", "diesel", "natural_gas", "other"],
          },
        },
      },
      {
        $group: {
          _id: "$type", // Group by fuel type
          count: { $sum: 1 }, // Count occurrences of each fuel type
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$count" }, // Calculate the total number of records
          data: {
            $push: {
              type: "$_id",
              count: "$count",
            },
          },
        },
      },
      {
        $unwind: "$data",
      },
      {
        $project: {
          _id: 0,
          type: "$data.type",
          count: "$data.count",
          percentage: {
            $multiply: [{ $divide: ["$data.count", "$total"] }, 100],
          },
        },
      },
    ]);

    //  result for the pie chart.
    const chartData = result;

    res.status(200).json({
      status: "success",
      data: chartData,
    });
  } catch (error) {
    console.error("Error fetching fuel mix data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getOtherFuelHeatmapData = async (req, res) => {
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

    const result = await Energy.aggregate([
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
          type: "other",
        },
      },
      {
        $unwind: "$source_of_fuels_used",
      },
      {
        $lookup: {
          from: "energy_dropdowns",
          localField: "source_of_fuels_used.type",
          foreignField: "_id",
          as: "fuelTypeData",
        },
      },
      {
        $unwind: "$fuelTypeData",
      },
      {
        $lookup: {
          from: "energy_dropdowns",
          localField: "source_of_fuels_used.quantity_unit",
          foreignField: "_id",
          as: "quantityUnitData",
        },
      },
      {
        $unwind: {
          path: "$quantityUnitData",
          preserveNullAndEmptyArrays: true, //  handle cases where the unit is not found.
        },
      },
      {
        $group: {
          _id: "$fuelTypeData.name", // Group by fuel type name
          count: { $sum: 1 },
          totalExpenditures: { $sum: "$source_of_fuels_used.expenditures" }, // Sum expenditures
          totalQuantity: { $sum: "$source_of_fuels_used.quantity" }, // Sum quantity
          //   quantity_unit: { $first: "$quantityUnitData.name" }, // Get unit name from the lookup
        },
      },
      {
        $project: {
          fuelType: "$_id",
          count: 1,
          totalExpenditures: 1,
          totalQuantity: 1,
          //   quantity_unit: 1,
          _id: 0,
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching other fuel heatmap data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getMicrogridData = async (req, res) => {
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

    const result = await Energy.aggregate([
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
          microgrid_installed: true, // Filter for microgrid installations
        },
      },
      {
        $lookup: {
          from: "energy_dropdowns", //  microgrid type details
          localField: "microgrid_type",
          foreignField: "_id",
          as: "microgridTypeDetails",
        },
      },
      {
        $unwind: {
          path: "$microgridTypeDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$microgridTypeDetails.name", // Group by microgrid type
          totalMicrogrids: { $sum: 1 },
          totalInstallationCost: { $sum: "$installation_cost" },
          averageInstallationCost: { $avg: "$installation_cost" },
          usageBreakdown: {
            $push: {
              usage: "$usage",
              count: 1,
            },
          },
          // microgridType: { $first: "$microgridTypeDetails.name" }, // Removed from here
        },
      },
      {
        $unwind: {
          path: "$usageBreakdown",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            microgridType: "$_id", // Include microgrid type in the group
            usage: "$usageBreakdown.usage",
          },
          count: { $sum: "$usageBreakdown.count" },
          totalMicrogrids: { $first: "$totalMicrogrids" },
          totalInstallationCost: { $first: "$totalInstallationCost" },
          averageInstallationCost: { $first: "$averageInstallationCost" },
          // microgridType: { $first: "$microgridType" },  // Removed from here
        },
      },
      {
        $project: {
          _id: 0,
          microgridType: "$_id.microgridType", // Access microgridType from _id
          usage: "$_id.usage",
          count: 1,
          totalMicrogrids: 1,
          totalInstallationCost: 1,
          averageInstallationCost: 1,
        },
      },
      {
        $group: {
          _id: "$microgridType", // Group by microgrid type
          totalMicrogrids: { $first: "$totalMicrogrids" },
          totalInstallationCost: { $first: "$totalInstallationCost" },
          averageInstallationCost: { $first: "$averageInstallationCost" },
          usageBreakdown: { $push: { usage: "$usage", count: "$count" } },
          // microgridType: { $first: "$microgridType" }, // Add it back here
        },
      },
      {
        $project: {
          _id: 0,
          totalMicrogrids: 1,
          totalInstallationCost: 1,
          averageInstallationCost: 1,
          usageBreakdown: 1,
          microgridType: "$_id", // Include microgridType in the final result
        },
      },
    ]);

    const microgridData = result || []; // Change default to [] to handle empty result

    res.status(200).json({
      status: "success",
      data: microgridData,
    });
  } catch (error) {
    console.error("Error fetching microgrid data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getRenewableAndMicrogridShare = async (req, res) => {
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

    const result = await Energy.aggregate([
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
          totalEnergyConsumption: { $sum: "$yearly_electricity_consumption" }, 
          renewableEnergyConsumption: {
            $sum: {
              $cond: [{ $eq: ["$microgrid_installed", true] }, "$usage", 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalEnergyConsumption: 1,
          renewableEnergyConsumption: 1,
          renewablePercentage: {
            $cond: [
              { $eq: ["$totalEnergyConsumption", 0] },
              0,
              {
                $multiply: [
                  {
                    $divide: [
                      "$renewableEnergyConsumption",
                      "$totalEnergyConsumption",
                    ],
                  },
                  100,
                ],
              },
            ],
          },
        },
      },
    ]);

    const responseData = result[0] || {
      totalEnergyConsumption: 0,
      renewableEnergyConsumption: 0,
      microgridEnergyConsumption: 0,
      renewablePercentage: 0,
    };

    res.status(200).json({
      status: "success",
      data: responseData,
    });
  } catch (error) {
    console.error("Error fetching renewable and microgrid share:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getEnergyIntensityRankings = async (req, res) => {
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

    const result = await Energy.aggregate([
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
          _id: "$userDetails.village_name", // Group by village
          totalEnergyConsumption: { $sum: "$yearly_electricity_consumption" },
          totalPopulation: { $sum: { $size: "$userDetails.members" } }, //  population per village.
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          totalEnergyConsumption: 1,
          totalPopulation: 1,
          energyIntensity: {
            $cond: [
              { $eq: ["$totalPopulation", 0] }, // Avoid division by zero
              0,
              { $divide: ["$totalEnergyConsumption", "$totalPopulation"] },
            ],
          },
        },
      },
      {
        $sort: { energyIntensity: -1 }, // Sort in descending order of energyIntensity
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching energy intensity rankings:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getGridAccessData,
  getKWhHistogramData,
  getEnergySpendVsConsumption,
  getFuelMixDonutData,
  getOtherFuelHeatmapData,
  getMicrogridData,
  getRenewableAndMicrogridShare,
  getEnergyIntensityRankings
};
