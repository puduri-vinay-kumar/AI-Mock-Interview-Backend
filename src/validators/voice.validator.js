const { body } = require("express-validator");

const transcribeAudioValidator = [
  body("prompt")
    .optional()
    .isString()
    .withMessage("Prompt must be a string"),
];

const textToSpeechValidator = [
  body("text").trim().notEmpty().withMessage("Text is required"),
  body("voice").optional().isString().withMessage("Voice must be a string"),
  body("instructions")
    .optional()
    .isString()
    .withMessage("Instructions must be a string"),
];

module.exports = {
  transcribeAudioValidator,
  textToSpeechValidator,
};
