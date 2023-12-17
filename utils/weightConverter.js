module.exports.weightConverter = (value, unit) => {
  switch (unit.toLowerCase()) {
    case "tonne":
      return value / 0.001;
    case "kilogram":
      return value;
    case "gram":
      return value / 1000;
    case "milligram":
      return value / 1000000;
    case "stone":
      return value / 0.157473;
    case "pound":
      return value / 2.20462;
    case "ounce":
      return value / 35.2739199982575;
    default:
      return value;
  }
};
