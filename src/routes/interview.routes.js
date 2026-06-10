const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const interviewController = require("../controllers/interview.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  createInterviewValidator,
  updateInterviewStatusValidator,
  submitInterviewAnswerValidator,
  appendTranscriptValidator,
} = require("../validators/interview.validator");
const {
  submitInterviewVoiceAnswerValidator,
} = require("../validators/interviewVoice.validator");

const router = express.Router();

const audioDir = path.join(process.cwd(), "uploads", "audio");
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`),
});

const voiceUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "audio/mpeg",
      "audio/mp4",
      "audio/wav",
      "audio/webm",
      "audio/x-m4a",
      "video/mp4",
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Unsupported audio format for interview answer"));
    }

    return cb(null, true);
  },
});

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
  "/:id/answer-voice",
  voiceUpload.single("audio"),
  submitInterviewVoiceAnswerValidator,
  validate,
  interviewController.submitInterviewVoiceAnswer
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
