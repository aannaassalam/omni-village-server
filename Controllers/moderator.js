const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const Moderator = require("../Models/moderator");

const accountSid = "AC4d37b2cba30b46a0262ca0f7429c5fd0";
const authToken = process.env.TWILIO_SECRET;
const client = require("twilio")(accountSid, authToken);

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

module.exports.send_otp = async (req, res) => {
    try {
        // console.log(authToken);
        const { country_code, phone, type = "login" } = req.body;
        const user = await Moderator.findOne({
            phone: phone,
            country_code,
        });
        if (user?._id && type === "register") {
            res.status(400).json({
                message: "User already exists, Please Login!",
            });
        } else if (!user && type === "login") {
            res.status(400).json({
                message: "User doesn't exists, Please Register!",
            });
        } else {
            if (`${phone}` !== "1234567890") {
                otp_keeper[`${country_code}${phone}`] = otpGenerator.generate(
                    4,
                    {
                        upperCaseAlphabets: false,
                        specialChars: false,
                        lowerCaseAlphabets: false,
                        digits: true,
                    }
                );
            }

            // res.send(otp_keeper[`${phone}`]);

            client.messages
                .create({
                    body: `Your login OTP for Omni Village - ${
                        otp_keeper[`${country_code}${phone}`]
                    }`,
                    messagingServiceSid: "MGd4add4653516dbb9e97b4bdc350f9367",
                    to: `${country_code}${phone}`,
                    statusCallback:
                        "https://omnivillage.azurewebsites.net/api/webhook/",
                })
                .then((message) => res.send(message))
                .catch((err) => {
                    if (err.code === 21211)
                        res.status(400).json({
                            message: "Please enter a valid phone number!",
                        });
                    console.log(err, "message");
                });
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
            const user = await Moderator.create({
                first_name: "-",
                last_name: "-",
                village_name: "-",
                phone,
                country_code,
                address: "-",
                address_proof: "-",
                officer_proof: "-",
                currency,
                country,
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
            const user = await Moderator.findOne({
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

module.exports.edit_user = async (req, res) => {
    const { user } = res.locals;
    const {
        first_name = "",
        last_name = "",
        village_name = "",
        address = "",
    } = req.body;

    const address_proof = req.files?.address_proof?.[0];
    const officer_proof = req.files?.officer_proof?.[0];

    try {
        const updatedUser = await Moderator.findByIdAndUpdate(
            user._id,
            {
                first_name: first_name?.trim().length
                    ? first_name.trim()
                    : user.first_name,
                last_name: last_name?.trim().length
                    ? last_name.trim()
                    : user.last_name,
                village_name: village_name?.trim().length
                    ? village_name.trim()
                    : user.village_name,
                address: address?.trim().length ? address.trim() : user.address,
                address_proof: address_proof
                    ? address_proof?.path
                    : user.address_proof,
                officer_proof: officer_proof
                    ? officer_proof?.path
                    : user.officer_proof,
            },
            { runValidators: true, new: true }
        );
        res.json({ msg: "User updated successfully!" });
    } catch (err) {
        console.log(err);
        // !req.body.edit && fs.unlinkSync("./" + req.file.path);
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
        const deleted_user = await Moderator.findByIdAndDelete(user._id, {
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
