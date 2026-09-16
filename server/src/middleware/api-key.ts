import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"] as string | undefined;

  if (!key || key !== env.apiKey) {
    const requestId = req.headers["x-request-id"] as string;
    logger.warn({ requestId, ip: req.ip, path: req.path }, "Unauthorized: invalid or missing API key");

    res.status(401).json({
      success: false,
      error: "Unauthorized: API key inválida ou ausente",
      requestId,
    });
    return;
  }

  next();
}
