const express = require("express");
const interviewController = require("../controllers/interview.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createInterviewValidator,
  updateInterviewStatusValidator,
  submitInterviewAnswerValidator,
  appendTranscriptValidator,
} = require("../validators/interview.validator");

const router = express.Router();

router.use(protect);

router.post("/create", createInterviewValidator, validate, interviewController.createInterview);
router.get("/history", interviewController.getInterviewHistory);
router.post(
  "/:id/answer",
  submitInterviewAnswerValidator,
  validate,
  interviewController.submitInterviewAnswer
);
router.post(
  "/:id/transcript",
  appendTranscriptValidator,
  validate,
  interviewController.appendInterviewTranscript
);
router.post("/:id/complete", interviewController.completeInterview);
router.get("/:id", interviewController.getInterviewById);
router.put(
  "/:id/status",
  updateInterviewStatusValidator,
  validate,
  interviewController.updateInterviewStatus
);

module.exports = router;
