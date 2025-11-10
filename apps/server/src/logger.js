const path = require("path");
const { createLogger, format, transports } = require("winston");

function buildLogger(config = {}) {
  const fileTransport = new transports.File({
    filename: path.join(config.logDir, "waan-server.log"),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 5,
  });

  return createLogger({
    level: process.env.WAAN_LOG_LEVEL || "info",
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.json()
    ),
    transports: [
      fileTransport,
      new transports.Console({
        level: process.env.WAAN_CONSOLE_LEVEL || "info",
        format: format.combine(
          format.colorize(),
          format.timestamp(),
          format.printf(info => {
            return `${info.timestamp} [${info.level}] ${info.message}${
              info.stack ? `\n${info.stack}` : ""
            }`;
          })
        ),
      }),
    ],
  });
}

module.exports = {
  buildLogger,
};
