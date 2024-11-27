const mongoose = require("mongoose");
const { isEmail } = require("validator");
// const bcrypt = require("bcrypt");

const moderatorSchema = new mongoose.Schema(
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
        country_code: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please provide country code!"],
        },
        phone: {
            type: mongoose.Schema.Types.Number,
            required: [true, "Please enter you mobile number!"],
            min: 10,
            unique: true,
        },
        address: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please enter your address!"],
        },
        address_proof: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please upload an address proof!"],
        },
        officer_proof: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please upload an officer proof!"],
        },
        currency: {
            type: mongoose.Schema.Types.String,
            required: [true, "Currency is required!"],
        },
        country: {
            type: mongoose.Schema.Types.String,
            required: [true, "Country is required!"],
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

module.exports = mongoose.model("moderator", moderatorSchema);
