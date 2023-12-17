module.exports.landMeaurementConverter = (value, unit) => {
  switch (unit.toLowerCase()) {
    case "square meter":
      return value / 1000000;
    case "square kilometer":
      return value;
    case "hectare":
      return value / 100;
    case "acre":
      return value / 247.105;
    case "square feet":
      return value / 10763910.42;
    case "square mile":
      return value / 0.386102;
    case "guntha":
      return value / 9884.215;
    case "square link":
      return value / 24710439.364956;
    case "bigha":
      return value / 395.3686105;
    case "square rod":
      return value / 39536.861035;
    case "acre-foot":
    // return value / 0.010725;
    case "township":
      return value / 0.010725;
    case "hectometer":
      return value / 100;
    case "dunam":
      return value / 1000;
    case "rood":
      return value / 988.42152587;
    case "perch":
      return value / 39536.861035;
    case "square chain":
      return value / 2471.05;
    case "hectare meter":
      return value / 100;
    case "section":
      return value / 0.386102;
    case "square yard":
      return value / 1195989.93;
    case "rai":
      return value / 625;
    case "square inch":
      return value / 1550000000;
    case "relong":
      return;
    case "point":
      return value / 8035000000000;
    case "jemba":
      return;
    default:
      return value;
  }
};
