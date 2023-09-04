const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a crop name!"],
      unique: true,
      set: (value) => value.toLowerCase(),
    },
    category: {
      type: mongoose.Schema.Types.Boolean,
      required: [true, "Please specify if its a category or not!"],
    },
    categoryId: {
      type: mongoose.Schema.Types.String,
      ref: "Crop",
      default: "",
      required: [
        function () {
          return this.category === 0;
        },
        "Crop category id is required!",
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
