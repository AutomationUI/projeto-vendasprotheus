import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.isDev ? "debug" : "info",
  transport: env.isDev
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
    : undefined,
  base: { service: "vendasprotheus-server" },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.headers?.["x-request-id"],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export type Logger = typeof logger;
