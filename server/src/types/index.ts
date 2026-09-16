// ─── Messaging ─────────────────────────────────────────
export interface SendEmailParams {
  to: string;
  subject: string;
  customerName: string;
  quoteNumero: string;
  approvalLink: string;
  pdfBuffer: Buffer;
  filename: string;
}

export interface SendWhatsAppParams {
  to: string;
  pdfBuffer: Buffer;
  approvalLink: string;
  quoteNumero: string;
  customerName: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Delivery Log ──────────────────────────────────────
export interface DeliveryLogEntry {
  quoteId: string;
  channel: "email" | "whatsapp";
  recipient: string;
  status: "sent" | "failed";
  messageId?: string;
  error?: string;
  timestamp: string;
}

// ─── Quote Approval ────────────────────────────────────
export type ApprovalStatus = "pendente" | "aprovado" | "rejeitado";


// ─── API Responses ─────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

export interface HealthCheckResponse {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    protheus: boolean;
    smtp: boolean;
    whatsapp: boolean;
  };
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
