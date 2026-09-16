import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { safeString } from "@/lib/utils";
import {
  type AppUser,
  type UserRole,
  type Permission,
} from "@/lib/types-roles";
import { getSettings, subscribeSettings } from "@/lib/settings-store";
import { subscribePermissions, getEffectivePermissionsForUser } from "@/lib/permissions-store";
import { subscribeUsers, getUsers } from "@/lib/user-store";
import { addAuditLog } from "@/lib/audit-store";
import { authService, type LoginResponse } from "@/lib/api";

const SESSION_KEY = "vendasprotheus_session";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const ATTEMPTS_KEY = "vendasprotheus_login_attempts";

interface LoginAttempts {
  count: number;
  lastAttempt: number;
}

export interface LoginResult {
  success: boolean;
  requires2FA?: boolean;
  locked?: boolean;
  remainingSeconds?: number;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (module: string, action: Permission["actions"][number]) => boolean;
  hasRole: (role: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadSession(): AppUser | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem("protheus_user");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Validate the session user still exists and is active
    const currentUser = getUsers().find(u => u.id === parsed.id || u.email === parsed.email);
    if (currentUser && currentUser.ativo) return currentUser;
    if (parsed && (parsed.role || parsed.nome || parsed.name)) {
      const roleValue = typeof parsed.role === "string"
        ? parsed.role
        : (typeof parsed.role === "object" && parsed.role?.name ? parsed.role.name : "admin");
      return {
        id: parsed.id || "usr-admin",
        nome: parsed.nome || parsed.name || "Administrador",
        email: parsed.email || "admin@protheus.com.br",
        role: (roleValue as UserRole) || "admin",
        departamento: parsed.departamento || "Diretoria",
        ativo: true,
        doisFatores: Boolean(parsed.doisFatores),
        avatarUrl: parsed.avatarUrl,
        criadoEm: parsed.criadoEm || new Date().toISOString(),
      };
    }
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("protheus_user");
    return null;
  } catch {
    return null;
  }
}

function saveSession(user: AppUser | null, token?: string, organizationId?: string) {
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, email: user.email, token, organizationId: organizationId || "default-org" }));
    sessionStorage.setItem("protheus_user", JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("protheus_user");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(loadSession);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    // Rate limiting check
    try {
      const stored = sessionStorage.getItem(ATTEMPTS_KEY);
      if (stored) {
        const attempts: LoginAttempts = JSON.parse(stored);
        const elapsed = Date.now() - attempts.lastAttempt;
        if (attempts.count >= MAX_LOGIN_ATTEMPTS && elapsed < LOCKOUT_DURATION_MS) {
          const remainingSeconds = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 1000);
          return { success: false, locked: true, remainingSeconds };
        }
        if (elapsed >= LOCKOUT_DURATION_MS) {
          sessionStorage.removeItem(ATTEMPTS_KEY);
        }
      }
    } catch { /* ignore parse errors */ }

    let response: LoginResponse;
    try {
      response = await authService.login({ email, password });
    } catch {
      return { success: false, error: "Erro de conexão ao servidor" };
    }

    if (!response.success || !response.user) {
      // Increment failed attempts
      try {
        const stored = sessionStorage.getItem(ATTEMPTS_KEY);
        const attempts: LoginAttempts = stored ? JSON.parse(stored) : { count: 0, lastAttempt: 0 };
        attempts.count += 1;
        attempts.lastAttempt = Date.now();
        sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
      } catch { /* ignore */ }
      return { success: false, error: response.error || "Credenciais inválidas" };
    }

    // Successful login — clear attempts and store session
    sessionStorage.removeItem(ATTEMPTS_KEY);
    const foundUser = response.user;
    setUser(foundUser);
    saveSession(foundUser, response.token, response.organizationId);
    addAuditLog({
      usuario: foundUser.nome,
      evento: "login",
      descricao: "Login realizado com sucesso",
      modulo: "Autenticação",
    });
    return { success: true, requires2FA: response.requires2FA };
  }, []);

  const verify2FA = useCallback(async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Sessão não encontrada" };
    try {
      return await authService.verify2FA({ userId: user.id, code });
    } catch {
      return { success: false, error: "Erro ao verificar código" };
    }
  }, [user]);

  const logout = useCallback(() => {
    if (user) {
      addAuditLog({
        usuario: user.nome,
        evento: "logout",
        descricao: "Logout realizado",
        modulo: "Autenticação",
      });
    }
    setUser(null);
    saveSession(null);
  }, [user]);

  const [, setSettings] = useState(getSettings());
  const [permTrigger, setPermTrigger] = useState(0);

  useEffect(() => subscribeSettings(() => setSettings(getSettings())), []);
  useEffect(() => subscribePermissions(() => setPermTrigger(t => t + 1)), []);
  
  // Also subscribe to users to keep current session fresh if role or active status changes
  useEffect(() => {
    return subscribeUsers(() => {
      if (user) {
        const fresh = getUsers().find(u => u.id === user.id);
        if (fresh) {
          if (!fresh.ativo) {
            logout();
          } else {
            setUser(fresh);
          }
        }
      }
    });
  }, [user, logout]);

  const hasPermission = useCallback(
    (module: string, action: Permission["actions"][number]) => {
      if (!user) return false;
      
      const roleStr = safeString(user.role);
      // Admin bypass
      if (roleStr === "admin") return true;

      try {
        // Use centralized permission resolution
        const perms = getEffectivePermissionsForUser(user);
        if (!Array.isArray(perms)) return false;
        const modulePerm = perms.find((p) => p && safeString(p.module) === safeString(module));
        if (!modulePerm) return false;

        if (action === "view") {
          return (
            modulePerm.actions?.includes("view") ||
            modulePerm.actions?.some(
              (a) =>
                typeof a === "string" &&
                (a.includes(".read") || a.includes(".view") || a === "view" || a.startsWith("finance."))
            ) ||
            false
          );
        }

        return modulePerm.actions?.includes(action) ?? false;
      } catch {
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, permTrigger]
  );

  const hasRole = useCallback(
    (role: UserRole) => {
      if (!user) return false;
      const roleStr = safeString(user.role);
      return roleStr === safeString(role);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, verify2FA, logout, hasPermission, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
