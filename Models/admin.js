const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please Enter a Name!"],
    },
    email: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter an Email!"],
      set: (value) => value.toLowerCase(),
      unique: true,
    },
    password: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter a Password!"],
    },
    role: {
      type: mongoose.Schema.Types.String,
      enum: ["admin", "viewer"],
      default: "viewer",
      required: [true, "Please Select a Role!"],
    },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password.toString(), salt);
  // if (this.phone.toString().length < 10) throw Error("invalid phone");
  next();
});

adminSchema.statics.login = async function (email, password) {
  const query = { email };
  const admin = await this.findOne(query);
  if (admin) {
    const matched = await bcrypt.compare(password.toString(), admin.password);
    delete admin._doc["password"];
    if (matched) return admin;
    throw Error("incorrect password");
  }
  throw Error("incorrect email");
};

module.exports = mongoose.model("admin", adminSchema);
