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
        number_of_members: {
            type: mongoose.Schema.Types.Number,
            required: [true, "Please provide number of members!"],
        },
        members: [
            {
                name: {
                    type: mongoose.Schema.Types.String,
                    set: (val) => val.toLowerCase(),
                    required: [true, "Please provide member name!"],
                },
                age: {
                    type: mongoose.Schema.Types.Number,
                    required: [true, "Please provide member age!"],
                },
                gender: {
                    type: mongoose.Schema.Types.String,
                    required: [true, "Please provide member gender!"],
                    set: (val) => val.toLowerCase(),
                    enum: ["male", "female", "other"],
                },
                demographic_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    default: null,
                },
            },
        ],
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
        document_type: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please select your Document type!"],
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
        officer_proof: {
            type: mongoose.Schema.Types.String,
            required: [true, "Please upload an officer proof!"],
        },
        total_land: {
            type: mongoose.Schema.Types.Number,
            default: 0,
        },
        currency: {
            type: mongoose.Schema.Types.String,
            required: [true, "Currency is required!"],
        },
        country: {
            type: mongoose.Schema.Types.String,
            required: [true, "Country is required!"],
        },
        land_measurement: {
            type: mongoose.Schema.Types.String,
            required: [true, "Land Measurement is required!"],
        },
        land_measurement_symbol: {
            type: mongoose.Schema.Types.String,
            required: [true, "Land Measurement Symbol is required!"],
        },
        sub_area: {
            cultivation: {
                land: {
                    type: mongoose.Schema.Types.Number,
                    default: 0,
                },
                distribution: {
                    once: {
                        type: mongoose.Schema.Types.Number,
                        default: 0,
                    },
                    twice: {
                        type: mongoose.Schema.Types.Number,
                        default: 0,
                    },
                    thrice: {
                        type: mongoose.Schema.Types.Number,
                        default: 0,
                    },
                },
            },
            trees: {
                type: mongoose.Schema.Types.Number,
                default: 0,
            },
            poultry: {
                type: mongoose.Schema.Types.Number,
                default: 0,
            },
            fishery: {
                type: mongoose.Schema.Types.Number,
                default: 0,
            },
            storage: {
                type: mongoose.Schema.Types.Number,
                default: 0,
            },
        },
        type: {
            type: String,
            default: "villager",
            enum: ["villager", "officer"],
        },
        street_address: {
            type: mongoose.Schema.Types.String,
            default: "",
            required: [true, "Street Address is required!"],
        },
        is_landholding_data: {
            type: Boolean,
            default: false,
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
