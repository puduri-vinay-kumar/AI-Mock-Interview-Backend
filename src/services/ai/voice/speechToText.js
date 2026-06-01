const { transcribeAudioFile, isAIProviderConfigured } = require("../provider.service");
const logger = require("../../../utils/logger");

const transcribeAudio = async (audioFile) => {
  if (isAIProviderConfigured()) {
    try {
      const result = await transcribeAudioFile({
        filePath: audioFile.filePath,
        prompt: audioFile.prompt,
        mimeType: audioFile.mimeType,
      });

      if (result) {
        return result;
      }
    } catch (error) {
      logger.warn(`Speech-to-text fallback engaged: ${error.message}`);
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
