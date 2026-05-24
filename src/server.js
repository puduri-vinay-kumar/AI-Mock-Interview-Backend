const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const app = require("./app");
const connectDB = require("./config/db");
const validateEnv = require("./config/env");
const { initializeInterviewSocket } = require("./sockets/interview.socket");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();
    const server = http.createServer(app);

    initializeInterviewSocket(server);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
