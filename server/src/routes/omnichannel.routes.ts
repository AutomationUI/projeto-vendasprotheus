import { Router } from "express";
import { handleIncomingWebhook, getThread, getThreadMessages, getThreadNotes, listOrganizationThreads, updateThreadStatus, addNoteToThread, sendAgentReply, checkSLATimeouts, type AtendimentoThread, type OmnichannelMessage, type OmnichannelNote } from "../services/omnichannel.service.js";
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

// ─── Obter thread de atendimento completa ───────────────────────────────────
omnichannelRouter.get("/thread/:threadId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    const [thread, messages, notes] = await Promise.all([
      getThread(threadId, organizationId),
      getThreadMessages(threadId, organizationId),
      getThreadNotes(threadId, organizationId),
    ]);

    if (!thread) {
      res.status(404).json({ success: false, error: "Thread não encontrada" });
      return;
    }

    res.json({
      success: true,
      data: {
        thread,
        messages,
        notes,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar threads da organização ──────────────────────────────────────────
omnichannelRouter.get("/threads", async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    const options = {
      status: req.query.status as AtendimentoThread["status"] | undefined,
      source: req.query.source as AtendimentoThread["source"] | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };

    const threads = await listOrganizationThreads(organizationId, options);

    res.json({
      success: true,
      data: threads,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Listar threads do cliente ──────────────────────────────────────────────
omnichannelRouter.get("/customer/:customerIdentifier/threads", async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerIdentifier } = req.params;
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    const threads = await listOrganizationThreads(organizationId, {
      status: req.query.status as AtendimentoThread["status"] | undefined,
      // Filter by customer identifier manually since it's not in listOrganizationThreads options yet
    });

    const filtered = threads?.filter(t => t.customerIdentifier === customerIdentifier) || [];

    res.json({
      success: true,
      data: filtered,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Atualizar status da thread ─────────────────────────────────────────────
omnichannelRouter.patch("/thread/:threadId/status", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { status, assignedTo } = req.body;
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    if (!status || !["open", "in_progress", "on_hold", "closed"].includes(status)) {
      res.status(400).json({ success: false, error: "Status inválido" });
      return;
    }

    const thread = await updateThreadStatus(threadId, organizationId, status, assignedTo);

    if (!thread) {
      res.status(404).json({ success: false, error: "Thread não encontrada" });
      return;
    }

    res.json({ success: true, data: thread });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Atualizar SLA ──────────────────────────────────────────────────────────
omnichannelRouter.patch("/thread/:threadId/sla", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { alerted, exceededAt } = req.body;
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    // This is now handled by the checkSLATimeouts job
    // Keeping endpoint for manual updates if needed
    res.json({
      success: true,
      data: { threadId, alerted, exceededAt },
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
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    if (!text || !authorId) {
      res.status(400).json({ success: false, error: "Campos obrigatórios: text e authorId" });
      return;
    }

    const note = await addNoteToThread(threadId, organizationId, authorId, text);

    if (!note) {
      res.status(404).json({ success: false, error: "Thread não encontrada ou erro ao adicionar nota" });
      return;
    }

    res.json({ success: true, data: { threadId, note } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Enviar resposta do agente (outbound) ──────────────────────────────────
omnichannelRouter.post("/thread/:threadId/reply", async (req: Request, res: Response): Promise<void> => {
  try {
    const { threadId } = req.params;
    const { content, messageType, externalMessageId } = req.body;
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    if (!content) {
      res.status(400).json({ success: false, error: "Campo obrigatório: content" });
      return;
    }

    const message = await sendAgentReply(
      threadId,
      organizationId,
      content,
      messageType,
      externalMessageId
    );

    if (!message) {
      res.status(404).json({ success: false, error: "Thread não encontrada ou erro ao enviar resposta" });
      return;
    }

    res.json({ success: true, data: message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});

// ─── Verificar SLA timeouts (para job CRON) ────────────────────────────────
omnichannelRouter.post("/sla/check", async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = req.headers["x-organization-id"] as string | undefined;

    if (!organizationId) {
      res.status(400).json({ success: false, error: "Header X-Organization-Id é obrigatório" });
      return;
    }

    const alertedCount = await checkSLATimeouts(organizationId);

    res.json({ success: true, data: { alertedCount } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    res.status(500).json({ success: false, error: message });
  }
});