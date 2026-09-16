import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { SendWhatsAppParams, SendResult } from "../types/index.js";

const META_API_BASE = "https://graph.facebook.com/v21.0";

export function isWhatsAppConfigured(): boolean {
  return !!(env.whatsapp.phoneNumberId && env.whatsapp.accessToken);
}

async function uploadMedia(pdfBuffer: Buffer, filename: string): Promise<string> {
  const formData = new FormData();
  const arrayBuffer = pdfBuffer.buffer.slice(
    pdfBuffer.byteOffset,
    pdfBuffer.byteOffset + pdfBuffer.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  formData.append("file", blob, filename);
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "application/pdf");

  const url = `${META_API_BASE}/${env.whatsapp.phoneNumberId}/media`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.whatsapp.accessToken}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Media upload failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { id: string };
  logger.debug({ mediaId: data.id, filename }, "Media uploaded to Meta API");
  return data.id;
}

export async function sendQuoteWhatsApp(params: SendWhatsAppParams): Promise<SendResult> {
  const { to, pdfBuffer, approvalLink, quoteNumero, customerName } = params;

  if (!isWhatsAppConfigured()) {
    return { success: false, error: "WhatsApp Business não configurado" };
  }

  try {
    const filename = `proposta-${quoteNumero}.pdf`;
    const mediaId = await uploadMedia(pdfBuffer, filename);

    const url = `${META_API_BASE}/${env.whatsapp.phoneNumberId}/messages`;
    const phoneDigits = to.replace(/\D/g, "");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phoneDigits,
        type: "document",
        document: {
          id: mediaId,
          filename,
          caption:
            `Olá ${customerName}! Segue a proposta comercial #${quoteNumero}.\n\n` +
            `Acesse o link para visualizar e aprovar:\n${approvalLink}`,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WhatsApp send failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { messages: { id: string }[] };
    const messageId = data.messages?.[0]?.id;
    logger.info({ to: phoneDigits, quoteNumero, messageId }, "WhatsApp message sent");
    return { success: true, messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar WhatsApp";
    logger.error({ err, to, quoteNumero }, "Failed to send WhatsApp message");
    return { success: false, error: message };
  }
}

export async function sendTestWhatsApp(to: string): Promise<SendResult> {
  if (!isWhatsAppConfigured()) {
    return { success: false, error: "WhatsApp Business não configurado" };
  }

  try {
    const phoneDigits = to.replace(/\D/g, "");
    const url = `${META_API_BASE}/${env.whatsapp.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phoneDigits,
        type: "text",
        text: {
          body: "✅ Teste de integração WhatsApp Business - VendasProtheus. Configuração está correta!",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`WhatsApp test failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as { messages: { id: string }[] };
    logger.info({ to: phoneDigits }, "Test WhatsApp message sent");
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error({ err, to }, "Failed to send test WhatsApp");
    return { success: false, error: message };
  }
}
