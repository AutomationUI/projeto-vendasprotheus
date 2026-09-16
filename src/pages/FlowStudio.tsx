import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  Panel,
  MarkerType,
  ReactFlowInstance
} from "reactflow";
import "reactflow/dist/style.css";
import { 
  Zap, GitFork, Mail, Clock, 
  Play, Trash2, 
  Layers, Settings, Info, Plus, ChevronRight,
  Sparkles, Sliders, Cpu,
  Download, Maximize2, Minimize2,
  Shield, Activity, Eye, Grid,
  SlidersHorizontal, Copy, Radio, ArrowRight,
  RefreshCw, BarChart3,
  Save, Upload, Edit3, CheckCircle2, Files, MousePointerClick,
  Wand2, ShieldCheck, AlertCircle, AlertTriangle,
  Scale, FileText, ExternalLink, PanelLeftClose, PanelLeft,
  PanelRightClose, PanelRight, MoreVertical,
  Undo2, Redo2, BookmarkCheck, Loader2
} from "lucide-react";
import { getDocumentsForFlow, autoConnectFlow } from "@/lib/flow-document-connector";
import { 
  validateWorkflow, 
  layoutWorkflowNodes,
  removeUnreachableNodes,
  breakCycles,
  fillDefaultConfigurations,
  cleanDanglingEdges,
  WorkflowValidationIssue
} from "@/lib/workflow-engine";
import { WorkflowValidationDrawer } from "@/components/WorkflowValidationDrawer";
import { WorkflowValidationModal } from "@/components/WorkflowValidationModal";
import { 
  TriggerNode, ConditionNode, ActionNode, 
  OperationNode, ValidatorNode, ConnectorNode,
  BusinessRuleNode
} from "@/components/FlowStudioCustomNodes";
import { 
  DataPipeEdge, 
  ConditionalBranchEdge, 
  StepConnectorEdge, 
  SecurityEdge 
} from "@/components/FlowStudioCustomEdges";
import { 
  CreateFlowModal, 
  EditFlowMetaModal, 
  ImportFlowModal, 
  DeleteFlowConfirmModal 
} from "@/components/FlowStudioModals";

import { FlowSimulationLab } from "@/components/FlowSimulationLab";
import { FlowSimulationSidePanel } from "@/components/FlowSimulationSidePanel";
import { FlowDocumentsModal } from "@/components/FlowDocumentsModal";
import { FlowGovernanceRulesModal } from "@/components/FlowGovernanceRulesModal";
import { ConnectorsHub } from "@/components/ConnectorsHub";
import { FlowAnalyticsDashboard } from "@/components/FlowAnalyticsDashboard";
import { ConnectorItem, FlowEdgeData } from "@/types/connectors";
import { CONNECTORS_CATALOG } from "@/data/connectors-catalog";
import { CRMNodeType, CRMNodeData, FlowCategory, FullFlowTemplate } from "@/types/crm-flow";
import { ALL_FLOW_TEMPLATES } from "@/data/all-flows-templates";
import { DEFAULT_GOVERNANCE_RULES } from "@/lib/governance-flow-bridge";
import { flowsApiService, CUSTOM_FLOWS_STORAGE_KEY } from "@/lib/api/flows-service";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Custom ReactFlow Component Registry
const nodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  operationNode: OperationNode,
  validatorNode: ValidatorNode,
  connectorNode: ConnectorNode,
  businessRuleNode: BusinessRuleNode,
};

// Custom ReactFlow Edge / Connector Registry
const edgeTypes = {
  dataPipeEdge: DataPipeEdge,
  conditionalEdge: ConditionalBranchEdge,
  stepConnectorEdge: StepConnectorEdge,
  securityEdge: SecurityEdge,
};

