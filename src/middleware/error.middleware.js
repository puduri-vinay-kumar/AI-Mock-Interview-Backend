const multer = require("multer");
const { errorResponse } = require("../utils/responseHandler");

exports.notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

exports.errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error";
  let details = error.details || {};

  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(error.errors).map((item) => item.message);
  }

  if (error.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource identifier";
  }

  if (error.code === 11000) {
    statusCode = 409;
    message = "Duplicate resource detected";
    details = error.keyValue;
  }

  if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired token";
  }

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.message;
  }

  if (error.name === "OpenAIError" || error.service === "openai") {
    statusCode = error.statusCode || 502;
    message = error.message || "OpenAI service request failed";
    details = error.details || {};
  }

  if (error.name === "GeminiError" || error.service === "gemini") {
    statusCode = error.statusCode || 503;
    message = error.message || "Gemini service request failed";
    details = error.details || {};
  }

  return errorResponse(res, message, details, statusCode);
};
