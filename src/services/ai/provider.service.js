const openAI = require("./openai.service");
const gemini = require("./gemini.service");

const getActiveAIProvider = () => {
  const preferred = String(process.env.AI_PROVIDER || "").toLowerCase();

  if (preferred === "gemini" && gemini.isGeminiConfigured()) {
    return "gemini";
  }

  if (preferred === "openai" && openAI.isOpenAIConfigured()) {
    return "openai";
  }

  if (gemini.isGeminiConfigured()) {
    return "gemini";
  }

  if (openAI.isOpenAIConfigured()) {
    return "openai";
  }

  return "fallback";
};

const getProviderModule = () => {
  const provider = getActiveAIProvider();
  if (provider === "gemini") {
    return gemini;
  }
  if (provider === "openai") {
    return openAI;
  }
  return null;
};

const isAIProviderConfigured = () => getActiveAIProvider() !== "fallback";

const createStructuredResponse = async (params) => {
  const providerModule = getProviderModule();
  if (!providerModule) {
    return null;
  }
  return providerModule.createStructuredResponse(params);
};

const createTextResponse = async (params) => {
  const providerModule = getProviderModule();
  if (!providerModule) {
    return null;
  }
  return providerModule.createTextResponse(params);
};

const transcribeAudioFile = async (params) => {
  const providerModule = getProviderModule();
  if (!providerModule) {
    return null;
  }
  return providerModule.transcribeAudioFile(params);
};

const generateSpeechFile = async (params) => {
  const providerModule = getProviderModule();
  if (!providerModule) {
    return null;
  }
  return providerModule.generateSpeechFile(params);
};

module.exports = {
  getActiveAIProvider,
  isAIProviderConfigured,
  createStructuredResponse,
  createTextResponse,
  transcribeAudioFile,
  generateSpeechFile,
};
