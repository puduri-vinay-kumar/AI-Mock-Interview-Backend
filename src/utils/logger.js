const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

module.exports = {
  info(message) {
    console.log(formatMessage("info", message));
  },
  warn(message) {
    console.warn(formatMessage("warn", message));
  },
  error(message) {
    console.error(formatMessage("error", message));
  },
};
