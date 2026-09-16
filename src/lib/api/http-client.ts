// ─── HTTP Client with interceptors ─────────────────────────
// Wraps fetch with auth headers, timeout, error handling, and retry.
// When backend is ready, all API calls flow through here.

import { API_CONFIG, getApiUrl } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeout?: number;
}

function getAuthToken(): string | null {
  try {
    const session = sessionStorage.getItem("vendasprotheus_session");
    if (!session) return null;
    const parsed = JSON.parse(session);
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function getOrganizationId(): string | null {
  try {
    const session = sessionStorage.getItem("vendasprotheus_session");
    if (!session) return null;
    const parsed = JSON.parse(session);
    return parsed.organizationId ?? "default-org";
  } catch {
    return "default-org";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, timeout = API_CONFIG.timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const orgId = getOrganizationId();
  if (orgId) {
    headers["X-Organization-Id"] = orgId;
  }

  if (API_CONFIG.apiKey) {
    headers["X-Api-Key"] = API_CONFIG.apiKey;
  }

  try {
    const response = await fetch(getApiUrl(path), {
      ...fetchOptions,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);

      // 401 → redirect to login
      if (response.status === 401) {
        sessionStorage.removeItem("vendasprotheus_session");
        window.location.href = "/login";
      }

      throw new ApiError(response.status, response.statusText, errorBody);
    }

    // 204 No Content
    if (response.status === 204) return undefined as T;

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Public API methods ─────────────────────────────────

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
