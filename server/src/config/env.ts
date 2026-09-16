import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // ─── Server ────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  // ─── Security ──────────────────────────────────────────
  API_KEY: z.string().default("dev-api-key"),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("*"),

  // ─── Rate Limiting ────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

  // ─── SMTP ──────────────────────────────────────────────
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM_NAME: z.string().default("VendasProtheus"),
  SMTP_FROM_EMAIL: z.string().default("noreply@vendasprotheus.com"),

  // ─── WhatsApp Business (Meta Cloud API) ────────────────
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(""),
  WHATSAPP_ACCESS_TOKEN: z.string().default(""),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(""),
  WHATSAPP_TEMPLATE_NAME: z.string().default("envio_orcamento"),

  // ─── Unified Event Hub (websocket_full) ────────────────
  EVENT_HUB_URL: z.string().default("https://websocket-full.internal/events"),
  EVENT_HUB_AUTH_TOKEN: z.string().default("dev-event-hub-token"),
  EVENT_HUB_TENANT_ID: z.string().default("vendasprotheus-saas"),

  // ─── Protheus REST API ─────────────────────────────────
  PROTHEUS_BASE_URL: z.string().default("http://localhost:3000/mock-protheus"),
  PROTHEUS_USER: z.string().default(""),
  PROTHEUS_PASS: z.string().default(""),
  PROTHEUS_TENANT_ID: z.string().default("01"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  console.error("❌ Variáveis de ambiente inválidas:");
  console.error(JSON.stringify(formatted, null, 2));
  process.exit(1);
}

const data = parsed.data;

export const env = {
  nodeEnv: data.NODE_ENV,
  isProd: data.NODE_ENV === "production",
  isDev: data.NODE_ENV === "development",
  port: 3000,

  apiKey: data.API_KEY,
  frontendUrl: data.FRONTEND_URL,
  corsOrigin: data.CORS_ORIGIN,

  rateLimit: {
    windowMs: data.RATE_LIMIT_WINDOW_MS,
    max: data.RATE_LIMIT_MAX,
  },

  smtp: {
    host: data.SMTP_HOST,
    port: data.SMTP_PORT,
    secure: data.SMTP_SECURE,
    user: data.SMTP_USER,
    pass: data.SMTP_PASS,
    fromName: data.SMTP_FROM_NAME,
    fromEmail: data.SMTP_FROM_EMAIL,
  },

  whatsapp: {
    phoneNumberId: data.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: data.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: data.WHATSAPP_BUSINESS_ACCOUNT_ID,
    templateName: data.WHATSAPP_TEMPLATE_NAME,
  },

  eventHub: {
    url: data.EVENT_HUB_URL,
    authToken: data.EVENT_HUB_AUTH_TOKEN,
    tenantId: data.EVENT_HUB_TENANT_ID,
  },

  protheus: {
    baseUrl: data.PROTHEUS_BASE_URL,
    user: data.PROTHEUS_USER,
    pass: data.PROTHEUS_PASS,
    tenantId: data.PROTHEUS_TENANT_ID,
  },
} as const;

export type Env = typeof env;
