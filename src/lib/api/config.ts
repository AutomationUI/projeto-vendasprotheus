// ─── API Configuration ────────────────────────────────────
// Toggle between mock and real API by changing USE_MOCK or setting
// VITE_API_BASE_URL in .env

export const API_CONFIG = {
  /** Use mock data (true) or real API (false) */
  useMock: import.meta.env.VITE_USE_MOCK !== "false",

  /** Base URL for the real API (ignored when useMock is true) */
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",

  /** API key for authenticated routes */
  apiKey: import.meta.env.VITE_API_KEY || "dev-api-key",

  /** Request timeout in milliseconds */
  timeout: 15_000,

  /** API version prefix */
  version: "v1",
} as const;

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (cleanPath.startsWith("/api/v1")) {
    return cleanPath;
  }
  if (cleanPath.startsWith("/api/")) {
    return cleanPath;
  }
  return `${API_CONFIG.baseUrl}/${API_CONFIG.version}${cleanPath}`;
}
