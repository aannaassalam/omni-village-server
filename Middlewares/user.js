const jwt = require("jsonwebtoken");
const User = require("../Models/user");
const { default: axios } = require("axios");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decodedToken) => {
      if (err) {
        console.log(err);
        res.status(401).json({ msg: "Invalid token!" });
      } else {
        const user = await User.findById(decodedToken.id);
        if (user) {
          next();
        } else {
          res.status(401).json({ msg: "Invalid token!" });
        }
      }
    });
  } else {
    res
      .status(401)
      .json({ msg: "Unauthorized access, please login or create an account!" });
  }
};

const checkUser = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.locals.user = null;
        next();
      } else {
        const user = await User.findById(decodedToken.id);
        // console.log(user);
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

const getCurrencies = async (req, res, next) => {
  const url =
    "https://openexchangerates.org/api/latest.json?app_id=44b8fd3eaf9d44b4aa72e6635ac8de54";
  try {
    const resp = await axios.get(url);
    res.locals.currencies = resp.data.rates;
  } catch (err) {
    console.log(err);
  }
  next();
};

// const checkMerchant = (req, res, next) => {
//   const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
//   if (token) {
//     // console.log(token);
//     jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, decodedToken) => {
//       if (err) {
//         console.log(err.message);
//         res.locals.merchant = null;
//         next();
//       } else {
//         // console.log("token");
//         const merchant = await Merchant.findById(decodedToken.id);
//         // console.log(decodedToken);
//         res.locals.merchant = merchant;
//         next();
//       }
//     });
//   } else {
//     res.locals.merchant = null;
//     next();
//   }
// };

module.exports = { verifyToken, checkUser, getCurrencies };
