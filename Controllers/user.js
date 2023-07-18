const User = require("../Models/user");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const { options } = require("../Routes/user");
const sharp = require("sharp");
const fs = require("fs");

const accountSid = "AC4d37b2cba30b46a0262ca0f7429c5fd0";
const authToken = "e4be10a1e5ffccfbdfdbdc6a5e0a1430";
const client = require("twilio")(accountSid, authToken);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "anasalam027@gmail.com",
    pass: "yvbkuiovpwpfvtmq",
  },
});

const forgot_password_otp_keeper = {};
const otp_keeper = {};

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
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: 24 * 60 * 60,
  });
};

module.exports.send_otp = (req, res) => {
  try {
    const { phone } = req.body;
    otp_keeper[`${phone}`] = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });

    // res.send(otp_keeper[`${phone}`]);

    client.messages
      .create({
        body: `Your login OTP for Omni Village - ${otp_keeper[`${phone}`]}`,
        messagingServiceSid: "MGd4add4653516dbb9e97b4bdc350f9367",
        to: phone,
      })
      .then((message) => res.send(message));
  } catch (err) {
    console.log(err);
    res.send(400).json({ message: "Bad request" });
  }
};

module.exports.register = async (req, res) => {
  const {
    first_name,
    last_name,
    village_name,
    phone,
    family_name,
    username,
    social_security_number,
    address,
    otp,
  } = req.body;

  try {
    if (otp.trim() === otp_keeper[`${phone}`]) {
      delete otp_keeper[`${phone}`];
      const buffer = await sharp(req.file.path).png({ quality: 10 }).toBuffer();
      await sharp(buffer).toFile("./" + req.file.path);
      const user = await User.create({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        village_name: village_name.trim(),
        phone,
        family_name: family_name.trim(),
        username: username.trim(),
        social_security_number: social_security_number.trim(),
        address: address.trim(),
        address_proof: req.file.path,
      });
      const refreshToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.JWT_SECRET_KEY
      );
      res.json({ token: createToken(user._id), refreshToken });
    } else {
      fs.unlinkSync("./" + req.file.path);
      res.status(401).send({ message: "Incorrect OTP" });
    }
  } catch (err) {
    fs.unlinkSync("./" + req.file.path);
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.login = async (req, res) => {
  const { phone, otp } = req.body;

  try {
    if (otp.trim() === otp_keeper[`${phone}`]) {
      delete otp_keeper[`${phone}`];
      const user = await User.findOne({
        phone,
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

module.exports.get_current_user = (req, res) => {
  const { user } = res.locals;
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
    family_name = "",
    username = "",
    social_security_number = "",
    address = "",
  } = req.body;
  try {
    if (address_proof.filename) {
      const buffer = await sharp(req.file.path).png({ quality: 10 }).toBuffer();
      await sharp(buffer).toFile("./" + req.file.path);
    }
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        ...user,
        first_name: first_name?.trim().length
          ? first_name.trim()
          : user.first_name,
        last_name: last_name?.trim().length ? last_name.trim() : user.last_name,
        village_name: village_name?.trim().length
          ? village_name.trim()
          : user.village_name,
        family_name: family_name?.trim().length
          ? family_name.trim()
          : user.family_name,
        username: username?.trim().length ? username.trim() : user.username,
        social_security_number: social_security_number?.trim().length
          ? social_security_number.trim()
          : user.social_security_number,
        address: address?.trim().length ? address.trim() : user.address,
        address_proof: req.body.filename.length
          ? req.body.path
          : user.address_proof,
      },
      { runValidators: true }
    );
    res.json({ msg: "User updated successfully!" });
  } catch (err) {
    console.log(err);
    fs.unlinkSync("./" + req.body.path);
    res.status(400).json(err);
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
