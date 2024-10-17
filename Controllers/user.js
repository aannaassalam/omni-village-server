const User = require("../Models/user");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const sharp = require("sharp");
const fs = require("fs");
const moment = require("moment");
const {
    Types: { ObjectId },
} = require("mongoose");
const html_to_pdf = require("html-pdf-node");
var stream = require("stream");
const AppError = require("../AppError");
const Joi = require("joi");

const options = {
    format: "A4",
    displayHeaderFooter: true,
    margin: {
        top: "2cm",
        bottom: "2cm",
        left: "0.5cm",
        right: "0.5cm",
    },
    headerTemplate: "<div/>",
    footerTemplate: `<style>span{width:100% !important;font-size:12px !important;font-family: "Elephant"; !important; text-align:center}</style><span><label class="pageNumber"></label></span>`,
};

const accountSid = "AC4d37b2cba30b46a0262ca0f7429c5fd0";
const authToken = process.env.TWILIO_SECRET;
const client = require("twilio")(accountSid, authToken);

const otp_keeper = {
    "+911234567890": "0000",
    "+601234567890": "0000",
    "+9751234567890": "0000",
};

const tableRow = (array, level = 0) => {
    return [
        ...array.map((_item) => {
            const item = Object.entries(_item);
            return item
                .map((_data, index) => {
                    return Array.isArray(_data[1])
                        ? `
            <div class="row" style="border-bottom-color: #ccc !important">
              <h3>${_data[0].replaceAll("_", " ")}</h3>
            </div>
            ${tableRow(_data[1], 2)}`
                        : `<div
            class="row"
            style="${`
              border-bottom-color:
                ${index === item.length - 1 ? "#ccc !important" : "#eee"};
              padding-inline: ${10 * level}px`}"
          >
            <p>${_data[0].replaceAll("_", " ")}</p>
            <p>
              ${
                  _data[0] === "createdAt" ||
                  _data[0] === "updatedAt" ||
                  _data[0] === "month_planted" ||
                  _data[0] === "month_harvested"
                      ? moment(_data[1]).format("dddd, DD MMM YYYY hh:mm a")
                      : _data[1]?.toString()
              }
            </p>
          </div>`;
                })
                .join("");
        }),
    ].join("");
};

