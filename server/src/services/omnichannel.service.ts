import type { Request, Response } from "express";
import { randomUUID as uuidv4 } from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { publishEvent } from "../services/event-hub.service.js";
import { logger } from "../lib/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface IncomingWebhook {
  id: string;
  source: "whatsapp" | "email" | "webchat";
  messageId: string;
  from: string; // phone number or email of sender
  to: string;   // business number / destination email
  content: string;
  timestamp: string;
  metadata?: {
    direction: "inbound" | "outbound";
    status: "received" | "read" | "delivered" | "failed";
    contacts?: any[];
  };
}

export interface AtendimentoThread {
  id: string;
  customerId?: string;
  organizationId: string;
  customerIdentifier: string;
  source: "whatsapp" | "email" | "webchat";
  status: "open" | "in_progress" | "on_hold" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  startedAt: string;
  lastMessageAt: string;
  assignedTo?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OmnichannelMessage {
  id: string;
  organizationId: string;
  threadId: string;
  role: "customer" | "agent" | "system";
  content: string;
  messageType: "text" | "image" | "document" | "audio" | "video" | "location" | "system";
  externalMessageId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface OmnichannelNote {
  id: string;
  organizationId: string;
  threadId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface SLATracking {
  id: string;
  organizationId: string;
  threadId: string;
  priority: "low" | "medium" | "high" | "urgent";
  source: "whatsapp" | "email" | "webchat";
  startedAt: string;
  lastUpdateAt: string;
  timeoutMs: number;
  alerted: boolean;
  exceededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helper Functions ────────────────────────────────────────────────────

function getSLATimeoutMs(
  source: "whatsapp" | "email" | "webchat",
  priority: "low" | "medium" | "high" | "urgent"
): number {
  const baseMinutes: Record<"low" | "medium" | "high" | "urgent", number> = {
    low: 120,
    medium: 60,
    high: 30,
    urgent: 15,
  };

  const channelMultiplier: Record<
    "whatsapp" | "email" | "webchat",
    Record<"low" | "medium" | "high" | "urgent", number>
  > = {
    whatsapp: { low: 1, medium: 1, high: 1, urgent: 1 },
    email: { low: 4, medium: 2, high: 1, urgent: 1 },
    webchat: { low: 0.5, medium: 1, high: 1.5, urgent: 2.5 },
  };

  const minutes = baseMinutes[priority] * (channelMultiplier[source][priority] || 1);
  return minutes * 60 * 1000;
}

function getSourceFromWebhook(
  source: string
): "whatsapp" | "email" | "webchat" {
  switch (source) {
    case "whatsapp":
      return "whatsapp";
    case "email":
      return "email";
    case "webchat":
      return "webchat";
    default:
      return "webchat";
  }
}

// ─── Database Operations ──────────────────────────────────────────────────

async function findOrCreateThread(
  organizationId: string,
  customerIdentifier: string,
  source: "whatsapp" | "email" | "webchat",
  webhook: IncomingWebhook
): Promise<AtendimentoThread> {
  // Try to find existing open thread for this customer + source
  const { data: existingThread } = await supabase
    .from("omnichannel_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("customer_identifier", customerIdentifier)
    .eq("source", source)
    .in("status", ["open", "in_progress", "on_hold"])
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingThread) {
    // Update last_message_at
    const { data: updated } = await supabase
      .from("omnichannel_threads")
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingThread.id)
      .select()
      .single();

    return mapThreadFromDB(updated!);
  }

  // Create new thread
  const threadId = uuidv4();
  const now = new Date().toISOString();

  const { data: newThread, error } = await supabase
    .from("omnichannel_threads")
    .insert({
      id: threadId,
      organization_id: organizationId,
      customer_identifier: customerIdentifier,
      source,
      status: "open",
      priority: "medium",
      started_at: now,
      last_message_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  // Create SLA tracking
  await createSLATracking(threadId, organizationId, source, "medium");

  // Publish thread created event
  await publishEvent({
    eventName: "omnichannel.thread.created",
    source: "backend-vendasprotheus",
    tenantId: organizationId,
    rooms: ["omnichannel", `thread:${threadId}`],
    payload: { thread: mapThreadFromDB(newThread) },
  });

  return mapThreadFromDB(newThread);
}

async function createSLATracking(
  threadId: string,
  organizationId: string,
  source: "whatsapp" | "email" | "webchat",
  priority: "low" | "medium" | "high" | "urgent"
): Promise<void> {
  const now = new Date().toISOString();
  const timeoutMs = getSLATimeoutMs(source, priority);

  await supabase.from("omnichannel_sla").upsert({
    id: uuidv4(),
    organization_id: organizationId,
    thread_id: threadId,
    source,
    priority,
    started_at: now,
    last_update_at: now,
    timeout_ms: timeoutMs,
    alerted: false,
    exceeded_at: null,
    created_at: now,
    updated_at: now,
  });
}

async function saveIncomingMessage(
  threadId: string,
  organizationId: string,
  webhook: IncomingWebhook
): Promise<OmnichannelMessage> {
  const messageId = uuidv4();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("omnichannel_messages")
    .insert({
      id: messageId,
      organization_id: organizationId,
      thread_id: threadId,
      role: "customer",
      content: webhook.content,
      message_type: "text",
      external_message_id: webhook.messageId,
      metadata: webhook.metadata || {},
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  // Update thread last_message_at
  await supabase
    .from("omnichannel_threads")
    .update({
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", threadId);

  // Update SLA last_update_at
  await supabase
    .from("omnichannel_sla")
    .update({
      last_update_at: now,
      updated_at: now,
    })
    .eq("thread_id", threadId);

  return mapMessageFromDB(data);
}

async function saveOutgoingMessage(
  threadId: string,
  organizationId: string,
  content: string,
  messageType: OmnichannelMessage["messageType"] = "text",
  externalMessageId?: string,
  metadata?: Record<string, any>
): Promise<OmnichannelMessage> {
  const messageId = uuidv4();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("omnichannel_messages")
    .insert({
      id: messageId,
      organization_id: organizationId,
      thread_id: threadId,
      role: "agent",
      content,
      message_type: messageType,
      external_message_id: externalMessageId,
      metadata: metadata || {},
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  // Update thread last_message_at
  await supabase
    .from("omnichannel_threads")
    .update({
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", threadId);

  return mapMessageFromDB(data);
}

async function saveNote(
  threadId: string,
  organizationId: string,
  authorId: string,
  text: string
): Promise<OmnichannelNote> {
  const noteId = uuidv4();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("omnichannel_notes")
    .insert({
      id: noteId,
      organization_id: organizationId,
      thread_id: threadId,
      author_id: authorId,
      text,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;

  return mapNoteFromDB(data);
}

// ─── Mappers ──────────────────────────────────────────────────────────────

function mapThreadFromDB(row: Record<string, any>): AtendimentoThread {
  return {
    id: row.id,
    customerId: row.customer_id,
    organizationId: row.organization_id,
    customerIdentifier: row.customer_identifier,
    source: row.source,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    startedAt: row.started_at,
    lastMessageAt: row.last_message_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessageFromDB(row: Record<string, any>): OmnichannelMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    messageType: row.message_type,
    externalMessageId: row.external_message_id,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

function mapNoteFromDB(row: Record<string, any>): OmnichannelNote {
  return {
    id: row.id,
    organizationId: row.organization_id,
    threadId: row.thread_id,
    authorId: row.author_id,
    text: row.text,
    createdAt: row.created_at,
  };
}

// ─── Webhook Handler ──────────────────────────────────────────────────────

export async function handleIncomingWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const webhook: IncomingWebhook = req.body;

    // 1. Validate payload
    if (!webhook.source || !webhook.from || !webhook.content) {
      res.status(400).json({
        success: false,
        error: "Payload de webhook inválido: campos obrigatórios ausentes",
      });
      return;
    }

    const organizationId = req.headers["x-organization-id"] as string | undefined;
    if (!organizationId) {
      res.status(400).json({
        success: false,
        error: "Header X-Organization-Id é obrigatório",
      });
      return;
    }

    const source = getSourceFromWebhook(webhook.source);

    // 2. Find or create thread
    const thread = await findOrCreateThread(
      organizationId,
      webhook.from,
      source,
      webhook
    );

    // 3. Save incoming message
    const message = await saveIncomingMessage(thread.id, organizationId, webhook);

    // 4. Publish message received event to Event Hub
    await publishEvent({
      eventName: "omnichannel.message.received",
      source: "backend-vendasprotheus",
      tenantId: organizationId,
      rooms: ["omnichannel", `thread:${thread.id}`],
      payload: {
        thread: thread,
        message: message,
      },
    });

    // 5. Respond to webhook sender
    res.json({
      success: true,
      data: {
        threadId: thread.id,
        messageId: message.id,
      },
    });
  } catch (err) {
    logger.error({ err, webhook: req.body }, "Erro ao processar webhook entrante");
    res.status(500).json({
      success: false,
      error: "Erro interno ao processar webhook",
    });
  }
}

// ─── Thread Operations ────────────────────────────────────────────────────

export async function getThread(
  threadId: string,
  organizationId: string
): Promise<AtendimentoThread | null> {
  const { data, error } = await supabase
    .from("omnichannel_threads")
    .select("*")
    .eq("id", threadId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return mapThreadFromDB(data);
}

export async function getThreadMessages(
  threadId: string,
  organizationId: string,
  limit = 100
): Promise<OmnichannelMessage[]> {
  const { data, error } = await supabase
    .from("omnichannel_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapMessageFromDB);
}

export async function getThreadNotes(
  threadId: string,
  organizationId: string
): Promise<OmnichannelNote[]> {
  const { data, error } = await supabase
    .from("omnichannel_notes")
    .select("*")
    .eq("thread_id", threadId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(mapNoteFromDB);
}

export async function listCustomerThreads(
  customerIdentifier: string,
  organizationId: string,
  status?: AtendimentoThread["status"]
): Promise<AtendimentoThread[]> {
  let query = supabase
    .from("omnichannel_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("customer_identifier", customerIdentifier)
    .order("last_message_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapThreadFromDB);
}

export async function listOrganizationThreads(
  organizationId: string,
  options?: {
    status?: AtendimentoThread["status"];
    source?: AtendimentoThread["source"];
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<AtendimentoThread[]> {
  let query = supabase
    .from("omnichannel_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.source) query = query.eq("source", options.source);
  if (options?.assignedTo) query = query.eq("assigned_to", options.assignedTo);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapThreadFromDB);
}

export async function updateThreadStatus(
  threadId: string,
  organizationId: string,
  status: AtendimentoThread["status"],
  assignedTo?: string
): Promise<AtendimentoThread | null> {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (assignedTo) updates.assigned_to = assignedTo;
  if (status === "closed") updates.closed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("omnichannel_threads")
    .update(updates)
    .eq("id", threadId)
    .eq("organization_id", organizationId)
    .select()
    .maybeSingle();

  if (error || !data) return null;

  const thread = mapThreadFromDB(data);

  // Publish thread updated event
  await publishEvent({
    eventName: status === "closed" ? "omnichannel.thread.closed" : "omnichannel.thread.updated",
    source: "backend-vendasprotheus",
    tenantId: organizationId,
    rooms: ["omnichannel", `thread:${threadId}`],
    payload: { thread },
  });

  return thread;
}

export async function addNoteToThread(
  threadId: string,
  organizationId: string,
  authorId: string,
  text: string
): Promise<OmnichannelNote | null> {
  try {
    const note = await saveNote(threadId, organizationId, authorId, text);

    // Publish note added event
    await publishEvent({
      eventName: "omnichannel.note.added",
      source: "backend-vendasprotheus",
      tenantId: organizationId,
      rooms: ["omnichannel", `thread:${threadId}`],
      payload: { threadId, note },
    });

    return note;
  } catch (err) {
    logger.error({ err, threadId }, "Erro ao adicionar nota à thread");
    return null;
  }
}

export async function updateSLAStatus(
  threadId: string,
  organizationId: string,
  alerted: boolean,
  exceededAt?: string
): Promise<void> {
  const updates: Record<string, any> = {
    alerted,
    updated_at: new Date().toISOString(),
  };

  if (exceededAt) updates.exceeded_at = exceededAt;

  await supabase
    .from("omnichannel_sla")
    .update(updates)
    .eq("thread_id", threadId)
    .eq("organization_id", organizationId);

  // Publish SLA event
  await publishEvent({
    eventName: alerted ? "omnichannel.sla.alerted" : "omnichannel.sla.exceeded",
    source: "backend-vendasprotheus",
    tenantId: organizationId,
    rooms: ["omnichannel", `thread:${threadId}`],
    payload: { threadId, alerted, exceededAt },
  });
}

// ─── SLA Monitoring (for CRON job) ────────────────────────────────────────

export async function checkSLATimeouts(organizationId: string): Promise<number> {
  const now = new Date().toISOString();
  let alertedCount = 0;

  // Find SLAs that have exceeded timeout and not yet alerted
  const { data: slaRecords } = await supabase
    .from("omnichannel_sla")
    .select("*, omnichannel_threads!inner(source, priority)")
    .eq("organization_id", organizationId)
    .eq("alerted", false)
    .lt("exceeded_at", now);

  if (slaRecords) {
    for (const sla of slaRecords) {
      await updateSLAStatus(sla.thread_id, organizationId, true, now);
      alertedCount++;
    }
  }

  return alertedCount;
}

// ─── Agent Reply (Outbound) ───────────────────────────────────────────────

export async function sendAgentReply(
  threadId: string,
  organizationId: string,
  content: string,
  messageType: OmnichannelMessage["messageType"] = "text",
  externalMessageId?: string
): Promise<OmnichannelMessage | null> {
  try {
    const message = await saveOutgoingMessage(
      threadId,
      organizationId,
      content,
      messageType,
      externalMessageId
    );

    // Publish message sent event
    await publishEvent({
      eventName: "omnichannel.message.sent",
      source: "backend-vendasprotheus",
      tenantId: organizationId,
      rooms: ["omnichannel", `thread:${threadId}`],
      payload: { threadId, message },
    });

    return message;
  } catch (err) {
    logger.error({ err, threadId }, "Erro ao enviar resposta do agente");
    return null;
  }
}