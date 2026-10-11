const User = require("../Models/user");

const getMaritalStatusByVillage = async (req, res) => {
  try {
    const { village } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const maritalStatusCounts = await User.aggregate([
      {
        $match: {
          village_name: { $regex: new RegExp(village, "i") },
        },
      },
      {
        $unwind: "$members",
      },
      {
        $match: {
          "members.demographic_id": { $ne: null },
        },
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.marital_status",
          foreignField: "_id",
          as: "maritalStatusInfo",
        },
      },
      {
        $unwind: "$maritalStatusInfo",
      },
      {
        $match: {
          "maritalStatusInfo.type": "marital_status",
        },
      },
      {
        $group: {
          _id: "$maritalStatusInfo.name.en",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          maritalStatus: "$_id",
          count: 1,
        },
      },
    ]);

    const formattedCounts = maritalStatusCounts.reduce((acc, item) => {
      acc[item.maritalStatus] = item.count;
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        maritalStatusCounts: formattedCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching marital status by village:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getDietShareByVillageAndOptionalGender = async (req, res) => {
  try {
    const { village, gender } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const initialMatchStage = {
      village_name: { $regex: new RegExp(village, "i") },
    };

    const memberMatchStage = {};
    if (gender) {
      memberMatchStage["members.gender"] = {
        $regex: new RegExp(`\\b${gender}\\b`, "i"),
      };
    }

    const groupStageId = {};
    groupStageId.gender = "$members.gender";
    groupStageId.dietNames = "$dietInfo.name";

    const dietShareAndCountByVillageGender = await User.aggregate([
      {
        $match: initialMatchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $match: memberMatchStage, // Filter members by gender after unwinding
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.diet",
          foreignField: "_id",
          as: "dietInfo",
        },
      },
      {
        $unwind: {
          path: "$dietInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: groupStageId,
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.gender",
          total: { $sum: "$count" },
          diets: {
            $push: {
              names: "$_id.dietNames",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          group: "$_id",
          diets: {
            $map: {
              input: "$diets",
              as: "d",
              in: {
                names: "$$d.names",
                count: "$$d.count",
                share: { $round: [{ $divide: ["$$d.count", "$total"] }, 2] },
              },
            },
          },
        },
      },
    ]);

    const formattedResult = dietShareAndCountByVillageGender.reduce(
      (acc, item) => {
        acc[item.group] = item.diets.map((dietInfo) => ({
          names: dietInfo.names,
          count: dietInfo.count,
          share: dietInfo.share,
        }));
        return acc;
      },
      {}
    );

    res.status(200).json({
      status: "success",
      data: { village: village, dietShareAndCount: formattedResult },
    });
  } catch (error) {
    console.error(
      "Error fetching diet share and count by village and gender:",
      error
    );
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getBMIDistributionByVillageAndOptionalGender = async (req, res) => {
  try {
    const { village, gender } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const initialMatchStage = {
      village_name: { $regex: new RegExp(village, "i") },
    };

    const memberMatchStage = {};
    if (gender) {
      memberMatchStage["members.gender"] = {
        $regex: new RegExp(`\\b${gender}\\b`, "i"),
      };
    }

    const bmiData = await User.aggregate([
      {
        $match: initialMatchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $match: memberMatchStage,
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $match: {
          "memberDemographic.height": { $gt: 0 }, // Ensure height is greater than 0
          "memberDemographic.weight": { $gt: 0 }, // Ensure weight is greater than 0
        },
      },
      {
        $project: {
          _id: 0,
          gender: "$members.gender",
          height: "$memberDemographic.height",
          weight: "$memberDemographic.weight",
          bmi: {
            $round: [
              {
                $divide: [
                  "$memberDemographic.weight",
                  {
                    $pow: [
                      { $divide: ["$memberDemographic.height", 3.2808399] },
                      2,
                    ],
                  },
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $group: {
          _id: "$gender",
          bmiValues: { $push: "$bmi" },
          heightValues: { $push: "$height" },
          weightValues: { $push: "$weight" },
        },
      },
      {
        $project: {
          _id: 0,
          group: "$_id",
          bmiValues: 1,
          heightValues: 1,
          weightValues: 1,
        },
      },
    ]);

    const formattedResult = bmiData.reduce((acc, item) => {
      acc[item.group || "All"] = {
        bmiValues: item.bmiValues,
        heightValues: item.heightValues,
        weightValues: item.weightValues,
      };
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: { village: village, bmiDistribution: formattedResult },
    });
  } catch (error) {
    console.error("Error fetching BMI distribution:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getChronicDiseasePrevalence = async (req, res) => {
  try {
    const { village, disease } = req.query;

    const initialMatchStage = {};
    if (village) {
      initialMatchStage["village_name"] = { $regex: new RegExp(village, "i") };
    }

    const memberMatchStage = {};
    if (disease) {
      memberMatchStage["memberDemographic.chronic_diseases"] = {
        $in: [new RegExp(disease, "i")],
      };
    }

    const prevalenceData = await User.aggregate([
      {
        $match: initialMatchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $match: {
          "memberDemographic.chronic_disease": {
            $exists: true,
            $not: { $size: 0 },
          },
        },
      },
      {
        $match: memberMatchStage,
      },
      {
        $unwind: "$memberDemographic.chronic_disease",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.chronic_disease",
          foreignField: "_id",
          as: "diseaseInfo",
        },
      },
      {
        $unwind: "$diseaseInfo",
      },
      {
        $match: {
          "diseaseInfo.type": "chronic_diseases",
        },
      },
      {
        $group: {
          _id: {
            village: "$village_name",
            diseaseNames: "$diseaseInfo.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          diseases: {
            $push: {
              diseaseNames: "$_id.diseaseNames",
              count: "$count",
            },
          },
          totalMembers: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          diseases: {
            $sortArray: {
              input: {
                $map: {
                  input: "$diseases",
                  as: "d",
                  in: {
                    diseaseNames: "$$d.diseaseNames",
                    count: "$$d.count",
                    prevalence: {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ["$$d.count", "$totalMembers"] },
                            100,
                          ],
                        },
                        2,
                      ],
                    },
                  },
                },
              },
              sortBy: { prevalence: -1 },
            },
          },
          totalMembers: 1,
        },
      },
    ]);

    const formattedResult = prevalenceData.reduce((acc, item) => {
      acc[item.village] = {
        diseases: item.diseases,
        totalMembersWithDisease: item.totalMembers,
      };
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        chronicDiseasePrevalence: formattedResult,
      },
    });
  } catch (error) {
    console.error("Error fetching chronic disease prevalence:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getIncomeRangeByAgeAndOptionalGender = async (req, res) => {
  try {
    const { village, gender } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const initialMatchStage = {
      village_name: { $regex: new RegExp(village, "i") },
    };

    const memberMatchStage = {};
    if (gender) {
      memberMatchStage["members.gender"] = {
        $regex: new RegExp(`\\b${gender}\\b`, "i"),
      };
    }

    const incomeRangeData = await User.aggregate([
      {
        $match: initialMatchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $match: memberMatchStage,
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.yearly_income",
          foreignField: "_id",
          as: "incomeInfo",
        },
      },
      {
        $unwind: {
          path: "$incomeInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$village_name",
            gender: "$members.gender",
            incomeNames: "$incomeInfo.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            village: "$_id.village",
            gender: "$_id.gender",
          },
          incomeRanges: {
            $push: {
              names: "$_id.incomeNames", // Push the dropdown names
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id.village",
          gender: "$_id.gender",
          incomeRanges: 1,
        },
      },
      {
        $sort: { village: 1, gender: 1 },
      },
    ]);

    const formattedResult = incomeRangeData.reduce((acc, item) => {
      const villageKey = item.village;
      const genderKey = item.gender || "All";

      if (!acc[villageKey]) {
        acc[villageKey] = {};
      }
      acc[villageKey][genderKey] = {
        incomeRanges: item.incomeRanges, // Contains names and counts
      };
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        incomeRangeValues: formattedResult,
      },
    });
  } catch (error) {
    console.error("Error fetching income range values:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getMotorDisabilityPrevalenceByVillageAndOptionalGender = async (
  req,
  res
) => {
  try {
    const { village, gender } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const initialMatchStage = {
      village_name: { $regex: new RegExp(village, "i") },
    };

    const memberMatchStage = {};
    if (gender) {
      memberMatchStage["members.gender"] = {
        $regex: new RegExp(`\\b${gender}\\b`, "i"),
      };
    }

    const motorDisabilityData = await User.aggregate([
      {
        $match: initialMatchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $match: memberMatchStage, // Apply gender filter
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.motor_disablity",
          foreignField: "_id",
          as: "motorDisabilityInfo",
        },
      },
      {
        $unwind: {
          path: "$motorDisabilityInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            village: "$village_name",
            gender: "$members.gender",
            disability: "$motorDisabilityInfo.name",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            village: "$_id.village",
            gender: "$_id.gender",
          },
          disabilities: {
            $push: {
              name: "$_id.disability",
              count: "$count",
            },
          },
          totalMembers: { $sum: "$count" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id.village",
          gender: "$_id.gender",
          disabilities: {
            $map: {
              input: "$disabilities",
              as: "d",
              in: {
                name: "$$d.name",
                count: "$$d.count",
                share: {
                  $round: [{ $divide: ["$$d.count", "$totalMembers"] }, 2],
                },
              },
            },
          },
          totalMembers: 1,
        },
      },
      {
        $sort: { village: 1, gender: 1 },
      },
    ]);

    const formattedResult = motorDisabilityData.reduce((acc, item) => {
      const villageKey = item.village;
      const genderKey = item.gender || "All";

      if (!acc[villageKey]) {
        acc[villageKey] = {};
      }
      acc[villageKey][genderKey] = {
        disabilities: item.disabilities,
        totalMembers: item.totalMembers,
      };
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        motorDisabilityPrevalence: formattedResult,
      },
    });
  } catch (error) {
    console.error("Error fetching motor disability prevalence:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getVillagePopulationSnapshot = async (req, res) => {
  try {
    const { village } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const villageRegex = new RegExp(village, "i"); // Case-insensitive matching

    const snapshotData = await User.aggregate([
      {
        $match: { village_name: villageRegex },
      },
      {
        $group: {
          _id: "$village_name",
          uniqueHouseholds: { $sum: 1 },
          users: { $push: "$$ROOT" }, // Store user documents for later processing
        },
      },
      {
        $unwind: "$users",
      },
      {
        $unwind: "$users.members",
      },
      {
        $group: {
          _id: {
            village: "$_id",
            gender: "$users.members.gender",
          },
          count: { $sum: 1 },
          uniqueHouseholds: { $first: "$uniqueHouseholds" },
        },
      },
      {
        $group: {
          _id: "$_id.village",
          genderCounts: {
            $push: {
              gender: "$_id.gender",
              count: "$count",
            },
          },
          totalPopulation: { $sum: "$count" },
          uniqueHouseholds: { $first: "$uniqueHouseholds" },
        },
      },
      {
        $project: {
          _id: 0,
          village: "$_id",
          genderCounts: 1,
          totalPopulation: 1,
          uniqueHouseholds: 1,
        },
      },
    ]);

    if (snapshotData.length === 0) {
      return res.status(200).json({
        status: "success",
        data: {
          village: village,
          snapshot: {},
        },
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        snapshot: snapshotData[0],
      },
    });
  } catch (error) {
    console.error("Error fetching village population snapshot:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getLanguageProficiencyHeatMap = async (req, res) => {
  try {
    const { village } = req.query;

    if (!village) {
      return res.status(400).json({ error: "Village parameter is required." });
    }

    const villageRegex = new RegExp(village, "i");

    const heatmapData = await User.aggregate([
      {
        $match: { village_name: villageRegex },
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographics",
        },
      },
      {
        $unwind: "$memberDemographics",
      },
      {
        $project: {
          _id: 0,
          language_speak: "$memberDemographics.language_speak",
          technical_vocational_skills:
            "$memberDemographics.technical_vocational_skills",
        },
      },
      {
        $unwind: "$language_speak",
      },
      {
        $unwind: "$technical_vocational_skills",
      },
      {
        $lookup: {
          from: "demographic_dropdowns", // Look up language names
          localField: "language_speak",
          foreignField: "_id",
          as: "language_name",
        },
      },
      {
        $unwind: "$language_name",
      },
      {
        $lookup: {
          from: "demographic_dropdowns", // Look up skill names
          localField: "technical_vocational_skills",
          foreignField: "_id",
          as: "skill_name",
        },
      },
      {
        $unwind: "$skill_name",
      },
      {
        $group: {
          _id: {
            language: "$language_name.name", // Use the name from demographicDropdown
            skill: "$skill_name.name", // Use the name from demographicDropdown
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: null,
          data: {
            $push: {
              language: "$_id.language",
              skill: "$_id.skill",
              count: "$count",
            },
          },
          languages: { $addToSet: "$_id.language" },
          skills: { $addToSet: "$_id.skill" },
        },
      },
      {
        $project: {
          _id: 0,
          languages: 1,
          skills: 1,
          data: 1,
        },
      },
    ]);

    if (heatmapData.length === 0) {
      return res.status(200).json({
        status: "success",
        data: {
          village: village,
          uniqueSkills: [],
          heatmapData: [],
          uniqueLanguages: [],
        },
      });
    }

    const result = heatmapData[0];

    const matrix = result.languages
      .map((language) => {
        const row = { language };
        let found = false;

        result.skills.forEach((skill) => {
          const entry = result.data.find(
            (item) =>
              item.language["en"] === language["en"] &&
              item.skill["en"] === skill["en"]
          );

          if (entry != undefined) {
            found = true;
          }

          // Properly store per-skill count in row
          row[skill.en] = entry ? entry.count : 0;
        });

        return found ? row : null;
      })
      .filter(Boolean);

    res.status(200).json({
      status: "success",
      data: {
        village: village,
        heatmapData: matrix,
        uniqueSkills: result.skills,
        uniqueLanguages: result.languages,
      },
    });
  } catch (error) {
    console.error("Error fetching language proficiency heatmap data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error.",
    });
  }
};

const getOccupationTreeMapData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["village_name"] = { $regex: new RegExp(village, "i") };
    }

    const result = await User.aggregate([
      {
        $match: matchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographics",
        },
      },
      {
        $unwind: "$memberDemographics",
      },
      {
        $project: {
          _id: 0,
          occupation: "$memberDemographics.occupation", // changed from  $memberDemographics.language_speak
        },
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "occupation",
          foreignField: "_id",
          as: "occupationDetails",
        },
      },
      {
        $unwind: "$occupationDetails",
      },
      {
        $group: {
          _id: "$occupationDetails.name",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          occupation: "$_id",
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
    console.error("Error fetching occupation tree map data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getDualKPISavings = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["village_name"] = { $regex: new RegExp(village, "i") };
    }

    const result = await User.aggregate([
      {
        $match: matchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          bankAccountUsers: {
            $sum: {
              $cond: [{ $eq: ["$memberDemographic.bank_account", true] }, 1, 0],
            },
          },
          savingsUsers: {
            $sum: {
              $cond: [
                { $eq: ["$memberDemographic.savings_investment", true] },
                1,
                0,
              ],
            },
          },
          totalSavings: {
            $sum: {
              $cond: [
                { $eq: ["$memberDemographic.savings_investment", true] },
                "$memberDemographic.savings_investment_amount",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          bankAccountPercentage: {
            $multiply: [{ $divide: ["$bankAccountUsers", "$totalUsers"] }, 100],
          },
          savingsPercentage: {
            $multiply: [{ $divide: ["$savingsUsers", "$totalUsers"] }, 100],
          },
          averageSavingsAmount: {
            $cond: [
              { $eq: ["$savingsUsers", 0] }, // Avoid division by zero
              0,
              { $divide: ["$totalSavings", "$savingsUsers"] },
            ],
          },
        },
      },
    ]);

    const data = result[0] || {
      bankAccountPercentage: 0,
      savingsPercentage: 0,
      averageSavingsAmount: 0,
    };

    res.status(200).json({
      status: "success",
      data: {
        bankAccountPercentage: data.bankAccountPercentage.toFixed(2),
        savingsPercentage: data.savingsPercentage.toFixed(2),
        averageSavingsAmount: data.averageSavingsAmount.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error fetching data for dual KPI cards:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getHabitsData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["village_name"] = { $regex: new RegExp(village, "i") };
    }

    const result = await User.aggregate([
      {
        $match: matchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.specific_habit",
          foreignField: "_id",
          as: "habitData",
        },
      },
      {
        $unwind: {
          path: "$habitData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "demographic_dropdowns", // added lookup for currently_feeling
          localField: "memberDemographic.currently_feeling",
          foreignField: "_id",
          as: "feelingData",
        },
      },
      {
        $unwind: {
          path: "$feelingData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            habit: "$habitData.name",
            feeling: "$feelingData.name", // Group by habit and feeling
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
      {
        $group: {
          _id: "$_id.habit",
          topFeelings: {
            $push: {
              feeling: "$_id.feeling",
              count: "$count",
            },
          },
          totalCount: { $sum: "$count" },
        },
      },
      {
        $project: {
          habit: "$_id",
          topFeelings: {
            $slice: ["$topFeelings", 3], // Get the top 3 feelings
          },
          totalCount: 1,
          _id: 0,
        },
      },
      {
        $lookup: {
          from: "risk_levels",
          localField: "habit",
          foreignField: "habitName",
          as: "riskData",
        },
      },
      {
        $unwind: {
          path: "$riskData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          habit: 1,
          topFeelings: 1,
          totalCount: 1,
          riskLevel: {
            $ifNull: ["$riskData.riskLevel", "No Data"],
          },
        },
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching habits and feelings data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getEducationSankeyData = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["village_name"] = { $regex: new RegExp(village, "i") };
    }

    const result = await User.aggregate([
      {
        $match: matchStage,
      },
      {
        $unwind: "$members",
      },
      {
        $lookup: {
          from: "demographics",
          localField: "members.demographic_id",
          foreignField: "_id",
          as: "memberDemographic",
        },
      },
      {
        $unwind: "$memberDemographic",
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.education_status",
          foreignField: "_id",
          as: "educationStatusData",
        },
      },
      {
        $unwind: {
          path: "$educationStatusData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "demographic_dropdowns",
          localField: "memberDemographic.education_seeking_to_gain",
          foreignField: "_id",
          as: "educationSeekingData",
        },
      },
      {
        $unwind: {
          path: "$educationSeekingData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: {
            source: "$educationStatusData.name",
            target: "$educationSeekingData.name",
          },
          value: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id.source",
          target: "$_id.target",
          value: 1,
        },
      },
      {
        $match: {
          $expr: {
            $and: [{ $ne: ["$source", null] }, { $ne: ["$target", null] }],
          },
        },
      },
    ]);

    // Get unique nodes
    const nodes = Array.from(
      new Set(result.flatMap((link) => [link.source, link.target]))
    ).map((name) => ({ name }));

    // Map sources and targets to indices
    const links = result.map((item) => ({
      source: nodes.findIndex((node) => node.name === item.source),
      target: nodes.findIndex((node) => node.name === item.target),
      value: item.value,
    }));

    res.status(200).json({
      status: "success",
      data: { nodes, links },
    });
  } catch (error) {
    console.error("Error fetching education Sankey data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getMaritalStatusByVillage,
  getDietShareByVillageAndOptionalGender,
  getBMIDistributionByVillageAndOptionalGender,
  getChronicDiseasePrevalence,
  getIncomeRangeByAgeAndOptionalGender,
  getMotorDisabilityPrevalenceByVillageAndOptionalGender,
  getVillagePopulationSnapshot,
  getLanguageProficiencyHeatMap,
  getOccupationTreeMapData,
  getDualKPISavings,
  getHabitsData,
  getEducationSankeyData,
};
