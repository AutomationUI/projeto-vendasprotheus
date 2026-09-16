import { Router, Request, Response, NextFunction } from "express";
import { FlowsController } from "../controllers/flows.controller.js";

export const flowsRouter = Router();

// Middleware: injeção de contexto de organização (Multi-tenant SaaS)
flowsRouter.use((req: Request, res: Response, next: NextFunction): void => {
  const orgId = (req.headers["x-organization-id"] as string) || "default";
  (req as any).organizationId = orgId;
  next();
});

// ─── Rotas CRUD de Flows ────────────────────────────────────────────────
// GET    /api/v1/flows            - Lista todos os fluxos da organização
// GET    /api/v1/flows/:id        - Busca detalhes de um fluxo específico
// POST   /api/v1/flows            - Cria um novo fluxo personalizado
// PUT    /api/v1/flows/:id        - Atualiza nós, edges ou metadados de um fluxo
// DELETE /api/v1/flows/:id        - Remove fluxo customizado ou restaura padrão
// POST   /api/v1/flows/:id/duplicate - Duplica fluxo existente como nova cópia
// PATCH  /api/v1/flows/:id/status - Altera o status (Rascunho, Ativo, etc.)

flowsRouter.get("/", FlowsController.list);
flowsRouter.get("/:id", FlowsController.getById);
flowsRouter.post("/", FlowsController.create);
flowsRouter.put("/:id/layout", FlowsController.saveLayout);
flowsRouter.post("/:id/layout", FlowsController.saveLayout);
flowsRouter.put("/:id", FlowsController.update);
flowsRouter.delete("/:id", FlowsController.delete);
flowsRouter.post("/:id/duplicate", FlowsController.duplicate);
flowsRouter.patch("/:id/status", FlowsController.changeStatus);
