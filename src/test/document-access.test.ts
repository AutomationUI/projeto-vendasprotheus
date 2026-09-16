import { describe, it, expect } from "vitest";
import {
  canAccessDocument,
  filterAuthorizedDocuments,
} from "@/lib/document-access";
import { buildDataScopeContext } from "@/lib/data-scope";
import type { AppUser } from "@/lib/types-roles";
import type { GovernanceDocument } from "@/types/governance";

function makeDoc(partial: Partial<GovernanceDocument>): GovernanceDocument {
  return {
    id: partial.id ?? "doc-1",
    organizationId: partial.organizationId ?? "org-1",
    ownerId: partial.ownerId ?? "u2",
    title: partial.title ?? "Política Comercial",
    scope: partial.scope ?? "organizacao",
    scopeRefId: partial.scopeRefId,
    accessPolicy: partial.accessPolicy ?? "publico",
    classification: partial.classification ?? "interno",
    version: partial.version ?? 1,
    status: partial.status ?? "publicado",
    mimeType: partial.mimeType ?? "application/pdf",
    createdAt: partial.createdAt ?? "2026-01-01",
    updatedAt: partial.updatedAt ?? "2026-01-01",
  };
}

const repA = {
  id: "u2",
  nome: "Carlos",
  email: "carlos@vendas.com",
  role: "representante",
  ativo: true,
  criadoEm: "2026-01-01",
  organizationId: "org-1",
  representativeId: "u2",
} as AppUser;

const admin = {
  id: "u1",
  nome: "Admin",
  email: "admin@vendas.com",
  role: "admin",
  ativo: true,
  criadoEm: "2026-01-01",
  organizationId: "org-1",
} as AppUser;

describe("canAccessDocument", () => {
  it("nega documento de outra organização", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ organizationId: "org-2", accessPolicy: "publico" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(false);
  });

  it("nega documento privado de outro usuário", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ accessPolicy: "privado", ownerId: "outro-usuario" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(false);
  });

  it("permite documento privado do próprio usuário", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ accessPolicy: "privado", ownerId: "u2" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(true);
  });

  it("nega documento de outro representante", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ scope: "representante", scopeRefId: "u3" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(false);
  });

  it("permite documento do próprio representante", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ scope: "representante", scopeRefId: "u2" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(true);
  });

  it("admin (global) acessa documentos de qualquer representante", () => {
    const ctx = buildDataScopeContext(admin);
    const doc = makeDoc({ scope: "representante", scopeRefId: "u3" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(true);
  });

  it("nega classificação confidencial para representante", () => {
    const ctx = buildDataScopeContext(repA);
    const doc = makeDoc({ classification: "confidencial", scope: "organizacao" });
    expect(canAccessDocument(ctx, doc).allowed).toBe(false);
  });
});

describe("filterAuthorizedDocuments", () => {
  it("filtra apenas documentos autorizados", () => {
    const ctx = buildDataScopeContext(repA);
    const docs = [
      makeDoc({ id: "d1", scope: "organizacao", accessPolicy: "publico" }),
      makeDoc({ id: "d2", scope: "representante", scopeRefId: "u2" }),
      makeDoc({ id: "d3", scope: "representante", scopeRefId: "u3" }),
    ];
    const result = filterAuthorizedDocuments(ctx, docs);
    expect(result.map((d) => d.id).sort()).toEqual(["d1", "d2"]);
  });
});