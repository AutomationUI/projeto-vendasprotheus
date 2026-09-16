// ─── Decision Flow Studio — Modelagem Visual Versionada ───────────────────
// Área para o Super Admin modelar fluxos de decisão (tipo BPMN) com:
// início, fim, decisões, condições, cálculos, ações, validações e exceções.
// Os fluxos são versionados e auditáveis, e o motor de decisão é determinístico.
//
// Este módulo é puro (sem dependência de React/DB) para reuso no backend.

import type { RuleExpression, RuleAction } from "./governance";
import type { CalculationInput } from "../lib/commission-engine";
import { evaluateExpression } from "../lib/commission-engine";

// ─── Tipos de nós do fluxo ────────────────────────────────────────────────
export type FlowNodeType = "inicio" | "fim" | "decisao" | "acao" | "calculo" | "regra" | "validador";

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  label: string;
  // Para "decisao": condição avaliada no nó (determinística)
  condition?: RuleExpression;
  // Para "acao"/"regra": ações a executar quando o nó é atingido
  actions?: RuleAction[];
  // Para "calculo": fórmula descritiva (também persiste versão)
  formula?: string;
  // Validação/exceção
  throwIf?: RuleExpression;
  message?: string;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  // Rótulo do ramo: "sim", "não", ou outro
  label?: string;
  // condição opcional no ramo (case de decisão)
  condition?: RuleExpression;
}

export type DecisionFlowStatus = "rascunho" | "publicado" | "desativado" | "arquivado";

export interface DecisionFlow {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  startNodeId: string;
  status: DecisionFlowStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ─── Resultado da execução ────────────────────────────────────────────────
export interface FlowExecutionTrace {
  nodeId: string;
  nodeLabel: string;
  result: "pula" | "para" | "bloqueado";
  message?: string;
}

export interface FlowExecutionResult {
  success: boolean;
  blocked: boolean;
  executedNodes: FlowExecutionTrace[];
  reachedEnd: boolean;
  accumulatedActions: RuleAction[];
}

// ─── Motor determinístico de fluxo ────────────────────────────────────────
// Executa o grafo: começa em startNodeId, segue edges, avalia decisões e
// acumula ações. Não depende de IA — execução 100% determinística e auditável.

function evaluateActions(
  actions: RuleAction[] | undefined
): RuleAction[] {
  return actions ?? [];
}

export function executeFlow(
  flow: DecisionFlow,
  input: CalculationInput
): FlowExecutionResult {
  const nodeMap = new Map<string, FlowNode>(flow.nodes.map((n) => [n.id, n]));
  // agrupa arestas por origem
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of flow.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge);
    outgoing.set(edge.from, list);
  }

  const trace: FlowExecutionTrace[] = [];
  const accumulatedActions: RuleAction[] = [];
  let currentId = flow.startNodeId;
  const visited = new Set<string>();

  // proteção contra ciclos
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodeMap.get(currentId);
    if (!node) break;

    if (node.type === "fim") {
      trace.push({ nodeId: node.id, nodeLabel: node.label, result: "para" });
      return { success: true, blocked: false, executedNodes: trace, reachedEnd: true, accumulatedActions };
    }

    // validador: se throwIf verdadeiro, bloqueia
    if (node.throwIf) {
      const shouldThrow = evaluateExpression(node.throwIf, input, [], {
        id: flow.id,
        name: node.label,
        version: flow.version,
      });
      if (shouldThrow) {
        trace.push({ nodeId: node.id, nodeLabel: node.label, result: "bloqueado", message: node.message });
        return { success: false, blocked: true, executedNodes: trace, reachedEnd: false, accumulatedActions };
      }
    }

    // acumula ações
    accumulatedActions.push(...evaluateActions(node.actions));

    // ação de bloqueio interrompe o fluxo
    const hasBlock = accumulatedActions.some((a) => a.type === "bloquear");
    if (hasBlock) {
      trace.push({ nodeId: node.id, nodeLabel: node.label, result: "bloqueado", message: node.message ?? "Fluxo bloqueado por ação de restrição" });
      return { success: false, blocked: true, executedNodes: trace, reachedEnd: false, accumulatedActions };
    }

    // decisão: avalia condição própria
    if (node.type === "decisao" && node.condition) {
      const condOk = evaluateExpression(node.condition, input, [], {
        id: flow.id,
        name: node.label,
        version: flow.version,
      });
      // escolhe o ramo: prioriza aresta com condição correspondente, senão rótulo sim/não
      const edges = outgoing.get(currentId) ?? [];
      const chosen = edges.find((e) => e.condition && evaluateExpression(e.condition, input, [], {
        id: flow.id,
        name: node.label,
        version: flow.version,
      })) ?? edges.find((e) => e.label === (condOk ? "sim" : "não"));

      if (!chosen) {
        trace.push({ nodeId: node.id, nodeLabel: node.label, result: "para" });
        break;
      }
      trace.push({ nodeId: node.id, nodeLabel: node.label, result: "pula" });
      currentId = chosen.to;
      continue;
    }

    // nó simples: segue a primeira aresta
    const next = (outgoing.get(currentId) ?? [])[0];
    trace.push({ nodeId: node.id, nodeLabel: node.label, result: "pula" });
    if (!next) {
      trace.push({ nodeId: currentId, nodeLabel: node.label, result: "para" });
      break;
    }
    currentId = next.to;
  }

  return { success: true, blocked: false, executedNodes: trace, reachedEnd: false, accumulatedActions };
}

// ─── Helpers de construção de fluxo ───────────────────────────────────────
export function createFlowNode(id: string, type: FlowNodeType, label: string): FlowNode {
  return { id, type, label };
}

export function connectFlowNodes(from: string, to: string, label?: string): FlowEdge {
  return { id: `e-${from}-${to}`, from, to, label };
}

// ─── Versionamento de fluxos ──────────────────────────────────────────────
export function nextFlowVersion(version: number): number {
  return version + 1;
}