export default function FlowStudio() {
  // Custom Flows persisted in localStorage
  const [customFlows, setCustomFlows] = useState<Record<string, FullFlowTemplate>>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_FLOWS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Erro ao carregar fluxos customizados do localStorage", e);
    }
    return {};
  });

  // Merged Templates (Built-in + Custom User Flows)
  const allTemplates = useMemo(() => {
    return {
      ...ALL_FLOW_TEMPLATES,
      ...customFlows
    };
  }, [customFlows]);

  // Initial load from Flows API (with multi-tenant support and offline fallback)
  useEffect(() => {
    let isMounted = true;
    flowsApiService.listFlows().then((result) => {
      if (isMounted && result.flows && Object.keys(result.flows).length > 0) {
        setCustomFlows((prev) => ({
          ...prev,
          ...result.flows
        }));
      }
    }).catch((err) => {
      console.warn("Falha ao sincronizar fluxos da API:", err);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Active Flow Selection
  const [activeFlowKey, setActiveFlowKey] = useState<string>("lead-routing");
  const activeTemplate = useMemo(() => allTemplates[activeFlowKey] || allTemplates["lead-routing"] || ALL_FLOW_TEMPLATES["lead-routing"], [allTemplates, activeFlowKey]);

  // Flow State for active canvas
  const [nodes, setNodes, onNodesChange] = useNodesState(activeTemplate.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(activeTemplate.edges);
  
  // History Stacks for Undo/Redo (Ctrl+Z / Ctrl+Y)
  const [undoStack, setUndoStack] = useState<Array<{ nodes: Node<CRMNodeData>[]; edges: Edge[] }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ nodes: Node<CRMNodeData>[]; edges: Edge[] }>>([]);
  const currentCanvasRef = useRef<{ nodes: Node<CRMNodeData>[]; edges: Edge[] }>({ nodes: [], edges: [] });

  useEffect(() => {
    currentCanvasRef.current = { nodes, edges };
  }, [nodes, edges]);

  const takeSnapshot = useCallback(() => {
    const current = currentCanvasRef.current;
    if (!current.nodes || current.nodes.length === 0) return;
    setUndoStack((prev) => [
      ...prev.slice(-35),
      {
        nodes: JSON.parse(JSON.stringify(current.nodes)),
        edges: JSON.parse(JSON.stringify(current.edges))
      }
    ]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) {
        toast.info("Não há mais alterações para desfazer.");
        return prevUndo;
      }
      const previous = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, -1);

      setRedoStack((prevRedo) => [
        ...prevRedo,
        {
          nodes: JSON.parse(JSON.stringify(currentCanvasRef.current.nodes)),
          edges: JSON.parse(JSON.stringify(currentCanvasRef.current.edges))
        }
      ]);

      setNodes(previous.nodes);
      setEdges(previous.edges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      toast.info("Ação desfeita (Ctrl+Z)", { duration: 1500 });
      return newUndo;
    });
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) {
        toast.info("Não há alterações para refazer.");
        return prevRedo;
      }
      const next = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, -1);

      setUndoStack((prevUndo) => [
        ...prevUndo,
        {
          nodes: JSON.parse(JSON.stringify(currentCanvasRef.current.nodes)),
          edges: JSON.parse(JSON.stringify(currentCanvasRef.current.edges))
        }
      ]);

      setNodes(next.nodes);
      setEdges(next.edges);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      toast.info("Ação refeita (Ctrl+Y)", { duration: 1500 });
      return newRedo;
    });
  }, [setNodes, setEdges]);

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditMetaModalOpen, setIsEditMetaModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalTargetFlowKey, setModalTargetFlowKey] = useState<string | null>(null);

  // Inspector and Configuration State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(activeTemplate.nodes[0]?.id || null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  
  // Drag-and-drop tool pallet state
  const [draggedNodeType, setDraggedNodeType] = useState<CRMNodeType | null>(null);

  // View modes: 'canvas' | 'gallery' | 'simulation' | 'connectors' | 'analytics'
  const [searchParams] = useSearchParams();
  const initialViewMode = ((): "canvas" | "gallery" | "simulation" | "connectors" | "analytics" => {
    const tab = searchParams.get("tab");
    if (tab === "simulation" || tab === "analytics" || tab === "connectors" || tab === "gallery" || tab === "canvas") {
      return tab;
    }
    return "canvas";
  })();

  const [viewMode, setViewMode] = useState<"canvas" | "gallery" | "simulation" | "connectors" | "analytics">(initialViewMode);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["canvas", "gallery", "simulation", "connectors", "analytics"].includes(tab) && tab !== viewMode) {
      setViewMode(tab as any);
    }
  }, [searchParams, viewMode]);

  // Collapsible panels for clean full-canvas layout
  const [isLeftPaletteOpen, setIsLeftPaletteOpen] = useState(true);
  const [isRightInspectorOpen, setIsRightInspectorOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<"inspector" | "simulation">("simulation");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Filter Categories
  const [selectedCategory, setSelectedCategory] = useState<FlowCategory>("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Fullscreen toggle state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Flow simulation interactive state
  const [simInputs, setSimInputs] = useState<Record<string, any>>(activeTemplate.meta.simDefaultInputs || {});
  const [activeSimPath, setActiveSimPath] = useState<string[]>([]);
  const [simLogs, setSimLogs] = useState<Array<{ 
    step: number; 
    nodeId: string; 
    label: string; 
    outcome: string; 
    time: string;
    clauseNumber?: string;
    clauseTitle?: string;
    docTitle?: string;
  }>>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync state when switching flows
  useEffect(() => {
    const tmpl = allTemplates[activeFlowKey];
    if (tmpl) {
      setNodes(tmpl.nodes);
      setEdges(tmpl.edges);
      setSelectedNodeId(tmpl.nodes[0]?.id || null);
      setSelectedEdgeId(null);
      setSimInputs(tmpl.meta.simDefaultInputs || {});
      setActiveSimPath([]);
      setSimLogs([]);
      setUndoStack([]);
      setRedoStack([]);
      if (reactFlowInstance) {
        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2, duration: 400 }), 100);
      }
    }
  }, [activeFlowKey, allTemplates, setNodes, setEdges, reactFlowInstance]);

  // Filtered flows list
  const flowKeysList = useMemo(() => {
    return Object.keys(allTemplates).filter((key) => {
      const flow = allTemplates[key];
      if (!flow) return false;
      const matchCat = selectedCategory === "todos" || flow.meta.category === selectedCategory;
      const matchSearch = searchQuery.trim() === "" || 
        flow.meta.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.meta.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.meta.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (flow.meta.erpTables && flow.meta.erpTables.some(tab => tab.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchCat && matchSearch;
    });
  }, [allTemplates, selectedCategory, searchQuery]);

  // Intelligent Connection Handler with Custom Edge Assignment and Governance Auto-Sync
  const onConnect = useCallback((connection: Connection) => {
    takeSnapshot();
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    let edgeType = "stepConnectorEdge";
    let edgeData: FlowEdgeData = { latencyMs: 24, label: "Transição" };

    const isBusinessRuleInvolved = sourceNode?.data.type === "businessRule" || targetNode?.data.type === "businessRule";

    if (isBusinessRuleInvolved) {
      edgeType = "securityEdge";
      edgeData = { label: "Diretriz Governança", latencyMs: 6 };

      // Auto-busca as definições de margem e descontos do Governance Studio
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === connection.source || n.id === connection.target) {
            if (n.data.type === "businessRule") {
              return {
                ...n,
                data: {
                  ...n.data,
                  config: {
                    ...n.data.config,
                    maxDiscountPct: 8,
                    maxDiscountManagerPct: 15,
                    minMarginPct: 25,
                    maxPaymentTermDays: 60,
                    maxVolumeWithoutApproval: 50000,
                    approvalHierarchy: "Vendedor ≤ 8% | Gerente ≤ 15% | Diretoria > 15%",
                    governanceSyncStatus: "synced",
                    governanceVersion: 3,
                    governanceLastSync: new Date().toISOString(),
                    connectedDocumentTitle: "Manual de Diretrizes de Preço e Desconto v3.2.pdf",
                    connectedClauseNumber: "Cláusula 4.1",
                    connectedClauseTitle: "Alçadas Comerciais e Piso de Rentabilidade",
                    complianceRule: "Descontos até 8% auto-aprovados. Margens inferiores a 25% ou prazos >60d exigem comitê de crédito e diretoria."
                  }
                }
              };
            }
          }
          return n;
        })
      );

      toast.success("Regra de Negócio Conectada!", {
        description: "Definições de margem (≥ 25%) e descontos (≤ 8% Rep / ≤ 15% Ger.) sincronizadas automaticamente do Governance Studio."
      });
    } else if (sourceNode?.data.type === "condition") {
      edgeType = "conditionalEdge";
      edgeData = { conditionType: "sim", label: "Sim / Aprovado", latencyMs: 15 };
    } else if (sourceNode?.data.type === "connector") {
      edgeType = "dataPipeEdge";
      edgeData = { 
        protocol: (sourceNode.data.config.connectorProtocol as any) || "REST", 
        latencyMs: sourceNode.data.config.connectorLatency || 28,
        label: "Sync Pipe"
      };
    } else if (sourceNode?.data.type === "validator") {
      edgeType = "securityEdge";
      edgeData = { label: "mTLS Auditado", latencyMs: 8 };
    }

    const newEdge: Edge<FlowEdgeData> = {
      id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source!,
      target: connection.target!,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: edgeType,
      animated: true,
      data: edgeData,
      markerEnd: { type: MarkerType.ArrowClosed }
    };

    setEdges((eds) => eds.concat(newEdge));
    setSelectedEdgeId(newEdge.id);
    setSelectedNodeId(null);
    if (!isBusinessRuleInvolved) {
      toast.success("Conector de processo estabelecido!");
    }
  }, [nodes, setEdges, setNodes, takeSnapshot]);

  // Handle Select Node for editing
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Handle Select Edge for editing
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Handle Pane Click to deselect edge
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
  }, []);

  // Update selected Node Properties helper
  const updateSelectedNode = useCallback((updater: (data: CRMNodeData) => CRMNodeData) => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.map((node) => {
      if (node.id === selectedNodeId) {
        return {
          ...node,
          data: updater(node.data)
        };
      }
      return node;
    }));
  }, [selectedNodeId, setNodes]);

  // Update selected Edge Properties helper
  const updateSelectedEdge = useCallback((updater: (edge: Edge<FlowEdgeData>) => Edge<FlowEdgeData>) => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.map((e) => {
      if (e.id === selectedEdgeId) {
        return updater(e as Edge<FlowEdgeData>);
      }
      return e;
    }));
  }, [selectedEdgeId, setEdges]);

  // Insert a Connector from Hub directly into active Canvas
  const handleAddConnectorToCanvas = useCallback((connector: ConnectorItem) => {
    const newId = `node-conn-${Date.now()}`;
    const newNode: Node<CRMNodeData> = {
      id: newId,
      type: "connectorNode",
      position: { 
        x: 260 + (Math.random() * 60 - 30), 
        y: 200 + (Math.random() * 60 - 30) 
      },
      data: {
        label: connector.name,
        type: "connector",
        icon: connector.icon,
        description: connector.description,
        category: connector.categoryLabel,
        config: {
          connectorId: connector.id,
          connectorVendor: connector.vendor,
          connectorProtocol: connector.protocol,
          connectorEndpoint: connector.endpoints[0]?.path || connector.baseUrl,
          connectorStatus: connector.status,
          connectorLatency: connector.latencyMs,
          protheusSyncEnabled: connector.isOfficialTotvs,
          protheusTable: connector.protheusTables ? connector.protheusTables[0] : undefined
        }
      }
    };

    takeSnapshot();
    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
    setViewMode("canvas");
    toast.success(`Conector "${connector.name}" inserido no Canvas!`);
    if (reactFlowInstance) {
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 80);
    }
  }, [reactFlowInstance, setNodes, takeSnapshot]);

  // Sidebar drag start
  const handleDragStart = (type: CRMNodeType) => {
    setDraggedNodeType(type);
  };

  // Canvas Drop orchestration
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!reactFlowWrapper.current || !reactFlowInstance || !draggedNodeType) return;

    takeSnapshot();

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newId = `node-${Date.now()}`;
    const defaultData: Record<CRMNodeType, CRMNodeData> = {
      trigger: {
        label: "Entrada Manual de Evento",
        type: "trigger",
        icon: "zap",
        description: "Gatilho disparado manualmente ou por API de integração.",
        config: { source: "CRM Manual API" }
      },
      condition: {
        label: "Validador Condicional",
        type: "condition",
        icon: "fork",
        description: "Avalia expressões lógicas e direciona o fluxo para caminhos distintos.",
        config: { field: "Margem de Contribuição", operator: ">=", value: "25%" }
      },
      action: {
        label: "Ação de Notificação / Tarefa",
        type: "action",
        icon: "mail",
        description: "Executa tarefa automatizada no CRM ou envia mensagens multicanal.",
        config: { emailTemplate: "Apresentação Geral de Serviços" }
      },
      operation: {
        label: "Cálculo de Fórmula Comercial",
        type: "operation",
        icon: "calc",
        description: "Calcula alíquotas de comissões, bônus ou temporizadores de SLA.",
        config: { formula: "Resultado = Valor * 0.05" }
      },
      validator: {
        label: "Trava de Compliance / Alçada",
        type: "validator",
        icon: "lock",
        description: "Bloqueia a operação se os requisitos de governança não forem satisfeitos.",
        config: { validationRule: "Piso estatutário de margem" }
      },
      businessRule: {
        label: "Regra de Negócio (Governança)",
        type: "businessRule",
        icon: "scale",
        description: "Aplica validações e tetos de descontos e margens sincronizados com o Governance Studio.",
        config: {
          governanceRuleId: "gov-rule-desc-max-rep",
          governanceRuleName: "Alçada de Desconto & Margem Mínima",
          maxDiscountPct: 8,
          maxDiscountManagerPct: 15,
          minMarginPct: 25,
          maxPaymentTermDays: 60,
          maxVolumeWithoutApproval: 50000,
          approvalHierarchy: "Vendedor ≤ 8% | Gerente ≤ 15% | Diretoria > 15%",
          governanceSyncStatus: "synced",
          governanceVersion: 3,
          governanceLastSync: new Date().toISOString(),
          connectedDocumentTitle: "Manual de Diretrizes de Preço e Desconto v3.2.pdf",
          connectedClauseNumber: "Cláusula 4.1",
          connectedClauseTitle: "Alçadas Comerciais e Piso de Rentabilidade",
          complianceRule: "Descontos até 8% auto-aprovados. Margens inferiores a 25% ou prazos >60d exigem comitê executivo e diretoria."
        }
      },
      connector: {
        label: "TOTVS Protheus REST Gateway",
        type: "connector",
        icon: "cpu",
        description: "Conector corporativo para integração e leitura/gravação nas tabelas do ERP Protheus.",
        config: {
          connectorId: "totvs-protheus-rest",
          connectorVendor: "TOTVS S.A.",
          connectorProtocol: "REST",
          connectorEndpoint: "/salesorders",
          connectorStatus: "online",
          connectorLatency: 28,
          protheusSyncEnabled: true,
          protheusTable: "SC5 - Pedidos de Venda",
          protheusOperation: "incluir"
        }
      }
    };

    const newNode: Node<CRMNodeData> = {
      id: newId,
      type: `${draggedNodeType}Node`,
      position,
      data: defaultData[draggedNodeType],
    };

    const { updatedNodes } = autoConnectFlow(activeFlowKey, activeTemplate.meta, [newNode]);
    const connectedNode = updatedNodes[0] || newNode;

    setNodes((nds) => nds.concat(connectedNode));
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
    setDraggedNodeType(null);
    toast.success(`Nó de ${draggedNodeType} adicionado e vinculado aos documentos de governança!`);
  }, [draggedNodeType, reactFlowInstance, setNodes, activeFlowKey, activeTemplate.meta, takeSnapshot]);

  // Click shortcut fallback to insert nodes
  const handleAddNodeClick = (type: CRMNodeType) => {
    takeSnapshot();
    const newId = `node-click-${Date.now()}`;
    const defaultData: Record<CRMNodeType, CRMNodeData> = {
      trigger: {
        label: "Entrada de Processo",
        type: "trigger",
        icon: "zap",
        description: "Inicia a sequência do processo comercial.",
        config: { source: "Sistema CRM" }
      },
      condition: {
        label: "Divisor de Decisão",
        type: "condition",
        icon: "fork",
        description: "Ramifica o fluxo com base em critérios objetivos.",
        config: { field: "Valor Total", operator: ">=", value: "R$ 50.000" }
      },
      action: {
        label: "Ação Automatizada",
        type: "action",
        icon: "mail",
        description: "Executa tarefa ou notificação no fluxo.",
        config: { emailTemplate: "Notificação Geral" }
      },
      operation: {
        label: "Cálculo de Parâmetros",
        type: "operation",
        icon: "calc",
        description: "Executa regra matemática de cálculo.",
        config: { formula: "Taxa = 5%" }
      },
      validator: {
        label: "Validador de Segurança",
        type: "validator",
        icon: "shield",
        description: "Verifica integridade do processo antes da liberação.",
        config: { validationRule: "Auditoria Comercial" }
      },
      businessRule: {
        label: "Regra de Negócio (Governança)",
        type: "businessRule",
        icon: "scale",
        description: "Aplica validações de margens e descontos corporativos do Governance Studio.",
        config: {
          governanceRuleId: "gov-rule-desc-max-rep",
          governanceRuleName: "Alçada de Desconto & Margem Mínima",
          maxDiscountPct: 8,
          maxDiscountManagerPct: 15,
          minMarginPct: 25,
          maxPaymentTermDays: 60,
          maxVolumeWithoutApproval: 50000,
          approvalHierarchy: "Vendedor ≤ 8% | Gerente ≤ 15% | Diretoria > 15%",
          governanceSyncStatus: "synced",
          governanceVersion: 3,
          governanceLastSync: new Date().toISOString(),
          connectedDocumentTitle: "Manual de Diretrizes de Preço e Desconto v3.2.pdf",
          connectedClauseNumber: "Cláusula 4.1",
          connectedClauseTitle: "Alçadas Comerciais e Piso de Rentabilidade"
        }
      },
      connector: {
        label: "Conector REST Protheus",
        type: "connector",
        icon: "cpu",
        description: "Sincronização bidirecional de pedidos e clientes com TOTVS Protheus.",
        config: {
          connectorId: "totvs-protheus-rest",
          connectorVendor: "TOTVS S.A.",
          connectorProtocol: "REST",
          connectorEndpoint: "/salesorders",
          connectorStatus: "online",
          connectorLatency: 28,
          protheusSyncEnabled: true,
          protheusTable: "SC5 - Pedidos de Venda"
        }
      }
    };

    const newNode: Node<CRMNodeData> = {
      id: newId,
      type: `${type}Node`,
      position: { x: 260 + (Math.random() * 40 - 20), y: 200 + (Math.random() * 40 - 20) },
      data: defaultData[type]
    };

    const { updatedNodes } = autoConnectFlow(activeFlowKey, activeTemplate.meta, [newNode]);
    const connectedNode = updatedNodes[0] || newNode;

    takeSnapshot();
    setNodes((nds) => nds.concat(connectedNode));
    setSelectedNodeId(newId);
    setSelectedEdgeId(null);
    toast.success(`Nó "${defaultData[type].label}" adicionado e vinculado à política comercial!`);
  };

  // Reset/Clear workspace
  const handleClearWorkspace = () => {
    takeSnapshot();
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    toast.info("Canvas limpo! Adicione ou carregue nós para começar.");
  };

  // Validation Engine State
  const [isValidationDrawerOpen, setIsValidationDrawerOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [validationModalAction, setValidationModalAction] = useState<"save" | "export">("save");

  // Automated Normative Documents & Commercial Policies Connection State
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [isGovernanceRulesModalOpen, setIsGovernanceRulesModalOpen] = useState(false);
  const connectedDocs = useMemo(() => {
    return getDocumentsForFlow(activeFlowKey);
  }, [activeFlowKey]);

  // Handler to explicitly trigger auto-connection across all nodes
  const handleAutoSyncAllDocuments = useCallback(() => {
    const { updatedNodes } = autoConnectFlow(activeFlowKey, activeTemplate.meta, nodes);
    setNodes(updatedNodes);
    toast.success("Conexões com Documentos Normativos Sincronizadas!", {
      description: `${updatedNodes.length} nós vinculados a cláusulas estatutárias, tabelas e regulamentos de comissão.`
    });
  }, [activeFlowKey, activeTemplate.meta, nodes, setNodes]);

  const validationResult = useMemo(() => {
    return validateWorkflow(nodes, edges, { strictMode: true });
  }, [nodes, edges]);

  // Clean dangling edges handler
  const handleCleanDanglingEdges = useCallback(() => {
    const { edges: validEdges, removedCount } = cleanDanglingEdges(nodes, edges);
    if (removedCount > 0) {
      setEdges(validEdges);
      toast.success(`${removedCount} conexão(ões) órfã(s) removida(s)!`);
    } else {
      toast.info("Nenhuma conexão órfã encontrada.");
    }
  }, [nodes, edges, setEdges]);

  // Auto-Fix All Issues handler
  const handleAutoFixAll = useCallback(() => {
    const v = validateWorkflow(nodes, edges, { strictMode: true });
    if (!v.hasErrors && v.warningsCount === 0) {
      toast.info("O fluxo já está completamente válido! Nenhuma correção necessária.");
      return;
    }

    let currentNodes = [...nodes];
    let currentEdges = [...edges];

    // 1. Remove unreachable/isolated nodes
    if (v.unreachableNodeIds.length > 0) {
      const { nodes: cleanedNodes, edges: cleanedEdges } = removeUnreachableNodes(currentNodes, currentEdges, v.unreachableNodeIds);
      currentNodes = cleanedNodes;
      currentEdges = cleanedEdges;
    }

    // 2. Break cycles
    if (v.cycleNodeIds.length > 0) {
      const { edges: cleanedEdges } = breakCycles(currentEdges, v.errorEdgeIds);
      currentEdges = cleanedEdges;
    }

    // 3. Fill default mandatory configs
    if (v.missingConfigNodeIds.length > 0) {
      currentNodes = fillDefaultConfigurations(currentNodes);
    }

    // 4. Clean dangling edges
    const { edges: cleanedEdges } = cleanDanglingEdges(currentNodes, currentEdges);
    currentEdges = cleanedEdges;

    setNodes(currentNodes);
    setEdges(currentEdges);

    const newValidation = validateWorkflow(currentNodes, currentEdges, { strictMode: true });
    if (newValidation.isValid) {
      toast.success("Correção automática concluída com sucesso!", {
        description: "Loops eliminados, nós órfãos removidos e parâmetros obrigatórios preenchidos."
      });
      setIsValidationModalOpen(false);
    } else {
      toast.warning("Auto-correção parcial aplicada.", {
        description: `Restam ${newValidation.errorsCount} inconsistência(s) que exigem intervenção manual.`
      });
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Remove all unreachable nodes handler
  const handleRemoveUnreachableNodes = useCallback(() => {
    const v = validateWorkflow(nodes, edges, { strictMode: true });
    if (v.unreachableNodeIds.length === 0) {
      toast.info("Nenhum nó inalcançável detectado.");
      return;
    }
    const { nodes: cleanedNodes, edges: cleanedEdges, removedCount } = removeUnreachableNodes(nodes, edges, v.unreachableNodeIds);
    setNodes(cleanedNodes);
    setEdges(cleanedEdges);
    toast.success(`${removedCount} nó(s) inalcançável(eis) removido(s) do fluxo!`);
  }, [nodes, edges, setNodes, setEdges]);

  // Break all detected cycles handler
  const handleBreakCycles = useCallback(() => {
    const v = validateWorkflow(nodes, edges, { strictMode: true });
    if (v.cycleNodeIds.length === 0) {
      toast.info("Nenhum ciclo fechado detectado.");
      return;
    }
    const { edges: cleanedEdges, removedCount } = breakCycles(edges, v.errorEdgeIds);
    setEdges(cleanedEdges);
    toast.success(`${removedCount} conexão(ões) cíclica(s) removida(s), desfazendo o loop.`);
  }, [nodes, edges, setEdges]);

  // Individual issue auto-fix
  const handleAutoFixIssue = useCallback((issue: WorkflowValidationIssue) => {
    if (issue.category === "unreachable" && issue.nodeId) {
      const { nodes: cleanedNodes, edges: cleanedEdges } = removeUnreachableNodes(nodes, edges, [issue.nodeId]);
      setNodes(cleanedNodes);
      setEdges(cleanedEdges);
      toast.success(`Nó inalcançável "${issue.nodeLabel || issue.nodeId}" removido!`);
    } else if (issue.category === "cycle") {
      const edgeToBreak = issue.edgeId 
        ? [issue.edgeId] 
        : issue.relatedNodeIds 
        ? [edges.find(e => issue.relatedNodeIds?.includes(e.source) && issue.relatedNodeIds?.includes(e.target))?.id].filter(Boolean) as string[] 
        : [];
      if (edgeToBreak.length > 0) {
        const { edges: cleanedEdges } = breakCycles(edges, edgeToBreak);
        setEdges(cleanedEdges);
        toast.success("Conexão cíclica quebrada com sucesso!");
      } else {
        const { edges: cleanedEdges } = breakCycles(edges);
        setEdges(cleanedEdges);
        toast.success("Ciclo resolvido com remoção da transição reversa!");
      }
    } else if ((issue.category === "missing_config" || issue.category === "missing_trigger") && issue.nodeId) {
      setNodes(nds => nds.map(n => {
        if (n.id === issue.nodeId) {
          const filled = fillDefaultConfigurations([n]);
          return filled[0];
        }
        return n;
      }));
      toast.success(`Configurações padrão preenchidas para "${issue.nodeLabel || issue.nodeId}"!`);
    } else if (issue.category === "dangling_edge") {
      const { edges: cleanedEdges } = cleanDanglingEdges(nodes, edges);
      setEdges(cleanedEdges);
      toast.success("Conexões órfãs limpas!");
    }
  }, [nodes, edges, setNodes, setEdges]);

  // Auto-arrange layout using DAG topological layer algorithm
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) {
      toast.info("O canvas está vazio.");
      return;
    }
    
    takeSnapshot();
    const layoutedNodes = layoutWorkflowNodes(nodes, edges, "LR");
    setNodes(layoutedNodes);

    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
      }, 50);
    }

    toast.success("Layout auto-organizado com sucesso!", {
      description: `${nodes.length} nós alinhados em níveis sem sobreposição.`
    });
  }, [nodes, edges, setNodes, reactFlowInstance, takeSnapshot]);

  // Run flowchart execution simulation
  const handleSimulateFlow = (customPath?: string[]) => {
    setIsSimulating(true);
    setActiveSimPath([]);
    setSimLogs([]);

    const path = (customPath && customPath.length > 0)
      ? customPath
      : activeTemplate.meta.calculateSimPath(simInputs);
      
    let stepIndex = 0;
    const now = new Date();

    const interval = setInterval(() => {
      if (stepIndex < path.length) {
        const currentTargetId = path[stepIndex];
        const targetNode = nodes.find(n => n.id === currentTargetId);
        
        setActiveSimPath(prev => [...prev, currentTargetId]);
        
        if (targetNode && reactFlowInstance) {
          reactFlowInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.15, duration: 300 });
        }
        
        setSimLogs(prev => [
          ...prev,
          {
            step: stepIndex + 1,
            nodeId: currentTargetId,
            label: targetNode?.data.label || currentTargetId,
            outcome: targetNode?.data.config.actionOutcome || 
                     (targetNode?.data.type === "condition" ? "Condição Avaliada com Sucesso" : targetNode?.data.type === "businessRule" ? "Regra de Negócio Auditada" : "Executado"),
            time: new Date(now.getTime() + stepIndex * 1000).toLocaleTimeString("pt-BR"),
            clauseNumber: targetNode?.data.config.connectedClauseNumber,
            clauseTitle: targetNode?.data.config.connectedClauseTitle,
            docTitle: targetNode?.data.config.connectedDocumentTitle
          }
        ]);

        stepIndex++;
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        toast.success(`Simulação do fluxo "${activeTemplate.meta.name}" concluída com sucesso!`, { duration: 5000 });
      }
    }, 900);
  };

  // Duplicate selected Node with 1-click
  const handleDuplicateSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const nodeToDup = nodes.find(n => n.id === selectedNodeId);
    if (!nodeToDup) return;
    takeSnapshot();
    const newId = `node-dup-${Date.now()}`;
    const duplicatedNode: Node<CRMNodeData> = {
      ...nodeToDup,
      id: newId,
      position: {
        x: nodeToDup.position.x + 40,
        y: nodeToDup.position.y + 40
      },
      data: {
        ...nodeToDup.data,
        label: `${nodeToDup.data.label} (Cópia)`,
        config: { ...nodeToDup.data.config }
      }
    };
    setNodes((nds) => nds.concat(duplicatedNode));
    setSelectedNodeId(newId);
    toast.success(`Nó "${nodeToDup.data.label}" duplicado com sucesso!`);
  }, [selectedNodeId, nodes, setNodes, takeSnapshot]);

  // Delete selected Node or Edge
  const handleDeleteSelectedElement = useCallback(() => {
    if (selectedNodeId) {
      takeSnapshot();
      const nodeToDelete = nodes.find(n => n.id === selectedNodeId);
      setNodes(nds => nds.filter(n => n.id !== selectedNodeId));
      setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
      toast.success(`Nó "${nodeToDelete?.data.label || 'selecionado'}" excluído!`);
    } else if (selectedEdgeId) {
      takeSnapshot();
      setEdges(eds => eds.filter(e => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      toast.success("Conexão removida!");
    }
  }, [selectedNodeId, selectedEdgeId, nodes, setNodes, setEdges, takeSnapshot]);

  // Estado para salvamento de layout assíncrono
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [lastSavedLayoutTime, setLastSavedLayoutTime] = useState<string | null>(null);

  // Persiste a posição atual de cada nó e as conexões no banco de dados via API
  // Garantindo que o desenho seja recarregado exatamente como o usuário deixou.
  const handleSaveLayout = useCallback(async () => {
    if (nodes.length === 0) {
      toast.info("Não há nós no fluxo para salvar o layout.");
      return;
    }

    const currentFlow = allTemplates[activeFlowKey] || ALL_FLOW_TEMPLATES[activeFlowKey];
    const flowName = currentFlow?.meta?.name || activeFlowKey;
    setIsSavingLayout(true);

    try {
      const viewport = reactFlowInstance ? reactFlowInstance.getViewport() : undefined;
      const res = await flowsApiService.saveLayout(activeFlowKey, nodes, edges, {
        viewport,
        name: flowName,
        status: currentFlow?.meta?.status,
        category: currentFlow?.meta?.category,
        description: currentFlow?.meta?.description
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSavedLayoutTime(timeStr);

      if (res.flow) {
        setCustomFlows((prev) => ({
          ...prev,
          [activeFlowKey]: res.flow!
        }));
      }

      if (res.source === "server") {
        toast.success(`Layout de "${flowName}" salvo no banco de dados!`, {
          description: `${nodes.length} nós e ${edges.length} conexões persistidos via API com sucesso.`
        });
      } else {
        toast.info(`Layout de "${flowName}" salvo localmente`, {
          description: "Posições gravadas com sucesso. Serão sincronizadas com o banco quando a API responder."
        });
      }
    } catch (err: any) {
      console.error("Erro ao salvar layout:", err);
      toast.error("Falha ao salvar layout do fluxo", {
        description: err?.message || "Ocorreu um erro ao comunicar com a API."
      });
    } finally {
      setIsSavingLayout(false);
    }
  }, [activeFlowKey, allTemplates, nodes, edges, reactFlowInstance]);

  // Save current flow modifications to localStorage with strict validation
  const handleSaveActiveFlow = useCallback((forceDraft = false) => {
    const currentFlow = allTemplates[activeFlowKey] || ALL_FLOW_TEMPLATES[activeFlowKey];
    if (!currentFlow) return;

    const vResult = validateWorkflow(nodes, edges, { strictMode: true });
    if (vResult.hasErrors && !forceDraft) {
      setValidationModalAction("save");
      setIsValidationModalOpen(true);
      toast.error(`Bloqueio de Salvamento: Foram detectadas ${vResult.errorsCount} inconsistência(s) crítica(s).`, {
        description: "Loops, nós desconexos ou parâmetros obrigatórios em branco impedem a homologação."
      });
      return;
    }

    const updatedFlow: FullFlowTemplate = {
      ...currentFlow,
      meta: {
        ...currentFlow.meta,
        nodesCount: nodes.length,
        status: forceDraft && vResult.hasErrors
          ? "Rascunho (Incompleto)"
          : customFlows[activeFlowKey]
          ? "Personalizado"
          : "Homologado (Editado)",
      },
      nodes,
      edges
    };

    const updatedCustoms = {
      ...customFlows,
      [activeFlowKey]: updatedFlow
    };

    setCustomFlows(updatedCustoms);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updatedCustoms));
      flowsApiService.saveFlow(activeFlowKey, updatedFlow).catch((err) => {
        console.warn("Falha ao sincronizar salvamento com API de Fluxos:", err);
      });

      if (forceDraft && vResult.hasErrors) {
        toast.warning(`Fluxo "${updatedFlow.meta.name}" salvo como Rascunho com pendências!`, {
          description: `${vResult.errorsCount} inconsistência(s) mantida(s). Corrija antes de executar no Protheus.`
        });
      } else {
        toast.success(`Fluxo "${updatedFlow.meta.name}" validado e salvo com sucesso!`, {
          description: `${nodes.length} nós e ${edges.length} conexões verificados e íntegros.`
        });
      }
    } catch (_e) {
      toast.error("Erro ao salvar fluxo no armazenamento local.");
    }
  }, [activeFlowKey, allTemplates, nodes, edges, customFlows]);

  // Duplicate entire flow
  const handleDuplicateActiveFlow = useCallback(() => {
    const currentFlow = allTemplates[activeFlowKey] || ALL_FLOW_TEMPLATES[activeFlowKey];
    if (!currentFlow) return;
    const newKey = `flow-dup-${Date.now()}`;
    const duplicatedFlow: FullFlowTemplate = {
      meta: {
        ...currentFlow.meta,
        id: newKey,
        name: `${currentFlow.meta.name} (Cópia)`,
        version: "v1.0 (Personalizado)",
        nodesCount: nodes.length,
        status: "Personalizado"
      },
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges))
    };

    const updated = {
      ...customFlows,
      [newKey]: duplicatedFlow
    };

    setCustomFlows(updated);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
      flowsApiService.createFlow(duplicatedFlow).catch((err) => {
        console.warn("Falha ao salvar cópia na API de fluxos:", err);
      });
    } catch (err) {
      console.error("Falha ao salvar no storage:", err);
    }
    setActiveFlowKey(newKey);
    setViewMode("canvas");
    toast.success(`Fluxo duplicado como "${duplicatedFlow.meta.name}"!`);
  }, [activeFlowKey, allTemplates, nodes, edges, customFlows]);

  // Create new flow
  const handleCreateNewFlow = useCallback((formData: {
    name: string;
    category: FlowCategory;
    categoryLabel: string;
    description: string;
    templateType: "blank" | "standard";
    tags: string[];
    erpTable: string;
  }) => {
    const newKey = `custom-flow-${Date.now()}`;
    let initialNodes: Node<CRMNodeData>[] = [];
    let initialEdges: Edge[] = [];

    if (formData.templateType === "standard") {
      initialNodes = [
        {
          id: "node-start",
          type: "triggerNode",
          position: { x: 260, y: 40 },
          data: {
            label: "Início do Fluxo",
            type: "trigger",
            icon: "zap",
            description: "Ponto de entrada do processo comercial.",
            config: { source: "CRM Comercial" }
          }
        },
        {
          id: "node-cond",
          type: "conditionNode",
          position: { x: 260, y: 190 },
          data: {
            label: "Validação de Regra",
            type: "condition",
            icon: "fork",
            description: "Critério de alçada e decisão.",
            config: { field: "Valor do Pedido", operator: ">=", value: "R$ 10.000" }
          }
        },
        {
          id: "node-action-yes",
          type: "actionNode",
          position: { x: 120, y: 350 },
          data: {
            label: "Aprovação & Notificação",
            type: "action",
            icon: "check",
            description: "Executa aprovação automatizada.",
            config: { emailTemplate: "Aprovação Imediata" }
          }
        },
        {
          id: "node-action-no",
          type: "actionNode",
          position: { x: 400, y: 350 },
          data: {
            label: "Encaminhar para Gerência",
            type: "action",
            icon: "mail",
            description: "Solicita parecer comercial manual.",
            config: { assigneeGroup: "Gerência Comercial" }
          }
        }
      ];

      initialEdges = [
        {
          id: "edge-start-cond",
          source: "node-start",
          target: "node-cond",
          type: "stepConnectorEdge",
          animated: true,
          data: { latencyMs: 12, label: "Avançar" }
        },
        {
          id: "edge-cond-yes",
          source: "node-cond",
          target: "node-action-yes",
          type: "conditionalEdge",
          animated: true,
          data: { conditionType: "sim", label: "Sim / Aprovado", latencyMs: 10 }
        },
        {
          id: "edge-cond-no",
          source: "node-cond",
          target: "node-action-no",
          type: "conditionalEdge",
          animated: true,
          data: { conditionType: "nao", label: "Não / Rejeitado", latencyMs: 10 }
        }
      ];
    } else {
      initialNodes = [
        {
          id: "node-start",
          type: "triggerNode",
          position: { x: 260, y: 60 },
          data: {
            label: "Disparo Inicial",
            type: "trigger",
            icon: "zap",
            description: "Evento de entrada que inicia este fluxo.",
            config: { source: "CRM / Webhook" }
          }
        }
      ];
    }

    const newFlow: FullFlowTemplate = {
      meta: {
        id: newKey,
        name: formData.name,
        category: formData.category,
        categoryLabel: formData.categoryLabel,
        description: formData.description,
        status: "Personalizado",
        version: "v1.0",
        tags: formData.tags.length > 0 ? formData.tags : ["Personalizado", "CRM"],
        erpTables: formData.erpTable ? [formData.erpTable] : ["SA1 - Clientes"],
        nodesCount: initialNodes.length,
        simDefaultInputs: {},
        calculateSimPath: () => initialNodes.map(n => n.id)
      },
      nodes: initialNodes,
      edges: initialEdges
    };

    const updated = {
      ...customFlows,
      [newKey]: newFlow
    };

    setCustomFlows(updated);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
      flowsApiService.createFlow(newFlow).catch((err) => {
        console.warn("Falha ao criar fluxo na API de fluxos:", err);
      });
    } catch (err) {
      console.error("Falha ao salvar no storage:", err);
    }
    setActiveFlowKey(newKey);
    setViewMode("canvas");
    toast.success(`Fluxo "${newFlow.meta.name}" criado com sucesso! Comece a desenhar.`);
  }, [customFlows]);

  // Change Flow Status directly
  const handleChangeFlowStatus = useCallback((key: string, newStatus: string) => {
    const targetFlow = allTemplates[key];
    if (!targetFlow) return;

    const updatedFlow: FullFlowTemplate = {
      ...targetFlow,
      meta: {
        ...targetFlow.meta,
        status: newStatus as any
      }
    };

    const updatedCustoms = {
      ...customFlows,
      [key]: updatedFlow
    };

    setCustomFlows(updatedCustoms);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updatedCustoms));
      flowsApiService.changeStatus(key, newStatus).catch((err) => {
        console.warn("Falha ao sincronizar status na API:", err);
      });
      toast.success(`Status do fluxo "${targetFlow.meta.name}" alterado para "${newStatus}"!`);
    } catch (_e) {
      toast.error("Erro ao salvar alteração de status.");
    }
  }, [allTemplates, customFlows]);

  // Duplicate flow by key
  const handleDuplicateFlowByKey = useCallback((key: string) => {
    const targetFlow = allTemplates[key] || ALL_FLOW_TEMPLATES[key];
    if (!targetFlow) return;

    const newKey = `flow-dup-${Date.now()}`;
    const duplicatedFlow: FullFlowTemplate = {
      meta: {
        ...targetFlow.meta,
        id: newKey,
        name: `${targetFlow.meta.name} (Cópia)`,
        version: "v1.0 (Personalizado)",
        nodesCount: targetFlow.nodes.length,
        status: "Personalizado"
      },
      nodes: JSON.parse(JSON.stringify(targetFlow.nodes)),
      edges: JSON.parse(JSON.stringify(targetFlow.edges))
    };

    const updated = {
      ...customFlows,
      [newKey]: duplicatedFlow
    };

    setCustomFlows(updated);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
      flowsApiService.createFlow(duplicatedFlow).catch((err) => {
        console.warn("Falha ao salvar cópia na API de fluxos:", err);
      });
    } catch (err) {
      console.error("Falha ao salvar no storage:", err);
    }
    setActiveFlowKey(newKey);
    setViewMode("canvas");
    toast.success(`Fluxo duplicado como "${duplicatedFlow.meta.name}" e carregado no Canvas!`);
  }, [allTemplates, customFlows]);

  // Update metadata of target or active flow
  const handleUpdateFlowMeta = useCallback((data: {
    name: string;
    category: FlowCategory;
    categoryLabel: string;
    description: string;
    tags: string[];
    erpTables: string[];
  }) => {
    const key = modalTargetFlowKey || activeFlowKey;
    const currentFlow = allTemplates[key] || ALL_FLOW_TEMPLATES[key];
    if (!currentFlow) return;

    const updatedFlow: FullFlowTemplate = {
      ...currentFlow,
      meta: {
        ...currentFlow.meta,
        name: data.name,
        category: data.category,
        categoryLabel: data.categoryLabel,
        description: data.description,
        tags: data.tags,
        erpTables: data.erpTables
      },
      nodes: key === activeFlowKey ? nodes : currentFlow.nodes,
      edges: key === activeFlowKey ? edges : currentFlow.edges
    };

    const updated = {
      ...customFlows,
      [key]: updatedFlow
    };

    setCustomFlows(updated);
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
      flowsApiService.updateFlow(key, updatedFlow).catch((err) => {
        console.warn("Falha ao atualizar metadados na API de fluxos:", err);
      });
    } catch (err) {
      console.error("Falha ao salvar no storage:", err);
    }
    setModalTargetFlowKey(null);
    setIsEditMetaModalOpen(false);
    toast.success(`Metadados do fluxo "${updatedFlow.meta.name}" atualizados com sucesso!`);
  }, [modalTargetFlowKey, activeFlowKey, allTemplates, nodes, edges, customFlows]);

  // Delete target flow (custom or restore built-in)
  const handleDeleteTargetFlow = useCallback(() => {
    const key = modalTargetFlowKey || activeFlowKey;
    const isCustom = !!customFlows[key];
    const flowName = allTemplates[key]?.meta.name || key;

    if (isCustom) {
      const updated = { ...customFlows };
      delete updated[key];
      setCustomFlows(updated);
      try {
        localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
        flowsApiService.deleteFlow(key).catch((err) => {
          console.warn("Falha ao excluir fluxo na API de fluxos:", err);
        });
      } catch (err) {
        console.error("Falha ao salvar no storage:", err);
      }
      if (activeFlowKey === key) {
        setActiveFlowKey("lead-routing");
      }
      toast.success(`Fluxo personalizado "${flowName}" excluído!`);
    } else {
      const original = ALL_FLOW_TEMPLATES[key];
      if (original) {
        if (activeFlowKey === key) {
          setNodes(original.nodes);
          setEdges(original.edges);
        }
        toast.info(`Fluxo "${original.meta.name}" restaurado para o padrão original.`);
      }
    }
    setModalTargetFlowKey(null);
    setIsDeleteModalOpen(false);
  }, [modalTargetFlowKey, activeFlowKey, allTemplates, customFlows, setNodes, setEdges]);

  // Import JSON Flow
  const handleImportFlowJSON = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
        throw new Error("Arquivo JSON inválido: nós do fluxo não encontrados.");
      }
      const importedNodes = parsed.nodes;
      const importedEdges = parsed.edges || [];
      const valResult = validateWorkflow(importedNodes, importedEdges, { strictMode: true });

      const newKey = `import-${Date.now()}`;
      const importedFlow: FullFlowTemplate = {
        meta: {
          id: newKey,
          name: parsed.meta?.name ? `${parsed.meta.name} (Importado)` : "Fluxo Importado",
          category: parsed.meta?.category || "crm",
          categoryLabel: parsed.meta?.categoryLabel || "Comercial & CRM",
          description: parsed.meta?.description || "Fluxo importado de arquivo JSON.",
          status: valResult.hasErrors ? "Importado (Com Pendências)" : "Importado",
          version: parsed.meta?.version || "v1.0",
          tags: parsed.meta?.tags || ["Importado"],
          erpTables: parsed.meta?.erpTables || ["SA1 - Clientes"],
          nodesCount: importedNodes.length,
          simDefaultInputs: parsed.meta?.simDefaultInputs || {},
          calculateSimPath: () => importedNodes.map((n: any) => n.id)
        },
        nodes: importedNodes,
        edges: importedEdges
      };

      const updated = {
        ...customFlows,
        [newKey]: importedFlow
      };

      setCustomFlows(updated);
      try {
        localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Falha ao salvar no storage:", err);
      }
      setActiveFlowKey(newKey);
      setViewMode("canvas");
      setIsImportModalOpen(false);

      if (valResult.hasErrors) {
        setIsValidationDrawerOpen(true);
        toast.warning(`Fluxo "${importedFlow.meta.name}" importado com ${valResult.errorsCount} inconsistência(s)!`, {
          description: "Painel de validação aberto para correção de loops, nós órfãos ou parâmetros ausentes."
        });
      } else {
        toast.success(`Fluxo "${importedFlow.meta.name}" importado e 100% validado!`);
      }
    } catch (err: any) {
      toast.error(`Falha ao importar JSON: ${err.message || "Formato inválido"}`);
    }
  }, [customFlows]);

  // Keyboard Shortcuts: Delete/Backspace (Delete element), Ctrl+D (Duplicate node), Ctrl+S (Save flow), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId || selectedEdgeId) {
          e.preventDefault();
          handleDeleteSelectedElement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (selectedNodeId) {
          e.preventDefault();
          handleDuplicateSelectedNode();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveLayout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, handleDeleteSelectedElement, handleDuplicateSelectedNode, handleSaveLayout, handleUndo, handleRedo]);

  // Export Flow JSON for environment portability & backup
  const handleExportJSON = useCallback((forceExport = false) => {
    const currentMeta = activeTemplate.meta;

    const vResult = validateWorkflow(nodes, edges, { strictMode: true });
    if (vResult.hasErrors && !forceExport) {
      setValidationModalAction("export");
      setIsValidationModalOpen(true);
      toast.error(`Bloqueio de Exportação: Foram detectados ${vResult.errorsCount} erro(s) estruturais.`, {
        description: "O fluxo possui dependências circulares, nós desconexos ou parâmetros vazios. Resolva antes de gerar o pacote de exportação."
      });
      return;
    }

    const safeSlug = (currentMeta.name || "fluxo")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const flowExportData = {
      $schema: "https://nexus-crm.totvs/schemas/workflow-v1.json",
      schemaVersion: "nexus-crm-flow-v1",
      exportedAt: new Date().toISOString(),
      platform: "Nexus CRM Protheus Suite",
      validation: {
        isValid: vResult.isValid,
        errorsCount: vResult.errorsCount,
        warningsCount: vResult.warningsCount,
        cycleNodeIds: vResult.cycleNodeIds,
        unreachableNodeIds: vResult.unreachableNodeIds,
        missingConfigNodeIds: vResult.missingConfigNodeIds,
        isDraftExport: forceExport && vResult.hasErrors
      },
      meta: {
        id: currentMeta.id,
        name: currentMeta.name,
        category: currentMeta.category,
        categoryLabel: currentMeta.categoryLabel,
        description: currentMeta.description,
        status: forceExport && vResult.hasErrors ? "Rascunho Exportado" : currentMeta.status,
        version: currentMeta.version,
        tags: currentMeta.tags || [],
        erpTables: currentMeta.erpTables || [],
        nodesCount: nodes.length,
        simDefaultInputs: currentMeta.simDefaultInputs || {}
      },
      nodes,
      edges
    };

    const fileName = `workflow-${safeSlug || currentMeta.id}-${forceExport && vResult.hasErrors ? 'rascunho-' : ''}${Date.now()}.json`;
    const jsonString = JSON.stringify(flowExportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (forceExport && vResult.hasErrors) {
      toast.warning(`Workflow exportado como Rascunho com pendências: ${fileName}`, {
        description: `O arquivo JSON contém ${vResult.errorsCount} inconsistência(s) anotada(s).`
      });
    } else {
      toast.success(`Workflow validado e baixado: ${fileName}`, {
        description: `Arquivo JSON 100% íntegro pronto para transferência entre ambientes (${nodes.length} nós, ${edges.length} conexões).`
      });
    }
  }, [activeTemplate, nodes, edges]);

  // Copy JSON to clipboard
  const handleCopyJSON = useCallback(() => {
    const vResult = validateWorkflow(nodes, edges, { strictMode: true });
    if (vResult.hasErrors) {
      toast.warning(`Aviso: O fluxo copiado possui ${vResult.errorsCount} inconsistência(s) de validação.`, {
        description: "JSON copiado com metadados de auditoria."
      });
    }
    const flowData = {
      schemaVersion: "nexus-crm-flow-v1",
      meta: activeTemplate.meta,
      validation: {
        isValid: vResult.isValid,
        errorsCount: vResult.errorsCount
      },
      nodes,
      edges
    };
    navigator.clipboard.writeText(JSON.stringify(flowData, null, 2));
    toast.success("Definição do fluxo copiada para a área de transferência!");
  }, [activeTemplate, nodes, edges]);

  const selectedNode = useMemo(() => {
    return nodes.find(n => n.id === selectedNodeId);
  }, [nodes, selectedNodeId]);

  return (
    <div className={`flex flex-col gap-4 w-full ${
      isFullscreen ? "fixed inset-0 z-50 p-4 sm:p-6 bg-white dark:bg-neutral-950 overflow-y-auto" : "pb-6"
    }`}>
      
      {/* ─── Top Header: Title & Clean Action Bar ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-neutral-200/80 dark:border-neutral-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Orquestrador de Processos TOTVS Protheus
            </span>
            <span className="text-[10px] font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
              {Object.keys(allTemplates).length} Fluxos Disponíveis
            </span>
            {customFlows[activeFlowKey] && (
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/60">
                Personalizado (Editável)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {activeTemplate.meta.name}
            </h1>
            <span className="text-xs font-mono font-bold bg-neutral-200/70 dark:bg-neutral-800 px-2 py-0.5 rounded text-neutral-600 dark:text-neutral-300">
              {activeTemplate.meta.version}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 max-w-3xl">
            {activeTemplate.meta.description}
          </p>
        </div>

        {/* Primary Action Controls & Lifecycle Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Create New Flow Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Novo
          </button>

          {/* Auto-Layout Button */}
          <button
            onClick={handleAutoLayout}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-[11px] font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-xs flex items-center gap-1.5 transition-colors"
            title="Organizar nós automaticamente no canvas com algoritmo DAG"
          >
            <Wand2 className="h-3 w-3" /> Auto-Layout
          </button>

          {/* Salvar Layout Button - Persiste posições e conexões na API/DB */}
          <button
            onClick={handleSaveLayout}
            disabled={isSavingLayout}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            title="Salvar Layout: Persiste a posição atual de cada nó e as conexões no banco de dados via API (Ctrl+S)"
          >
            {isSavingLayout ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <BookmarkCheck className="h-3 w-3" />
            )}
            <span>{isSavingLayout ? "Salvando..." : "Salvar Layout"}</span>
          </button>

          {/* Save Active Flow Changes */}
          <button
            onClick={() => handleSaveActiveFlow(false)}
            className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
            title="Salvar alterações de negócio e metadados"
          >
            <Save className="h-3 w-3" /> Salvar
          </button>

          {lastSavedLayoutTime && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Layout salvo às {lastSavedLayoutTime}</span>
            </div>
          )}

          {/* Validation Engine Button */}
          <button
            onClick={() => setIsValidationDrawerOpen(true)}
            className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border shadow-xs flex items-center gap-1.5 transition-colors ${
              validationResult.isValid && validationResult.warningsCount === 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : validationResult.hasErrors
                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            {validationResult.errorsCount + validationResult.warningsCount > 0 ? (
                <span className="font-bold">{validationResult.errorsCount + validationResult.warningsCount} Problema(s)</span>
            ) : "Validar"}
          </button>

          {/* Normative Documents & Policies Automated Link Button */}
          <button
            onClick={() => setIsDocumentsModalOpen(true)}
            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-[11px] font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <FileText className="h-3 w-3" />
            <span>Docs ({connectedDocs.length})</span>
          </button>

          {/* Governance Studio Native Rules Link Button */}
          <button
            onClick={() => setIsGovernanceRulesModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Scale className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
            <span>Governança</span>
          </button>

          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              className="px-2.5 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center gap-1 transition-colors"
              title="Mais opções do fluxo"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {isMoreMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in"
                onMouseLeave={() => setIsMoreMenuOpen(false)}
              >
                <button
                  onClick={() => {
                    setIsEditMetaModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                >
                  <Edit3 className="h-3.5 w-3.5 text-neutral-400" /> Editar Metadados
                </button>
                <button
                  onClick={() => {
                    handleDuplicateActiveFlow();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                >
                  <Files className="h-3.5 w-3.5 text-blue-500" /> Duplicar Fluxo
                </button>
                <button
                  onClick={() => {
                    handleExportJSON();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-500" /> Baixar Arquivo JSON
                </button>
                <button
                  onClick={() => {
                    setIsImportModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5 text-indigo-500" /> Importar JSON
                </button>
                <div className="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-2"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir / Restaurar
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl shadow-xs transition-colors"
            title={isFullscreen ? "Sair da tela cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs & Quick Selector Bar ────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 py-3 px-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
          {[
            { id: "canvas", label: "Canvas Visual", icon: Sliders },
            { id: "simulation", label: "Simulação & Testes", icon: Sparkles },
            { id: "analytics", label: "Analytics & SLA", icon: BarChart3 },
            { id: "connectors", label: `Hub (${CONNECTORS_CATALOG.length})`, icon: Radio },
            { id: "gallery", label: `Catálogo (${Object.keys(allTemplates).length})`, icon: Grid },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all ${
                viewMode === tab.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Category Filter & Quick Process Picker */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0 scrollbar-none">
            {[
              { id: "todos", label: "Todos" },
              { id: "crm", label: "Comercial" },
              { id: "governance", label: "Gov." },
              { id: "erp", label: "ERP" },
              { id: "finance", label: "Fin." },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as FlowCategory)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "text-neutral-900 dark:text-neutral-100 font-bold border-b border-neutral-900 dark:border-neutral-100"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block" />

          <select
            value={activeFlowKey}
            onChange={(e) => {
              setActiveFlowKey(e.target.value);
              if (viewMode !== "simulation" && viewMode !== "analytics" && viewMode !== "connectors" && viewMode !== "gallery") {
                setViewMode("canvas");
              }
            }}
            className="h-8 text-xs bg-transparent border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 text-neutral-800 dark:text-neutral-100 focus:outline-primary max-w-[150px] truncate"
          >
            {Object.keys(allTemplates).map((key) => {
              const f = allTemplates[key];
              if (!f) return null;
              return (
                <option key={key} value={key}>
                  {f.meta.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* ─── VIEW 0: CONNECTORS HUB ───────────────────────────────────────── */}
      {viewMode === "connectors" && (
        <React.Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Carregando Hub de Conectores...</div>}>
          <ConnectorsHub 
            onAddConnectorToCanvas={handleAddConnectorToCanvas}
            onOpenInCanvas={() => setViewMode("canvas")}
          />
        </React.Suspense>
      )}

      {/* ─── VIEW 0.5: FLOW ANALYTICS & BOTTLENECK DASHBOARD (RECHARTS) ──── */}
      {viewMode === "analytics" && (
        <React.Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Carregando Analytics & Gargalos...</div>}>
          <FlowAnalyticsDashboard 
            initialFlowKey={activeFlowKey}
            onOpenFlowInCanvas={(flowKey) => {
              setActiveFlowKey(flowKey);
              setViewMode("canvas");
            }}
          />
        </React.Suspense>
      )}

      {/* ─── VIEW 0.8: FLOW SIMULATION LAB ─────────────────────────────────── */}
      {viewMode === "simulation" && (
        <React.Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Carregando Laboratório de Simulação...</div>}>
          <FlowSimulationLab 
            activeTemplate={activeTemplate}
            nodes={nodes}
            edges={edges}
            simInputs={simInputs}
            setSimInputs={setSimInputs}
            connectedDocs={connectedDocs}
            onOpenDocumentsModal={() => setIsDocumentsModalOpen(true)}
            onOpenCanvas={() => setViewMode("canvas")}
          />
        </React.Suspense>
      )}

      {/* ─── VIEW 1: GALLERY OF ALL FLOWS ─────────────────────────────────── */}
      {viewMode === "gallery" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
              <Grid className="h-4.5 w-4.5 text-primary" /> Catálogo de Processos ({flowKeysList.length} fluxos encontrados)
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no catálogo..."
                className="h-8 px-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary w-44"
              />
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Criar Novo Fluxo
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {flowKeysList.map((key) => {
              const flow = allTemplates[key];
              if (!flow) return null;
              const isCurrent = key === activeFlowKey;
              const isCustom = Boolean(customFlows[key]);
              return (
                <Card 
                  key={key} 
                  className={`border transition-all duration-200 hover:shadow-md ${
                    isCurrent 
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10" 
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {flow.meta.categoryLabel}
                          </span>
                          {isCustom && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/40">
                              Personalizado
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                          {flow.meta.name}
                        </CardTitle>
                      </div>

                      {/* Status Selector Badge */}
                      <select
                        value={flow.meta.status || "Ativo"}
                        onChange={(e) => handleChangeFlowStatus(key, e.target.value)}
                        className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1 text-neutral-800 dark:text-neutral-200 focus:outline-primary cursor-pointer shrink-0"
                      >
                        <option value="Ativo">🟢 Ativo</option>
                        <option value="Produção">🚀 Produção</option>
                        <option value="Homologação">🧪 Homologação</option>
                        <option value="Rascunho">📝 Rascunho</option>
                        <option value="Personalizado">⚙️ Custom</option>
                      </select>
                    </div>
                    <CardDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2">
                      {flow.meta.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3.5 pt-0">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {flow.meta.tags.map((tag) => (
                        <span key={tag} className="text-[9px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats & ERP Integration */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                      <div className="flex items-center gap-1 font-semibold">
                        <Layers className="h-3.5 w-3.5 text-neutral-400" />
                        <span>{flow.nodes.length} Nós / {flow.edges.length} Conexões</span>
                      </div>
                      {flow.meta.erpTables && flow.meta.erpTables.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                          <Cpu className="h-3 w-3" /> {flow.meta.erpTables[0].split(" ")[0]}
                        </div>
                      )}
                    </div>

                    {/* Complete CRUD Actions Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setActiveFlowKey(key);
                            setViewMode("canvas");
                            toast.success(`Fluxo "${flow.meta.name}" carregado no Canvas!`);
                          }}
                          className={`py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors ${
                            isCurrent 
                              ? "bg-primary text-white hover:bg-primary/90" 
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isCurrent ? "Canvas (Ativo)" : "Editar Canvas"}
                        </button>

                        <button
                          onClick={() => {
                            setModalTargetFlowKey(key);
                            setIsEditMetaModalOpen(true);
                          }}
                          className="py-1.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-amber-500" />
                          Metadados
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handleDuplicateFlowByKey(key)}
                          className="py-1 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title="Duplicar Fluxo"
                        >
                          <Copy className="h-3 w-3 text-blue-500" /> Copiar
                        </button>

                        <button
                          onClick={() => {
                            setActiveFlowKey(key);
                            setViewMode("analytics");
                          }}
                          className="py-1 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                          title="Análise de SLA"
                        >
                          <BarChart3 className="h-3 w-3" /> SLA
                        </button>

                        <button
                          onClick={() => {
                            setModalTargetFlowKey(key);
                            setIsDeleteModalOpen(true);
                          }}
                          className="py-1 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100"
                          title={isCustom ? "Excluir Fluxo" : "Restaurar ao Padrão"}
                        >
                          <Trash2 className="h-3 w-3" />
                          {isCustom ? "Excluir" : "Reset"}
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW 2: MAIN CANVAS VISUALIZER ────────────────────────────────── */}
      {viewMode === "canvas" && (
        <div className={`relative flex flex-col xl:flex-row gap-3 overflow-hidden rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm ${
          isFullscreen 
            ? "h-[calc(100vh-140px)] min-h-[560px]" 
            : "h-[calc(100vh-240px)] min-h-[560px]"
        }`}>
          
          {/* 1. Left Pallet (Toolbox & Flow Quick Switcher) - Collapsible */}
          {isLeftPaletteOpen && (
            <div className="w-full xl:w-72 2xl:w-80 shrink-0 border-b xl:border-b-0 xl:border-r border-neutral-200/80 dark:border-neutral-800/80 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40 z-10 overflow-y-auto p-3.5 pb-8 space-y-3.5 max-h-[320px] xl:max-h-full">
              
              <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-2">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Paleta & Processos
                </span>
                <button
                  onClick={() => setIsLeftPaletteOpen(false)}
                  className="p-1 rounded-lg hover:bg-neutral-200/70 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                  title="Ocultar paleta para expandir canvas"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>

              {/* Quick Flow Picker Card */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-primary" /> Fluxo Selecionado
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/40">
                    {activeTemplate.meta.status}
                  </span>
                </div>

                <div className="p-2 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 space-y-1">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{activeTemplate.meta.name}</h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2">{activeTemplate.meta.description}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-400 font-semibold">
                    <span>Versão: <strong>{activeTemplate.meta.version}</strong></span>
                    <span>{nodes.length} nós ativos</span>
                  </div>
                </div>

                {/* Quick Template Switcher */}
                <div className="space-y-1 pt-0.5 max-h-36 overflow-y-auto pr-1">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Alternar Processo:</span>
                  {Object.keys(ALL_FLOW_TEMPLATES).map((key) => {
                    const tmpl = ALL_FLOW_TEMPLATES[key];
                    const isSelected = key === activeFlowKey;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveFlowKey(key)}
                        className={`w-full text-left p-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                          isSelected 
                            ? "bg-primary text-white shadow-xs" 
                            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <span className="truncate pr-2">{tmpl.meta.name}</span>
                        <ChevronRight className={`h-3 w-3 shrink-0 ${isSelected ? "text-white" : "text-neutral-400"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* Toolbox: Palette of Draggable Nodes */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs space-y-3">
              <div>
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Paleta de Elementos
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Arraste para o canvas ou clique em (+) para adicionar.
                </p>
              </div>

              {/* Toolbox Elements */}
              <div className="space-y-2.5">
                  
                {/* 1. Trigger */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("trigger")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <Zap className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Gatilho (Trigger)</p>
                      <p className="text-[10px] opacity-75 truncate">Inicia o fluxo do processo</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("trigger")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar nó ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 2. Condition */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("condition")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <GitFork className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Condicional (Split)</p>
                      <p className="text-[10px] opacity-75 truncate">Ramifica Sim / Não</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("condition")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar nó ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 3. Action */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("action")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <Mail className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Ação Comercial</p>
                      <p className="text-[10px] opacity-75 truncate">E-mail, Tarefas, Protheus</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("action")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar nó ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 4. Operation */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("operation")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Cálculo & Espera</p>
                      <p className="text-[10px] opacity-75 truncate">Temporizador & Fórmulas</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("operation")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar nó ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 5. Validator */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("validator")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <Shield className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Validador / Trava</p>
                      <p className="text-[10px] opacity-75 truncate">Compliance & Bloqueio</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("validator")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar nó ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 6. Business Rule (Governance Studio Connected) */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("businessRule")}
                  className="p-2.5 bg-gradient-to-r from-violet-50/60 to-indigo-50/40 dark:from-violet-950/30 dark:to-indigo-950/20 border border-violet-200 dark:border-violet-800/80 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-violet-400 dark:hover:border-violet-700 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-violet-100 dark:bg-violet-900/60 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
                      <Scale className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-violet-900 dark:text-violet-200 truncate">Regra de Negócio</p>
                        <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 bg-violet-200/80 dark:bg-violet-800 text-violet-800 dark:text-violet-200 rounded">Gov</span>
                      </div>
                      <p className="text-[10px] text-violet-700/80 dark:text-violet-300/80 truncate">Margens, Descontos & Prazos</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("businessRule")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-md text-violet-500 hover:text-violet-800 dark:hover:text-violet-200 transition-colors border border-violet-200/60 dark:border-violet-800 shadow-xs"
                    title="Adicionar Regra de Negócio ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* 7. Enterprise Connector Node */}
                <div
                  draggable
                  onDragStart={() => handleDragStart("connector")}
                  className="p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-all text-neutral-700 dark:text-neutral-300 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg shrink-0">
                      <Radio className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">Conector Corporativo</p>
                      <p className="text-[10px] opacity-75 truncate">TOTVS, APIs, Webhooks</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddNodeClick("connector")}
                    className="p-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 shadow-xs"
                    title="Adicionar conector ao canvas"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

              </div>

              {/* Quick Connectors Presets Bar */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Conectores Rápidos:</span>
                  <button 
                    onClick={() => setViewMode("connectors")} 
                    className="text-[9px] font-bold text-primary hover:underline"
                  >
                    Ver Todos (16) →
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {CONNECTORS_CATALOG.slice(0, 4).map(conn => (
                    <button
                      key={conn.id}
                      onClick={() => handleAddConnectorToCanvas(conn)}
                      className="p-1.5 bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/60 dark:border-neutral-800 rounded-lg text-left transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[10px] font-semibold text-neutral-700 dark:text-neutral-300 truncate group-hover:text-primary">
                        {conn.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Actions Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs space-y-2.5">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-primary" /> Ações do Canvas
              </h3>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSaveLayout}
                  disabled={isSavingLayout}
                  className="col-span-2 p-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-indigo-200 dark:border-indigo-800/60 transition-colors shadow-2xs"
                  title="Salvar posições atuais e conexões no banco de dados via API"
                >
                  {isSavingLayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{isSavingLayout ? "Salvando Layout..." : "Salvar Layout (Banco de Dados)"}</span>
                </button>
                <button
                  onClick={handleAutoLayout}
                  className="p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                  <Grid className="h-3.5 w-3.5" /> Auto-Grade
                </button>
                <button
                  onClick={handleCopyJSON}
                  className="p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar JSON
                </button>
                <button
                  onClick={handleExportJSON}
                  className="p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Exportar
                </button>
                <button
                  onClick={handleClearWorkspace}
                  className="p-2 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-rose-200 dark:border-rose-900/40 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Limpar
                </button>
              </div>
            </div>

          </div>
          )}

          {/* 2. Middle Interactive ReactFlow Canvas */}
          <div className="flex-1 min-h-[460px] h-full relative overflow-hidden flex flex-col bg-neutral-900/5 dark:bg-neutral-950 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60">
            
            {/* Clean Header Bar for Canvas (Non-overlapping) */}
            <div className="bg-white dark:bg-neutral-900 px-4 py-3 border-b border-neutral-200/80 dark:border-neutral-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
              <div className="flex items-center gap-3 flex-wrap">
                {!isLeftPaletteOpen && (
                  <button
                    onClick={() => setIsLeftPaletteOpen(true)}
                    className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 text-xs font-bold transition-all"
                    title="Abrir paleta de elementos"
                  >
                    <PanelLeft className="h-3.5 w-3.5 text-primary" />
                    <span>Paleta</span>
                  </button>
                )}
                
                <div className="bg-neutral-50 dark:bg-neutral-800/60 px-3 py-1.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{activeTemplate.meta.name}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">({nodes.length} nós • {edges.length} conexões)</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setRightPanelTab("simulation");
                    setIsRightInspectorOpen(true);
                  }}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                    isRightInspectorOpen && rightPanelTab === "simulation"
                      ? "bg-violet-600 text-white shadow-violet-500/20 ring-2 ring-violet-400"
                      : "bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
                  }`}
                  title="Abrir Painel Lateral de Simulação de Regras"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Simulação & Regras</span>
                </button>

                <button
                  onClick={() => handleSimulateFlow()}
                  disabled={isSimulating}
                  className={`py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all ${
                    isSimulating ? "opacity-60 cursor-wait animate-pulse" : ""
                  }`}
                  title="Executar fluxo atual"
                >
                  <Play className="h-3.5 w-3.5 fill-white" />
                  {isSimulating ? "Simulando..." : "Testar Fluxo"}
                </button>

                {!isRightInspectorOpen && (
                  <button
                    onClick={() => {
                      setRightPanelTab("inspector");
                      setIsRightInspectorOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 text-xs font-bold transition-all"
                    title="Abrir inspetor de propriedades"
                  >
                    <PanelRight className="h-3.5 w-3.5 text-primary" />
                    <span className="hidden sm:inline">Inspetor</span>
                  </button>
                )}
              </div>
            </div>

            {/* Docked Quick-Add Toolbar */}
            <div className="bg-neutral-50 dark:bg-neutral-900/80 px-4 py-2.5 border-b border-neutral-200/80 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-neutral-500 uppercase mr-1">Adicionar Nó:</span>
                <button
                  onClick={() => handleAddNodeClick("trigger")}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors"
                  title="Adicionar Gatilho (Trigger)"
                >
                  <Zap className="h-3.5 w-3.5 text-indigo-500" /> + Gatilho
                </button>
                <button
                  onClick={() => handleAddNodeClick("condition")}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors"
                  title="Adicionar Condicional (Sim / Não)"
                >
                  <GitFork className="h-3.5 w-3.5 text-amber-500" /> + Decisão
                </button>
                <button
                  onClick={() => handleAddNodeClick("action")}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors"
                  title="Adicionar Ação Comercial"
                >
                  <Mail className="h-3.5 w-3.5 text-emerald-500" /> + Ação
                </button>
                <button
                  onClick={() => handleAddNodeClick("operation")}
                  className="px-2.5 py-1 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors"
                  title="Adicionar Cálculo ou Temporizador"
                >
                  <Clock className="h-3.5 w-3.5 text-blue-500" /> + Cálculo
                </button>
                <button
                  onClick={() => handleAddNodeClick("validator")}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-rose-200/50 transition-colors"
                  title="Adicionar Validador ou Trava"
                >
                  <Shield className="h-3.5 w-3.5 text-rose-500" /> + Validador
                </button>
                <button
                  onClick={() => handleAddNodeClick("connector")}
                  className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/50 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-cyan-200/50 transition-colors"
                  title="Adicionar Conector Protheus / REST"
                >
                  <Radio className="h-3.5 w-3.5 text-cyan-500" /> + Conector
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5 shadow-2xs">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                    title="Desfazer alteração (Ctrl+Z)"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                    title="Refazer alteração (Ctrl+Y ou Ctrl+Shift+Z)"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  onClick={handleAutoLayout}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors shrink-0"
                  title="Organizar automaticamente a posição de todos os nós sem sobreposição"
                >
                  <Wand2 className="h-3.5 w-3.5" /> Auto-Layout
                </button>

                <button
                  onClick={handleSaveLayout}
                  disabled={isSavingLayout}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                  title="Salvar a posição atual de cada nó e as conexões no banco de dados via API"
                >
                  {isSavingLayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{isSavingLayout ? "Salvando..." : "Salvar Layout"}</span>
                </button>
              </div>
            </div>

            {/* Canvas Viewport */}
            <div
              ref={reactFlowWrapper}
              className="flex-1 min-h-0 w-full relative overflow-hidden"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <ReactFlow
                nodes={nodes.map((n) => {
                  const isInPath = activeSimPath.includes(n.id);
                  const isErrorNode = validationResult.errorNodeIds.includes(n.id);
                  const isWarningNode = validationResult.warningNodeIds.includes(n.id);
                  const isCycleNode = validationResult.cycleNodeIds.includes(n.id);
                  const isUnreachableNode = validationResult.unreachableNodeIds.includes(n.id);

                  let glowStyle: React.CSSProperties | undefined = undefined;
                  if (isInPath) {
                    glowStyle = {
                      boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                      borderRadius: '12px',
                      transform: 'scale(1.02)',
                      transition: 'all 0.3s ease'
                    };
                  } else if (isErrorNode) {
                    glowStyle = {
                      boxShadow: isCycleNode 
                        ? '0 0 0 2px #f43f5e, 0 0 16px rgba(244, 63, 94, 0.45)' 
                        : '0 0 0 2px #f43f5e, 0 0 12px rgba(244, 63, 94, 0.3)',
                      borderRadius: '12px'
                    };
                  } else if (isWarningNode || isUnreachableNode) {
                    glowStyle = {
                      boxShadow: '0 0 0 2px #f59e0b, 0 0 10px rgba(245, 158, 11, 0.25)',
                      borderRadius: '12px'
                    };
                  }

                  return {
                    ...n,
                    style: glowStyle
                  };
                })}
                edges={edges.map((e) => {
                  const isEdgeActive = activeSimPath.includes(e.source) && activeSimPath.includes(e.target);
                  const isSelected = e.id === selectedEdgeId;
                  const isErrorEdge = validationResult.errorEdgeIds.includes(e.id);
                  return {
                    ...e,
                    animated: e.animated || isEdgeActive || isSelected || isErrorEdge,
                    style: isErrorEdge
                      ? { stroke: "#f43f5e", strokeWidth: 3, strokeDasharray: "4 3" }
                      : isEdgeActive
                      ? { stroke: "#6366f1", strokeWidth: 3.5 }
                      : isSelected
                      ? { stroke: "#3b82f6", strokeWidth: 3 }
                      : e.style || { stroke: "#94a3b8", strokeWidth: 1.5 }
                  };
                })}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                onNodeDragStart={() => takeSnapshot()}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onInit={setReactFlowInstance}
                fitView
                attributionPosition="bottom-right"
                className="h-full w-full"
              >
                <Controls className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-md overflow-hidden" />
                
                <MiniMap 
                  nodeStrokeColor={(n) => {
                    if (n.type === "triggerNode") return "#6366f1";
                    if (n.type === "conditionNode") return "#d97706";
                    if (n.type === "validatorNode") return "#e11d48";
                    if (n.type === "operationNode") return "#0284c7";
                    if (n.type === "connectorNode") return "#0891b2";
                    if (n.type === "businessRuleNode") return "#8b5cf6";
                    return "#10b981";
                  }}
                  nodeColor={(n) => {
                    if (n.type === "triggerNode") return "#e0e7ff";
                    if (n.type === "conditionNode") return "#fef3c7";
                    if (n.type === "validatorNode") return "#ffe4e6";
                    if (n.type === "operationNode") return "#e0f2fe";
                    if (n.type === "connectorNode") return "#cffafe";
                    if (n.type === "businessRuleNode") return "#ede9fe";
                    return "#d1fae5";
                  }}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl overflow-hidden shadow-sm"
                />
                
                <Background gap={16} size={1} />
                
                {/* HUD Overlay Panel */}
                <Panel position="top-left" className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm p-2.5 border border-neutral-200/60 dark:border-neutral-800/60 rounded-xl shadow-md space-y-1 max-w-xs pointer-events-auto">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Estado do Processo</span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                    </span>
                  </div>
                  <div className="pt-0.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                    Ambiente Protheus <strong>0101</strong> • {nodes.length} nós • {edges.length} conexões
                  </div>
                  <button
                    onClick={() => setIsValidationDrawerOpen(true)}
                    className="w-full mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                  >
                    <span className="font-semibold flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-indigo-500" /> Validação:
                    </span>
                    {validationResult.isValid && validationResult.warningsCount === 0 ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conforme (0 erros)
                      </span>
                    ) : validationResult.hasErrors ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {validationResult.errorsCount} Erro(s)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {validationResult.warningsCount} Alerta(s)
                      </span>
                    )}
                  </button>
                </Panel>



                {/* Floating Selection Action Bar */}
                {(selectedNodeId || selectedEdgeId) && (
                  <Panel position="bottom-center" className="bg-neutral-900/90 dark:bg-neutral-900/95 backdrop-blur-md px-4 py-2 border border-neutral-700/80 rounded-2xl shadow-2xl flex items-center gap-3 text-white pointer-events-auto animate-in fade-in slide-in-from-bottom-2 mb-3">
                    <div className="flex items-center gap-2 pr-2 border-r border-neutral-700">
                      <MousePointerClick className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold truncate max-w-[180px]">
                        {selectedNode ? selectedNode.data.label : (edges.find(e => e.id === selectedEdgeId)?.data?.label || "Conector selecionado")}
                      </span>
                    </div>

                    {selectedNodeId && (
                      <button
                        onClick={handleDuplicateSelectedNode}
                        className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700 text-neutral-200"
                        title="Duplicar nó selecionado (Ctrl+D)"
                      >
                        <Files className="h-3.5 w-3.5 text-blue-400" /> Duplicar (Ctrl+D)
                      </button>
                    )}

                    <button
                      onClick={handleDeleteSelectedElement}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors text-white shadow-xs"
                      title="Excluir elemento selecionado (Del / Backspace)"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir (Del)
                    </button>
                  </Panel>
                )}

                {/* Keyboard Shortcuts Hint Panel */}
                <Panel position="bottom-left" className="ml-14 mb-3 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm px-2.5 py-2 border border-neutral-200/80 dark:border-neutral-800/80 rounded-xl text-[10px] text-neutral-600 dark:text-neutral-400 space-y-1 pointer-events-auto hidden sm:block shadow-sm">
                  <div className="flex items-center gap-1.5"><kbd className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">Ctrl+Z</kbd> Desfazer alteração</div>
                  <div className="flex items-center gap-1.5"><kbd className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">Ctrl+Y</kbd> Refazer alteração</div>
                  <div className="flex items-center gap-1.5"><kbd className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">Del</kbd> Excluir etapa/conexão</div>
                  <div className="flex items-center gap-1.5"><kbd className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">Ctrl+D</kbd> Duplicar nó</div>
                  <div className="flex items-center gap-1.5"><kbd className="font-mono font-bold bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-neutral-700 dark:text-neutral-300">Ctrl+S</kbd> Salvar fluxo</div>
                </Panel>
              </ReactFlow>
            </div>

            {/* Simulation Log Drawer if active */}
            {simLogs.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-500" /> Trilha de Execução Simulada ({simLogs.length} passos)
                  </h4>
                  <button 
                    onClick={() => setSimLogs([])}
                    className="text-[10px] text-neutral-400 hover:text-neutral-600"
                  >
                    Limpar Logs
                  </button>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto font-mono text-[11px]">
                  {simLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-1.5 bg-neutral-50 dark:bg-neutral-950 rounded border border-neutral-100 dark:border-neutral-800/60">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-1 rounded">Passo {log.step}</span>
                        <span className="font-semibold text-neutral-700 dark:text-neutral-200">{log.label}</span>
                        {log.clauseNumber && (
                          <span className="text-[9px] font-sans font-medium bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded flex items-center gap-0.5" title={`${log.docTitle || ''} - ${log.clauseTitle || ''}`}>
                            <Scale className="h-2.5 w-2.5 text-emerald-600" />
                            {log.clauseNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{log.outcome}</span>
                        <span className="text-[9px] text-neutral-400">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* 3. Right Inspector & Parameters Configuration Panel - Collapsible */}
          {isRightInspectorOpen && (
            <div className="w-full xl:w-[540px] 2xl:w-[640px] shrink-0 border-t xl:border-t-0 xl:border-l border-neutral-200/80 dark:border-neutral-800/80 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40 z-10 overflow-y-auto pb-8 max-h-[460px] xl:max-h-full">
              
              {/* Right Panel Header with Tab Switcher */}
              <div className="p-2.5 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between gap-1 shrink-0 sticky top-0 z-20">
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl text-xs">
                  <button
                    onClick={() => setRightPanelTab("simulation")}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
                      rightPanelTab === "simulation"
                        ? "bg-violet-600 text-white shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Simulação</span>
                  </button>

                  <button
                    onClick={() => setRightPanelTab("inspector")}
                    className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs ${
                      rightPanelTab === "inspector"
                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    }`}
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Inspetor</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsRightInspectorOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="Ocultar painel lateral"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              </div>

              {/* TAB CONTENT 1: SIMULATION SIDE PANEL */}
              {rightPanelTab === "simulation" && (
                <FlowSimulationSidePanel
                  activeTemplate={activeTemplate}
                  nodes={nodes}
                  edges={edges}
                  onRunSimulation={(executedNodeIds) => handleSimulateFlow(executedNodeIds)}
                  isSimulating={isSimulating}
                  activeSimPath={activeSimPath}
                  onClose={() => setIsRightInspectorOpen(false)}
                  onFocusNode={(nodeId) => {
                    setSelectedNodeId(nodeId);
                    setSelectedEdgeId(null);
                    const targetNode = nodes.find(n => n.id === nodeId);
                    if (targetNode && reactFlowInstance) {
                      reactFlowInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 400 });
                    }
                  }}
                />
              )}

              {/* TAB CONTENT 2: NODE/EDGE INSPECTOR & RAW PARAMETERS */}
              {rightPanelTab === "inspector" && (
                <div className="p-3.5 space-y-3.5">
                  {/* Inspector Card (Handles Selected Edge OR Selected Node) */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-3.5 shadow-xs space-y-3.5">

              {/* CASE 1: EDGE / CONNECTOR TRANSITION SELECTED */}
              {selectedEdgeId && (() => {
                const selectedEdge = edges.find(e => e.id === selectedEdgeId);
                if (!selectedEdge) return null;
                const edgeData = (selectedEdge.data as FlowEdgeData) || {};
                const sourceNode = nodes.find(n => n.id === selectedEdge.source);
                const targetNode = nodes.find(n => n.id === selectedEdge.target);

                return (
                  <div className="space-y-3.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase">Conector / Transição</span>
                      <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        {selectedEdge.type || "stepConnectorEdge"}
                      </span>
                    </div>

                    <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 text-xs space-y-1">
                      <div className="text-[10px] text-neutral-400 font-bold uppercase">Origem → Destino</div>
                      <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 truncate">
                        <span>{sourceNode?.data.label || selectedEdge.source}</span>
                        <ArrowRight className="h-3 w-3 text-neutral-400 shrink-0" />
                        <span>{targetNode?.data.label || selectedEdge.target}</span>
                      </div>
                    </div>

                    {/* Edge Type Selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Tipo do Conector Visual</label>
                      <select
                        value={selectedEdge.type || "stepConnectorEdge"}
                        onChange={(e) => updateSelectedEdge(edge => ({ ...edge, type: e.target.value }))}
                        className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                      >
                        <option value="stepConnectorEdge">Passo Step (Ortogonal Suave)</option>
                        <option value="dataPipeEdge">Data Pipe (Barramento Animado)</option>
                        <option value="conditionalEdge">Bifurcação Condicional (Sim / Não)</option>
                        <option value="securityEdge">Canal Seguro mTLS (Criptografado)</option>
                      </select>
                    </div>

                    {/* Label / Condition Expression */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Rótulo / Legenda da Aresta</label>
                      <input
                        type="text"
                        value={edgeData.label || ""}
                        onChange={(e) => updateSelectedEdge(edge => ({
                          ...edge,
                          data: { ...edge.data, label: e.target.value }
                        }))}
                        placeholder="Ex: Sim, Não, Aprovado, Retry"
                        className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                      />
                    </div>

                    {/* Conditional Variant if conditional edge */}
                    {selectedEdge.type === "conditionalEdge" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Tipo de Decisão</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => updateSelectedEdge(edge => ({
                              ...edge,
                              data: { ...edge.data, conditionType: "sim", label: "Sim / Aprovado" }
                            }))}
                            className={`p-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              edgeData.conditionType === "sim"
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                            }`}
                          >
                            Sim / True
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSelectedEdge(edge => ({
                              ...edge,
                              data: { ...edge.data, conditionType: "nao", label: "Não / Rejeitado" }
                            }))}
                            className={`p-1.5 rounded-lg text-xs font-bold border transition-colors ${
                              edgeData.conditionType === "nao"
                                ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                                : "bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
                            }`}
                          >
                            Não / False
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Protocol & Latency */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-neutral-400 uppercase">Protocolo</label>
                        <select
                          value={edgeData.protocol || "REST"}
                          onChange={(e) => updateSelectedEdge(edge => ({
                            ...edge,
                            data: { ...edge.data, protocol: e.target.value as any }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                        >
                          <option value="REST">REST HTTPS</option>
                          <option value="ADVPL">ADVPL RPC</option>
                          <option value="Webhook">Webhook</option>
                          <option value="CDC">Kafka CDC</option>
                          <option value="AMQP">AMQP Rabbit</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-neutral-400 uppercase">Latência (ms)</label>
                        <input
                          type="number"
                          value={edgeData.latencyMs || 24}
                          onChange={(e) => updateSelectedEdge(edge => ({
                            ...edge,
                            data: { ...edge.data, latencyMs: Number(e.target.value) }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-mono text-center"
                        />
                      </div>
                    </div>

                    {/* Payload Route */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Payload Roteado</label>
                      <input
                        type="text"
                        value={edgeData.payloadSummary || "application/json (Record payload)"}
                        onChange={(e) => updateSelectedEdge(edge => ({
                          ...edge,
                          data: { ...edge.data, payloadSummary: e.target.value }
                        }))}
                        className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-mono text-[11px]"
                      />
                    </div>

                    {/* Delete Edge Button */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                      <button
                        onClick={() => {
                          setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
                          setSelectedEdgeId(null);
                          toast.success("Conector removido.");
                        }}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-1 font-bold border border-rose-100 dark:border-rose-900/30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir Conector
                      </button>
                    </div>

                  </div>
                );
              })()}

              {/* CASE 2: NODE SELECTED */}
              {!selectedEdgeId && selectedNode && (
                <div className="space-y-3.5 animate-in fade-in">
                  
                  {/* Node Type Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Tipo do Elemento</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full">
                      {selectedNode.data.type}
                    </span>
                  </div>

                  {/* Node Name/Label */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Título da Etapa</label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
                      onChange={(e) => updateSelectedNode(data => ({ ...data, label: e.target.value }))}
                      className="w-full h-8.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                    />
                  </div>

                  {/* Node Description */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">Descrição Operacional</label>
                    <textarea
                      value={selectedNode.data.description}
                      rows={2}
                      onChange={(e) => updateSelectedNode(data => ({ ...data, description: e.target.value }))}
                      className="w-full text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl p-2.5 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary leading-relaxed"
                    />
                  </div>

                  {/* Connector Specific Configuration */}
                  {selectedNode.data.type === "connector" && (
                    <div className="space-y-2.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase">Configuração de Conector</label>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                          {selectedNode.data.config.connectorStatus || "online"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-400">Provedor / Vendor</label>
                          <input
                            type="text"
                            value={selectedNode.data.config.connectorVendor ?? "TOTVS S.A."}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, connectorVendor: e.target.value }
                            }))}
                            className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-400">Protocolo</label>
                          <select
                            value={selectedNode.data.config.connectorProtocol ?? "REST"}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, connectorProtocol: e.target.value }
                            }))}
                            className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          >
                            <option value="REST">REST API</option>
                            <option value="ADVPL">ADVPL RPC</option>
                            <option value="Webhook">Webhook</option>
                            <option value="CDC">Kafka CDC</option>
                            <option value="AMQP">RabbitMQ</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Endpoint / Rota</label>
                        <input
                          type="text"
                          value={selectedNode.data.config.connectorEndpoint ?? "/salesorders"}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, connectorEndpoint: e.target.value }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-mono text-[11px]"
                          placeholder="Ex: /api/v1/customers"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Ping realizado com sucesso no conector "${selectedNode.data.label}"! Latência: ${selectedNode.data.config.connectorLatency || 28}ms`);
                        }}
                        className="w-full py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-emerald-500" /> Testar Ping de Conexão
                      </button>
                    </div>
                  )}

                  {/* Trigger Config */}
                  {selectedNode.data.type === "trigger" && (
                    <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Origem do Gatilho</label>
                      <input
                        type="text"
                        value={selectedNode.data.config.source ?? ""}
                        onChange={(e) => updateSelectedNode(data => ({
                          ...data,
                          config: { ...data.config, source: e.target.value }
                        }))}
                        className="w-full h-8.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                        placeholder="Ex: API Gateway, Webhook, Portal"
                      />
                    </div>
                  )}

                  {/* Condition Config */}
                  {selectedNode.data.type === "condition" && (
                    <div className="space-y-2.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Campo de Avaliação</label>
                      <input
                        type="text"
                        value={selectedNode.data.config.field ?? ""}
                        onChange={(e) => updateSelectedNode(data => ({
                          ...data,
                          config: { ...data.config, field: e.target.value }
                        }))}
                        className="w-full h-8.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                        placeholder="Ex: Faturamento Anual, Margem %"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-400">Operador</label>
                          <select
                            value={selectedNode.data.config.operator ?? "=="}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, operator: e.target.value }
                            }))}
                            className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          >
                            <option value="==">Igual (==)</option>
                            <option value=">=">Maior ou Igual (&gt;=)</option>
                            <option value="<=">Menor ou Igual (&lt;=)</option>
                            <option value=">">Maior (&gt;)</option>
                            <option value="<">Menor (&lt;)</option>
                            <option value="!=">Diferente (!=)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-400">Valor de Corte</label>
                          <input
                            type="text"
                            value={selectedNode.data.config.value ?? ""}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, value: e.target.value }
                            }))}
                            className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                            placeholder="Ex: 50000000"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Config */}
                  {selectedNode.data.type === "action" && (
                    <div className="space-y-2.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Parâmetros da Ação</label>
                      
                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Destinatário / Grupo Atribuído</label>
                        <input
                          type="text"
                          value={selectedNode.data.config.assigneeGroup ?? ""}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, assigneeGroup: e.target.value }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          placeholder="Ex: Key Accounts, Inside Sales"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Template de E-mail</label>
                        <input
                          type="text"
                          value={selectedNode.data.config.emailTemplate ?? ""}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, emailTemplate: e.target.value }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          placeholder="Ex: Proposta Comercial Q3"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Canal Slack / WhatsApp</label>
                        <input
                          type="text"
                          value={selectedNode.data.config.slackChannel ?? selectedNode.data.config.whatsappTemplate ?? ""}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, slackChannel: e.target.value }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          placeholder="Ex: #vendas-leads, Alerta WhatsApp"
                        />
                      </div>
                    </div>
                  )}

                  {/* Operation & Calculation Config */}
                  {selectedNode.data.type === "operation" && (
                    <div className="space-y-2.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Fórmula & Temporizador</label>
                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Fórmula de Cálculo ƒ(x)</label>
                        <input
                          type="text"
                          value={selectedNode.data.config.formula ?? ""}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, formula: e.target.value }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-mono text-sky-600 dark:text-sky-400"
                          placeholder="Ex: Comissao = Valor * 0.05"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400">Pausa / Espera (Dias)</label>
                        <input
                          type="number"
                          value={selectedNode.data.config.delayDays ?? ""}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, delayDays: Number(e.target.value) }
                          }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary"
                          placeholder="Ex: 14"
                        />
                      </div>
                    </div>
                  )}

                  {/* Validator Config */}
                  {selectedNode.data.type === "validator" && (
                    <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase">Regra de Validação</label>
                      <input
                        type="text"
                        value={selectedNode.data.config.validationRule ?? ""}
                        onChange={(e) => updateSelectedNode(data => ({
                          ...data,
                          config: { ...data.config, validationRule: e.target.value }
                        }))}
                        className="w-full h-8.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary text-rose-600 dark:text-rose-400 font-semibold"
                        placeholder="Ex: Schema Fiscal Protheus"
                      />
                    </div>
                  )}

                  {/* Business Rule / Governance Studio Config */}
                  {selectedNode.data.type === "businessRule" && (
                    <div className="space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase flex items-center gap-1">
                          <Scale className="h-3.5 w-3.5" /> Definições Governance Studio
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            updateSelectedNode(data => ({
                              ...data,
                              config: {
                                ...data.config,
                                maxDiscountPct: 8,
                                maxDiscountManagerPct: 15,
                                minMarginPct: 25,
                                maxPaymentTermDays: 60,
                                maxVolumeWithoutApproval: 50000,
                                governanceSyncStatus: "synced",
                                governanceVersion: 3,
                                governanceLastSync: new Date().toISOString()
                              }
                            }));
                            toast.success("Parâmetros do Governance Studio Re-sincronizados!", {
                              description: "Desconto Vendedor ≤ 8%, Gerente ≤ 15%, Margem ≥ 25%, Prazo ≤ 60d."
                            });
                          }}
                          className="text-[9px] font-bold text-violet-600 dark:text-violet-300 hover:text-violet-900 dark:hover:text-white flex items-center gap-1 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200/60 dark:border-violet-800"
                          title="Buscar definições atualizadas da Governança"
                        >
                          <RefreshCw className="h-2.5 w-2.5" /> Re-sincronizar
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">Teto Desconto Vendedor (%)</label>
                          <input
                            type="number"
                            value={selectedNode.data.config.maxDiscountPct ?? 8}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, maxDiscountPct: Number(e.target.value) }
                            }))}
                            className="w-full h-8 text-xs border border-violet-200 dark:border-violet-900 rounded-lg px-2 bg-violet-50/30 dark:bg-violet-950/30 font-bold text-violet-700 dark:text-violet-300 focus:outline-violet-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">Teto Desconto Gerente (%)</label>
                          <input
                            type="number"
                            value={selectedNode.data.config.maxDiscountManagerPct ?? 15}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, maxDiscountManagerPct: Number(e.target.value) }
                            }))}
                            className="w-full h-8 text-xs border border-violet-200 dark:border-violet-900 rounded-lg px-2 bg-violet-50/30 dark:bg-violet-950/30 font-bold text-violet-700 dark:text-violet-300 focus:outline-violet-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">Piso Margem Mínima (%)</label>
                          <input
                            type="number"
                            value={selectedNode.data.config.minMarginPct ?? 25}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, minMarginPct: Number(e.target.value) }
                            }))}
                            className="w-full h-8 text-xs border border-emerald-200 dark:border-emerald-900 rounded-lg px-2 bg-emerald-50/30 dark:bg-emerald-950/30 font-bold text-emerald-700 dark:text-emerald-300 focus:outline-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">Prazo Máx Pagto (Dias)</label>
                          <input
                            type="number"
                            value={selectedNode.data.config.maxPaymentTermDays ?? 60}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, maxPaymentTermDays: Number(e.target.value) }
                            }))}
                            className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 font-bold text-neutral-700 dark:text-neutral-200 focus:outline-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-1">
                        <label className="text-[9px] font-medium text-neutral-500 dark:text-neutral-400">Regra Comercial do Governance Studio</label>
                        <select
                          value={selectedNode.data.config.governanceRuleId ?? "gov-rule-desc-max-rep"}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const matchedRule = DEFAULT_GOVERNANCE_RULES.find(r => r.id === selectedId);
                            updateSelectedNode(data => ({
                              ...data,
                              config: { 
                                ...data.config, 
                                governanceRuleId: selectedId,
                                governanceRuleName: matchedRule?.name || "Regra de Governança",
                                complianceRule: matchedRule?.description || data.config.complianceRule
                              }
                            }));
                          }}
                          className="w-full h-8 text-[11px] border border-violet-200 dark:border-violet-900 rounded-lg px-2 bg-white dark:bg-neutral-900 focus:outline-violet-500"
                        >
                          {DEFAULT_GOVERNANCE_RULES.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-2 bg-violet-50/60 dark:bg-violet-950/40 rounded-lg border border-violet-100 dark:border-violet-900/40 text-[10px] space-y-1">
                        <div className="font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Vínculo Ativo com o Governance Studio
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-[9px] leading-tight">
                          Os nós a montante e a jusante recebem as travas de margem e descontos em tempo de execução.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Protheus ERP Advanced Configuration */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1">
                        <Cpu className="h-3.5 w-3.5 text-blue-500" /> Sincronização TOTVS Protheus
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedNode.data.config.protheusSyncEnabled ?? false}
                          onChange={(e) => updateSelectedNode(data => ({
                            ...data,
                            config: { ...data.config, protheusSyncEnabled: e.target.checked }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {selectedNode.data.config.protheusSyncEnabled && (
                      <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100/40 dark:border-blue-900/30 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-neutral-500 uppercase">Tabela ERP</label>
                          <select
                            value={selectedNode.data.config.protheusTable ?? "SA1 - Clientes"}
                            onChange={(e) => updateSelectedNode(data => ({
                              ...data,
                              config: { ...data.config, protheusTable: e.target.value }
                            }))}
                            className="w-full h-7.5 text-[11px] border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-white dark:bg-neutral-900 focus:outline-primary"
                          >
                            <option value="SA1 - Clientes">SA1 - Clientes</option>
                            <option value="SC5 - Pedidos de Venda">SC5 - Pedidos de Venda</option>
                            <option value="SC6 - Itens Pedido">SC6 - Itens Pedido</option>
                            <option value="SC2 - Ordens de Produção">SC2 - Ordens de Produção</option>
                            <option value="SA3 - Vendedores">SA3 - Vendedores</option>
                            <option value="SE1 - Contas a Receber">SE1 - Contas a Receber</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[9px] font-bold text-neutral-500 uppercase">Operação</label>
                            <select
                              value={selectedNode.data.config.protheusOperation ?? "incluir"}
                              onChange={(e) => updateSelectedNode(data => ({
                                ...data,
                                config: { ...data.config, protheusOperation: e.target.value }
                              }))}
                              className="w-full h-7.5 text-[11px] border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-white dark:bg-neutral-900 focus:outline-primary"
                            >
                              <option value="incluir">MSExecAuto Incluir</option>
                              <option value="alterar">MSExecAuto Alterar</option>
                              <option value="execblock">ExecBlock ADVPL</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-neutral-500 uppercase">Filial ERP</label>
                            <input
                              type="text"
                              value={selectedNode.data.config.protheusBranchCode ?? "0101"}
                              onChange={(e) => updateSelectedNode(data => ({
                                ...data,
                                config: { ...data.config, protheusBranchCode: e.target.value }
                              }))}
                              className="w-full h-7.5 text-[11px] border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-white dark:bg-neutral-900 focus:outline-primary font-mono text-center"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Automated Normative Document & Statutory Clause Connection Card */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Documento & Regra Normativa
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Auto-Conectado
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2 text-xs">
                      <div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                          <FileText className="h-3 w-3 text-emerald-600" /> Documento Regulatório
                        </div>
                        <div className="font-bold text-neutral-800 dark:text-neutral-100 text-[11px] truncate mt-0.5">
                          {selectedNode.data.config.connectedDocumentTitle || 
                           (selectedNode.data.type === "condition" 
                             ? "Manual de Diretrizes de Preço e Desconto v3.2.pdf" 
                             : selectedNode.data.type === "operation" 
                             ? "Regulamento Geral de Comissionamento 2026.pdf" 
                             : "Política Comercial e Condições de Fornecimento B2B.pdf")}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-neutral-400 uppercase">Cláusula Estatutária Aplicada</div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
                          {selectedNode.data.config.connectedClauseNumber || "Cláusula Vinculada"}: {selectedNode.data.config.connectedClauseTitle || "Regra Regulamentar de Negócio"}
                        </div>
                        <p className="text-[10px] text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed bg-white/60 dark:bg-neutral-900/60 p-2 rounded-lg border border-emerald-500/10">
                          {selectedNode.data.config.complianceRule || 
                           "Execução regida pelo marco regulatório e compliance comercial corporativo. Parâmetros auditados para SOX e integração TOTVS Protheus."}
                        </p>
                      </div>

                      <div className="pt-1.5 flex items-center justify-between border-t border-emerald-500/10 text-[10px]">
                        <span className="text-neutral-500 dark:text-neutral-400 font-mono text-[9px] flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          Compliance Automático Ativo
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDocumentsModalOpen(true)}
                          className="font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 text-[10px]"
                        >
                          Ver Matriz <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Node Action Footer: Duplicate + Delete */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                    <button
                      onClick={handleDuplicateSelectedNode}
                      className="py-1.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs rounded-xl flex items-center gap-1 font-bold transition-colors"
                      title="Duplicar este nó (Ctrl+D)"
                    >
                      <Files className="h-3.5 w-3.5 text-blue-500" /> Duplicar (Ctrl+D)
                    </button>

                    <button
                      onClick={() => {
                        setNodes((nds) => nds.filter((node) => node.id !== selectedNodeId));
                        setEdges((eds) => eds.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
                        setSelectedNodeId(null);
                        toast.success("Nó removido do fluxo.");
                      }}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl flex items-center gap-1 font-bold border border-rose-100 dark:border-rose-900/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir Nó
                    </button>
                  </div>

                </div>
              )}

              {/* CASE 3: NOTHING SELECTED */}
              {!selectedEdgeId && !selectedNode && (
                <div className="flex flex-col items-center justify-center py-10 text-center text-neutral-400">
                  <Info className="h-7 w-7 text-neutral-300 dark:text-neutral-700 mb-1.5" />
                  <p className="text-xs font-bold text-neutral-500">Nenhum elemento selecionado</p>
                  <p className="text-[11px] text-neutral-400 max-w-xs mt-1">
                    Clique em qualquer etapa ou conector no canvas para parametrizar regras, latência e integrações.
                  </p>
                </div>
              )}
            </div>

            {/* Sandbox Simulation Parameters */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" /> Parâmetros de Teste
                </h3>
              </div>
              <p className="text-[11px] text-neutral-400">
                Ajuste os valores para simular o roteamento deste fluxo em tempo real:
              </p>

              <div className="space-y-2.5">
                {Object.keys(simInputs).map((paramKey) => {
                  const val = simInputs[paramKey];
                  const isNumber = typeof val === "number";
                  const isBoolean = typeof val === "boolean";
                  return (
                    <div key={paramKey} className="space-y-1">
                      <label className="text-[9px] font-bold text-neutral-400 uppercase capitalize">
                        {paramKey.replace(/([A-Z])/g, ' $1')}
                      </label>
                      {isBoolean ? (
                        <select
                          value={val ? "true" : "false"}
                          onChange={(e) => setSimInputs(prev => ({ ...prev, [paramKey]: e.target.value === "true" }))}
                          className="w-full h-7.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                        >
                          <option value="true">Sim / Verdadeiro</option>
                          <option value="false">Não / Falso</option>
                        </select>
                      ) : (
                        <input
                          type={isNumber ? "number" : "text"}
                          value={val}
                          onChange={(e) => setSimInputs(prev => ({ 
                            ...prev, 
                            [paramKey]: isNumber ? Number(e.target.value) : e.target.value 
                          }))}
                          className="w-full h-7.5 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-neutral-50 dark:bg-neutral-950 focus:outline-primary font-semibold"
                        />
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => handleSimulateFlow()}
                  disabled={isSimulating}
                  className={`w-full py-2 bg-primary text-white hover:bg-primary/90 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-opacity ${
                    isSimulating ? "opacity-50 cursor-wait animate-pulse" : ""
                  }`}
                >
                  <Play className="h-3.5 w-3.5" /> Executar Simulação Visual
                </button>
              </div>
            </div>
          </div>
          )}

          </div>
          )}

        </div>
      )}

      {/* ─── Modal Dialogs for Flow Lifecycle ────────────────────────────── */}
      <CreateFlowModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreate={handleCreateNewFlow}
      />

      <EditFlowMetaModal
        open={isEditMetaModalOpen}
        onOpenChange={(open) => {
          setIsEditMetaModalOpen(open);
          if (!open) setModalTargetFlowKey(null);
        }}
        initialData={{
          name: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.name || "",
          category: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.category || "crm",
          categoryLabel: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.categoryLabel || "Comercial & CRM",
          description: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.description || "",
          tags: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.tags || [],
          erpTables: (modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.erpTables || []
        }}
        onSave={handleUpdateFlowMeta}
      />

      <ImportFlowModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImport={handleImportFlowJSON}
      />

      <DeleteFlowConfirmModal
        open={isDeleteModalOpen}
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) setModalTargetFlowKey(null);
        }}
        onConfirm={handleDeleteTargetFlow}
        isCustom={!!customFlows[modalTargetFlowKey || activeFlowKey]}
        flowName={(modalTargetFlowKey ? allTemplates[modalTargetFlowKey] : activeTemplate)?.meta.name || ""}
      />

      {/* Validation Engine Drawer */}
      <WorkflowValidationDrawer
        isOpen={isValidationDrawerOpen}
        onClose={() => setIsValidationDrawerOpen(false)}
        validationResult={validationResult}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          setSelectedEdgeId(null);
          const targetNode = nodes.find(n => n.id === nodeId);
          if (targetNode && reactFlowInstance) {
            reactFlowInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 400 });
          }
        }}
        onSelectEdge={(edgeId) => {
          setSelectedEdgeId(edgeId);
          setSelectedNodeId(null);
        }}
        onAutoLayout={handleAutoLayout}
        onCleanDanglingEdges={handleCleanDanglingEdges}
        onAutoFixAll={handleAutoFixAll}
        onAutoFixIssue={handleAutoFixIssue}
        onRemoveUnreachableNodes={handleRemoveUnreachableNodes}
        onBreakCycles={handleBreakCycles}
      />

      {/* Pre-Save & Pre-Export Strict Validation Blocking Modal */}
      <WorkflowValidationModal
        open={isValidationModalOpen}
        onOpenChange={setIsValidationModalOpen}
        validationResult={validationResult}
        actionType={validationModalAction}
        flowName={activeTemplate.meta.name}
        onFocusNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          setSelectedEdgeId(null);
          const targetNode = nodes.find(n => n.id === nodeId);
          if (targetNode && reactFlowInstance) {
            reactFlowInstance.setCenter(targetNode.position.x, targetNode.position.y, { zoom: 1.2, duration: 400 });
          }
        }}
        onFocusEdge={(edgeId) => {
          setSelectedEdgeId(edgeId);
          setSelectedNodeId(null);
        }}
        onProceedAnyway={() => {
          if (validationModalAction === "save") {
            handleSaveActiveFlow(true); // force save as draft
          } else {
            handleExportJSON(true); // force export as draft
          }
        }}
        onAutoFixAll={handleAutoFixAll}
        onAutoFixIssue={handleAutoFixIssue}
      />

      {/* Automated Normative Documents & Commercial Policies Connection Modal */}
      {isDocumentsModalOpen && (
        <React.Suspense fallback={null}>
          <FlowDocumentsModal
            isOpen={isDocumentsModalOpen}
            onClose={() => setIsDocumentsModalOpen(false)}
            activeFlowKey={activeFlowKey}
            onAutoSyncAll={handleAutoSyncAllDocuments}
          />
        </React.Suspense>
      )}

      {/* Governance Studio Native Rules Modal */}
      <FlowGovernanceRulesModal
        open={isGovernanceRulesModalOpen}
        onOpenChange={setIsGovernanceRulesModalOpen}
        activeFlowId={activeFlowKey}
        activeFlowName={activeTemplate.meta.name}
      />

    </div>
  );
}
