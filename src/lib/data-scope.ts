// ─── Data Scope Resolution & Representative Isolation ─────────────────────
// O isolamento entre representantes NÃO pode depender apenas da interface.
// Segurança em múltiplas camadas: navegação → permissões → API → RLS → arquivos.
// Este módulo centraliza a resolução do "Data Scope" (sobre QUAIS dados o
// usuário pode atuar) e os filtros de organização/representante aplicados
// em todas as consultas.

import type { DataScope, DataScopeContext } from "../types/governance";
import type { AppUser } from "./types-roles";

// ─── Resolve o DataScope efetivo a partir do usuário/role ────────────────
export function resolveDataScope(user: AppUser | null): DataScope {
  if (!user) return "meus_dados";
  switch (user.role) {
    case "admin":
      return "global";
    case "representante":
      return "minha_carteira";
    case "cliente":
      return "meus_dados";
    case "consultor":
      return "minha_equipe";
    default:
      return "meus_dados";
  }
}

// ─── Extrai os identificadores de isolamento de um usuário ───────────────
// organization_id (tenant) e representative_id (ambiente do representante).
export function extractIsolationContext(
  user: AppUser | null
): { organizationId: string | null; representativeId: string | null } {
  if (!user) return { organizationId: null, representativeId: null };

  const anyUser = user as AppUser & {
    organizationId?: string;
    representativeId?: string;
  };

  const representativeId = user.role === "representante" ? (anyUser.representativeId ?? user.id) : null;

  return {
    organizationId: anyUser.organizationId ?? null,
    representativeId,
  };
}

export function buildDataScopeContext(user: AppUser | null): DataScopeContext {
  const { organizationId, representativeId } = extractIsolationContext(user);
  return {
    organizationId,
    representativeId,
    userId: user?.id ?? null,
    dataScope: resolveDataScope(user),
  };
}

// ─── Filtros de isolamento para queries ──────────────────────────────────
// Um representante só acessa registros do seu próprio escopo. Usado nas
// camadas de API e persistência para garantir isolamento mesmo se a UI falhar.
export interface IsolationFilter {
  organizationId?: string;
  representativeId?: string;
}

export function buildIsolationFilter(ctx: DataScopeContext): IsolationFilter {
  const filter: IsolationFilter = {};
  if (ctx.organizationId) filter.organizationId = ctx.organizationId;
  // Para "minha_carteira"/"meus_dados" de um representante, trava no representante.
  if (
    ctx.dataScope === "minha_carteira" ||
    ctx.dataScope === "meus_dados"
  ) {
    if (ctx.representativeId) filter.representativeId = ctx.representativeId;
  }
  return filter;
}

// ─── Guard de acesso entre representantes ────────────────────────────────
// Verifica se um determinado contexto pode acessar dados de outro representante.
export function canAccessRepresentativeData(
  ctx: DataScopeContext,
  targetRepresentativeId: string
): boolean {
  if (ctx.dataScope === "global" || ctx.dataScope === "toda_organizacao") {
    return true;
  }
  return ctx.representativeId === targetRepresentativeId;
}

// ─── Verifica se um registro pertence ao escopo autorizado ───────────────
export function isInScope(
  ctx: DataScopeContext,
  record: { organizationId?: string | null; representativeId?: string | null }
): boolean {
  if (ctx.dataScope === "global") return true;

  if (ctx.organizationId) {
    if (record.organizationId && record.organizationId !== ctx.organizationId) {
      return false;
    }
  }

  if (ctx.dataScope === "toda_organizacao") return true;

  if (ctx.representativeId) {
    if (record.representativeId && record.representativeId !== ctx.representativeId) {
      return false;
    }
  }

  return true;
}