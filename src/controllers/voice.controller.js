const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const { transcribeAudio } = require("../services/ai/voice/speechToText");
const { generateSpeech } = require("../services/ai/voice/textToSpeech");
const {
  createVoiceSessionState,
  markAISpeaking,
  markUserSpeaking,
  appendTranscriptChunk,
  detectSilence,
} = require("../services/ai/voice/voiceSessionManager");

exports.transcribeInterviewAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error("Audio file is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await transcribeAudio({
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    prompt:
      req.body.prompt ||
      "This is a mock interview transcript with technical and behavioral discussion.",
  });

  return successResponse(res, "Audio transcribed successfully", result, 201);
});

exports.generateInterviewSpeech = asyncHandler(async (req, res) => {
  const { text, voice, instructions } = req.body;
  const audioUrl = await generateSpeech(text, { voice, instructions });

  return successResponse(res, "Speech generated successfully", {
    audioUrl,
  });
});

exports.simulateVoiceSessionState = asyncHandler(async (req, res) => {
  const { transcriptChunk, aiSpeaking, userSpeaking } = req.body;

  let state = createVoiceSessionState();
  state = markAISpeaking(state, Boolean(aiSpeaking));
  state = markUserSpeaking(state, Boolean(userSpeaking));

  if (transcriptChunk) {
    state = appendTranscriptChunk(state, {
      speaker: userSpeaking ? "user" : "ai",
      text: transcriptChunk,
      timestamp: new Date(),
    });
  }

  return successResponse(res, "Voice session state simulated successfully", {
    state,
    silenceDetected: detectSilence(state),
  });
});
