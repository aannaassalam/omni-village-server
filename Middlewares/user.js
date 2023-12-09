const jwt = require("jsonwebtoken");
const User = require("../Models/user");

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

module.exports = { verifyToken, checkUser };
