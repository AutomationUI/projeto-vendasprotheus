import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

export interface AuthUserPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  customPermissions?: Array<{ module: string; actions: string[] }>;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

/**
 * Middleware para validar o token JWT Bearer e injetar o usuário no request (`req.user`).
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: "Token de autenticação não fornecido ou inválido",
      requestId: req.headers["x-request-id"],
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      res.status(401).json({
        success: false,
        error: "Token malformado",
        requestId: req.headers["x-request-id"],
      });
      return;
    }

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8")) as AuthUserPayload;
    
    if (payload.exp && Date.now() >= payload.exp) {
      res.status(401).json({
        success: false,
        error: "Token expirado",
        requestId: req.headers["x-request-id"],
      });
      return;
    }

    req.user = payload;
    next();
  } catch (err) {
    logger.error({ err }, "Failed to authenticate token");
    res.status(401).json({
      success: false,
      error: "Falha na autenticação do token",
      requestId: req.headers["x-request-id"],
    });
  }
}

/**
 * Middleware para exigir permissões específicas (módulo e ação) baseadas no perfil/área.
 */
export function requirePermission(moduleName: string, action: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
        requestId: req.headers["x-request-id"],
      });
      return;
    }

    const { role, customPermissions } = req.user;

    // Administrador possui acesso total
    if (role === "admin") {
      return next();
    }

    // Verificar permissões customizadas ou padrão do perfil
    let hasAccess = false;

    if (customPermissions && Array.isArray(customPermissions)) {
      const modPerm = customPermissions.find((p) => p.module === moduleName);
      if (modPerm && modPerm.actions && modPerm.actions.includes(action as any)) {
        hasAccess = true;
      }
    }

    // Fallback para regras padrão por role se não houver customização ou permissão direta
    if (!hasAccess) {
      if (role === "representante") {
        if (moduleName === "pedidos" && (action === "view" || action === "create" || action === "edit")) {
          hasAccess = true;
        }
        if (moduleName === "orcamentos" && (action === "view" || action === "create" || action === "edit")) {
          hasAccess = true;
        }
        if (moduleName === "aprovacoes" && action === "view") {
          hasAccess = true;
        }
      } else if (role === "consultor") {
        if (action === "view") {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      logger.warn(
        { userId: req.user.sub, role, moduleName, action, requestId: req.headers["x-request-id"] },
        "Access denied: insufficient permissions"
      );
      res.status(403).json({
        success: false,
        error: `Acesso negado: Seu perfil ou área não possui permissão para executar a ação '${action}' no módulo '${moduleName}'.`,
        requestId: req.headers["x-request-id"],
      });
      return;
    }

    next();
  };
}

/**
 * Validador específico para rotas sensíveis de aprovação ou cancelamento.
 */
export function requireApprovalOrCancellationPermission(actionType: "approve" | "cancel") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const action = actionType === "approve" ? "approve" : "edit";
    const middleware = requirePermission("pedidos", action);
    middleware(req, res, next);
  };
}
