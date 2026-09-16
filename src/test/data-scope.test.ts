import { describe, it, expect } from "vitest";
import {
  resolveDataScope,
  buildDataScopeContext,
  buildIsolationFilter,
  canAccessRepresentativeData,
  isInScope,
} from "@/lib/data-scope";
import { scopeCovers } from "@/types/governance";
import type { AppUser } from "@/lib/types-roles";

const admin: AppUser = {
  id: "u1",
  nome: "Admin",
  email: "admin@vendas.com",
  role: "admin",
  ativo: true,
  criadoEm: "2026-01-01",
};

const representante = {
  ...admin,
  id: "u2",
  role: "representante" as const,
};

describe("resolveDataScope", () => {
  it("admin resolve para global", () => {
    expect(resolveDataScope(admin)).toBe("global");
  });

  it("representante resolve para minha_carteira", () => {
    expect(resolveDataScope(representante)).toBe("minha_carteira");
  });

  it("usuário nulo resolve para meus_dados", () => {
    expect(resolveDataScope(null)).toBe("meus_dados");
  });
});

describe("scopeCovers (hierarquia)", () => {
  it("global cobre todos os escopos", () => {
    expect(scopeCovers("global", "meus_dados")).toBe(true);
    expect(scopeCovers("global", "toda_organizacao")).toBe(true);
  });

  it("minha_carteira não cobre toda_organizacao", () => {
    expect(scopeCovers("minha_carteira", "toda_organizacao")).toBe(false);
  });
});

describe("isolamento entre representantes", () => {
  const ctx = buildDataScopeContext(representante);

  it("representante usa o próprio id como representativeId", () => {
    expect(ctx.representativeId).toBe("u2");
  });

  it("bloqueia acesso a dados de outro representante", () => {
    expect(canAccessRepresentativeData(ctx, "u3")).toBe(false);
    expect(canAccessRepresentativeData(ctx, "u2")).toBe(true);
  });

  it("admin pode acessar dados de qualquer representante", () => {
    const adminCtx = buildDataScopeContext(admin);
    expect(canAccessRepresentativeData(adminCtx, "u3")).toBe(true);
  });

  it("filtro de isolamento trava no representativeId para minha_carteira", () => {
    const filter = buildIsolationFilter(ctx);
    expect(filter.representativeId).toBe("u2");
  });

  it("isInScope bloqueia registro de outro representante", () => {
    expect(isInScope(ctx, { representativeId: "u3" })).toBe(false);
    expect(isInScope(ctx, { representativeId: "u2" })).toBe(true);
  });
});