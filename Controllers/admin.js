const Admin = require("../Models/admin");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const AppError = require("../AppError");
const { listPlaces, indexPlaces, chainOf, shown } = require("../utils/places");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "anasalam027@gmail.com",
    pass: "yvbkuiovpwpfvtmq",
  },
});

const handleErrors = (err) => {
  let errors = {};

  // One sentence for both: an answer that told them apart would tell anyone
  // which addresses have a dashboard account.
  if (
    err.message === "incorrect email" ||
    err.message === "incorrect password"
  ) {
    errors.password = "The email or the password is incorrect";
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

// How an account's place is shown: its name, and the names from its country
// down to it. null when the account has no place, or the place is gone.
const placeOf = (placeId, byId) => {
  const place = byId.get(String(placeId));
  if (!place) return null;
  return {
    _id: place._id,
    name: shown(place),
    level: place.level,
    names: chainOf(place)
      .map((id) => byId.get(String(id)))
      .filter(Boolean)
      .map(shown),
  };
};

// Sent by mail and typed once, so it can be long: twelve characters of
// letters, digits, "-" and "_" (72 bits). Eight digits could be guessed
// against the login, which has no limit on attempts.
const temporaryPassword = () => crypto.randomBytes(9).toString("base64url");

// A mail that cannot be sent must not fail the request: the account or the
// new password is already saved by then. The password is handed back
// instead, for the super admin to pass on.
const sendTemporaryPassword = async (email, tempPassword) => {
  if (!process.env.MAIL_DISABLED) {
    try {
      await transporter.sendMail({
        from: "anasalam027@gmail.com",
        to: email,
        subject: "Your Omni Village dashboard account",
        text: [
          "Here is how to sign in to the Omni Village dashboard.",
          "",
          `Email: ${email}`,
          `Temporary password: ${tempPassword}`,
          "",
          "Please change this password after signing in.",
        ].join("\n"),
      });
      return { emailed: true };
    } catch (error) {
      console.log(error);
    }
  }
  return { emailed: false, tempPassword };
};

// The team routes manage regional accounts only: a super admin or a viewer
// is never reset or removed through them.
const regionalAccount = async (id) => {
  const account = await Admin.findById(id).select({ email: 1, role: 1 }).lean();
  if (!account) throw new AppError(0, "Account not found", 404);
  if (account.role !== "regional") {
    throw new AppError(0, "This is not a regional team account.", 409);
  }
  return account;
};

module.exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // The model's enum also holds "regional"; that role is not handed out here.
  if (!["admin", "viewer"].includes(role)) {
    return res.status(400).json({ role: "Role must be admin or viewer" });
  }

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
  // An object here would reach Mongo as a query operator: {"$gt": ""} for
  // the email finds the first account there is.
  if (typeof email !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json(handleErrors(new Error("incorrect password")));
  }
  try {
    const admin = await Admin.login(email, password);
    res.json({
      token: createToken(admin._id),
      ...admin._doc,
      // A regional account works inside one place, and the dashboard has to
      // name it straight away. Other roles answer exactly as before.
      ...(admin.role === "regional" && {
        place: placeOf(admin.placeId, indexPlaces(await listPlaces())),
      }),
    });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

module.exports.forgot_password = async (req, res) => {
  const { email } = req.body;

  try {
    // This route is open. A list here would be cast by Mongoose to
    // {email: {$in: [...]}}: one account's password reset, and the new one
    // mailed to every address in the list, the caller's included.
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ email: "Please enter an Email!" });
    }

    // No such account: answer exactly as if there were one, and mail nobody.
    const admin = await Admin.findOne({ email }).select({ _id: 1 }).lean();
    if (!admin) return res.send("Mail sent!");

    // With the mailer off there is no way to hand the new password over, so
    // nothing is changed. (The answer stays the same: see above.)
    if (process.env.MAIL_DISABLED) return res.send("Mail sent!");

    const new_password = temporaryPassword();

    // The mail first, the password after: a mail that cannot be sent must
    // leave the old password working, or the account is locked out with a
    // password nobody has.
    try {
      await transporter.sendMail({
        from: "anasalam027@gmail.com",
        to: email,
        subject: "Password reset for OmniVillage",
        text: `Your new password for ${email} is ${new_password}`,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        message: "The mail could not be sent. Your password is unchanged.",
      });
    }

    const salt = await bcrypt.genSalt();
    await Admin.updateOne(
      { _id: admin._id },
      { password: await bcrypt.hash(new_password, salt) }
    );
    return res.send("Mail sent!");
  } catch (err) {
    console.log(err);
    res.status(400).json(handleErrors(err));
  }
};

