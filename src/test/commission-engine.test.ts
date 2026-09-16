import { describe, it, expect } from "vitest";
import {
  calculateCommission,
  evaluateCondition,
  evaluateExpression,
  selectApplicableRules,
  promoteRule,
  canTransitionCommission,
  nextRuleVersion,
} from "@/lib/commission-engine";
import type {
  CommercialRule,
  CommissionPolicy,
} from "@/types/governance";

// ─── Fixtures ─────────────────────────────────────────────────────────────

const basePolicy: CommissionPolicy = {
  id: "pol-1",
  organizationId: "org-1",
  name: "Comissão Padrão",
  comissaoBase: 5,
  releasePolicy: "pedido",
  ruleIds: [],
  version: 1,
  status: "ativa",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function makeRule(partial: Partial<CommercialRule>): CommercialRule {
  return {
    id: partial.id ?? "rule-1",
    organizationId: "org-1",
    name: partial.name ?? "Regra",
    expression: partial.expression ?? { combinator: "and", conditions: [] },
    actions: partial.actions ?? [],
    priority: partial.priority ?? 0,
    status: partial.status ?? "ativa",
    version: partial.version ?? 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

// ─── Testes de condições ──────────────────────────────────────────────────

describe("evaluateCondition", () => {
  it("compara margem com operador gte", () => {
    expect(
      evaluateCondition({ field: "margem", operator: "gte", value: 20 }, { margem: 24, valorBase: 1000 })
    ).toBe(true);

    expect(
      evaluateCondition({ field: "margem", operator: "gte", value: 30 }, { margem: 24, valorBase: 1000 })
    ).toBe(false);
  });

  it("compara meta de atingimento", () => {
    expect(
      evaluateCondition({ field: "meta_atingimento", operator: "gte", value: 100 }, { metaAtingimento: 108, valorBase: 1000 })
    ).toBe(true);
  });

  it("suporta operador in", () => {
    expect(
      evaluateCondition({ field: "categoria_produto", operator: "in", value: ["Premium", "Plus"] }, { categoriaProduto: "Premium", valorBase: 1000 })
    ).toBe(true);

    expect(
      evaluateCondition({ field: "categoria_produto", operator: "in", value: ["Básico"] }, { categoriaProduto: "Premium", valorBase: 1000 })
    ).toBe(false);
  });
});

// ─── Testes de expressões combinadas ──────────────────────────────────────

describe("evaluateExpression", () => {
  const rule = makeRule({ id: "r", name: "R" });

  it("AND: todas devem ser verdadeiras", () => {
    const expr = {
      combinator: "and" as const,
      conditions: [
        { field: "margem" as const, operator: "gte" as const, value: 20 },
        { field: "meta_atingimento" as const, operator: "gte" as const, value: 100 },
      ],
    };
    expect(evaluateExpression(expr, { margem: 24, metaAtingimento: 108, valorBase: 1000 }, [], rule)).toBe(true);
    expect(evaluateExpression(expr, { margem: 10, metaAtingimento: 108, valorBase: 1000 }, [], rule)).toBe(false);
  });

  it("OR: basta uma verdadeira", () => {
    const expr = {
      combinator: "or" as const,
      conditions: [
        { field: "margem" as const, operator: "gte" as const, value: 20 },
        { field: "meta_atingimento" as const, operator: "gte" as const, value: 100 },
      ],
    };
    expect(evaluateExpression(expr, { margem: 10, metaAtingimento: 108, valorBase: 1000 }, [], rule)).toBe(true);
  });
});

// ─── Testes do cálculo determinístico ─────────────────────────────────────

describe("calculateCommission", () => {
  it("aplica bônus de meta quando regra Premium + margem são satisfeitas", () => {
    const rule = makeRule({
      id: "rule-premium",
      name: "Comissão Premium v3",
      version: 3,
      priority: 10,
      expression: {
        combinator: "and",
        conditions: [
          { field: "margem", operator: "gte", value: 20 },
          { field: "meta_atingimento", operator: "gte", value: 100 },
        ],
      },
      actions: [{ type: "bonus", percentual: 1 }],
    });

    const result = calculateCommission(basePolicy, [rule], {
      valorBase: 100000,
      margem: 24,
      metaAtingimento: 108,
    });

    expect(result.comissaoBasePercentual).toBe(5);
    expect(result.bonusPercentual).toBe(1);
    expect(result.comissaoFinalPercentual).toBe(6);
    expect(result.comissaoValor).toBe(6000);
    expect(result.blocked).toBe(false);
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0].version).toBe(3);
  });

  it("não aplica bônus quando condições não são satisfeitas (determinístico)", () => {
    const rule = makeRule({
      id: "rule-premium",
      name: "Comissão Premium v3",
      version: 3,
      priority: 10,
      expression: {
        combinator: "and",
        conditions: [{ field: "margem", operator: "gte", value: 20 }],
      },
      actions: [{ type: "bonus", percentual: 1 }],
    });

    const result = calculateCommission(basePolicy, [rule], {
      valorBase: 100000,
      margem: 15,
    });

    expect(result.bonusPercentual).toBe(0);
    expect(result.comissaoValor).toBe(5000);
    expect(result.appliedRules).toHaveLength(0);
  });

  it("registra trace completo para auditoria", () => {
    const rule = makeRule({
      id: "rule-premium",
      name: "Premium",
      version: 3,
      expression: {
        combinator: "and",
        conditions: [{ field: "margem", operator: "gte", value: 20 }],
      },
      actions: [{ type: "bonus", percentual: 1 }],
    });

    const result = calculateCommission(basePolicy, [rule], { valorBase: 100, margem: 24 });
    expect(result.trace.length).toBeGreaterThan(0);
    expect(result.trace[0]).toMatchObject({ ruleId: "rule-premium", matched: true });
  });

  it("bloqueia quando regra de bloqueio é satisfeita", () => {
    const rule = makeRule({
      id: "rule-block",
      name: "Bloqueio produto restrito",
      expression: {
        combinator: "and",
        conditions: [{ field: "categoria_produto", operator: "eq", value: "Restrito" }],
      },
      actions: [{ type: "bloquear" }],
    });

    const result = calculateCommission(basePolicy, [rule], {
      valorBase: 1000,
      categoriaProduto: "Restrito",
    });

    expect(result.blocked).toBe(true);
    expect(result.comissaoValor).toBe(0);
    expect(result.blockReasons).toContain("Bloqueio produto restrito");
  });

  it("seleciona regras pela prioridade mais alta primeiro", () => {
    const low = makeRule({ id: "low", name: "Low", priority: 1, expression: { combinator: "and", conditions: [] }, actions: [{ type: "bonus", percentual: 1 }] });
    const high = makeRule({ id: "high", name: "High", priority: 10, expression: { combinator: "and", conditions: [] }, actions: [{ type: "bonus", percentual: 2 }] });

    const applicable = selectApplicableRules([low, high], { valorBase: 100 });
    expect(applicable[0].rule.id).toBe("high");
  });
});

// ─── Versionamento ────────────────────────────────────────────────────────

describe("versionamento de regras", () => {
  it("promove estatutos sem permitir retrocesso", () => {
    const rule = makeRule({ status: "rascunho" });
    const published = promoteRule(rule, "publicada");
    expect(published.status).toBe("publicada");

    const active = promoteRule(published, "ativa");
    expect(active.status).toBe("ativa");

    // Tentar regredir de "ativa" para "publicada" deve lançar erro
    expect(() => promoteRule(active, "publicada")).toThrow();
  });

  it("não permite sobrescrever versão usada", () => {
    expect(nextRuleVersion(3)).toBe(4);
  });

  it("valida transições do ciclo de comissão", () => {
    expect(canTransitionCommission("rascunho", "prevista")).toBe(true);
    expect(canTransitionCommission("paga", "liberada")).toBe(false);
  });
});