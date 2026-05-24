const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const voiceController = require("../controllers/voice.controller");
const { protect } = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  transcribeAudioValidator,
  textToSpeechValidator,
} = require("../validators/voice.validator");

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

const upload = multer({
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
      return cb(new Error("Unsupported audio format for transcription"));
    }

    return cb(null, true);
  },
});

router.use(protect);

router.post(
  "/transcribe",
  upload.single("audio"),
  transcribeAudioValidator,
  validate,
  voiceController.transcribeInterviewAudio
);
router.post("/speak", textToSpeechValidator, validate, voiceController.generateInterviewSpeech);
router.post("/session", voiceController.simulateVoiceSessionState);

module.exports = router;
