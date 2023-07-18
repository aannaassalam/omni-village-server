const mongoose = require("mongoose");
const { isEmail } = require("validator");
// const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    first_name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your first name!"],
    },
    last_name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your last name!"],
    },
    village_name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your village name!"],
    },
    // email: {
    //   type: mongoose.Schema.Types.String,
    //   required: [true, "Please enter an email!"],
    //   unique: true,
    //   lowercase: true,
    //   validate: [isEmail, "Please enter a valid email!"],
    // },
    phone: {
      type: mongoose.Schema.Types.Number,
      required: [true, "Please enter you mobile number!"],
      min: 10,
      unique: true,
    },
    family_name: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your family name!"],
    },
    username: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter a username!"],
      unique: true,
    },
    social_security_number: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your social security number!"],
    },
    address: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please enter your address!"],
    },
    address_proof: {
      type: mongoose.Schema.Types.String,
      required: [true, "Please upload an address proof!"],
    },
  },
  {
    timestamps: true,
  }
);

// userSchema.pre("save", async function (next) {
//   const salt = await bcrypt.genSalt();
//   this.password = await bcrypt.hash(this.password.toString(), salt);
//   if (this.phone.toString().length < 10) throw Error("invalid phone");
//   next();
// });

// userSchema.statics.login = async function (email, phone, password) {
//   const query = email.trim().length ? { email } : { phone };
//   const user = await this.findOne(query);
//   if (user) {
//     const matched = await bcrypt.compare(password.toString(), user.password);
//     if (matched) return user;
//     throw Error("incorrect password");
//   }
//   throw Error("incorrect email");
// };

module.exports = mongoose.model("User", userSchema);
