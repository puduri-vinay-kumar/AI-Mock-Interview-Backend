const { transcribeAudioFile, isAIProviderConfigured } = require("../provider.service");

const transcribeAudio = async (audioFile) => {
  if (isAIProviderConfigured()) {
    const result = await transcribeAudioFile({
      filePath: audioFile.filePath,
      prompt: audioFile.prompt,
      mimeType: audioFile.mimeType,
    });

    if (result) {
      return result;
    }
  }

  return {
    transcript: "Mock transcript generated because OpenAI audio transcription is not configured.",
    confidence: 0.61,
    provider: "mock",
  };
};

module.exports = {
  transcribeAudio,
};
