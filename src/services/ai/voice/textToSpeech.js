const { generateSpeechFile, isAIProviderConfigured } = require("../provider.service");

const generateSpeech = async (text, options = {}) => {
  if (isAIProviderConfigured()) {
    const result = await generateSpeechFile({
      text,
      voice: options.voice,
      instructions: options.instructions,
    });

    if (result) {
      return result.audioUrl;
    }
  }

  return `mock://speech/${Buffer.from(text).toString("base64").slice(0, 32)}`;
};

module.exports = {
  generateSpeech,
};
