const asyncHandler = require("../middleware/async.middleware");
const { successResponse } = require("../utils/responseHandler");
const {
  getActiveAIProvider,
  isAIProviderConfigured,
} = require("../services/ai/provider.service");

exports.getReadiness = asyncHandler(async (req, res) => {
  return successResponse(res, "System readiness fetched successfully", {
    environment: process.env.NODE_ENV || "development",
    databaseConfigured: Boolean(process.env.MONGO_URI),
    authConfigured: Boolean(process.env.JWT_SECRET),
    aiProvider: getActiveAIProvider(),
    aiConfigured: isAIProviderConfigured(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    socketsConfigured: Boolean(
      process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_URL
    ),
  });
});
