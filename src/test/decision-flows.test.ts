import { describe, it, expect } from "vitest";
import {
  executeFlow,
  createFlowNode,
  connectFlowNodes,
  nextFlowVersion,
  type DecisionFlow,
} from "@/types/decision-flows";

function buildCommissionFlow(): DecisionFlow {
  // INICIO -> [PRODUTO PERMITIDO?] sim -> [META ATINGIDA?] sim -> [BÔNUS] -> FIM
  //                          não -> BLOQUEAR
  const inicio = createFlowNode("inicio", "inicio", "Início");
  const produtoPermitido = createFlowNode("produto", "decisao", "Produto Permitido?");
  produtoPermitido.condition = {
    combinator: "and",
    conditions: [{ field: "categoria_produto", operator: "neq", value: "Restrito" }],
  };
  const metaAtingida = createFlowNode("meta", "decisao", "Meta Atingida?");
  metaAtingida.condition = {
    combinator: "and",
    conditions: [{ field: "meta_atingimento", operator: "gte", value: 100 }],
  };
  const bonus = createFlowNode("bonus", "acao", "Bônus");
  bonus.actions = [{ type: "bonus", percentual: 1 }];
  const bloquear = createFlowNode("bloquear", "acao", "Bloquear");
  bloquear.actions = [{ type: "bloquear" }];
  const fim = createFlowNode("fim", "fim", "Fim");

  return {
    id: "flow-1",
    organizationId: "org-1",
    name: "Fluxo de Comissão Premium",
    nodes: [inicio, produtoPermitido, metaAtingida, bonus, bloquear, fim],
    edges: [
      connectFlowNodes("inicio", "produto", "->"),
      connectFlowNodes("produto", "meta", "sim"),
      connectFlowNodes("produto", "bloquear", "não"),
      connectFlowNodes("meta", "bonus", "sim"),
      connectFlowNodes("meta", "fim", "não"),
      connectFlowNodes("bonus", "fim", "->"),
      connectFlowNodes("bloquear", "fim", "->"),
    ],
    startNodeId: "inicio",
    status: "publicado",
    version: 3,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  };
}

describe("executeFlow", () => {
  it("percorre caminho feliz: produto permitido + meta atingida → bônus", () => {
    const flow = buildCommissionFlow();
    const result = executeFlow(flow, {
      valorBase: 100000,
      categoriaProduto: "Premium",
      metaAtingimento: 108,
    });

    expect(result.success).toBe(true);
    expect(result.reachedEnd).toBe(true);
    expect(result.blocked).toBe(false);
    expect(result.accumulatedActions).toContainEqual({ type: "bonus", percentual: 1 });
  });

  it("bloqueia quando produto não permitido", () => {
    const flow = buildCommissionFlow();
    const result = executeFlow(flow, {
      valorBase: 100000,
      categoriaProduto: "Restrito",
      metaAtingimento: 108,
    });

    expect(result.success).toBe(false);
    expect(result.blocked).toBe(true);
  });

  it("acumula trace auditável dos nós executados", () => {
    const flow = buildCommissionFlow();
    const result = executeFlow(flow, {
      valorBase: 100,
      categoriaProduto: "Premium",
      metaAtingimento: 100,
    });
    expect(result.executedNodes.length).toBeGreaterThan(0);
    expect(result.executedNodes.some((n) => n.nodeLabel === "Bônus")).toBe(true);
  });
});

describe("versionamento de fluxos", () => {
  it("incrementa versão", () => {
    expect(nextFlowVersion(3)).toBe(4);
  });
});