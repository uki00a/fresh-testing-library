import { createLoggerMiddleware } from "./(_middlewares)/logger.ts";

export const handler = createLoggerMiddleware(console);
