import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import type { SendEmailParams, SendResult } from "../types/index.js";

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
    logger.info({ host: env.smtp.host, port: env.smtp.port }, "SMTP transporter created");
  }
  return cachedTransporter;
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    return false;
  }
}

function buildEmailHtml(params: {
  customerName: string;
  quoteNumero: string;
  approvalLink: string;
  fromName: string;
}): string {
  const { customerName, quoteNumero, approvalLink, fromName } = params;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;">${fromName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="color:#334155;font-size:16px;margin:0 0 16px;">
              Olá <strong>${customerName}</strong>,
            </p>
            <p style="color:#334155;font-size:15px;margin:0 0 24px;">
              Segue em anexo a proposta comercial <strong>#${quoteNumero}</strong>.
              Você também pode visualizar e aprovar diretamente pelo link abaixo:
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
              <tr><td align="center" style="background:#2563eb;border-radius:6px;">
                <a href="${approvalLink}"
                   style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;">
                  Ver Proposta
                </a>
              </td></tr>
            </table>
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;">
              O PDF da proposta está anexo a este e-mail.
            </p>
            <p style="color:#64748b;font-size:13px;margin:0;">
              Em caso de dúvidas, responda este e-mail ou entre em contato conosco.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
              ${fromName} &bull; Enviado automaticamente pelo sistema VendasProtheus
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendQuoteEmail(params: SendEmailParams): Promise<SendResult> {
  const { to, subject, customerName, quoteNumero, approvalLink, pdfBuffer, filename } = params;

  try {
    const transporter = getTransporter();

    const html = buildEmailHtml({
      customerName,
      quoteNumero,
      approvalLink,
      fromName: env.smtp.fromName,
    });

    const info = await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject,
      html,
      attachments: [
        {
          filename: filename || `proposta-${quoteNumero}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    logger.info({ to, quoteNumero, messageId: info.messageId }, "Email sent successfully");
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao enviar email";
    logger.error({ err, to, quoteNumero }, "Failed to send email");
    return { success: false, error: message };
  }
}

export async function sendTestEmail(to: string): Promise<SendResult> {
  try {
    const transporter = getTransporter();

    const info = await transporter.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to,
      subject: "Teste de configuração SMTP - VendasProtheus",
      html: `<div style="font-family:Arial,sans-serif;padding:24px;">
        <h2 style="color:#0f172a;">Configuração SMTP OK ✓</h2>
        <p style="color:#334155;">
          Este é um e-mail de teste enviado pelo sistema VendasProtheus.
          Se você está recebendo esta mensagem, a configuração SMTP está correta.
        </p>
        <p style="color:#94a3b8;font-size:13px;">
          Enviado em ${new Date().toLocaleString("pt-BR")}
        </p>
      </div>`,
    });

    logger.info({ to }, "Test email sent");
    return { success: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error({ err, to }, "Failed to send test email");
    return { success: false, error: message };
  }
}
