import { Router } from "express";
import { createProviderContext } from "../providers";
import type { Request, Response } from "express";

// ─── Configuração do Provider por organização ───────────────────────────────
// Em um sistema completo, a organização viria do JWT / contexto de autenticação.
// Para esta refatoração, recebemos o organizationId via header ou query param.

export const ordersRouter = Router();

// Middleware para injetar o contexto do provider baseado na organização.
// Em produção, o organizationId viria do token JWT do usuário autenticado.
// Aqui usamos um header temporário: X-Organization-Id.
ordersRouter.use((req: Request, res: Response, next): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({
      success: false,
      error: "Parâmetro obrigatório ausente: X-Organization-Id",
    });
    return;
  }

  // Criar o contexto de providers para esta organização
  // Modo "supabase" = Hub nativo via Supabase + organization_id RLS
  try {
    ;(req as any).providerContext = createProviderContext(orgId, "supabase");
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar pedidos ────────────────────────────────────────────────────────
ordersRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    // Em um caso completo, poderíamos passar filtros via query string
    const filters = {};
    const { status } = req.query;
    if (status) filters.status = status as string;

    const list = await order.list(filters);
    res.json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Obter pedido por ID ──────────────────────────────────────────────────
ordersRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    const item = await order.get(id, organizationId);
    if (!item) {
      res.status(404).json({ success: false, error: "Pedido não encontrado" });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Criar pedido ──────────────────────────────────────────────────────────
ordersRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { organizationId } = req.headers["x-organization-id"] as string;
    const data = req.body;

    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    const created = await order.create(data, organizationId);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Atualizar pedido ──────────────────────────────────────────────────────
ordersRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;
    const data = req.body;

    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    const updated = await order.update(id, data, organizationId);
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Excluir pedido ────────────────────────────────────────────────────────
ordersRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    const deleted = await order.delete(id, organizationId);
    res.json({ success: true, data: { deleted } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Converter orçamento em pedido ─────────────────────────────────────────
ordersRouter.post("/from-quote", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { quoteId } = req.body;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { order } = ctx;

    const created = await order.fromQuote(quoteId, organizationId);
    if (!created) {
      res.status(404).json({ success: false, error: "Orçamento não encontrado" });
      return;
    }
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});