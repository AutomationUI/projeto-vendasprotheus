import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.headers["x-request-id"] as string;

  logger.error(
    {
      err,
      requestId,
      method: req.method,
      path: req.path,
    },
    "Unhandled error"
  );

  const statusCode = (err as Error & { statusCode?: number }).statusCode || 500;
  const message = env.isProd ? "Erro interno do servidor" : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId,
  });
}
