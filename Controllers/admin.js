const Admin = require("../Models/admin");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "anasalam027@gmail.com",
    pass: "yvbkuiovpwpfvtmq",
  },
});

const handleErrors = (err) => {
  let errors = {};

  //   incorrect email
  if (err.message === "incorrect email") {
    errors.email = "No Admin with this email found!";
    return errors;
  }

  // incorrect password
  if (err.message === "incorrect password") {
    errors.password = "The password is incorrect";
    return errors;
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

module.exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const admin = await Admin.create({
      name: name.trim(),
      password,
      email: email.trim(),
      role,
    });
    delete admin._doc["password"];
    res.json({
      token: createToken(admin._id),
      ...admin._doc,
    });
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.login(email, password);
    res.json({ token: createToken(admin._id), ...admin._doc });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.forgot_password = async (req, res) => {
  const { email } = req.body;

  try {
    const new_password = otpGenerator.generate(8, {
      lowerCaseAlphabets: false,
      specialChars: false,
      upperCaseAlphabets: false,
    });

    const salt = await bcrypt.genSalt();
    password = await bcrypt.hash(new_password.toString(), salt);

    const admin = await Admin.findOneAndUpdate(
      { email },
      {
        password,
      }
    );

    const mailOptions = {
      from: "anasalam027@gmail.com",
      to: email,
      subject: "Password reset for OmniVillage",
      text: `Your new password for ${email} is ${new_password}`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
        res.status(500).json(error);
      } else {
        console.log("Email sent: " + info.response);
        res.send("Mail sent!");
      }
    });
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.change_password = async (req, res) => {
  const { user_id, password } = req.body;
  try {
    const salt = await bcrypt.genSalt();
    const new_password = await bcrypt.hash(password.toString(), salt);

    const admin = await Admin.findByIdAndUpdate(user_id, {
      password: new_password,
    });
    res.json({ msg: "Password Changed!" });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};
