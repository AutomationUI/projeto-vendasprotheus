// ─── Document & Knowledge Base Access Control ─────────────────────────────
// Garante que uma consulta de um representante NUNCA exponha documentos
// privados de outro. A IA respeita exatamente as mesmas permissões do usuário.
//
// FLUXO: USUÁRIO → contexto → documentos autorizados → conteúdo permitido → resposta.
// O isolamento é aplicado via `organizationId` + `representativeId` + accessPolicy.

import type {
  GovernanceDocument,
  DocumentScope,
  DocumentScope as _DocScopeAlias,
} from "../types/governance";
import type { DataScopeContext } from "../types/governance";
import { scopeCovers } from "../types/governance";

// ─── Resultado da avaliação de acesso ─────────────────────────────────────
export interface DocumentAccessDecision {
  allowed: boolean;
  reason?: string;
}

// ─── Regra: dado o escopo do documento e o contexto do usuário, decide acesso ─
export function canAccessDocument(
  ctx: DataScopeContext,
  doc: GovernanceDocument
): DocumentAccessDecision {
  // Isolamento multitenant: organização diferente → negado
  if (ctx.organizationId && doc.organizationId !== ctx.organizationId) {
    return { allowed: false, reason: "Documento de outra organização" };
  }

  // Documento privado: apenas o proprietário
  if (doc.accessPolicy === "privado") {
    if (ctx.userId && doc.ownerId === ctx.userId) return { allowed: true };
    return { allowed: false, reason: "Documento privado" };
  }

  // Documento de escopo por representante
  if (doc.scope === "representante") {
    const docRep = doc.scopeRefId;
    if (docRep && ctx.representativeId !== docRep && !scopeCovers(ctx.dataScope, "toda_organizacao")) {
      return { allowed: false, reason: "Documento de outro representante" };
    }
  }

  // Classificação confidencial: exige, no mínimo, toda_organização
  if (doc.classification === "confidencial") {
    if (!scopeCovers(ctx.dataScope, "toda_organizacao")) {
      return { allowed: false, reason: "Classificação confidencial" };
    }
  }

  return { allowed: true };
}

// ─── Filtra documentos autorizados para o contexto ────────────────────────
export function filterAuthorizedDocuments(
  ctx: DataScopeContext,
  documents: GovernanceDocument[]
): GovernanceDocument[] {
  return documents.filter((doc) => canAccessDocument(ctx, doc).allowed);
}

// ─── Mapeia escopo do documento para verificação de isolamento ────────────
export function documentBelongsToRepresentative(
  doc: GovernanceDocument,
  representativeId: string
): boolean {
  if (doc.scope === "representante") return doc.scopeRefId === representativeId;
  if (doc.scope === "organizacao" || doc.scope === "global") return true;
  return false;
}

export type { DocumentScope };
export type { _DocScopeAlias as DocumentScopeAlias };