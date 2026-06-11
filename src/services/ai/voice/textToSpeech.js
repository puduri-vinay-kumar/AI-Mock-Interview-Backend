const { generateSpeechFile, isAIProviderConfigured } = require("../provider.service");
const logger = require("../../../utils/logger");

const generateSpeech = async (text, options = {}) => {
  if (isAIProviderConfigured()) {
    try {
      const result = await generateSpeechFile({
        text,
        voice: options.voice,
        instructions: options.instructions,
      });

      if (result?.audioUrl) {
        return {
          audioUrl: result.audioUrl,
          relativeAudioUrl: result.relativeAudioUrl || null,
          voiceAvailable: true,
          speechText: text,
          fallbackMode: "server-audio",
          provider: result.provider || "unknown",
        };
      }
    } catch (error) {
      logger.warn(`Text-to-speech fallback engaged: ${error.message}`);
    }
  }

  return {
    audioUrl: null,
    relativeAudioUrl: null,
    voiceAvailable: false,
    speechText: text,
    fallbackMode: "browser-tts",
    provider: "fallback",
  };
};

module.exports = {
  generateSpeech,
};
