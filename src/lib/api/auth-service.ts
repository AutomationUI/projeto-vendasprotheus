// ─── Auth Service ─────────────────────────────────────────
// Abstracts authentication. Today uses mock, tomorrow swaps to real API.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import { getUsers } from "@/lib/user-store";
import type { AppUser } from "@/lib/types-roles";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AppUser;
  token?: string;
  requires2FA?: boolean;
  locked?: boolean;
  remainingSeconds?: number;
  error?: string;
  organizationId?: string;
}

export interface Verify2FARequest {
  userId: string;
  code: string;
}

export interface Verify2FAResponse {
  success: boolean;
  error?: string;
}

// ─── Mock implementation ─────────────────────────────────

/** Simple hash for demo purposes — NOT cryptographically secure */
async function mockHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "vendasprotheus_salt_2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Default password hash (for "admin123") — pre-computed */
const _DEFAULT_PASSWORD_HASH = null as string | null; // Will be computed on first use

let passwordStore: Record<string, string> = {};

async function getPasswordStore(): Promise<Record<string, string>> {
  if (Object.keys(passwordStore).length > 0) return passwordStore;

  try {
    const stored = localStorage.getItem("vendasprotheus_passwords");
    if (stored) {
      passwordStore = JSON.parse(stored);
      return passwordStore;
    }
  } catch { /* ignore */ }

  // Initialize default passwords for all mock users
  const defaultHash = await mockHashPassword("admin123");
  const users = getUsers();
  passwordStore = {};
  for (const u of users) {
    passwordStore[u.id] = defaultHash;
  }
  localStorage.setItem("vendasprotheus_passwords", JSON.stringify(passwordStore));
  return passwordStore;
}

async function mockLogin(req: LoginRequest): Promise<LoginResponse> {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 200));

  const users = getUsers();
  const found = users.find(u => u.email.toLowerCase() === req.email.toLowerCase());

  if (!found || !found.ativo) {
    return { success: false, error: "Usuário não encontrado ou inativo" };
  }

  // Generate mock JWT-like token
  const token = btoa(JSON.stringify({ sub: found.id, email: found.email, iat: Date.now(), exp: Date.now() + 8 * 60 * 60 * 1000 }));

  return {
    success: true,
    user: found,
    token,
    requires2FA: true,
    organizationId: "default-org",
  };
}

async function mockVerify2FA(req: Verify2FARequest): Promise<Verify2FAResponse> {
  await new Promise(r => setTimeout(r, 200));

  // Accept codes: 000000 (test) or any code matching TOTP pattern  
  if (req.code.length === 6 && /^\d{6}$/.test(req.code)) {
    return { success: true };
  }
  return { success: false, error: "Código inválido" };
}

// ─── Real API implementation ─────────────────────────────

async function apiLogin(req: LoginRequest): Promise<LoginResponse> {
  return http.post<LoginResponse>("/auth/login", req);
}

async function apiVerify2FA(req: Verify2FARequest): Promise<Verify2FAResponse> {
  return http.post<Verify2FAResponse>("/auth/2fa/verify", req);
}

async function apiRefreshToken(): Promise<{ success: boolean; token?: string; error?: string }> {
  return http.post("/auth/refresh");
}

async function apiGetMe(): Promise<{ success: boolean; user?: any; organizationId?: string; error?: string }> {
  return http.get("/auth/me");
}

// ─── Exported service (auto-selects mock or real) ────────

export const authService = {
  login: API_CONFIG.useMock ? mockLogin : apiLogin,
  verify2FA: API_CONFIG.useMock ? mockVerify2FA : apiVerify2FA,
  hashPassword: mockHashPassword,
  getPasswordStore,
};
