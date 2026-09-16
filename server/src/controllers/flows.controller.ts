import { Request, Response } from "express";
import { flowsService } from "../services/flows.service.js";

export class FlowsController {
  static list(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { category, search, status } = req.query as {
      category?: string;
      search?: string;
      status?: string;
    };

    const flows = flowsService.listFlows(orgId, { category, search, status });
    res.json({
      success: true,
      count: flows.length,
      data: flows
    });
  }

  static getById(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;

    const flow = flowsService.getFlowById(orgId, id);
    if (!flow) {
      res.status(404).json({ success: false, error: "Fluxo não encontrado" });
      return;
    }

    res.json({ success: true, data: flow });
  }

  static create(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { name, category, categoryLabel, description, status, tags, erpTables, nodes, edges } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ success: false, error: "O nome do fluxo é obrigatório." });
      return;
    }

    const created = flowsService.createFlow(orgId, {
      name: name.trim(),
      category,
      categoryLabel,
      description,
      status,
      tags,
      erpTables,
      nodes,
      edges
    });

    res.status(201).json({
      success: true,
      message: "Fluxo criado com sucesso",
      data: created
    });
  }

  static update(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;
    const patch = req.body;

    const updated = flowsService.updateFlow(orgId, id, patch);
    if (!updated) {
      res.status(404).json({ success: false, error: "Fluxo não encontrado para atualização" });
      return;
    }

    res.json({
      success: true,
      message: "Fluxo atualizado com sucesso",
      data: updated
    });
  }

  static delete(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;

    const result = flowsService.deleteFlow(orgId, id);
    if (!result.success) {
      res.status(404).json({ success: false, error: "Fluxo não encontrado para exclusão" });
      return;
    }

    res.json({
      success: true,
      message: result.isCustom ? "Fluxo personalizado excluído com sucesso." : "Fluxo padrão restaurado ao modelo original.",
      isCustom: result.isCustom
    });
  }

  static duplicate(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;
    const { name } = req.body || {};

    const cloned = flowsService.duplicateFlow(orgId, id, name);
    if (!cloned) {
      res.status(404).json({ success: false, error: "Fluxo de origem não encontrado para duplicação" });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Fluxo duplicado com sucesso",
      data: cloned
    });
  }

  static changeStatus(req: Request, res: Response): void {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: "Status é obrigatório" });
      return;
    }

    const updated = flowsService.changeStatus(orgId, id, status);
    if (!updated) {
      res.status(404).json({ success: false, error: "Fluxo não encontrado" });
      return;
    }

    res.json({
      success: true,
      message: `Status do fluxo alterado para "${status}"`,
      data: updated
    });
  }

  static async saveLayout(req: Request, res: Response): Promise<void> {
    const orgId = (req as any).organizationId || "default";
    const { id } = req.params;
    const { nodes, edges, viewport, name, category, description, status } = req.body || {};

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      res.status(400).json({
        success: false,
        error: "Nodes e Edges em formato de array são obrigatórios para salvar o layout."
      });
      return;
    }

    try {
      const updated = await flowsService.saveLayout(orgId, id, {
        nodes,
        edges,
        viewport,
        name,
        category,
        description,
        status
      });

      res.json({
        success: true,
        message: "Layout do fluxo salvo com sucesso no banco de dados via API",
        data: updated
      });
    } catch (err: any) {
      console.error("[FlowsController] Erro ao salvar layout:", err);
      res.status(500).json({
        success: false,
        error: "Erro interno ao salvar layout: " + (err?.message || "falha desconhecida")
      });
    }
  }
}
