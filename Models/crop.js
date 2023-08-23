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
      enum: [0, 1],
    },
    categoryId: {
      type: mongoose.Schema.Types.String,
      ref: "Crop",
      default: "",
      required: [
        function () {
          this.category === 1;
        },
        "Crop category id is required!",
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Crop", cropSchema);
