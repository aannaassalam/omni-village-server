const Landholding = require("../Models/landholding");

const getParcelMapData = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }
    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };

    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const parcelData = await Landholding.aggregate([
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
          path: "$purpose_land_utilised_for",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "landholding_dropdowns",
          localField: "purpose_land_utilised_for.type",
          foreignField: "_id",
          as: "purposeType",
        },
      },
      {
        $unwind: {
          path: "$purposeType",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "landholding_dropdowns",
          localField: "purpose_land_utilised_for.type_category",
          foreignField: "_id",
          as: "purposeTypeCategories",
        },
      },
      {
        $project: {
          parcel_id: "$_id",
          geotag: {
            $let: {
              vars: {
                coords: { $split: ["$geotag", ","] },
              },
              in: {
                lat: {
                  $toDouble: {
                    $arrayElemAt: ["$$coords", 0],
                  },
                },
                lng: {
                  $toDouble: {
                    $arrayElemAt: ["$$coords", 1],
                  },
                },
              },
            },
          },
          land_area: "$total_land_area",
          land_under_use: 1,
          land_located: 1,
          year_purchased: 1,
          land_use_type: "$purposeType.name",
          land_use_categories: {
            $map: {
              input: "$purposeTypeCategories",
              as: "cat",
              in: "$$cat.name",
            },
          },
          user: {
            name: {
              $concat: [
                "$userDetails.first_name",
                " ",
                "$userDetails.last_name",
              ],
            },
            phone: "$userDetails.phone",
            village: "$userDetails.village_name",
            address: "$userDetails.address",
            total_land: "$userDetails.total_land",
            land_unit: "$userDetails.land_measurement_symbol",
            members: {
              $map: {
                input: "$userDetails.members",
                as: "m",
                in: {
                  name: "$$m.name",
                  age: "$$m.age",
                  gender: "$$m.gender",
                },
              },
            },
          },
        },
      },
    ]);

    res.json(parcelData);
  } catch (error) {
    console.error("Error fetching parcel map data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const getLandUseDistribution = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };

    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Landholding.aggregate([
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
          _id: "$land_located",
          count: { $sum: 1 },
          total_area: { $sum: "$total_land_area" },
        },
      },
    ]);

    // Normalize land_located field
    const distribution = {
      count: { inside: 0, outside: 0 },
      area: { inside: 0, outside: 0 },
    };

    result.forEach((item) => {
      const isInside = item._id?.toLowerCase().includes("inside");
      const key = isInside ? "inside" : "outside";
      distribution.count[key] += item.count;
      distribution.area[key] += item.total_area;
    });

    // Compute percentages
    const totalCount = distribution.count.inside + distribution.count.outside;
    const totalArea = distribution.area.inside + distribution.area.outside;

    const percentages = {
      count: {
        inside: ((distribution.count.inside / totalCount) * 100).toFixed(2),
        outside: ((distribution.count.outside / totalCount) * 100).toFixed(2),
      },
      area: {
        inside: ((distribution.area.inside / totalArea) * 100).toFixed(2),
        outside: ((distribution.area.outside / totalArea) * 100).toFixed(2),
      },
    };

    res.json({ ...distribution, percentages });
  } catch (error) {
    console.error("Error fetching land use distribution:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const getParcelSizeDistribution = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    // Match stage for case-insensitive country/village
    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };

    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    // Log-like bucket boundaries
    const boundaries = [
      0, 10, 100, 1000, 10000, 30000, 50000, 80000, 100000, 1000000,
    ];

    const rawDistribution = await Landholding.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      { $match: matchStage },
      {
        $project: {
          parcel_size: "$total_land_area",
          userDetails: 1,
        },
      },
      {
        $bucket: {
          groupBy: "$parcel_size",
          boundaries,
          default: "Other",
          output: {
            count: { $sum: 1 },
            owners: { $push: "$userDetails" },
          },
        },
      },
    ]);

    const formatted = rawDistribution
      .map((item) => {
        if (item._id === "Other") return null;

        const index = boundaries.indexOf(item._id);
        const min = boundaries[index - 1] ?? 0;
        const max = item._id;

        return {
          range: `${min}–<${max}`,
          min,
          max,
          count: item.count,
          owner_count: item.owners.length,
          owners: item.owners,
        };
      })
      .filter(Boolean); // Remove null if "Other" exists

    res.json({ distribution: formatted, measurement: "sq ft" });
  } catch (error) {
    console.error("Error fetching parcel size distribution:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const getUtilisationStatus = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    // Build match stage
    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Landholding.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      { $match: matchStage },
      {
        $addFields: {
          utilized: {
            $sum: {
              $map: {
                input: "$purpose_land_utilised_for",
                as: "use",
                in: "$$use.total_land_area_utilised",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$total_land_area" },
          utilized: { $sum: "$utilized" },
        },
      },
      {
        $project: {
          _id: 0,
          utilized: 1,
          unutilized: { $subtract: ["$total", "$utilized"] },
          total: 1,
        },
      },
    ]);

    res.json(result[0] || { utilized: 0, unutilized: 0, total: 0 });
  } catch (error) {
    console.error("Error fetching utilization data:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const getUsagePurposeTreeMap = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    // Build match stage
    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    // Aggregation pipeline
    const result = await Landholding.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      { $match: matchStage },
      {
        $unwind: "$purpose_land_utilised_for",
      },
      {
        $lookup: {
          from: "landholding_dropdowns",
          localField: "purpose_land_utilised_for.type",
          foreignField: "_id",
          as: "purposeType",
        },
      },
      {
        $unwind: "$purposeType",
      },
      {
        $lookup: {
          from: "landholding_dropdowns",
          localField: "purpose_land_utilised_for.type_category",
          foreignField: "_id",
          as: "purposeTypeCategory",
        },
      },
      {
        $unwind: "$purposeTypeCategory",
      },
      {
        $group: {
          _id: {
            mainType: "$purposeType.name",
            subType: "$purposeTypeCategory.name",
          },
          totalArea: {
            $sum: "$purpose_land_utilised_for.total_land_area_utilised",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          mainType: "$_id.mainType",
          subType: "$_id.subType",
          totalArea: 1,
          count: 1,
        },
      },
      {
        $sort: { totalArea: -1 }, // Optional sorting by area
      },
    ]);

    // Return the results to be used for Tree-map rendering
    res.json(result);
  } catch (error) {
    console.error("Error fetching usage purpose tree-map data:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

const getIdleLandReasonSankey = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

    // Define the match query for country and village
    const matchStage = {
      "userDetails.country": { $regex: new RegExp(`^${country}$`, "i") },
    };

    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await Landholding.aggregate([
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
        $match: {
          "userDetails.village_name": village,
        },
      },
      {
        $match: {
          land_under_use: false,
        },
      },
      {
        $unwind: "$purpose_status_of_land",
      },
      {
        $group: {
          _id: "$purpose_status_of_land.type",
          count: { $sum: 1 },
          totalLandArea: { $sum: "$total_land_area" },
        },
      },
      {
        $lookup: {
          from: "landholding_dropdowns",
          localField: "_id",
          foreignField: "_id",
          as: "purposeDetails",
        },
      },
      {
        $unwind: "$purposeDetails",
      },
      {
        $project: {
          idle_purpose_name: "$purposeDetails.name",
          count: 1,
          totalLandArea: 1,
        },
      },
    ]);

    res.json({ result });
  } catch (error) {
    console.error("Error fetching idle land reason Sankey data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const getYearPurchaseTimeline = async (req, res) => {
  try {
    const { country, village } = req.query;

    if (!country) {
      return res.status(400).json({ error: "Country is required" });
    }

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
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      // Add the $match stage to the pipeline
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$year_purchased",
          totalLandArea: {
            $sum: "$total_land_area",
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
      {
        $project: {
          year: "$_id",
          totalLandArea: 1,
          count: 1,
          _id: 0,
        },
      },
    ];

    const result = await Landholding.aggregate(pipeline);
    res.json({ result });
  } catch (error) {
    console.error("Error fetching year purchase timeline data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

const getLandDeclarationVsUse = async (req, res) => {
  try {
    const { country, village } = req.query;

    // Define the match stage with optional country and village filters
    const matchStage = {};
    if (country) {
      matchStage["userDetails.country"] = { $regex: new RegExp(`^${country}$`, "i") };
    }
    if (village) {
      matchStage["userDetails.village_name"] = { $regex: new RegExp(`^${village}$`, "i") };
    }

    const result = await Landholding.aggregate([
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
          _id: "$geotag",
          totalLandDeclared: { $sum: "$total_land_area" },
          totalLandUsed: {
            $sum: {
              $cond: [{ $eq: ["$land_under_use", true] }, "$total_land_area", 0],
            },
          },
        },
      },
      {
        $project: {
          geotag: "$_id",
          totalLandDeclared: 1,
          totalLandUsed: 1,
          _id: 0,
        },
      },
    ]);

    res.json({ result });
  } catch (error) {
    console.error("Error fetching land declaration vs. use data:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};


module.exports = {
  getParcelMapData,
  getLandUseDistribution,
  getParcelSizeDistribution,
  getUtilisationStatus,
  getUsagePurposeTreeMap,
  getIdleLandReasonSankey,
  getYearPurchaseTimeline,
  getLandDeclarationVsUse
};
