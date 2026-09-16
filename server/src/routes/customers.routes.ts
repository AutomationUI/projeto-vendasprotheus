import { Router } from "express";
import { createProviderContext } from "../providers";

export const customersRouter = Router();

// ─── Middleware: injetar contexto do provider por organização ───────────────
// O organizationId vem do header X-Organization-Id, definido pelo auth middleware
// ou contexto de sessão no frontend.
customersRouter.use((req: Request, res: Response, next): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({
      success: false,
      error: "Parâmetro obrigatório ausente: X-Organization-Id",
    });
    return;
  }

  try {
    ;(req as any).providerContext = createProviderContext(orgId, "supabase");
    next();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar clientes ──────────────────────────────────────────────────────
customersRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { customer } = req as any;
    const list = await customer.list();
    res.json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Obter cliente por ID ──────────────────────────────────────────────────
customersRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { customer } = ctx;

    const item = await customer.get(id, organizationId);
    if (!item) {
      res.status(404).json({ success: false, error: "Cliente não encontrado" });
      return;
    }
    res.json({ success: true, data: item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Criar cliente ──────────────────────────────────────────────────────────
customersRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { organizationId } = req.headers["x-organization-id"] as string;
    const data = req.body;

    const { providerContext: ctx } = req as any;
    const { customer } = ctx;

    const created = await customer.create(data, organizationId);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Atualizar cliente ──────────────────────────────────────────────────────
customersRouter.patch("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;
    const data = req.body;

    const { providerContext: ctx } = req as any;
    const { customer } = ctx;

    const updated = await customer.update(id, data, organizationId);
    res.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Excluir cliente ────────────────────────────────────────────────────────
customersRouter.delete("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { id } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { customer } = ctx;

    const deleted = await customer.delete(id, organizationId);
    res.json({ success: true, data: { deleted } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Buscar cliente por CNPJ ────────────────────────────────────────────────
customersRouter.get("/cnpj/:cnpj", async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerContext } = req as any;
    const { cnpj } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string;

    const { providerContext: ctx } = req as any;
    const { customer } = ctx;

    const found = await customer.findByCnpj(cnpj, organizationId);
    if (!found) {
      res.status(404).json({ success: false, error: "Cliente não encontrado com este CNPJ" });
      return;
    }
    res.json({ success: true, data: found });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});