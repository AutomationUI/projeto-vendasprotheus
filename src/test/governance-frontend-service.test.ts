import { describe, it, expect, beforeEach } from "vitest";
import { governanceService } from "@/lib/api/governance-service";
import type { CommercialRule, CommissionPolicy, RepresentativeEnvironment } from "@/types/governance";

const ORG = "org-1";

const rep: RepresentativeEnvironment = {
  id: "rep-1", organizationId: ORG, representativeId: "u2", codigo: "REP-001", regiao: "SP Capital",
  segmentos: ["Cerâmica"], ativo: true, createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const rule: CommercialRule = {
  id: "rule-premium", organizationId: ORG, name: "Comissão Premium", priority: 10, status: "ativa", version: 3,
  expression: { combinator: "and", conditions: [{ field: "margem", operator: "gte", value: 20 }] },
  actions: [{ type: "bonus", percentual: 1 }],
  createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

const policy: CommissionPolicy = {
  id: "pol-1", organizationId: ORG, name: "Comissão Padrão", comissaoBase: 5, releasePolicy: "pedido",
  ruleIds: ["rule-premium"], version: 1, status: "ativa", createdAt: "2026-01-01", updatedAt: "2026-01-01",
};

describe("governanceService (mock)", () => {
  beforeEach(async () => {
    // reset mock store determinístico recriando a sequência
    await governanceService.saveRepresentative(rep, ORG);
    await governanceService.saveRule(rule, ORG);
    await governanceService.savePolicy(policy, ORG);
  });

  it("salva e lista representantes com isolamento por organização", async () => {
    const list = await governanceService.getRepresentatives(ORG);
    expect(list.length).toBeGreaterThan(0);
    expect(list.find((r) => r.id === "rep-1")?.codigo).toBe("REP-001");
    expect(await governanceService.getRepresentatives("org-other")).toHaveLength(0);
  });

  it("cria versão de regra sem sobrescrever a versão usada", async () => {
    const v = await governanceService.createRuleVersion("rule-premium", { name: "Comissão Premium v4" }, ORG);
    expect(v.version).toBe(4);
    expect(v.status).toBe("rascunho");
  });

  it("calcula comissão de forma determinística e auditável", async () => {
    const calc = await governanceService.calculateCommission(
      { policyId: "pol-1", representativeId: "u2", input: { valorBase: 100000, margem: 24, metaAtingimento: 108 }, metadata: { clienteId: "cli-1" } },
      ORG
    );
    expect(calc.comissaoFinalPercentual).toBe(6);
    expect(calc.comissaoValor).toBe(6000);
    expect(calc.appliedRuleIds).toContain("rule-premium");
    expect(calc.trace.length).toBeGreaterThan(0);
  });

  it("isola cálculos por representante", async () => {
    await governanceService.calculateCommission({ policyId: "pol-1", representativeId: "u2", input: { valorBase: 100 }, metadata: { clienteId: "c1" } }, ORG);
    await governanceService.calculateCommission({ policyId: "pol-1", representativeId: "u3", input: { valorBase: 200 }, metadata: { clienteId: "c2" } }, ORG);
    const mine = await governanceService.getCalculations(ORG, "u2");
    expect(mine.every((c) => c.representativeId === "u2")).toBe(true);
  });
});