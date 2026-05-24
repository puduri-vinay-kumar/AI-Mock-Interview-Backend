const { body } = require("express-validator");

const evaluateCodeValidator = [
  body("language")
    .isIn(["javascript", "python", "cpp", "java"])
    .withMessage("Supported languages are javascript, python, cpp, java"),
  body("code").trim().notEmpty().withMessage("Code is required"),
  body("testCases").optional().isArray().withMessage("Test cases must be an array"),
];

const evaluateVerilogValidator = [
  body("code").trim().notEmpty().withMessage("Verilog code is required"),
  body("moduleName")
    .optional()
    .isString()
    .withMessage("Module name must be a string"),
];

module.exports = {
  evaluateCodeValidator,
  evaluateVerilogValidator,
};
