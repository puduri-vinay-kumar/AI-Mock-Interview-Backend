const createVoiceSessionState = () => ({
  aiSpeaking: false,
  userSpeaking: false,
  silenceCounter: 0,
  transcriptBuffer: [],
  lastTranscriptAt: null,
});

const markAISpeaking = (state, active) => ({
  ...state,
  aiSpeaking: active,
});

const markUserSpeaking = (state, active) => ({
  ...state,
  userSpeaking: active,
  silenceCounter: active ? 0 : state.silenceCounter + 1,
});

const appendTranscriptChunk = (state, chunk) => ({
  ...state,
  transcriptBuffer: [...state.transcriptBuffer, chunk],
  lastTranscriptAt: new Date(),
});

const detectSilence = (state) => state.silenceCounter >= 3;

module.exports = {
  createVoiceSessionState,
  markAISpeaking,
  markUserSpeaking,
  appendTranscriptChunk,
  detectSilence,
};
