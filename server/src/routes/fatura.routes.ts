import { Router } from "express";
import { criarFaturaService } from "../services/fatura.service";
import type { Request, Response } from "express";

export const faturaRouter = Router();

// Middleware para injetar o serviço de faturas baseado na organização
faturaRouter.use((req: Request, res: Response, next): void => {
  const orgId = req.headers["x-organization-id"] as string | undefined;
  if (!orgId) {
    res.status(400).json({
      success: false,
      error: "Parâmetro obrigatório ausente: X-Organization-Id",
    });
    return;
  }
  ;(req as any).faturaService = criarFaturaService(orgId);
  next();
});

// ─── Listar faturas ────────────────────────────────────────────────────────
faturaRouter.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const { status } = req.query;
    const list = await faturaService.list({ status: status as any });
    res.json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Obter fatura por ID ───────────────────────────────────────────────────
faturaRouter.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const { id } = req.params;
    const fatura = await faturaService.get(id);
    if (!fatura) {
      res.status(404).json({ success: false, error: "Fatura não encontrada" });
      return;
    }
    res.json({ success: true, data: fatura });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Criar fatura ──────────────────────────────────────────────────────────
faturaRouter.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const dados = req.body;

    const fatura = await faturaService.create({
      cliente_id: dados.cliente_id,
      vendedor: dados.vendedor,
      data_vencimento: dados.data_vencimento,
      valor_total: dados.valor_total,
      condicao_pagamento: dados.condicao_pagamento,
      observacoes: dados.observacoes,
    });

    if (!fatura) {
      res.status(500).json({ success: false, error: "Erro ao criar fatura" });
      return;
    }
    res.status(201).json({ success: true, data: fatura });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Receber pagamento ──────────────────────────────────────────────────────
faturaRouter.post("/:id/pagamento", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const { id } = req.params;
    const { valor } = req.body;

    if (!valor || isNaN(Number(valor))) {
      res.status(400).json({ success: false, error: "Valor do pagamento inválido" });
      return;
    }

    const { fatura, parcelasAtualizadas } = await faturaService.receberPagamento(id, Number(valor));

    if (!fatura) {
      res.status(404).json({ success: false, error: "Fatura não encontrada" });
      return;
    }
    res.json({ success: true, data: { fatura, parcelasAtualizadas } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Gerar parcelas ────────────────────────────────────────────────────────
faturaRouter.post("/:id/parcelas", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const { id } = req.params;
    const { numeroParcelas, diasVencimento } = req.body;

    if (!numeroParcelas || numeroParcelas <= 0) {
      res.status(400).json({ success: false, error: "Número de parcelas inválido" });
      return;
    }

    const { fatura, parcelas } = await faturaService.gerarParcelas(id, numeroParcelas, diasVencimento);

    if (!fatura) {
      res.status(404).json({ success: false, error: "Fatura não encontrada" });
      return;
    }
    res.json({ success: true, data: { fatura, parcelas } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar parcelas de uma fatura ─────────────────────────────────────────
faturaRouter.get("/:id/parcelas", async (req: Request, res: Response): Promise<void> => {
  try {
    const { faturaService } = req as any;
    const { faturaId } = req.params;
    const { status } = req.query;

    const list = await faturaService.listParcelas(faturaId, status as any);
    res.json({ success: true, data: list });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});