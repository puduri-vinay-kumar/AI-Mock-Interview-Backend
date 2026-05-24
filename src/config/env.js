const logger = require("../utils/logger");

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
const optionalEnvVars = [
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "GEMINI_TTS_MODEL",
  "OPENAI_API_KEY",
  "CLIENT_URL",
  "SOCKET_CORS_ORIGIN",
  "OPENAI_MODEL",
  "OPENAI_TRANSCRIPTION_MODEL",
  "OPENAI_TTS_MODEL",
];

const validateEnv = () => {
  const missingRequired = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingRequired.length) {
    throw new Error(
      `Missing required environment variables: ${missingRequired.join(", ")}`
    );
  }

  const missingOptional = optionalEnvVars.filter((key) => !process.env[key]);
  if (missingOptional.length) {
    logger.warn(
      `Optional environment variables not configured: ${missingOptional.join(
        ", "
      )}`
    );
  }

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    logger.warn(
      "No AI provider API key is set. AI features will use fallback/mock behavior."
    );
  }
};

module.exports = validateEnv;
