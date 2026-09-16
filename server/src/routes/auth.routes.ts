import { Request, Response, Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";

export const authRouter = Router();

const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("hex");
}

function generateToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  const signature = randomBytes(32).toString("base64url");
  return `${header}.${body}.${signature}`;
}

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

// ─── Login ──────────────────────────────────────────────────────
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email e senha são obrigatórios",
      });
    }

    // Buscar usuário no Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !user) {
      logger.warn({ email }, "Login failed: user not found");
      return res.status(401).json({
        success: false,
        error: "Credenciais inválidas",
      });
    }

    if (!user.active) {
      return res.status(401).json({
        success: false,
        error: "Usuário inativo",
      });
    }

    // Verificar senha (para demo, aceitamos qualquer senha se não tiver hash)
    // Em produção, comparar com hash armazenado
    const passwordHash = user.password_hash;
    const salt = user.salt || "vendasprotheus_salt_2026";

    if (passwordHash && hashPassword(password, salt) !== passwordHash) {
      logger.warn({ email }, "Login failed: invalid password");
      return res.status(401).json({
        success: false,
        error: "Credenciais inválidas",
      });
    }

    // Gerar token
    const token = generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id || "default-org",
      iat: Date.now(),
      exp: Date.now() + SESSION_EXPIRY_MS,
    });

    // Armazenar sessão (opcional, pode usar Redis em produção)
    // await supabase.from("sessions").upsert({ user_id: user.id, token, expires_at: new Date(Date.now() + SESSION_EXPIRY_MS).toISOString() });

    return res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.name,
        email: user.email,
        role: user.role,
        ativo: user.active,
        departamento: user.department,
        doisFatores: user.two_factor_enabled || false,
        avatarUrl: user.avatar_url,
        criadoEm: user.created_at,
      },
      token,
      requires2FA: user.two_factor_enabled || false,
      organizationId: user.organization_id || "default-org",
    });
  } catch (err) {
    logger.error({ err }, "Login error");
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// ─── Verificar 2FA ─────────────────────────────────────────────
authRouter.post("/2fa/verify", async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: "User ID e código são obrigatórios",
      });
    }

    // Para demo, aceita qualquer código de 6 dígitos
    if (code.length === 6 && /^\d{6}$/.test(code)) {
      return res.json({ success: true });
    }

    // Em produção, validar TOTP
    // const { data: user } = await supabase.from("users").select("totp_secret").eq("id", userId).single();
    // const valid = verifyTOTP(user.totp_secret, code);

    return res.status(401).json({
      success: false,
      error: "Código inválido",
    });
  } catch (err) {
    logger.error({ err }, "2FA verify error");
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
    });
  }
});

// ─── Refresh token ─────────────────────────────────────────────
authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Token não fornecido" });
    }

    const token = authHeader.slice(7);

    // Decodificar token (simplificado)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ success: false, error: "Token inválido" });
    }

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp || 0;

    if (Date.now() >= exp) {
      return res.status(401).json({ success: false, error: "Token expirado" });
    }

    // Gerar novo token
    const newToken = generateToken({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      iat: Date.now(),
      exp: Date.now() + SESSION_EXPIRY_MS,
    });

    return res.json({
      success: true,
      token: newToken,
    });
  } catch (err) {
    logger.error({ err }, "Token refresh error");
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// ─── Logout ────────────────────────────────────────────────────
authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      // Opcional: invalidar token no Redis/DB
      // await supabase.from("sessions").delete().eq("token", token);
    }
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Logout error");
    return res.status(500).json({ success: false, error: "Erro interno" });
  }
});

// ─── Me (perfil do usuário logado) ─────────────────────────────
authRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, error: "Token não fornecido" });
    }

    const token = authHeader.slice(7);
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ success: false, error: "Token inválido" });
    }

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp || 0;

    if (Date.now() >= exp) {
      return res.status(401).json({ success: false, error: "Token expirado" });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, name, email, role, active, department, two_factor_enabled, avatar_url, created_at, organization_id")
      .eq("id", payload.sub)
      .single();

    if (error || !user) {
      return res.status(404).json({ success: false, error: "Usuário não encontrado" });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        nome: user.name,
        email: user.email,
        role: user.role,
        ativo: user.active,
        departamento: user.department,
        doisFatores: user.two_factor_enabled || false,
        avatarUrl: user.avatar_url,
        criadoEm: user.created_at,
      },
      organizationId: user.organization_id || "default-org",
    });
  } catch (err) {
    logger.error({ err }, "Get me error");
    return res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});