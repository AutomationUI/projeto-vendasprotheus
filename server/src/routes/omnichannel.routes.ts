import { Router } from "express";
import { randomUUID as uuidv4 } from "node:crypto";
import { handleIncomingWebhook, type IncomingWebhook } from "../services/omnichannel.service.js";
import { publishEvent } from "../services/event-hub.service.js";
import type { Request, Response } from "express";

export const omnichannelRouter = Router();

// ─── Event Producer Dispatcher (Unified Event Hub) ──────────────────────────
omnichannelRouter.post("/events", async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventName, source, tenantId, rooms, payload, critical } = req.body;
    if (!eventName) {
      res.status(400).json({ success: false, error: "eventName é obrigatório" });
      return;
    }

    const ok = await publishEvent({
      eventName,
      source: source || "omnichannel-api",
      tenantId,
      rooms,
      payload: payload || {},
      critical,
    });

    res.json({ success: ok, eventName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao publicar evento";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Webhook WhatsApp (Meta Cloud API) ──────────────────────────────────────
// Recebe eventos do WhatsApp Cloud API e direciona para o handler central.
omnichannelRouter.post(
  "/whatsapp/webhook",
  async (req: Request, res: Response): Promise<void> => {
    await handleIncomingWebhook(req, res);
  }
);

// ─── Webhook E-mail ────────────────────────────────────────────────────────
omnichannelRouter.post("/email/webhook", async (req: Request, res: Response): Promise<void> => {
  await handleIncomingWebhook(req, res);
});

// ─── Webhook Webchat ───────────────────────────────────────────────────────
omnichannelRouter.post("/webchat/webhook", async (req: Request, res: Response): Promise<void> => {
  await handleIncomingWebhook(req, res);
});

// ─── Obter thread de atendimento ───────────────────────────────────────────
omnichannelRouter.get("/thread/:threadId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string | undefined;

    // TODO: Consultar banco de threads/atendimentos
    // Em produção, verificaria RLS organization_id e retornaria a thread completa
    // com mensagens, notas e status SLA.

    // Placeholder: retorna estrutura básica
    const placeholderThread: {
      id: string;
      customerId: string;
      organizationId: string;
      status: string;
      priority: string;
      lastMessageAt: string;
      messages: any[];
    } = {
      id: threadId,
      customerId: "customer-placeholder",
      organizationId: organizationId || "org-placeholder",
      status: "open",
      priority: "medium",
      lastMessageAt: new Date().toISOString(),
      messages: [],
    };

    res.json({
      success: true,
      data: placeholderThread,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar threads do cliente ──────────────────────────────────────────────
omnichannelRouter.get("/customer/:customerId/threads", async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId } = req.params;
    const { organizationId } = req.headers["x-organization-id"] as string | undefined;

    // TODO: Consultar banco - listar todas as threads abertas para este cliente
    // dentro da organização. Aplicar filtros por status, prioridade, data.

    // Placeholder: retornar lista vazia
    res.json({
      success: true,
      data: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Atualizar status SLA ──────────────────────────────────────────────────
omnichannelRouter.patch("/thread/:threadId/sla", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { alerted, exceededAt } = req.body;
    const { organizationId } = req.headers["x-organization-id"] as string | undefined;

    // TODO: Atualizar registro SLA no banco de dados
    // Verificar se ultrapassou o timeout e marcar alerted = true se necessário

    res.json({
      success: true,
      data: {
        threadId,
        alerted,
        exceededAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Adicionar nota interna a thread ────────────────────────────────────────
omnichannelRouter.post("/thread/:threadId/notes", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { text, authorId } = req.body;
    const { organizationId } = req.headers["x-organization-id"] as string | undefined;

    if (!text || !authorId) {
      res.status(400).json({
        success: false,
        error: "Campos obrigatórios: text e authorId",
      });
      return;
    }

    // TODO: Persistir nota no banco de dados, associada à thread e organização
    // A nota teria: id, authorId, text, createdAt, type ("internal" ou "external")

    res.json({
      success: true,
      data: {
        threadId,
        note: {
          id: uuidv4(),
          authorId,
          text,
          createdAt: new Date().toISOString(),
          type: "internal",
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});