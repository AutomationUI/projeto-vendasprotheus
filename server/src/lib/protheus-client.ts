import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

interface ProtheusRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

interface ProtheusErrorBody {
  errorCode?: string;
  errorMessage?: string;
}

export class ProtheusApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: ProtheusErrorBody
  ) {
    super(`Protheus API ${status}: ${body?.errorMessage || statusText}`);
    this.name = "ProtheusApiError";
  }
}

function getAuthHeader(): string {
  if (env.protheus.user && env.protheus.pass) {
    const credentials = Buffer.from(`${env.protheus.user}:${env.protheus.pass}`).toString("base64");
    return `Basic ${credentials}`;
  }
  return "";
}

export async function protheusRequest<T>(options: ProtheusRequestOptions): Promise<T> {
  const { method = "GET", path, body, timeout = 30_000 } = options;
  const url = `${env.protheus.baseUrl}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    tenantId: env.protheus.tenantId,
    ...options.headers,
  };

  const auth = getAuthHeader();
  if (auth) {
    headers["Authorization"] = auth;
  }

  logger.debug({ method, url }, "Protheus request");

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as ProtheusErrorBody | null;
      logger.error(
        { method, url, status: response.status, errorBody },
        "Protheus request failed"
      );
      throw new ProtheusApiError(response.status, response.statusText, errorBody ?? undefined);
    }

    if (response.status === 204) return undefined as T;

    const data = (await response.json()) as T;
    logger.debug({ method, url, status: response.status }, "Protheus request succeeded");
    return data;
  } catch (err) {
    if (err instanceof ProtheusApiError) throw err;

    if ((err as Error).name === "AbortError") {
      logger.error({ method, url, timeout }, "Protheus request timed out");
      throw new ProtheusApiError(408, "Request timeout");
    }

    logger.error({ err, method, url }, "Protheus request error");
    throw new ProtheusApiError(503, "Protheus indisponível");
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function isProtheusReachable(): Promise<boolean> {
  try {
    await protheusRequest({ path: "/api/framework/environment/v1/version", timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}
