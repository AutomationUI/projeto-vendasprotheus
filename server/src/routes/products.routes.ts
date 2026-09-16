import { Router } from "express";
import { proxy } from "../lib/protheus-proxy.js";

export const productsRouter = Router();

// ─── Protheus endpoint mapping ───────────────────────────
// Ajuste os paths abaixo para os endpoints reais do seu Protheus.
const BASE = "/api/vendas/produtos/v1";

productsRouter.get("/", proxy(BASE));
productsRouter.get("/:id", proxy(`${BASE}/:id`));
productsRouter.post("/", proxy(BASE));
productsRouter.patch("/:id", proxy(`${BASE}/:id`, "PUT"));
productsRouter.delete("/:id", proxy(`${BASE}/:id`));
