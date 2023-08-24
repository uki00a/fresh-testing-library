import type { MiddlewareHandler } from "$fresh/server.ts";

interface Logger {
  info(...args: Array<unknown>): void;
}

export function createLoggerMiddleware(logger: Logger): MiddlewareHandler {
  return async (req, ctx) => {
    // Output logs in [koa-logger](https://github.com/koajs/logger) like format
    logger.info(`<-- ${req.method} ${new URL(req.url).pathname}`);
    const res = await ctx.next();
    logger.info(`--> ${req.method} ${new URL(req.url).pathname} ${res.status}`);
    return res;
  };
}
