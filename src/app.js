const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const interviewRoutes = require("./routes/interview.routes");
const reportRoutes = require("./routes/report.routes");
const uploadRoutes = require("./routes/upload.routes");
const voiceRoutes = require("./routes/voice.routes");
const codingRoutes = require("./routes/coding.routes");
const systemRoutes = require("./routes/system.routes");
const { swaggerUi, swaggerSpec } = require("./docs/swagger");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const {
  apiLimiter,
  authLimiter,
  uploadLimiter,
} = require("./middleware/rateLimit.middleware");
const { successResponse } = require("./utils/responseHandler");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(apiLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", (req, res) => {
  return successResponse(res, "Backend service is running", {
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/docs.json", (req, res) => {
  return res.status(200).json(swaggerSpec);
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/voice", uploadLimiter, voiceRoutes);
app.use("/api/coding", codingRoutes);
app.use("/api/system", systemRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
