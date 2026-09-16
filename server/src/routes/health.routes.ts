import { Router } from "express";
import type { Request, Response } from "express";
import { verifySmtpConnection } from "../services/email.service.js";
import { isWhatsAppConfigured } from "../services/whatsapp.service.js";
import { isProtheusReachable } from "../lib/protheus-client.js";
import type { HealthCheckResponse } from "../types/index.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const healthRouter = Router();

let serverVersion = "2.0.0";
try {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../package.json"), "utf-8"));
  serverVersion = pkg.version;
} catch {
  // fallback to hardcoded
}

const startTime = Date.now();

healthRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: serverVersion,
  });
});

healthRouter.get("/ready", async (_req: Request, res: Response) => {
  const [protheusOk, smtpOk] = await Promise.all([
    isProtheusReachable(),
    verifySmtpConnection(),
  ]);
  const whatsappOk = isWhatsAppConfigured();

  const allOk = protheusOk && smtpOk;

  const response: HealthCheckResponse = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    version: serverVersion,
    checks: {
      protheus: protheusOk,
      smtp: smtpOk,
      whatsapp: whatsappOk,
    },
  };

  res.status(protheusOk ? 200 : 503).json(response);
});
