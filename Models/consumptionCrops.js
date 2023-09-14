const mongoose = require("mongoose");

const consumptionCropSchema = new mongoose.Schema(
    {
        name: {
          type: mongoose.Schema.Types.String,
          required: [true, "Please Enter a consumption crop name!"],
          unique: true,
          set: (value) => value.toLowerCase(),
        },
        category: {
          type: mongoose.Schema.Types.Boolean,
          required: [true, "Please specify if its a category or not!"],
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Crop",
          default: "",
          required: [
            function () {
              return this.category === 0;
            },
            "consumption crop category id is required!",
          ],
        },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "consumption_type",
          default: "",
          required: [true, "consumption crop category id is required!",
          ],
        },
      },
  { timestamps: true }
);

module.exports = mongoose.model("consumption_crop", consumptionCropSchema);