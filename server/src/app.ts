import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { apiKeyAuth } from "./middleware/api-key.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRouter } from "./routes/health.routes.js";
import { diagnosticsRouter } from "./routes/diagnostics.routes.js";
import { messagingRouter } from "./routes/messaging.routes.js";
import { quotesRouter } from "./routes/quotes.routes.js";
import { createProviderContext, type ProviderContext } from "./providers";
import { customersRouter } from "./routes/customers.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { productsRouter } from "./routes/products.routes.js";
import { productImagesRouter } from "./routes/product-images.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { omnichannelRouter } from "./routes/omnichannel.routes.js";
import { faturaRouter } from "./routes/fatura.routes.js";
import financialRouter from "./routes/financial.routes.js";
import governanceRouter from "./routes/governance.routes.js";
import commissionsRouter from "./routes/commissions.routes.js";
import { flowsRouter } from "./routes/flows.routes.js";
import { logger } from "./lib/logger.js";

export async function createApp(): Promise<express.Application> {
  const app = express();

  // ─── Security headers ─────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false,
      crossOriginResourcePolicy: false,
      crossOriginOpenerPolicy: false,
    })
  );

  // ─── Request ID ────────────────────────────────────────
  app.use(requestId);

  // ─── Request logging (API routes only) ────────────────
  app.use((req, res, next) => {
    // Only log API and health endpoints to keep dev server logs focused
    if (
      !req.originalUrl.startsWith("/api") &&
      !req.originalUrl.startsWith("/health")
    ) {
      return next();
    }
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      logger.info(
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          requestId: req.headers["x-request-id"],
        },
        "request completed"
      );
    });
    next();
  });

  // ─── CORS ─────────────────────────────────────────────
  app.use(
    cors({
      origin: env.corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Api-Key", "X-Request-Id", "X-Organization-Id"],
    })
  );

  // ─── Body parsers ─────────────────────────────────────
  app.use(express.json({ limit: "10mb" }));

  // ─── Rate limiting (API only) ─────────────────────────
  app.use("/api", rateLimiter);

  // ─── Health & Diagnostics (no auth required) ────────
  app.use("/api", healthRouter);
  app.use("/api/v1", healthRouter);
  app.use("/api", diagnosticsRouter);
  app.use("/api/v1", diagnosticsRouter);

  // ─── Auth routes (no API key required) ────────────────
  app.use("/api/v1/auth", authRouter);

  // ─── Public routes (quote approval — no API key) ──────
  app.use("/api/v1/quotes", quotesRouter);

  // ─── Protected routes (require API key) ───────────────
  // O provider context (organization_id) é injetado via middleware interno em cada router.
  // O apiKeyAuth permanece para validação de credenciais da API.
  app.use("/api/v1/customers", apiKeyAuth, customersRouter);
  app.use("/api/v1/products", apiKeyAuth, productsRouter);
  app.use("/api/v1/product-images", apiKeyAuth, productImagesRouter);
  app.use("/api/v1/orders", apiKeyAuth, ordersRouter);
  app.use("/api/v1/messaging", apiKeyAuth, messagingRouter);
  app.use("/api/v1/financial", apiKeyAuth, financialRouter);
  app.use("/api/v1/governance", apiKeyAuth, governanceRouter);
  app.use("/api/v1/commissions", apiKeyAuth, commissionsRouter);
  app.use("/api/v1/flows", apiKeyAuth, flowsRouter);

  // ─── Omnichannel Webhooks ─────────────────────────────
  app.use("/api/v1/omnichannel", omnichannelRouter);

  // ─── Fatura & Contas a Receber ───────────────────────
  app.use("/api/v1/fatura", faturaRouter);

  // ─── 404 for API routes ────────────────────────────────
  app.use("/api/*all", (_req, res) => {
    res.status(404).json({ success: false, error: "Rota não encontrada" });
  });

  // ─── Frontend SPA serving ──────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // ─── Global error handler ─────────────────────────────
  app.use(errorHandler);

  return app;
}
