import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { setupSystemStatusWebSocket } from "./websocket/system-status.ws.js";
import type { Server } from "node:http";

let server: Server | null = null;

async function main(): Promise<void> {
  const app = await createApp();

  server = app.listen(env.port, "0.0.0.0", () => {
    logger.info(
      {
        port: env.port,
        env: env.nodeEnv,
        cors: env.corsOrigin,
        protheus: env.protheus.baseUrl,
        smtp: env.smtp.host || "not configured",
        whatsapp: env.whatsapp.phoneNumberId ? "configured" : "not configured",
        eventHub: env.eventHub.url,
      },
      "Backend Event Producer Server started"
    );
  });

  if (server) {
    setupSystemStatusWebSocket(server);
  }

  server.on("error", (err) => {
    logger.fatal({ err }, "Server error");
    process.exit(1);
  });
}

function gracefulShutdown(signal: string): void {
  logger.info({ signal }, "Shutdown signal received");

  if (server) {
    server.close(() => {
      logger.info("Shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.warn("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Unhandled rejection");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

main().catch((err) => {
  logger.fatal({ err }, "Failed to start server");
  process.exit(1);
});
