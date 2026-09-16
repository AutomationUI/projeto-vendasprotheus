import { Router } from "express";
import { validate } from "../middleware/validator.js";
import { approveQuoteSchema, rejectQuoteSchema, quoteIdParamSchema } from "../schemas/messaging.schema.js";
import { handleApprove, handleReject, handleGetStatus } from "../controllers/quotes.controller.js";
import { proxy } from "../lib/protheus-proxy.js";

export const quotesRouter = Router();

// ─── CRUD (proxy to Protheus) ────────────────────────────
const BASE = "/api/vendas/orcamentos/v1";

quotesRouter.get("/", proxy(BASE));
quotesRouter.post("/", proxy(BASE));
quotesRouter.get("/:id", proxy(`${BASE}/:id`));
quotesRouter.patch("/:id", proxy(`${BASE}/:id`, "PUT"));
quotesRouter.delete("/:id", proxy(`${BASE}/:id`));

// ─── Approval actions (public — no API key) ──────────────
quotesRouter.post("/:id/approve", validate(quoteIdParamSchema, "params"), validate(approveQuoteSchema), handleApprove);
quotesRouter.post("/:id/reject", validate(quoteIdParamSchema, "params"), validate(rejectQuoteSchema), handleReject);
quotesRouter.get("/:id/status", validate(quoteIdParamSchema, "params"), handleGetStatus);
