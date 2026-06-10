const { body, param } = require("express-validator");

const submitInterviewVoiceAnswerValidator = [
  param("id").isMongoId().withMessage("Valid interview id is required"),
  body("durationSeconds")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Duration seconds must be a positive number"),
];

module.exports = {
  submitInterviewVoiceAnswerValidator,
};