const convertJsonToHTML = (user) => {
    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
      <style>
      * {
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    }
    body {
      width: 80%;
      margin: auto;
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    }
    h1 {
      margin-bottom: 20px;
    }
      h2 {
        padding: 20px 10px;
      }
      h3 {
        padding: 12px 10px;
      }
      p {
        padding: 10px;
        word-break: break-all;
        /* border-bottom: 1px solid #eee; */
      }
      .row {
        display: flex;
        width: 100%;
        text-transform: capitalize;
        border-bottom-width: 1px;
        border-bottom-style: solid;
        border-bottom-color: #eee;
      }
      .row > * {
        width: 70%;
      }
      .row > *:first-child {
        width: 35% !important;
      }
      </style>
    </head>
    <body>
      <h1>User Details</h1>
      <div>
        ${Object.entries(user)
            .map((_data) => {
                return Array.isArray(_data[1])
                    ? `<div class="row" style="border-bottom-color: #ccc !important">
                ${
                    _data[0] === "members"
                        ? `<h3>${_data[0].replaceAll("_", " ")}</h3>`
                        : `<h2>${_data[0].replaceAll("_", " ")}</h2>`
                }
              </div>
              ${tableRow(_data[1])}`
                    : `<div class="row">
              <p>${_data[0].replaceAll("_", " ")}</p>
              <p>
                ${
                    _data[0] === "createdAt" ||
                    _data[0] === "updatedAt" ||
                    _data[0] === "month_planted" ||
                    _data[0] === "month_harvested"
                        ? moment(_data[1]).format("dddd, DD MMM YYYY hh:mm a")
                        : _data[1]?.toString()
                }
              </p>
            </div>`;
            })
            .join("")}
      </div>
    </body>
  </html>
  `;
};

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET_KEY);
};

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
                                crop: 0,
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
                                    $mergeObjects: [
                                        "$production_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: [
                                        "$important_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "fishery_crops",
                                foreignField: "_id",
                                localField: "fishery_crop_id",
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
                                crop: 0,
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
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: [
                                        "$personal_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "poultry_crops",
                                foreignField: "_id",
                                localField: "poultry_crop_id",
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
                                poultry_crop_name: 0,
                                poultry_crop_id: 0,
                                user_id: 0,
                                __v: 0,
                                crop: 0,
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
                                localField: "tree_crop_id",
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
                                crop: 0,
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
                    __v: 0,
                    sub_area: 0,
                    updatedAt: 0,
                },
            },
        ]);
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

module.exports.download_pdf = async (req, res) => {
    const { user_id } = req.query;
    try {
        const users = await User.aggregate([
            {
                $match: {
                    _id: new ObjectId(user_id),
                },
            },
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
                                crop: 0,
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
                                    $mergeObjects: [
                                        "$production_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: [
                                        "$important_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "fishery_crops",
                                foreignField: "_id",
                                localField: "fishery_crop_id",
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
                                crop: 0,
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
                            $replaceRoot: {
                                newRoot: {
                                    $mergeObjects: [
                                        "$personal_information",
                                        "$$ROOT",
                                    ],
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "poultry_crops",
                                foreignField: "_id",
                                localField: "poultry_crop_id",
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
                                poultry_crop_name: 0,
                                poultry_crop_id: 0,
                                user_id: 0,
                                __v: 0,
                                crop: 0,
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
                                localField: "tree_crop_id",
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
                                crop: 0,
                                __v: 0,
                            },
                        },
                    ],
                },
            },
            {
                $project: {
                    _id: 0,
                    __v: 0,
                    sub_area: 0,
                    updatedAt: 0,
                },
            },
        ]);

        const pdfBuffer = await html_to_pdf.generatePdf(
            { content: convertJsonToHTML(users[0]) },
            options
        );
        // .then((pdfBuffer) => {
        // var fileContents = Buffer.from(fileData, "base64");

        var readStream = new stream.PassThrough();
        readStream.end(pdfBuffer);

        res.set(
            "Content-disposition",
            "attachment; filename=" +
                `${users[0].first_name} ${users[0].last_name}.pdf`
        );
        res.set("Content-Type", "application/pdf");

        readStream.pipe(res);
        // res.download(`${users[0].first_name} ${users[0].last_name}.pdf`, pdfBuffer);
        // });
        return;
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error!" });
    }
};

module.exports.generate_token = async (req, res) => {
    const { phone, country_code } = req.body;
    const user = await User.findOne({ phone, country_code });
    if (user) {
        res.cookie("token", createToken(user._id), { httpOnly: true });
        res.send("Token generated successfully");
    } else {
        return new AppError(0, "User not found!", 400);
    }
};

module.exports.send_otp = async (req, res) => {
    const { country_code, phone, type = "login" } = req.body;
    const user = await User.findOne({
        phone: phone,
        country_code,
    });

    if (user?._id && type === "register") {
        res.status(400).json({ message: "User already exists, Please Login!" });
    } else if (!user && type === "login") {
        res.status(400).json({
            message: "User doesn't exists, Please Register!",
        });
    } else {
        if (`${phone}` !== "1234567890") {
            otp_keeper[`${country_code}${phone}`] = otpGenerator.generate(4, {
                upperCaseAlphabets: false,
                specialChars: false,
                lowerCaseAlphabets: false,
                digits: true,
            });
        }

        client.messages
            .create({
                body: `Your login OTP for Omni Village - ${
                    otp_keeper[`${country_code}${phone}`]
                }`,
                messagingServiceSid: "MGd4add4653516dbb9e97b4bdc350f9367",
                to: `${country_code}${phone}`,
                // statusCallback: "https://omnivillage.azurewebsites.net/api/webhook/",
            })
            .then((message) => res.send(message))
            .catch((err) => {
                if (err.code === 21211)
                    return new AppError(
                        0,
                        "Please enter a valid phone number!",
                        400
                    );
                console.log(err, "message");
            });
    }
};

module.exports.register = async (req, res) => {
    const { country_code, phone, currency, country, otp } = req.body;
    if (otp.toString().trim() === otp_keeper[`${country_code}${phone}`]) {
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
            field_officer_document: "-",
            land_measurement: "-",
            land_measurement_symbol: "-",
            currency,
            country,
            street_address: "-",
        });
        res.cookie("token", createToken(user._id), { httpOnly: true });
        return res.json({ msg: "User registered successfully" });
    } else {
        return new AppError(0, "Incorrect OTP", 400);
    }
};

module.exports.login = async (req, res) => {
    const { country_code, phone, otp } = req.body;
    if (otp.trim() === otp_keeper[`${country_code}${phone}`]) {
        if (`${phone}` !== "1234567890") {
            delete otp_keeper[`${country_code}${phone}`];
        }
        const user = await User.findOne({
            phone,
            country_code,
        });
        if (user._id) {
            res.cookie("token", createToken(user._id), { httpOnly: true });
            return res.json({ msg: "User logged in successfully" });
        } else {
            return new AppError(0, "User doesn't exists!", 400);
        }
    } else {
        return new AppError(0, "Incorrect OTP", 401);
    }
};

module.exports.get_current_user = (req, res) => {
    const { user } = res.locals;
    res.json(user);
};

module.exports.edit_user = async (req, res) => {
    const { user } = res.locals;

    const schema = Joi.object({
        first_name: Joi.string().trim().required(),
        last_name: Joi.string().trim().required(),
        village_name: Joi.string().trim().required(),
        social_security_number: Joi.string().trim().required(),
        address: Joi.string().trim().required(),
        members: Joi.array().items(
            Joi.object({
                name: Joi.string().trim().required(),
                age: Joi.number().required(),
                gender: Joi.string().trim().required(),
            })
        ),
        number_of_members: Joi.number().required().min(1),
        land_measurement_unit: Joi.string().trim().required(),
        land_measurement_unit_symbol: Joi.string().trim().required(),
        document_type: Joi.string().trim().required(),
        street_address: Joi.string().trim().required(),
        village_governing_body: Joi.boolean().required(),
    }).options({ stripUnknown: true });
    const address_proof = req.files.address_proof[0];
    const field_officer_document = req.files.field_officer_document[0];

    const { error, value } = schema.validate(req.body);
    if (error) throw error;

    const updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
            ...user._doc,
            ...value,
            address_proof: address_proof.path,
            field_officer_document: field_officer_document.path,
        },
        { runValidators: true, new: true }
    );
    return res.json({ msg: "User updated successfully!", ...updatedUser._doc });
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
        const updated_doc = await User.findByIdAndUpdate(
            user._id,
            {
                total_land,
                sub_area: {
                    cultivation,
                    trees,
                    poultry,
                    fishery,
                    storage,
                },
            },
            { runValidators: true, new: true }
        );
        return res.json(updated_doc);
    } else {
        return new AppError(
            0,
            "Sub area cannot be greater than total land!",
            400
        );
    }
};
