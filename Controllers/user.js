const User = require("../Models/user");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const sharp = require("sharp");
const fs = require("fs");
const moment = require("moment");

const accountSid = "AC4d37b2cba30b46a0262ca0f7429c5fd0";
const authToken = process.env.TWILIO_SECRET;
const client = require("twilio")(accountSid, authToken);

const forgot_password_otp_keeper = {};
const otp_keeper = {
  "+911234567890": "0000",
  "+601234567890": "0000",
  "+9751234567890": "0000",
};

const handleErrors = (err) => {
  let errors = {};

  //   incorrect email
  //   if (err.message === "incorrect email") {
  //     errors.email = "User doesn't exists!";
  //     return errors;
  //   }
  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "The password is incorrect";
    return errors;
  }

  if (err.message === "invalid phone") {
    errors.phone = "Please enter a valid mobile number!";
    return errors;
  }

  if (err.code === 11000) {
    if (Object.keys(err.keyPattern)[0] === "phone") {
      errors.phone = "Phone number already in use!";
      return errors;
    }
    if (Object.keys(err.keyPattern)[0] === "username") {
      errors.username = "Username already in use!";
      return errors;
    }
  }

  if (
    err.message.includes("User validation failed") ||
    err.message.includes("Validation failed")
  ) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
    return errors;
  }
  return err;
};

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY);
};

// module.exports.list_all = async (req, res) => {
//   try {
//     // const { limit = 10, page = 1 } = req.query;
//     // if (parseInt(page) < 1) {
//     //   res.status(400).json({ message: "Pages start from 1." });
//     // } else if (parseInt(limit) < 1) {
//     //   res.status(400).json({ message: "Limits must be greater than 0." });
//     // } else {
//       const users = await User.aggregate([
//         {
//           $project: {
//             sub_area: 0,
//           },
//         },
//       ])
//         .limit(parseInt(limit))
//         .skip(parseInt(limit) * (parseInt(page) - 1));
//       res.json(users);
//     // }
//   } catch (err) {
//     console.log(err);
//     res.status(500).json({ message: "Internal Server Error!" });
//   }
// };

