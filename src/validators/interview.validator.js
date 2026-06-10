const { body, param } = require("express-validator");

const createInterviewValidator = [
  body("role").trim().notEmpty().withMessage("Role is required"),
  body("experienceLevel")
    .isIn(["fresher", "junior", "mid", "senior"])
    .withMessage("Experience level is invalid"),
  body("interviewType")
    .isIn(["technical", "hr", "behavioral", "coding", "mixed"])
    .withMessage("Interview type is invalid"),
  body("questionCount")
    .isInt({ min: 1, max: 20 })
    .withMessage("Question count must be between 1 and 20"),
  body("duration")
    .optional()
    .isInt({ min: 5, max: 180 })
    .withMessage("Duration must be between 5 and 180 minutes"),
  body("resumeId").optional().isMongoId().withMessage("Resume id must be valid"),
  body("previousScore")
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage("Previous score must be between 0 and 100"),
];

const updateInterviewStatusValidator = [
  param("id").isMongoId().withMessage("Valid interview id is required"),
  body("status")
    .optional()
    .isIn(["scheduled", "in-progress", "completed", "cancelled"])
    .withMessage("Interview status is invalid"),
  body("answers")
    .optional()
    .isArray()
    .withMessage("Answers must be an array"),
  body("answers.*.questionId")
    .optional()
    .isString()
    .withMessage("Answer question id must be a string"),
  body("answers.*.question")
    .optional()
    .isString()
    .withMessage("Answer question must be a string"),
  body("answers.*.answer")
    .optional()
    .isString()
    .withMessage("Answer text must be a string"),
  body("liveTranscript")
    .optional()
    .isArray()
    .withMessage("Live transcript must be an array"),
  body("liveTranscript.*.speaker")
    .optional()
    .isIn(["ai", "user", "system"])
    .withMessage("Transcript speaker is invalid"),
  body("liveTranscript.*.text")
    .optional()
    .isString()
    .withMessage("Transcript text must be a string"),
];

const submitInterviewAnswerValidator = [
  param("id").isMongoId().withMessage("Valid interview id is required"),
  body("answer").trim().notEmpty().withMessage("Answer is required"),
  body("transcript")
    .optional()
    .isString()
    .withMessage("Transcript must be a string"),
  body("durationSeconds")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Duration seconds must be a positive number"),
];

const appendTranscriptValidator = [
  param("id").isMongoId().withMessage("Valid interview id is required"),
  body("entries").isArray({ min: 1 }).withMessage("Entries array is required"),
  body("entries.*.speaker")
    .isIn(["ai", "user", "system"])
    .withMessage("Transcript speaker is invalid"),
  body("entries.*.text")
    .isString()
    .withMessage("Transcript text must be a string"),
];

module.exports = {
  createInterviewValidator,
  updateInterviewStatusValidator,
  submitInterviewAnswerValidator,
  appendTranscriptValidator,
};
