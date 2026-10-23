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
      enum: ["admin", "viewer", "regional"],
      default: "viewer",
      required: [true, "Please Select a Role!"],
    },
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function (next) {
  // Only a new password is hashed. Hashing the stored hash again on an
  // unrelated save would lock the account out.
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password.toString(), salt);
  // if (this.phone.toString().length < 10) throw Error("invalid phone");
  next();
});

// The hash of nothing anyone can type: compared against when there is no
// such account, so that "no account" takes as long to answer as "wrong
// password" and the two cannot be told apart by timing either.
const NO_ACCOUNT = bcrypt.hashSync(require("crypto").randomBytes(24).toString("hex"), 10);

adminSchema.statics.login = async function (email, password) {
  const query = { email };
  const admin = await this.findOne(query);
  if (admin) {
    const matched = await bcrypt.compare(password.toString(), admin.password);
    delete admin._doc["password"];
    if (matched) return admin;
    throw Error("incorrect password");
  }
  await bcrypt.compare(password.toString(), NO_ACCOUNT);
  throw Error("incorrect email");
};

module.exports = mongoose.model("admin", adminSchema);
