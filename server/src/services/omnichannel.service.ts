import type { Request, Response } from "express";
import { randomUUID as uuidv4 } from "node:crypto";

  // Tipos para webhooks entrantes
  export interface IncomingWebhook {
  id: string;
  source: "whatsapp" | "email" | "webchat";
  messageId: string;
  from: string; // número de telefone ou email do remetido
  to: string;   // número do negócio / email de destino
  content: string;
  timestamp: string;
  metadata?: {
    direction: "inbound" | "outbound";
    status: "received" | "read" | "delivered" | "failed";
    contacts?: any[];
  };
}

// Estrutura de thread/atendimento
export interface AtendimentoThread {
  id: string;
  customerId: string;
  organizationId: string;
  source: "whatsapp" | "email" | "webchat";
  status: "open" | "in_progress" | "on_hold" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  startedAt: string;
  lastMessageAt: string;
  assignedTo?: string; // userId do atendente
  notes: Note[];
  messages: Message[];
}

export interface Note {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  type: "internal" | "external";
}

export interface Message {
  id: string;
  role: "customer" | "agent";
  content: string;
  timestamp: string;
  metadata?: any;
}

// SLA tracking
export interface SLATracking {
  threadId: string;
  priority: "low" | "medium" | "high" | "urgent";
  startedAt: string;
  lastUpdateAt: string;
  timeoutMs: number; // tempo máximo em ms antes de alerta
  alerted: boolean;
  exceededAt: string | null;
}

// Webhook handler base
export async function handleIncomingWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const webhook: IncomingWebhook = req.body;

    // 1. Validar payload
    if (!webhook.source || !webhook.from || !webhook.content) {
      res.status(400).json({
        success: false,
        error: "Payload de webhook inválido: campos obrigatórios ausentes",
      });
      return;
    }

    // 2. Buscar ou criar thread de atendimento
    // Em produção, isso consultaria o banco/datastore para ver se já existe
    // uma thread aberta para este cliente (customerId + source).
    // Aqui, simplificamos: geramos um ID ou buscamos contexto.
    const organizationId = req.headers["x-organization-id"] as string | undefined;
    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: "Header X-Organization-Id é obrigatório",
      });
      return;
    }

    // 2.1 Verificar se já há thread aberta para este cliente+neste canal
    // TODO: Consultar banco de threads/atendimentos
    const threadId = uuidv4(); // placeholder: em produção, buscar/criar thread existente

    // 3. Criar mensagem entrante
    const newMessage: Message = {
      id: uuidv4(),
      role: "customer",
      content: webhook.content,
      timestamp: webhook.timestamp,
    };

    // 4. Criar/atualizar thread
    const thread: AtendimentoThread = {
      id: threadId,
      customerId: webhook.from, // usar o ID do cliente (phone/email)
      organizationId,
      source: webhook.source,
      status: "open",
      priority: "medium", // default; poderia ser sobrescrito por regras de negócio
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      assignedTo: undefined,
      notes: [],
      messages: [newMessage],
    };

    // 5. Rastreamento SLA
    const sla: SLATracking = {
      threadId,
      priority: "medium",
      startedAt: new Date().toISOString(),
      lastUpdateAt: new Date().toISOString(),
      timeoutMs: getSLATimeoutMs(webhook.source, "medium"),
      alerted: false,
      exceededAt: null,
    };

    // 6. Persistir thread + SLA (TODO: salvar no banco/Redis)
    // Em produção, salvaria em: threads table com RLS organization_id,
    // SLA table com expiry check via job/CRON

    // 7. Responder ao emissor do webhook
    res.json({
      success: true,
      data: {
        threadId,
        messageId: newMessage.id,
        slaTimeoutMs: sla.timeoutMs,
      },
    });
  } catch (err) {
    console.error("Erro ao processar webhook entrante:", err);
    res.status(500).json({
      success: false,
      error: "Erro interno ao processar webhook",
    });
  }
}

// Helper: tempo de timeout SLA por canal e prioridade
export function getSLATimeoutMs(source: "whatsapp" | "email" | "webchat", priority: "low" | "medium" | "high" | "urgent"): number {
  // SLA examples (em minutos, convertido para ms):
  // WhatsApp: 15 min (urgent), 30 min (high), 60 min (medium), 120 min (low)
  // Email: 60 min (urgent), 120 min (high), 240 min (medium), 480 min (low)
  // Webchat: 5 min (urgent), 10 min (high), 20 min (medium), 40 min (low)

  const baseMinutes: Record<"low" | "medium" | "high" | "urgent", number> = {
    low: 120,
    medium: 60,
    high: 30,
    urgent: 15,
  };

  // Canais têm tempos diferentes
  const channelMultiplier: Record<"whatsapp" | "email" | "webchat", Record<"low" | "medium" | "high" | "urgent", number>> = {
    whatsapp: { low: 1, medium: 1, high: 1, urgent: 1 },
    email: { low: 4, medium: 2, high: 1, urgent: 1 },
    webchat: { low: 0.5, medium: 1, high: 1.5, urgent: 2.5 },
};
  
  const minutes = baseMinutes[priority] * (channelMultiplier[source][priority] || 1);
  return minutes * 60 * 1000;
  }
