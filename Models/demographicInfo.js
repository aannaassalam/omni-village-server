const mongoose = require("mongoose");

const demograhicSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, "User id is required!"],
    ref: "User",
  },
  marital_status: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "marital status is required",
    ],
    default: "",
  },
  diet: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "diet is required",
    ],
    default: "",
  },
  height: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.status === 1;
      },
      "height is required",
    ],
    default: 0,
  },
  weight: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.status === 1;
      },
      "weight is required",
    ],
    default: 0,
  },
  speaking: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "speaking is required",
    ],
    default: "",
  },
  reading: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "reading is required",
    ],
    default: "",
  },
  writing: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "writing is required",
    ],
    default: "",
  },
  occupation: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "occupation is required",
    ],
    default: "",
  },
  yearly_income: {
    type: mongoose.Schema.Types.Number,
    required: [
      function () {
        return this.status === 1;
      },
      "yearly_income is required",
    ],
    default: 0,
  },
  bank_account: {
    type: mongoose.Schema.Types.Boolean,
    required: [
      function () {
        return this.status === 1;
      },
      "yearly income is required",
    ],
    default: false,
  },
  savings_investment: {
    type: mongoose.Schema.Types.Boolean,
    required: [
      function () {
        return this.status === 1;
      },
      " savings and investments is required",
    ],
    default: false,
  },
  chronic_diseases: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "chronic diseases is required",
    ],
    default: "",
  },
  handicap: {
    type: mongoose.Schema.Types.Boolean,
    required: [
      function () {
        return this.status === 1;
      },
      "handicap is required",
    ],
    default: false,
  },
  mental_emotional: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "mental emotional is required",
    ],
    default: "",
  },
  habits: {
    type: mongoose.Schema.Types.Array,
    required: [
      function () {
        return this.status === 1;
      },
      "habits is required",
    ],
    default: null,
  },
  education: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "education is required",
    ],
    default: "",
  },
  education_seeking_to_gain: {
    type: mongoose.Schema.Types.Boolean,
    required: [
      function () {
        return this.status === 1;
      },
      "education seeking to gain is required",
    ],
    default: false,
  },
  skillsets: {
    type: mongoose.Schema.Types.Array,
    required: [
      function () {
        return this.status === 1;
      },
      "skillsets is required",
    ],
    default: null,
  },
  hobbies: {
    type: mongoose.Schema.Types.Array,
    required: [
      function () {
        return this.status === 1;
      },
      "hobbies is required",
    ],
    default: null,
  },
  skills_seeking_to_learn: {
    type: mongoose.Schema.Types.Array,
    required: [
      function () {
        return this.status === 1;
      },
      "skills seeking to learn is required",
    ],
    default: null,
  },
  hobbies_seeking_to_adopt: {
    type: mongoose.Schema.Types.Array,
    required: [
      function () {
        return this.status === 1;
      },
      "hobbies seeking to adopt is required",
    ],
    default: null,
  },
  aspiration: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "aspiration is required",
    ],
    default: "",
  },
  unfulfilled: {
    type: mongoose.Schema.Types.String,
    required: [false, "unfullfilled is required"],
    default: "",
  },
  wishes: {
    type: mongoose.Schema.Types.String,
    required: [
      function () {
        return this.status === 1;
      },
      "wishes is required",
    ],
    default: "",
  },
  status: {
    type: mongoose.Schema.Types.Number,
    default: 1,
    enum: [0, 1],
  },
});

module.exports = mongoose.model("Demographic", demograhicSchema);