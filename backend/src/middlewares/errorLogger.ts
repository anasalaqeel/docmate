import type { Context, Next } from "hono";
import logger from "../logger";

const errorLogger = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error: ${err.message}\nLocation: ${err.stack?.split("\n")[1].trim()}`);
      logger.error(err.message, { stack: err.stack });
    }
    throw err;
  }
};

export default errorLogger;
