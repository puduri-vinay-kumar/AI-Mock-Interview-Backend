const rateLimit = require("express-rate-limit");

const buildLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
      },
    },
  });

const apiLimiter = buildLimiter(
  15 * 60 * 1000,
  300,
  "Too many requests from this client. Please try again shortly."
);

const authLimiter = buildLimiter(
  15 * 60 * 1000,
  30,
  "Too many authentication attempts. Please try again later."
);

const uploadLimiter = buildLimiter(
  15 * 60 * 1000,
  20,
  "Too many upload attempts. Please wait before uploading again."
);

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
};
