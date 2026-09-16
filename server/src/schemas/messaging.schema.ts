import { z } from "zod";

// ─── Send Email ────────────────────────────────────────
export const sendEmailSchema = z.object({
  quoteId: z.string().min(1, "quoteId é obrigatório"),
  to: z.string().email("Endereço de email inválido"),
  subject: z.string().optional(),
  customerName: z.string().min(1).default("Cliente"),
  quoteNumero: z.string().min(1, "quoteNumero é obrigatório"),
  approvalLink: z.string().url().optional(),
  pdfBase64: z
    .string()
    .min(1, "pdfBase64 é obrigatório")
    .max(10_000_000, "PDF excede o tamanho máximo de ~7.5MB"),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ─── Send WhatsApp ─────────────────────────────────────
export const sendWhatsAppSchema = z.object({
  quoteId: z.string().min(1, "quoteId é obrigatório"),
  to: z
    .string()
    .min(10, "Número deve ter pelo menos 10 dígitos")
    .regex(/^[\d+\-() ]+$/, "Formato de telefone inválido"),
  customerName: z.string().min(1).default("Cliente"),
  quoteNumero: z.string().min(1, "quoteNumero é obrigatório"),
  approvalLink: z.string().url().optional(),
  pdfBase64: z
    .string()
    .min(1, "pdfBase64 é obrigatório")
    .max(10_000_000, "PDF excede o tamanho máximo de ~7.5MB"),
});

export type SendWhatsAppInput = z.infer<typeof sendWhatsAppSchema>;

// ─── Test endpoints ────────────────────────────────────
export const testEmailSchema = z.object({
  to: z.string().email("Endereço de email inválido"),
});

export const testWhatsAppSchema = z.object({
  to: z
    .string()
    .min(10, "Número deve ter pelo menos 10 dígitos")
    .regex(/^[\d+\-() ]+$/, "Formato de telefone inválido"),
});

// ─── Quote actions ─────────────────────────────────────
export const approveQuoteSchema = z.object({
  approvedBy: z.string().optional(),
});

export const rejectQuoteSchema = z.object({
  reason: z.string().min(1, "Motivo da rejeição é obrigatório"),
});

// ─── Params ────────────────────────────────────────────
export const quoteIdParamSchema = z.object({
  id: z.string().min(1),
});

export const quoteIdQuerySchema = z.object({
  quoteId: z.string().min(1),
});