module.exports.list_all = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $addFields: {
          cultivation: "$sub_area.cultivation.land",
          trees: "$sub_area.trees",
          poultry: "$sub_area.poultry",
          fishery: "$sub_area.fishery",
          storage: "$sub_area.storage",
        },
      },
      {
        $lookup: {
          from: "cultivations",
          foreignField: "user_id",
          localField: "_id",
          as: "cultivations",
          pipeline: [
            {
              $match: {
                status: 1,
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: [
                    "$utilization",
                    "$important_information",
                    "$$ROOT",
                  ],
                },
              },
            },
            {
              $lookup: {
                from: "crops",
                foreignField: "_id",
                localField: "crop_id",
                as: "crop",
              },
            },
            {
              $unwind: "$crop",
            },
            {
              $addFields: {
                crop_name: "$crop.name.en",
              },
            },
            {
              $project: {
                _id: 0,
                // crop_name: 0,
                crop_id: 0,
                crop: 0,
                user_id: 0,
                utilization: 0,
                important_information: 0,
                __v: 0,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "huntings",
          foreignField: "user_id",
          localField: "_id",
          as: "huntings",
          pipeline: [
            {
              $match: {
                status: 1,
              },
            },
            {
              $lookup: {
                from: "hunting_crops",
                foreignField: "_id",
                localField: "hunting_crop_id",
                as: "crop",
              },
            },
            {
              $unwind: "$crop",
            },
            {
              $addFields: {
                crop_name: "$crop.name.en",
              },
            },
            {
              $project: {
                _id: 0,
                hunting_crop_name: 0,
                hunting_crop_id: 0,
                user_id: 0,
                __v: 0,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "fisheries",
          foreignField: "user_id",
          localField: "_id",
          as: "fisheries",
          pipeline: [
            {
              $match: {
                status: 1,
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: ["$production_information", "$$ROOT"],
                },
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: ["$important_information", "$$ROOT"],
                },
              },
            },
            {
              $lookup: {
                from: "fishery_crops",
                foreignField: "_id",
                localField: "crop_id",
                as: "crop",
              },
            },
            {
              $unwind: "$crop",
            },
            {
              $addFields: {
                crop_name: "$crop.name.en",
              },
            },
            {
              $project: {
                _id: 0,
                fishery_crop_name: 0,
                fishery_crop_id: 0,
                user_id: 0,
                __v: 0,
                production_information: 0,
                important_information: 0,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "poultries",
          foreignField: "user_id",
          localField: "_id",
          as: "poultries",
          pipeline: [
            {
              $match: {
                status: 1,
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  $mergeObjects: ["$personal_information", "$$ROOT"],
                },
              },
            },
            {
              $lookup: {
                from: "poultry_crops",
                foreignField: "_id",
                localField: "crop_id",
                as: "crop",
              },
            },
            {
              $unwind: "$crop",
            },
            {
              $addFields: {
                crop_name: "$crop.name.en",
              },
            },
            {
              $lookup: {
                from: "poultry_products",
                foreignField: "_id",
                localField: "products",
                as: "products",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      poultry_crop_id: 0,
                      poultry_crop_name: 0,
                      __v: 0,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                _id: 0,
                poultry_crop_name: 0,
                poultry_crop_id: 0,
                user_id: 0,
                __v: 0,
                personal_information: 0,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "trees",
          foreignField: "user_id",
          localField: "_id",
          as: "tree",
          pipeline: [
            {
              $match: {
                status: 1,
              },
            },
            {
              $lookup: {
                from: "tree_crops",
                foreignField: "_id",
                localField: "crop_id",
                as: "crop",
              },
            },
            {
              $unwind: "$crop",
            },
            {
              $addFields: {
                crop_name: "$crop.name.en",
              },
            },
            {
              $lookup: {
                from: "tree_products",
                foreignField: "_id",
                localField: "products",
                as: "products",
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      tree_crop_id: 0,
                      tree_crop_name: 0,
                      __v: 0,
                    },
                  },
                ],
              },
            },
            {
              $project: {
                _id: 0,
                tree_crop_name: 0,
                tree_crop_id: 0,
                user_id: 0,
                __v: 0,
              },
            },
          ],
        },
      },
      // {
      //   $lookup: {
      //     from: "consumptions",
      //     foreignField: "user_id",
      //     localField: "_id",
      //     as: "consumptions",
      //     pipeline: [
      //       {
      //         $match: {
      //           status: 1,
      //         },
      //       },
      //       {
      //         $project: {
      //           _id: 0,
      //           crop_name: 0,
      //           crop_id: 0,
      //           user_id: 0,
      //           __v: 0,
      //         },
      //       },
      //     ],
      //   },
      // },
      // {
      //   $unwind: "$sub_area",
      // },
      {
        $project: {
          _id: 0,
          __v: 0,
          sub_area: 0,
          updatedAt: 0,
        },
      },
    ]);
    res.json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal Server Error!" });
  }
};

module.exports.generate_token = async (req, res) => {
  const { phone, country_code } = req.body;
  try {
    const user = await User.findOne({ phone, country_code });
    if (user) {
      res.json({
        token: createToken(user._id),
      });
    } else {
      res.status(400).json({ message: "User not found!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.send_otp = async (req, res) => {
  try {
    // console.log(authToken);
    const { country_code, phone, type = "login" } = req.body;
    const user = await User.findOne({
      phone: phone,
      country_code,
    });
    if (user?._id && type === "register") {
      res.status(400).json({ message: "User already exists, Please Login!" });
    } else if (!user && type === "login") {
      res
        .status(400)
        .json({ message: "User doesn't exists, Please Register!" });
    } else {
      if (`${phone}` !== "1234567890") {
        otp_keeper[`${country_code}${phone}`] = otpGenerator.generate(4, {
          upperCaseAlphabets: false,
          specialChars: false,
          lowerCaseAlphabets: false,
          digits: true,
        });
      }

      // res.send(otp_keeper[`${phone}`]);

      client.messages
        .create({
          body: `Your login OTP for Omni Village - ${
            otp_keeper[`${country_code}${phone}`]
          }`,
          messagingServiceSid: "MGd4add4653516dbb9e97b4bdc350f9367",
          to: `${country_code}${phone}`,
          statusCallback: "https://omnivillage.azurewebsites.net/api/webhook/",
        })
        .then((message) => res.send(message))
        .catch(
          (err) =>
            err.code === 21211 &&
            res
              .status(400)
              .json({ message: "Please enter a valid phone number!" })
        );
    }
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: "Bad request" });
  }
};

module.exports.register = async (req, res) => {
  const { country_code, phone, currency, country, otp } = req.body;

  try {
    if (otp.trim() === otp_keeper[`${country_code}${phone}`]) {
      if (`${phone}` !== "1234567890") {
        delete otp_keeper[`${country_code}${phone}`];
      }
      const user = await User.create({
        first_name: "-",
        last_name: "-",
        village_name: "-",
        number_of_members: "0",
        members: [],
        phone,
        country_code,
        document_type: "-",
        social_security_number: "-",
        address: "-",
        address_proof: "-",
        land_measurement: "-",
        land_measurement_symbol: "-",
        currency,
        country,
        street_address: "-",
      });
      const refreshToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.JWT_SECRET_KEY
      );
      res.json({ token: createToken(user._id), refreshToken });
    } else {
      res.status(401).send({ message: "Incorrect OTP" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.login = async (req, res) => {
  const { country_code, phone, otp } = req.body;

  try {
    if (otp.trim() === otp_keeper[`${country_code}${phone}`]) {
      if (`${phone}` !== "1234567890") {
        delete otp_keeper[`${country_code}${phone}`];
      }
      const user = await User.findOne({
        phone,
        country_code,
      });
      if (user._id) {
        const refreshToken = jwt.sign(
          {
            id: user._id,
          },
          process.env.JWT_SECRET_KEY
        );
        res.json({ token: createToken(user._id), refreshToken });
      } else {
        res.status(401).json({ message: "User doesn't exists!" });
      }
    } else {
      res.status(401).json({ message: "Incorrect OTP" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.get_current_user = (req, res) => {
  const { user } = res.locals;
  // console.log(user);
  res.json(user);
};

// module.exports.forgot_password = async (req, res) => {
//   const { phone } = req.body;

//   forgot_password_otp_keeper[email] = otpGenerator.generate(6, {
//     upperCaseAlphabets: false,
//     specialChars: false,
//     lowerCaseAlphabets: false,
//     digits: true,
//   });

//   const mailOptions = {
//     from: "anasalam027@gmail.com",
//     to: email,
//     subject: "Reset Password for Dealzup",
//     text: `One time password for ${email} password reset is ${otp_keeper[email]}`,
//   };

//   transporter.sendMail(mailOptions, function (error, info) {
//     if (error) {
//       console.log(error);
//       res.status(500).json(error);
//     } else {
//       console.log("Email sent: " + info.response);
//       res.send("Mail sent!");
//     }
//   });
// };

// module.exports.confirm_otp = (req, res) => {
//   const { phone, otp } = req.body;

//   if (otp.trim() === forgot_password_otp_keeper[phone]) {
//     res.send("Otp Verified Successfully!");
//     delete forgot_password_otp_keeper[phone];
//   } else {
//     res.status(400).json({ msg: "Incorrect OTP, please try again!" });
//   }
// };

module.exports.refresh = (req, res) => {
  if (req.body.refresh_token) {
    // Destructuring refreshToken from cookie
    const refreshToken = req.body.refresh_token;

    // Verifying refresh token
    jwt.verify(refreshToken, process.env.JWT_SECRET_KEY, (err, { payload }) => {
      if (err) {
        // Wrong Refesh Token
        return res.status(406).json({ message: "Unauthorized" });
      } else {
        // Correct token we send a new access token
        const accessToken = jwt.sign(
          {
            id: payload.id,
          },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: 24 * 60 * 60,
          }
        );
        return res.json({ accessToken });
      }
    });
  } else {
    return res.status(406).json({ message: "Unauthorized" });
  }
};

// module.exports.change_password = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email: email });
//     user.password = password;
//     user.save();
//     if (user._id) {
//       res.send("Password changed successfully!");
//     } else {
//       res.status(400).json({ msg: "User with this email not found!" });
//     }
//   } catch (err) {
//     console.log(err);
//     res.status(400).json(handleErrors(err));
//   }
// };

module.exports.edit_user = async (req, res) => {
  const { user } = res.locals;
  const {
    first_name = "",
    last_name = "",
    village_name = "",
    social_security_number = "",
    address = "",
    members = "[]",
    number_of_members = "",
    land_measurement = "",
    land_measurement_symbol = "",
    document_type = "",
    street_address = "",
  } = req.body;

  const address_proof = req.file;

  try {
    if (address_proof?.filename) {
      const buffer = await sharp(req.file.path).png({ quality: 10 }).toBuffer();
      await sharp(buffer).toFile("./" + req.file.path);
    }
    const new_members =
      typeof members === "string" ? JSON.parse(members) : members;
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        ...user._doc,
        first_name: first_name?.trim().length
          ? first_name.trim()
          : user.first_name,
        last_name: last_name?.trim().length ? last_name.trim() : user.last_name,
        village_name: village_name?.trim().length
          ? village_name.trim()
          : user.village_name,
        number_of_members: number_of_members.trim().length
          ? number_of_members.trim()
          : user.number_of_members,
        members: new_members.length > 0 ? new_members : user.members,
        document_type: document_type?.trim().length
          ? document_type.trim()
          : user.document_type,
        social_security_number: social_security_number?.trim().length
          ? social_security_number.trim()
          : user.social_security_number,
        address: address?.trim().length ? address.trim() : user.address,
        address_proof: address_proof?.filename?.length
          ? address_proof.path
          : user.address_proof,
        land_measurement: land_measurement.trim().length
          ? land_measurement.trim()
          : user.land_measurement,
        land_measurement_symbol: land_measurement_symbol.trim().length
          ? land_measurement_symbol.trim()
          : user.land_measurement_symbol,
        street_address: street_address.trim().length
          ? street_address.trim()
          : user.street_address,
      },
      { runValidators: true, new: true }
    );
    res.json({ msg: "User updated successfully!" });
  } catch (err) {
    console.log(err);
    !req.body.edit && fs.unlinkSync("./" + req.file.path);
    if (user._id) {
      res.status(400).json({ error: err });
    } else {
      res.status(401).json({ error: "Token Expired!" });
    }
  }
};

module.exports.delete_user = async (req, res) => {
  const { user } = res.locals;

  try {
    const deleted_user = await User.findByIdAndDelete(user._id, {
      returnDocument: true,
    });
    if (deleted_user._id) {
      res.send("User deleted successfully!");
    } else {
      res.status(400).json({ msg: "User doesn't exists!" });
    }
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.land_allocation = async (req, res) => {
  const { user } = res.locals;
  const { total_land, cultivation, trees, poultry, fishery, storage } =
    req.body;

  if (
    total_land >=
    parseInt(cultivation) +
      parseInt(trees) +
      parseInt(poultry) +
      parseInt(fishery) +
      parseInt(storage)
  ) {
    try {
      const updated_doc = await User.findByIdAndUpdate(
        user._id,
        {
          total_land,
          sub_area: {
            cultivation: {
              ...user._doc.sub_area.cultivation,
              land: cultivation,
            },
            trees,
            poultry,
            fishery,
            storage,
          },
        },
        { runValidators: true, new: true }
      );
      res.json(updated_doc);
    } catch (err) {
      res.status(400).json(handleErrors(err));
    }
  } else {
    res
      .status(400)
      .json({ msg: "Sub area cannot be greater than total land!" });
  }
};

module.exports.cultivation_land_allocation = async (req, res) => {
  const { user } = res.locals;
  const { once, twice, thrice } = req.body;

  // if (
  //   total_land >=
  //   parseInt(cultivation) +
  //     parseInt(trees) +
  //     parseInt(poultry) +
  //     parseInt(fishery) +
  //     parseInt(storage)
  // ) {
  try {
    const updated_doc = await User.findByIdAndUpdate(
      user._id,
      {
        sub_area: {
          ...user._doc.sub_area,
          cultivation: {
            ...user._doc.sub_area.cultivation,
            distribution: {
              once,
              twice,
              thrice,
            },
          },
        },
      },
      { runValidators: true, new: true }
    );
    res.json(updated_doc);
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
  // } else {
  //   res
  //     .status(400)
  //     .json({ msg: "Sub area cannot be greater than total land!" });
  // }
};

module.exports.user_list = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);
    const processed_users = {};
    users.forEach((user) => {
      const date = moment(user.createdAt).format("LL");
      processed_users[date] = processed_users[date]
        ? [...processed_users[date], user]
        : [user];
    });
    // res.json(processed_users);
    res.render("users", { users: processed_users });
  } catch (err) {
    res.status(304).json(err);
  }
};
