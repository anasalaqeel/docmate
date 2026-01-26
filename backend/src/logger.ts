import { createLogger, transports, format } from "winston";

const customFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.printf((info) => {
    const { level, message, timestamp, stack } = info;
    if (level === "error") {
      return `${timestamp} - [${level
        .toUpperCase()
        .padEnd(7)}] - ${message} \nStack trace: \n${stack}`;
    } else {
      return `${timestamp} - [${level.toUpperCase().padEnd(7)}] - ${message}`;
    }
  })
);

const logger = createLogger({
  level: "info",
  format: customFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/backendLogs.log", level: "error" }),
  ],
});

export default logger;
