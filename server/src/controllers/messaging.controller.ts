import type { Request, Response } from "express";
import { sendQuoteEmail, sendTestEmail } from "../services/email.service.js";
import { sendQuoteWhatsApp, sendTestWhatsApp } from "../services/whatsapp.service.js";
import { recordDelivery, getDeliveryLogByQuote, getRecentDeliveryLogs } from "../services/delivery-log.service.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { SendEmailInput, SendWhatsAppInput } from "../schemas/messaging.schema.js";
import type { ApiResponse, MessagingSettings } from "../types/index.js";

export async function handleSendEmail(req: Request, res: Response): Promise<void> {
  const body = req.body as SendEmailInput;
  const requestId = req.headers["x-request-id"] as string;
  const approvalLink = body.approvalLink || `${env.frontendUrl}/aprovar/${body.quoteId}`;
  const pdfBuffer = Buffer.from(body.pdfBase64, "base64");

  const result = await sendQuoteEmail({
    to: body.to,
    subject: body.subject || `Proposta Comercial #${body.quoteNumero}`,
    customerName: body.customerName,
    quoteNumero: body.quoteNumero,
    approvalLink,
    pdfBuffer,
    filename: `proposta-${body.quoteNumero}.pdf`,
  });

  recordDelivery({
    quoteId: body.quoteId,
    channel: "email",
    recipient: body.to,
    status: result.success ? "sent" : "failed",
    messageId: result.messageId,
    error: result.error,
  });

  const response: ApiResponse = { success: result.success, requestId };
  if (result.success) {
    response.data = { messageId: result.messageId };
    res.json(response);
  } else {
    response.error = result.error;
    res.status(502).json(response);
  }
}

export async function handleSendWhatsApp(req: Request, res: Response): Promise<void> {
  const body = req.body as SendWhatsAppInput;
  const requestId = req.headers["x-request-id"] as string;
  const approvalLink = body.approvalLink || `${env.frontendUrl}/aprovar/${body.quoteId}`;
  const pdfBuffer = Buffer.from(body.pdfBase64, "base64");

  const result = await sendQuoteWhatsApp({
    to: body.to,
    pdfBuffer,
    approvalLink,
    quoteNumero: body.quoteNumero,
    customerName: body.customerName,
  });

  recordDelivery({
    quoteId: body.quoteId,
    channel: "whatsapp",
    recipient: body.to,
    status: result.success ? "sent" : "failed",
    messageId: result.messageId,
    error: result.error,
  });

  const response: ApiResponse = { success: result.success, requestId };
  if (result.success) {
    response.data = { messageId: result.messageId };
    res.json(response);
  } else {
    response.error = result.error;
    res.status(502).json(response);
  }
}

export async function handleTestEmail(req: Request, res: Response): Promise<void> {
  const { to } = req.body;
  const requestId = req.headers["x-request-id"] as string;
  const result = await sendTestEmail(to);
  res.status(result.success ? 200 : 502).json({ ...result, requestId });
}

export async function handleTestWhatsApp(req: Request, res: Response): Promise<void> {
  const { to } = req.body;
  const requestId = req.headers["x-request-id"] as string;
  const result = await sendTestWhatsApp(to);
  res.status(result.success ? 200 : 502).json({ ...result, requestId });
}

export function handleGetDeliveryLog(_req: Request, res: Response): void {
  res.json({ success: true, data: getRecentDeliveryLogs() });
}

export function handleGetDeliveryLogByQuote(req: Request, res: Response): void {
  const quoteId = req.params.quoteId as string;
  res.json({ success: true, data: getDeliveryLogByQuote(quoteId) });
}

export function handleGetSettings(_req: Request, res: Response): void {
  const settings: MessagingSettings = {
    smtp: {
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      user: env.smtp.user,
      pass: env.smtp.pass ? "••••••••" : "",
      fromName: env.smtp.fromName,
      fromEmail: env.smtp.fromEmail,
    },
    whatsapp: {
      phoneNumberId: env.whatsapp.phoneNumberId,
      accessToken: env.whatsapp.accessToken ? "••••••••" : "",
      businessAccountId: env.whatsapp.businessAccountId,
      templateName: env.whatsapp.templateName,
    },
  };
  res.json({ success: true, data: settings });
}
