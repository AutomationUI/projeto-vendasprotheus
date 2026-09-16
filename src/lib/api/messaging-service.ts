// ─── Messaging Service ─────────────────────────────────
// Email & WhatsApp sending for quotes. Mock simulates success.

import { API_CONFIG } from "./config";
import { http } from "./http-client";

// ─── Types ───────────────────────────────────────────────

export interface SendEmailRequest {
  quoteId: string;
  to: string;
  subject: string;
  customerName: string;
  quoteNumero: string;
  approvalLink: string;
  pdfBase64: string;
}

export interface SendWhatsAppRequest {
  quoteId: string;
  to: string;
  customerName: string;
  quoteNumero: string;
  approvalLink: string;
  pdfBase64: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MessagingSettings {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
  };
  whatsapp: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId: string;
    templateName: string;
  };
}

export interface DeliveryLogEntry {
  id: string;
  quoteId: string;
  channel: "email" | "whatsapp";
  recipient: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
  timestamp: string;
}

// ─── Mock implementation ─────────────────────────────────

const mockDeliveryLog: DeliveryLogEntry[] = [];

async function mockSendEmail(req: SendEmailRequest): Promise<SendResult> {
  await new Promise(r => setTimeout(r, 1200));
  const entry: DeliveryLogEntry = {
    id: crypto.randomUUID(),
    quoteId: req.quoteId,
    channel: "email",
    recipient: req.to,
    status: "sent",
    messageId: `mock-email-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  mockDeliveryLog.push(entry);
  return { success: true, messageId: entry.messageId };
}

async function mockSendWhatsApp(req: SendWhatsAppRequest): Promise<SendResult> {
  await new Promise(r => setTimeout(r, 1500));
  const entry: DeliveryLogEntry = {
    id: crypto.randomUUID(),
    quoteId: req.quoteId,
    channel: "whatsapp",
    recipient: req.to,
    status: "sent",
    messageId: `mock-wa-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  mockDeliveryLog.push(entry);
  return { success: true, messageId: entry.messageId };
}

async function mockTestEmail(_to: string): Promise<SendResult> {
  await new Promise(r => setTimeout(r, 800));
  return { success: true, messageId: "mock-test-email" };
}

async function mockTestWhatsApp(_to: string): Promise<SendResult> {
  await new Promise(r => setTimeout(r, 800));
  return { success: true, messageId: "mock-test-whatsapp" };
}

async function mockGetSettings(): Promise<MessagingSettings> {
  await new Promise(r => setTimeout(r, 200));
  return {
    smtp: {
      host: "smtp.exemplo.com",
      port: 587,
      secure: false,
      user: "user@exemplo.com",
      pass: "••••••••",
      fromName: "Minha Empresa",
      fromEmail: "noreply@exemplo.com",
    },
    whatsapp: {
      phoneNumberId: "000000000000000",
      accessToken: "••••••••",
      businessAccountId: "000000000000000",
      templateName: "envio_orcamento",
    },
  };
}

async function mockGetDeliveryLog(quoteId?: string): Promise<DeliveryLogEntry[]> {
  await new Promise(r => setTimeout(r, 100));
  if (quoteId) return mockDeliveryLog.filter(e => e.quoteId === quoteId);
  return [...mockDeliveryLog].reverse();
}

// ─── Real API implementation ─────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

async function realSendEmail(req: SendEmailRequest): Promise<SendResult> {
  const res = await http.post<ApiEnvelope<{ messageId?: string }>>("/messaging/send-email", req);
  return { success: res.success, messageId: res.data?.messageId, error: res.error };
}

async function realSendWhatsApp(req: SendWhatsAppRequest): Promise<SendResult> {
  const res = await http.post<ApiEnvelope<{ messageId?: string }>>("/messaging/send-whatsapp", req);
  return { success: res.success, messageId: res.data?.messageId, error: res.error };
}

async function realTestEmail(to: string): Promise<SendResult> {
  return http.post<SendResult>("/messaging/test-email", { to });
}

async function realTestWhatsApp(to: string): Promise<SendResult> {
  return http.post<SendResult>("/messaging/test-whatsapp", { to });
}

async function realGetSettings(): Promise<MessagingSettings> {
  const res = await http.get<ApiEnvelope<MessagingSettings>>("/messaging/settings");
  return res.data!;
}

async function realGetDeliveryLog(quoteId?: string): Promise<DeliveryLogEntry[]> {
  const path = quoteId ? `/messaging/delivery-log/${quoteId}` : "/messaging/delivery-log";
  const res = await http.get<ApiEnvelope<DeliveryLogEntry[]>>(path);
  return res.data!;
}

// ─── Public API ──────────────────────────────────────────

export const messagingService = {
  sendEmail: (req: SendEmailRequest) =>
    API_CONFIG.useMock ? mockSendEmail(req) : realSendEmail(req),

  sendWhatsApp: (req: SendWhatsAppRequest) =>
    API_CONFIG.useMock ? mockSendWhatsApp(req) : realSendWhatsApp(req),

  testEmail: (to: string) =>
    API_CONFIG.useMock ? mockTestEmail(to) : realTestEmail(to),

  testWhatsApp: (to: string) =>
    API_CONFIG.useMock ? mockTestWhatsApp(to) : realTestWhatsApp(to),

  getSettings: () =>
    API_CONFIG.useMock ? mockGetSettings() : realGetSettings(),

  getDeliveryLog: (quoteId?: string) =>
    API_CONFIG.useMock ? mockGetDeliveryLog(quoteId) : realGetDeliveryLog(quoteId),
};
