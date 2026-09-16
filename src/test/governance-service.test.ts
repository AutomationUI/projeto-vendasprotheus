import { describe, it, expect } from "vitest";
import { GovernanceService } from "../../server/src/services/governance.service";
import type {
  CommercialRule,
  CommissionPolicy,
  RepresentativeEnvironment,
} from "@/types/governance";

const orgId = "org-1";

function makePolicy(): CommissionPolicy {
  return {
    id: "pol-1",
    organizationId: orgId,
    name: "Comissão Padrão",
    comissaoBase: 5,
    releasePolicy: "pedido",
    ruleIds: ["rule-premium"],
    version: 1,
    status: "ativa",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

function makePremiumRule(): CommercialRule {
  return {
    id: "rule-premium",
    organizationId: orgId,
    name: "Comissão Premium v3",
    expression: {
      combinator: "and",
      conditions: [
        { field: "margem", operator: "gte", value: 20 },
        { field: "meta_atingimento", operator: "gte", value: 100 },
      ],
    },
    actions: [{ type: "bonus", percentual: 1 }],
    priority: 10,
    status: "ativa",
    version: 3,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("GovernanceService — persistência offline-first", () => {
  it("salva e lista representantes por organização", () => {
    const svc = new GovernanceService();
    const rep: RepresentativeEnvironment = {
      id: "rep-1",
      organizationId: orgId,
      representativeId: "u2",
      codigo: "REP-001",
      regiao: "SP Capital",
      segmentos: ["Cerâmica", "Abrasivos"],
      ativo: true,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    };
    svc.saveRepresentative(orgId, rep);
    expect(svc.listRepresentatives(orgId)).toHaveLength(1);
    // isolamento: outra organização não vê o representante
    expect(svc.listRepresentatives("org-2")).toHaveLength(0);
  });

  it("versiona regra sem sobrescrever a versão usada em cálculos", () => {
    const svc = new GovernanceService();
    const rule = makePremiumRule();
    svc.saveRule(orgId, rule);

    const newVersion = svc.createRuleVersion(orgId, "rule-premium", {
      name: "Comissão Premium v4",
      actions: [{ type: "bonus", percentual: 2 }],
    });

    expect(newVersion.version).toBe(4);
    expect(newVersion.status).toBe("rascunho");

    // versão anterior arquivada (não ativa) → não entra em novos cálculos
    const archived = svc.getRule(orgId, "rule-premium");
    expect(archived?.status).toBe("arquivada");
  });

  it("calcula comissão oficial de forma determinística e auditável", () => {
    const svc = new GovernanceService();
    svc.saveRule(orgId, makePremiumRule());
    svc.savePolicy(orgId, makePolicy());

    const calc = svc.calculateCommission(orgId, "pol-1", "u2", {
      valorBase: 100000,
      margem: 24,
      metaAtingimento: 108,
    }, { clienteId: "cli-1" });

    expect(calc.comissaoFinalPercentual).toBe(6);
    expect(calc.comissaoValor).toBe(6000);
    expect(calc.status).toBe("prevista");
    expect(calc.appliedRuleIds).toContain("rule-premium");
    expect(calc.appliedRuleVersions["rule-premium"]).toBe(3);
    expect(calc.trace.length).toBeGreaterThan(0);
    expect(calc.events[0].to).toBe("prevista");
  });

  it("isola cálculos por representante", () => {
    const svc = new GovernanceService();
    svc.saveRule(orgId, makePremiumRule());
    svc.savePolicy(orgId, makePolicy());

    svc.calculateCommission(orgId, "pol-1", "u2", { valorBase: 100 }, { clienteId: "cli-1" });
    svc.calculateCommission(orgId, "pol-1", "u3", { valorBase: 200 }, { clienteId: "cli-2" });

    expect(svc.listCalculations(orgId, "u2")).toHaveLength(1);
    expect(svc.listCalculations(orgId, "u2")[0].representativeId).toBe("u2");
  });

  it("permite transição de status da comissão para liberada/a_pagar registrando eventos", () => {
    const svc = new GovernanceService();
    svc.saveRule(orgId, makePremiumRule());
    svc.savePolicy(orgId, makePolicy());

    const calc = svc.calculateCommission(orgId, "pol-1", "u2", { valorBase: 50000, margem: 25, metaAtingimento: 100 }, { clienteId: "cli-1" });
    expect(calc.status).toBe("prevista");

    // Transiciona para liberada
    calc.status = "liberada";
    calc.events.push({
      id: "ev-2",
      comissaoId: calc.id,
      from: "prevista",
      to: "liberada",
      responsavel: "Gerente Vendas",
      observacao: "Aprovada e liberada para pagamento",
      dataHora: new Date().toISOString(),
    });

    const updated = svc.listCalculations(orgId).find((c) => c.id === calc.id);
    expect(updated?.status).toBe("liberada");
    expect(updated?.events).toHaveLength(2);
    expect(updated?.events[1].to).toBe("liberada");
  });
});