module.exports.change_password = async (req, res) => {
  const { password } = req.body;

  if (typeof password !== "string" || password.length < 8) {
    return res
      .status(400)
      .json({ password: "Password must be at least 8 characters" });
  }

  try {
    const salt = await bcrypt.genSalt();
    const new_password = await bcrypt.hash(password.toString(), salt);

    // Always the signed-in account (verifyAdmin), never an id from the body:
    // that let anyone reset anyone's password.
    const admin = await Admin.findByIdAndUpdate(res.locals.admin._id, {
      password: new_password,
    });
    res.json({ msg: "Password Changed!" });
  } catch (err) {
    res.status(400).json(handleErrors(err));
  }
};

// Regional teams. Written as the rest of the project is: no try/catch here,
// the route wraps each handler in ControllerWrapper.

module.exports.get_team = async (req, res) => {
  const [accounts, places] = await Promise.all([
    Admin.find({}).select("-password").sort({ _id: 1 }).lean(),
    listPlaces(),
  ]);
  const byId = indexPlaces(places);

  return res.json(
    accounts.map(({ _id, name, email, role, placeId }) => ({
      _id,
      name,
      email,
      role,
      // Accounts older than the field have none: null, like the unassigned.
      placeId: placeId || null,
      place: placeOf(placeId, byId),
    }))
  );
};

module.exports.assign_team = async (req, res) => {
  const schema = Joi.object({
    // Any domain is accepted. Joi's default only lets through the public
    // suffixes it knows, which refuses an organisation's internal addresses.
    email: Joi.string()
      .trim()
      .lowercase()
      .email({ tlds: { allow: false } })
      .required(),
    placeId: Joi.string().required(),
    name: Joi.string().trim().optional(),
  }).options({ stripUnknown: true });

  const { error, value } = schema.validate(req.body);
  if (error) throw error;

  const place = indexPlaces(await listPlaces()).get(
    value.placeId.toLowerCase()
  );
  if (!place) throw new AppError(0, "Place not found", 404);

  const account = await Admin.findOne({ email: value.email })
    .select({ role: 1 })
    .lean();

  if (!account) {
    const tempPassword = temporaryPassword();
    // Hashed by the model's pre-save hook.
    await Admin.create({
      name: value.name || value.email.split("@")[0],
      email: value.email,
      password: tempPassword,
      role: "regional",
      placeId: place._id,
    });
    return res.json({
      created: true,
      ...(await sendTemporaryPassword(value.email, tempPassword)),
    });
  }

  if (account.role !== "regional") {
    throw new AppError(
      0,
      "This email already belongs to a super admin or viewer account.",
      409
    );
  }

  // updateOne, never load-and-save(): only the place changes.
  await Admin.updateOne({ _id: account._id }, { placeId: place._id });

  return res.json({ created: false });
};

module.exports.resend_team_password = async (req, res) => {
  const account = await regionalAccount(req.params.id);

  const tempPassword = temporaryPassword();
  // Hashed here as change_password does: updateOne runs no pre-save hook.
  const salt = await bcrypt.genSalt();
  const password = await bcrypt.hash(tempPassword, salt);
  await Admin.updateOne({ _id: account._id }, { password });

  return res.json(await sendTemporaryPassword(account.email, tempPassword));
};

module.exports.remove_team_member = async (req, res) => {
  const account = await regionalAccount(req.params.id);

  await Admin.deleteOne({ _id: account._id });

  return res.json({ message: "Team member removed successfully" });
};
