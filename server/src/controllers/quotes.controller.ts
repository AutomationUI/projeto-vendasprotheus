import type { Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { protheusRequest, ProtheusApiError } from "../lib/protheus-client.js";
import { logger } from "../lib/logger.js";
import type { ApiResponse } from "../types/index.js";

export async function handleApprove(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { approvedBy } = req.body;
  const requestId = req.headers["x-request-id"] as string;

  try {
    const data = await protheusRequest({
      method: "PUT",
      path: `/api/vendas/orcamentos/v1/${id}/aprovar`,
      body: { aprovadoPor: approvedBy },
    });

    logger.info({ quoteId: id, approvedBy }, "Quote approved via Protheus");

    // ─── Auto-generate financial title upon quote approval ───
    const orgId = req.headers["x-organization-id"] as string;
    if (orgId) {
      // Check if title already exists for this quote
      const { data: existingTitle } = await supabase.from("faturas").select("id").eq("orcamento_id", id).single();
      if (!existingTitle) {
        // Get quote details to create title
        const { data: quote } = await supabase.from("orcamentos").select("*").eq("id", id).single();
        if (quote && quote.cliente) {
          const { data: cliente } = await supabase.from("clientes").select("*").eq("id", quote.cliente).single();
          const clienteId = cliente?.id || "";

          const tituloData = {
            prefixo: "FAT",
            numero: `${Math.floor(100000 + Math.random() * 900000)}`,
            parcela: "01/01",
            tipo: "receber",
            cliente_id: clienteId,
            valor_total: Number(quote.valor || 0),
            data_emissao: new Date().toISOString().split("T")[0],
            data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days
            metodo_pagamento: "Boleto",
            categoria_gerencial: "Venda de Produtos",
            orcamento_id: id,
            organization_id: orgId,
            status: "ABERTA",
            historico_observacoes: `Faturamento ORC-${quote.numero}`,
          };

          await supabase.from("faturas").insert(tituloData);
        }
      }
    }

    res.json({ success: true, data, requestId } as ApiResponse);
  } catch (err) {
    const status = err instanceof ProtheusApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro ao aprovar orçamento";
    logger.error({ err, quoteId: id }, "Failed to approve quote");
    res.status(status).json({ success: false, error: message, requestId } as ApiResponse);
  }
}

export async function handleReject(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { reason } = req.body;
  const requestId = req.headers["x-request-id"] as string;

  try {
    const data = await protheusRequest({
      method: "PUT",
      path: `/api/vendas/orcamentos/v1/${id}/rejeitar`,
      body: { motivo: reason },
    });

    logger.info({ quoteId: id, reason }, "Quote rejected via Protheus");
    res.json({ success: true, data, requestId } as ApiResponse);
  } catch (err) {
    const status = err instanceof ProtheusApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro ao rejeitar orçamento";
    logger.error({ err, quoteId: id }, "Failed to reject quote");
    res.status(status).json({ success: false, error: message, requestId } as ApiResponse);
  }
}

export async function handleGetStatus(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const requestId = req.headers["x-request-id"] as string;

  try {
    const data = await protheusRequest({
      path: `/api/vendas/orcamentos/v1/${id}/status`,
    });

    res.json({ success: true, data, requestId } as ApiResponse);
  } catch (err) {
    const status = err instanceof ProtheusApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro ao consultar status";
    logger.error({ err, quoteId: id }, "Failed to get quote status");
    res.status(status).json({ success: false, error: message, requestId } as ApiResponse);
  }
}
