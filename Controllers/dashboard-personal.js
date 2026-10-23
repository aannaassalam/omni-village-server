const OtherHouseholdItem = require("../Models/other-personal-household-items");

const getExpenseByCategory = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await OtherHouseholdItem.aggregate([
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
          _id: "$type", // Group by the 'type' field (e.g., "personal_care_items")
          totalExpense: { $sum: "$yearly_expense_for_personal_care" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalExpense: 1,
        },
      },
      {
        $sort: { totalExpense: -1 }, // Sort by total expense in descending order
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching expense by category data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getItemTypeQuantityStackedBar = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await OtherHouseholdItem.aggregate([
      {
        $match: {
          items_produces: { $exists: true, $ne: [] }, // Only documents with actual items listed
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
        $match: matchStage, // Apply village filter
      },
      {
        $unwind: "$items_produces", // Deconstruct the items_produces array to process each item
      },
      {
        $lookup: {
          from: "other_personal_household_item_dropdowns", // Lookup the actual item name from the specified dropdowns
          localField: "items_produces.type", // Corrected localField to target the 'type' field within items_produces
          foreignField: "_id",
          as: "itemDetails",
        },
      },
      {
        $unwind: {
          path: "$itemDetails",
          preserveNullAndEmptyArrays: true, // Keep documents even if itemDetails lookup fails
        },
      },
      {
        // Group by the main document's 'type' and the specific produced item's name
        $group: {
          _id: {
            mainCategoryType: "$type", // e.g., "personal_care_items", "cleaning_products"
            producedItemName: "$itemDetails.name.en", // e.g., "brooms", "soap"
          },
          totalQuantity: { $sum: "$items_produces.quantity" }, // Sum the quantity for this specific item within this category
        },
      },
      {
        // Regroup to consolidate all produced items under their main category type
        $group: {
          _id: "$_id.mainCategoryType", // Group by the main document's 'type'
          producedItems: {
            $push: {
              itemName: "$_id.producedItemName",
              quantity: "$totalQuantity",
            },
          },
          totalCategoryQuantity: { $sum: "$totalQuantity" }, // Sum of all quantities for this main category
        },
      },
      {
        $project: {
          _id: 0,
          mainCategory: "$_id",
          producedItems: 1,
          totalCategoryQuantity: 1, // Useful for sorting or overall category size
        },
      },
      {
        $sort: { totalCategoryQuantity: -1 }, // Sort by the total quantity of each main category
      },
    ]);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching item type quantity stacked bar data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getLocalVsMarketPrepByProduct = async (req, res) => {
  try {
    const { village } = req.query;

    const commonPipeline = [
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
        $match: village
          ? {
              "userDetails.village_name": {
                $regex: new RegExp(`^${village}$`, "i"),
              },
            }
          : {}, // Apply village filter if provided
      },
    ];

    const [usedItemsResult, producedItemsResult] =
      await OtherHouseholdItem.aggregate([
        // Start with common pipeline stages
        ...commonPipeline,
        {
          $facet: {
            // Facet 1: Aggregate for items used (total demand)
            usedItems: [
              {
                $match: {
                  personal_care_item_use: { $exists: true, $ne: [] }, // Only documents with items used
                },
              },
              {
                $unwind: "$personal_care_item_use", // Deconstruct the personal_care_item_use array
              },
              {
                $lookup: {
                  from: "other_personal_household_item_dropdowns", // Lookup item details
                  localField: "personal_care_item_use",
                  foreignField: "_id",
                  as: "itemDetails",
                },
              },
              {
                $unwind: {
                  path: "$itemDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: "$itemDetails.name.en", // Group by English item name
                  count: { $sum: 1 }, // Count occurrences
                },
              },
              {
                $project: {
                  _id: 0,
                  itemName: "$_id",
                  totalUsedCount: "$count",
                },
              },
            ],

            // Facet 2: Aggregate for items produced locally (local supply)
            producedItems: [
              {
                $match: {
                  items_produces: { $exists: true, $ne: [] }, // Only documents with items produced
                },
              },
              {
                $unwind: "$items_produces", // Deconstruct the items_produces array
              },
              {
                $lookup: {
                  from: "other_personal_household_item_dropdowns", // Lookup item details
                  localField: "items_produces.type", // Correctly target the 'type' field within items_produces
                  foreignField: "_id",
                  as: "itemDetails",
                },
              },
              {
                $unwind: {
                  path: "$itemDetails",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $group: {
                  _id: "$itemDetails.name.en", // Group by English item name
                  count: { $sum: 1 }, // Count occurrences
                },
              },
              {
                $project: {
                  _id: 0,
                  itemName: "$_id",
                  totalProducedCount: "$count",
                },
              },
            ],
          },
        },
      ]);

      

    res.status(200).json({
      status: "success",
      producedItemsResult,
      usedItemsResult,
    });
  } catch (error) {
    console.error(
      "Error fetching local vs market prep by product data:",
      error
    );
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

const getHouseholdsProducingItems = async (req, res) => {
  try {
    const { village } = req.query;

    const matchStage = {};
    if (village) {
      matchStage["userDetails.village_name"] = {
        $regex: new RegExp(`^${village}$`, "i"),
      };
    }

    const result = await OtherHouseholdItem.aggregate([
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
        // Group by user_id to identify unique households
        $group: {
          _id: "$user_id", // Each unique user_id is a household
          // Check if this household has at least one record where items_produces is not empty
          producesItems: {
            $max: {
              $cond: [{ $gt: [{ $size: "$items_produces" }, 0] }, true, false],
            },
          },
        },
      },
      {
        // Group again to get overall counts
        $group: {
          _id: null, // Group all households together
          totalHouseholds: { $sum: 1 }, // Count total unique households
          householdsProducingItems: {
            $sum: { $cond: ["$producesItems", 1, 0] }, // Count households that produce items
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalHouseholds: 1,
          householdsProducingItems: 1,
          percentageProducing: {
            $cond: [
              { $eq: ["$totalHouseholds", 0] },
              0,
              { $multiply: [{ $divide: ["$householdsProducingItems", "$totalHouseholds"] }, 100] },
            ],
          },
        },
      },
    ]);

    const data = result[0] || {
      totalHouseholds: 0,
      householdsProducingItems: 0,
      percentageProducing: 0,
    };

    res.status(200).json({
      status: "success",
      data: data,
    });
  } catch (error) {
    console.error("Error fetching households producing items data:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message,
    });
  }
};

module.exports = {
  getExpenseByCategory,
  getItemTypeQuantityStackedBar,
  getLocalVsMarketPrepByProduct,
  getHouseholdsProducingItems,
};
