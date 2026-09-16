import { describe, it, expect } from "vitest";
import { Node, Edge } from "reactflow";
import { CRMNodeData } from "@/types/crm-flow";
import {
  validateWorkflow,
  breakCycles,
  removeUnreachableNodes,
  fillDefaultConfigurations,
  cleanDanglingEdges
} from "@/lib/workflow-engine";

// Helper to create test nodes
function createTestNode(
  id: string,
  type: "trigger" | "condition" | "action" | "connector" | "validator" | "operation",
  label: string,
  config: Record<string, any> = {}
): Node<CRMNodeData> {
  return {
    id,
    type: `${type}Node`,
    position: { x: 0, y: 0 },
    data: {
      label,
      type,
      icon: "zap",
      description: `Description for ${label}`,
      config
    }
  };
}

// Helper to create test edges
function createTestEdge(
  source: string,
  target: string,
  id?: string,
  type: string = "stepConnectorEdge"
): Edge {
  return {
    id: id || `edge-${source}-${target}`,
    source,
    target,
    type
  };
}

describe("Workflow Validation Engine", () => {
  describe("Circular Dependencies Detection", () => {
    it("detects direct self-loops (node pointing to itself)", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Disparo Inicial", { source: "CRM Webhook" }),
        createTestNode("action-1", "action", "Notificar Vendedor", { emailTemplate: "Alerta" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "action-1"),
        createTestEdge("action-1", "action-1", "edge-self-loop")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.hasErrors).toBe(true);
      expect(result.cycleNodeIds).toContain("action-1");
      const cycleIssue = result.issues.find((i) => i.category === "cycle");
      expect(cycleIssue).toBeDefined();
      expect(cycleIssue?.type).toBe("error");
      expect(cycleIssue?.nodeId).toBe("action-1");
    });

    it("detects 2-node reciprocal cycles (A -> B -> A)", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Disparo Inicial", { source: "CRM Webhook" }),
        createTestNode("node-a", "action", "Etapa A", { emailTemplate: "Template A" }),
        createTestNode("node-b", "action", "Etapa B", { emailTemplate: "Template B" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "node-a"),
        createTestEdge("node-a", "node-b", "edge-a-b"),
        createTestEdge("node-b", "node-a", "edge-b-a")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.cycleNodeIds.length).toBeGreaterThanOrEqual(2);
      expect(result.cycleNodeIds).toContain("node-a");
      expect(result.cycleNodeIds).toContain("node-b");
    });

    it("detects complex multi-node cycles (A -> B -> C -> A)", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Disparo Inicial", { source: "CRM Webhook" }),
        createTestNode("cond-1", "condition", "Verificar Alçada", {
          field: "Valor",
          operator: ">=",
          value: "10000"
        }),
        createTestNode("op-1", "operation", "Calcular SLA", { formula: "valor * 1.1" }),
        createTestNode("action-1", "action", "Registrar Log", { emailTemplate: "Log" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "cond-1"),
        createTestEdge("cond-1", "op-1"),
        createTestEdge("op-1", "action-1"),
        createTestEdge("action-1", "cond-1", "edge-back-cycle")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.hasErrors).toBe(true);
      const cycleIssues = result.issues.filter((i) => i.category === "cycle");
      expect(cycleIssues.length).toBeGreaterThan(0);
    });

    it("accepts valid Directed Acyclic Graphs (DAG) with diamond branches", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM Webhook" }),
        createTestNode("cond-1", "condition", "Decisão", {
          field: "Status",
          operator: "==",
          value: "Ativo"
        }),
        createTestNode("act-yes", "action", "Ação Sim", { emailTemplate: "Aprovado" }),
        createTestNode("act-no", "action", "Ação Não", { emailTemplate: "Rejeitado" }),
        createTestNode("sync-1", "connector", "ERP Sync", { connectorEndpoint: "/api/sync" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "cond-1"),
        createTestEdge("cond-1", "act-yes"),
        createTestEdge("cond-1", "act-no"),
        createTestEdge("act-yes", "sync-1"),
        createTestEdge("act-no", "sync-1")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.cycleNodeIds.length).toBe(0);
      expect(result.issues.some((i) => i.category === "cycle")).toBe(false);
    });
  });

  describe("Unreachable Nodes Detection", () => {
    it("detects completely isolated nodes", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "API" }),
        createTestNode("action-1", "action", "Ação Conectada", { emailTemplate: "Template" }),
        createTestNode("action-isolated", "action", "Ação Órfã", { emailTemplate: "Órfã" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "action-1")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.unreachableNodeIds).toContain("action-isolated");
      const isolatedIssue = result.issues.find((i) => i.id === "err-isolated-node-action-isolated");
      expect(isolatedIssue).toBeDefined();
      expect(isolatedIssue?.category).toBe("unreachable");
    });

    it("detects disconnected island subgraphs not reachable from triggers", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início Principal", { source: "CRM" }),
        createTestNode("act-main", "action", "Fluxo Principal", { emailTemplate: "T1" }),
        createTestNode("island-1", "condition", "Decisão Ilha", {
          field: "x",
          operator: ">",
          value: "10"
        }),
        createTestNode("island-2", "action", "Ação Ilha", { emailTemplate: "T2" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "act-main"),
        createTestEdge("island-1", "island-2")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.unreachableNodeIds).toContain("island-1");
      expect(result.unreachableNodeIds).toContain("island-2");
    });
  });

  describe("Mandatory Configuration Verification", () => {
    it("requires trigger node to have a defined source or event", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Gatilho Vazio", {}),
        createTestNode("act-1", "action", "Ação", { emailTemplate: "T" })
      ];
      const edges: Edge[] = [createTestEdge("trigger-1", "act-1")];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.missingConfigNodeIds).toContain("trigger-1");
      expect(result.issues.some((i) => i.id === "err-trigger-source-trigger-1")).toBe(true);
    });

    it("requires condition node to have field, operator, and value configured", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("cond-1", "condition", "Decisão Incompleta", { field: "Valor" }),
        createTestNode("act-1", "action", "Ação 1", { emailTemplate: "T1" }),
        createTestNode("act-2", "action", "Ação 2", { emailTemplate: "T2" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "cond-1"),
        createTestEdge("cond-1", "act-1"),
        createTestEdge("cond-1", "act-2")
      ];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.missingConfigNodeIds).toContain("cond-1");
      expect(result.issues.some((i) => i.id === "err-condition-rule-params-cond-1")).toBe(true);
    });

    it("flags error if condition node has 0 outgoing connections", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("cond-1", "condition", "Decisão Beco Sem Saída", {
          field: "Valor",
          operator: ">",
          value: "100"
        })
      ];
      const edges: Edge[] = [createTestEdge("trigger-1", "cond-1")];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.id === "err-condition-no-outputs-cond-1")).toBe(true);
    });

    it("flags error if a node has an empty or placeholder label", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("act-1", "action", "   ", { emailTemplate: "T" })
      ];
      const edges: Edge[] = [createTestEdge("trigger-1", "act-1")];

      const result = validateWorkflow(nodes, edges, { strictMode: true });

      expect(result.isValid).toBe(false);
      expect(result.missingConfigNodeIds).toContain("act-1");
      expect(result.issues.some((i) => i.id === "err-missing-label-act-1")).toBe(true);
    });
  });

  describe("Empty Workflow and Missing Trigger", () => {
    it("flags error when workflow has no nodes", () => {
      const result = validateWorkflow([], [], { strictMode: true });
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.id === "err-empty-workflow")).toBe(true);
    });

    it("flags error when workflow has no trigger node", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("act-1", "action", "Ação Direta", { emailTemplate: "T" })
      ];
      const result = validateWorkflow(nodes, [], { strictMode: true });
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.id === "err-no-trigger")).toBe(true);
    });
  });

  describe("Auto-Fix Capabilities", () => {
    it("removes unreachable and isolated nodes", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("act-main", "action", "Ação Conectada", { emailTemplate: "T1" }),
        createTestNode("act-orphan", "action", "Ação Isolada", { emailTemplate: "T2" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "act-main"),
        createTestEdge("act-orphan", "non-existent")
      ];

      const validation = validateWorkflow(nodes, edges, { strictMode: true });
      expect(validation.unreachableNodeIds).toContain("act-orphan");

      const { nodes: cleanedNodes, edges: cleanedEdges, removedCount } = removeUnreachableNodes(
        nodes,
        edges,
        validation.unreachableNodeIds
      );

      expect(removedCount).toBe(1);
      expect(cleanedNodes.find((n) => n.id === "act-orphan")).toBeUndefined();
      expect(cleanedNodes.length).toBe(2);
      expect(cleanedEdges.find((e) => e.source === "act-orphan")).toBeUndefined();
    });

    it("breaks circular dependencies by removing back-edges", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("node-a", "action", "Etapa A", { emailTemplate: "T1" }),
        createTestNode("node-b", "action", "Etapa B", { emailTemplate: "T2" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "node-a"),
        createTestEdge("node-a", "node-b", "edge-forward"),
        createTestEdge("node-b", "node-a", "edge-cycle-back")
      ];

      const validation = validateWorkflow(nodes, edges, { strictMode: true });
      expect(validation.cycleNodeIds.length).toBeGreaterThan(0);

      const cycleIssues = validation.issues.filter((i) => i.category === "cycle" && i.edgeId);
      const cycleEdgeIds = cycleIssues.map((i) => i.edgeId as string);

      const { edges: repairedEdges, removedCount } = breakCycles(edges, cycleEdgeIds);

      expect(removedCount).toBeGreaterThan(0);
      expect(repairedEdges.find((e) => e.id === "edge-cycle-back")).toBeUndefined();

      // Post-repair check: graph is now acyclic
      const postValidation = validateWorkflow(nodes, repairedEdges, { strictMode: true });
      expect(postValidation.cycleNodeIds.length).toBe(0);
    });

    it("fills default configurations for nodes with missing mandatory settings", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", {}),
        createTestNode("cond-1", "condition", "Decisão", {}),
        createTestNode("act-1", "action", "Ação", {})
      ];

      const filledNodes = fillDefaultConfigurations(nodes);

      expect(filledNodes.length).toBe(3);
      const filledTrigger = filledNodes.find((n) => n.id === "trigger-1");
      expect(filledTrigger?.data.config.source).toBeDefined();

      const filledCond = filledNodes.find((n) => n.id === "cond-1");
      expect(filledCond?.data.config.field).toBeDefined();
      expect(filledCond?.data.config.operator).toBeDefined();

      const filledAct = filledNodes.find((n) => n.id === "act-1");
      expect(filledAct?.data.config.actionOutcome).toBeDefined();
    });

    it("cleans dangling edges that reference non-existent nodes", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("trigger-1", "trigger", "Início", { source: "CRM" }),
        createTestNode("act-1", "action", "Ação", { emailTemplate: "T" })
      ];
      const edges: Edge[] = [
        createTestEdge("trigger-1", "act-1"),
        createTestEdge("act-1", "deleted-node", "dangling-edge-1"),
        createTestEdge("non-existent-source", "trigger-1", "dangling-edge-2")
      ];

      const { edges: cleanedEdges, removedCount } = cleanDanglingEdges(nodes, edges);

      expect(removedCount).toBe(2);
      expect(cleanedEdges.length).toBe(1);
      expect(cleanedEdges[0].id).toBe("edge-trigger-1-act-1");
    });
  });

  describe("Pre-Save Validation Engine Integration", () => {
    it("ensures a fully valid custom workflow passes validation before saving", () => {
      const nodes: Node<CRMNodeData>[] = [
        createTestNode("start", "trigger", "Início do Pedido", {
          source: "CRM Protheus",
          protheusSyncEnabled: true,
          protheusTable: "SC5 - Pedidos de Venda"
        }),
        createTestNode("check-credit", "condition", "Validar Limite de Crédito", {
          field: "Saldo de Crédito",
          operator: ">=",
          value: "Valor do Pedido"
        }),
        createTestNode("auto-approve", "action", "Aprovar Imediatamente", {
          emailTemplate: "Notificação de Faturamento",
          actionOutcome: "Aprovado no Protheus"
        }),
        createTestNode("manual-review", "action", "Encaminhar para Mesa de Crédito", {
          assigneeGroup: "Controladoria & Crédito",
          actionOutcome: "Encaminhado para Análise"
        })
      ];
      const edges: Edge[] = [
        createTestEdge("start", "check-credit"),
        createTestEdge("check-credit", "auto-approve", "edge-yes"),
        createTestEdge("check-credit", "manual-review", "edge-no")
      ];

      const validation = validateWorkflow(nodes, edges, { strictMode: true });

      expect(validation.isValid).toBe(true);
      expect(validation.hasErrors).toBe(false);
      expect(validation.errorsCount).toBe(0);
      expect(validation.cycleNodeIds.length).toBe(0);
      expect(validation.unreachableNodeIds.length).toBe(0);
      expect(validation.missingConfigNodeIds.length).toBe(0);
    });
  });
});
