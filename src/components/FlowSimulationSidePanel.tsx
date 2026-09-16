import React, { useState, useMemo, useEffect } from "react";
import { 
  Play, Sparkles, CheckCircle2, AlertTriangle, XCircle, 
  Scale, FileText, RotateCcw, Copy, Check, TrendingUp,
  Percent, ShieldCheck, Database, Layers, ArrowRight,
  UserCheck, DollarSign, Clock, HelpCircle, ChevronRight, Sliders,
  RefreshCw, FileSpreadsheet, ExternalLink
} from "lucide-react";
import { Node, Edge } from "reactflow";
import { CRMNodeData, FullFlowTemplate } from "@/types/crm-flow";
import { DEFAULT_GOVERNANCE_RULES } from "@/lib/governance-flow-bridge";
import { toast } from "sonner";

export interface MockScenario {
  id: string;
  name: string;
  description: string;
  category: "approved" | "manager" | "director" | "blocked" | "custom";
  cliente: string;
  vendedor: string;
  segmento: string;
  valorBruto: number;
  descontoPct: number;
  custoTotal: number;
  prazoDias: number;
  estoqueDisponivel: boolean;
  scoreSerasa: number;
}

export const MOCK_TEST_SCENARIOS: MockScenario[] = [
  {
    id: "mock-rep-ok",
    name: "Pedido Padrão Rep (TechSul S.A.)",
    description: "Desconto de 6% e Margem de 32% dentro da alçada livre do vendedor (≤ 8%).",
    category: "approved",
    cliente: "TechSul Automação Industrial Ltda",
    vendedor: "Carlos Silva (Representante SP)",
    segmento: "Tecnologia & Manufatura",
    valorBruto: 48000,
    descontoPct: 6.0,
    custoTotal: 30680,
    prazoDias: 30,
    estoqueDisponivel: true,
    scoreSerasa: 890
  },
  {
    id: "mock-ger-alçada",
    name: "Proposta Alçada Gerencial (AgroBrasil Corp)",
    description: "Desconto de 12% requer validação do Gerente Regional (8% < desc ≤ 15%).",
    category: "manager",
    cliente: "AgroBrasil Grãos e Insumos S.A.",
    vendedor: "Mariana Costa (Executiva PR)",
    segmento: "Agronegócio",
    valorBruto: 85000,
    descontoPct: 12.0,
    custoTotal: 54600,
    prazoDias: 45,
    estoqueDisponivel: true,
    scoreSerasa: 780
  },
  {
    id: "mock-dir-critico",
    name: "Contrato Crítico / Margem Baixa (MegaMax Indústria)",
    description: "Desconto de 18% e Margem de 19% acionam travas estatutárias de Diretoria.",
    category: "director",
    cliente: "MegaMax Equipamentos Pesados",
    vendedor: "Rodrigo Albuquerque (Key Account)",
    segmento: "Mineração & Indústria Pesada",
    valorBruto: 280000,
    descontoPct: 18.5,
    custoTotal: 184800,
    prazoDias: 90,
    estoqueDisponivel: true,
    scoreSerasa: 640
  },
  {
    id: "mock-prazo-estendido",
    name: "Pedido c/ Prazo Estendido 120d (Varejo Brasil)",
    description: "Prazo de 120 dias ultrapassa limite estatutário de 60 dias da política SE1.",
    category: "blocked",
    cliente: "Varejo Brasil Distribuidora",
    vendedor: "Beatriz Nogueira (Inside Sales)",
    segmento: "Varejo & Distribuição",
    valorBruto: 52000,
    descontoPct: 5.0,
    custoTotal: 34500,
    prazoDias: 120,
    estoqueDisponivel: true,
    scoreSerasa: 710
  },
  {
    id: "mock-enterprise-volume",
    name: "Grande Conta Enterprise (Alpha Corporation)",
    description: "Volume de R$ 750k com alçada executiva e trava de auditoria SOX.",
    category: "director",
    cliente: "Alpha Energy Global Participações",
    vendedor: "Diretoria de Grandes Contas",
    segmento: "Energia & Infraestrutura",
    valorBruto: 750000,
    descontoPct: 14.0,
    custoTotal: 470000,
    prazoDias: 60,
    estoqueDisponivel: true,
    scoreSerasa: 920
  }
];

interface FlowSimulationSidePanelProps {
  activeTemplate: FullFlowTemplate;
  nodes: Node<CRMNodeData>[];
  edges: Edge[];
  onRunSimulation?: (executedNodeIds: string[]) => void;
  isSimulating?: boolean;
  activeSimPath?: string[];
  onClose?: () => void;
  onFocusNode?: (nodeId: string) => void;
}

export function FlowSimulationSidePanel({
  activeTemplate,
  nodes,
  edges,
  onRunSimulation,
  isSimulating = false,
  activeSimPath = [],
  onClose,
  onFocusNode
}: FlowSimulationSidePanelProps) {
  // Mode selection & mock engine state
  const [isTestModeActive, setIsTestModeActive] = useState<boolean>(true);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("mock-rep-ok");
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"results" | "inputs" | "trace" | "payload">("results");

  // Editable simulation variables
  const [simData, setSimData] = useState<{
    cliente: string;
    vendedor: string;
    valorBruto: number;
    descontoPct: number;
    custoTotal: number;
    prazoDias: number;
    estoqueDisponivel: boolean;
    scoreSerasa: number;
  }>({
    cliente: MOCK_TEST_SCENARIOS[0].cliente,
    vendedor: MOCK_TEST_SCENARIOS[0].vendedor,
    valorBruto: MOCK_TEST_SCENARIOS[0].valorBruto,
    descontoPct: MOCK_TEST_SCENARIOS[0].descontoPct,
    custoTotal: MOCK_TEST_SCENARIOS[0].custoTotal,
    prazoDias: MOCK_TEST_SCENARIOS[0].prazoDias,
    estoqueDisponivel: MOCK_TEST_SCENARIOS[0].estoqueDisponivel,
    scoreSerasa: MOCK_TEST_SCENARIOS[0].scoreSerasa
  });

  // Sync when preset scenario is picked
  const handleSelectScenario = (scenarioId: string) => {
    setSelectedScenarioId(scenarioId);
    const scenario = MOCK_TEST_SCENARIOS.find(s => s.id === scenarioId);
    if (scenario) {
      setSimData({
        cliente: scenario.cliente,
        vendedor: scenario.vendedor,
        valorBruto: scenario.valorBruto,
        descontoPct: scenario.descontoPct,
        custoTotal: scenario.custoTotal,
        prazoDias: scenario.prazoDias,
        estoqueDisponivel: scenario.estoqueDisponivel,
        scoreSerasa: scenario.scoreSerasa
      });
      toast.info(`Cenário "${scenario.name}" carregado para simulação.`);
    }
  };

  // Extract governance parameters from the active flow (from BusinessRuleNode or defaults)
  const governanceRulesConfig = useMemo(() => {
    const businessRuleNode = nodes.find(n => n.type === "businessRuleNode" || n.data.type === "businessRule");
    const conditionNodes = nodes.filter(n => n.type === "conditionNode" || n.data.type === "condition");

    const maxDiscountRep = businessRuleNode?.data.config.maxDiscountPct ?? 8;
    const maxDiscountManager = businessRuleNode?.data.config.maxDiscountManagerPct ?? 15;
    const minMargin = businessRuleNode?.data.config.minMarginPct ?? 25;
    const maxTermDays = businessRuleNode?.data.config.maxPaymentTermDays ?? 60;
    const maxVolumeWithoutApproval = businessRuleNode?.data.config.maxVolumeWithoutApproval ?? 50000;
    const docTitle = businessRuleNode?.data.config.connectedDocumentTitle || "Manual de Diretrizes de Preço e Desconto v3.2.pdf";
    const clause = businessRuleNode?.data.config.connectedClauseNumber || "Cláusula 4.1";

    return {
      maxDiscountRep,
      maxDiscountManager,
      minMargin,
      maxTermDays,
      maxVolumeWithoutApproval,
      docTitle,
      clause,
      hasBusinessRuleNode: !!businessRuleNode
    };
  }, [nodes]);

  // Business Rules Evaluation (Descontos e Margens)
  const evaluationResult = useMemo(() => {
    const valorBruto = simData.valorBruto;
    const descontoPct = simData.descontoPct;
    const valorDesconto = valorBruto * (descontoPct / 100);
    const valorLiquido = valorBruto - valorDesconto;
    const custo = simData.custoTotal;
    const lucroBruto = valorLiquido - custo;
    const margemEfetivaPct = valorLiquido > 0 ? (lucroBruto / valorLiquido) * 100 : 0;

    // Rules verification
    const { maxDiscountRep, maxDiscountManager, minMargin, maxTermDays, maxVolumeWithoutApproval } = governanceRulesConfig;

    const discountApprovedRep = descontoPct <= maxDiscountRep;
    const discountApprovedManager = descontoPct <= maxDiscountManager;
    const marginCompliant = margemEfetivaPct >= minMargin;
    const termCompliant = simData.prazoDias <= maxTermDays;
    const volumeCompliant = valorLiquido <= maxVolumeWithoutApproval;

    // Hierarchy decision
    let approvalLevel: "Auto-Aprovado" | "Gerência Comercial" | "Diretoria Comercial" | "Comitê Executivo / Diretoria" = "Auto-Aprovado";
    let statusColor: "emerald" | "amber" | "rose" | "indigo" = "emerald";
    let statusText = "Aprovado em Conformidade";
    let justification = "Proposta com desconto e margem dentro das diretrizes operacionais do vendedor.";
    const violatedRules: string[] = [];

    if (!simData.estoqueDisponivel) {
      violatedRules.push("Estoque Insuficiente");
    }

    if (!marginCompliant) {
      violatedRules.push(`Margem (${margemEfetivaPct.toFixed(1)}%) abaixo do piso (${minMargin}%)`);
      approvalLevel = "Comitê Executivo / Diretoria";
      statusColor = "rose";
      statusText = "Bloqueio de Margem";
      justification = `Margem de contribuição (${margemEfetivaPct.toFixed(1)}%) viola o piso estatutário de ${minMargin}%. Exige chancela da Diretoria Executiva.`;
    } else if (!discountApprovedManager) {
      violatedRules.push(`Desconto (${descontoPct.toFixed(1)}%) acima da alçada gerencial (${maxDiscountManager}%)`);
      approvalLevel = "Diretoria Comercial";
      statusColor = "rose";
      statusText = "Alçada Diretoria Comercial";
      justification = `Desconto de ${descontoPct.toFixed(1)}% ultrapassa o teto do Gerente Regional (${maxDiscountManager}%).`;
    } else if (!discountApprovedRep) {
      violatedRules.push(`Desconto (${descontoPct.toFixed(1)}%) acima da alçada do vendedor (${maxDiscountRep}%)`);
      approvalLevel = "Gerência Comercial";
      statusColor = "amber";
      statusText = "Alçada Gerência Regional";
      justification = `Desconto de ${descontoPct.toFixed(1)}% acima da alçada livre do vendedor (${maxDiscountRep}%).`;
    } else if (!volumeCompliant) {
      violatedRules.push(`Valor do pedido (R$ ${valorLiquido.toLocaleString("pt-BR")}) acima de R$ ${maxVolumeWithoutApproval.toLocaleString("pt-BR")}`);
      approvalLevel = "Gerência Comercial";
      statusColor = "amber";
      statusText = "Volume Elevado";
      justification = `Pedido de alto volume requer confirmação de capacidade produtiva pelo Gerente Comercial.`;
    }

    if (!termCompliant && approvalLevel !== "Comitê Executivo / Diretoria") {
      violatedRules.push(`Prazo (${simData.prazoDias} dias) excede limite de ${maxTermDays} dias`);
      approvalLevel = "Comitê Executivo / Diretoria";
      statusColor = "rose";
      statusText = "Risco de Crédito SE1";
      justification += ` Prazo de ${simData.prazoDias} dias exige parecer de risco financeiro.`;
    }

    return {
      valorBruto,
      valorDesconto,
      valorLiquido,
      custo,
      lucroBruto,
      margemEfetivaPct: Number(margemEfetivaPct.toFixed(2)),
      discountApprovedRep,
      discountApprovedManager,
      marginCompliant,
      termCompliant,
      volumeCompliant,
      approvalLevel,
      statusColor,
      statusText,
      justification,
      violatedRules
    };
  }, [simData, governanceRulesConfig]);

  // Trace simulation execution across nodes in the flow
  const executedTrace = useMemo(() => {
    const traceSteps: Array<{
      nodeId: string;
      label: string;
      type: string;
      outcome: string;
      status: "success" | "warning" | "alert" | "executed";
      latencyMs: number;
    }> = [];

    // Find trigger
    const trigger = nodes.find(n => n.type === "triggerNode" || n.data.type === "trigger") || nodes[0];
    if (trigger) {
      traceSteps.push({
        nodeId: trigger.id,
        label: trigger.data.label || "Gatilho de Proposta",
        type: trigger.data.type,
        outcome: `Entrada recebida: ${simData.cliente} (R$ ${simData.valorBruto.toLocaleString("pt-BR")})`,
        status: "success",
        latencyMs: 12
      });
    }

    // Business Rule Node
    const businessRuleNode = nodes.find(n => n.type === "businessRuleNode" || n.data.type === "businessRule");
    if (businessRuleNode) {
      traceSteps.push({
        nodeId: businessRuleNode.id,
        label: businessRuleNode.data.label || "Regra de Negócio Governança",
        type: "businessRule",
        outcome: `Validação: Desconto ${simData.descontoPct}% (Teto ${governanceRulesConfig.maxDiscountRep}%) | Margem ${evaluationResult.margemEfetivaPct}% (Piso ${governanceRulesConfig.minMargin}%)`,
        status: evaluationResult.marginCompliant && evaluationResult.discountApprovedRep ? "success" : evaluationResult.discountApprovedManager ? "warning" : "alert",
        latencyMs: 18
      });
    }

    // Condition nodes
    const conditionNodes = nodes.filter(n => n.type === "conditionNode" || n.data.type === "condition");
    conditionNodes.forEach(cNode => {
      const isDiscountCondition = cNode.data.label.toLowerCase().includes("desconto") || cNode.data.config.field?.toLowerCase().includes("desconto");
      const isMarginCondition = cNode.data.label.toLowerCase().includes("margem") || cNode.data.config.field?.toLowerCase().includes("margem");
      
      let conditionPassed = true;
      if (isDiscountCondition) {
        conditionPassed = evaluationResult.discountApprovedRep;
      } else if (isMarginCondition) {
        conditionPassed = evaluationResult.marginCompliant;
      }

      traceSteps.push({
        nodeId: cNode.id,
        label: cNode.data.label || "Condição de Alçada",
        type: "condition",
        outcome: conditionPassed ? "Ramificação SIM / Aprovado Direto" : "Ramificação NÃO / Escalonamento Requerido",
        status: conditionPassed ? "success" : "warning",
        latencyMs: 8
      });
    });

    // Action/Validator nodes
    const actionNodes = nodes.filter(n => n.type === "actionNode" || n.type === "validatorNode" || n.data.type === "action" || n.data.type === "validator");
    actionNodes.slice(0, 2).forEach(aNode => {
      traceSteps.push({
        nodeId: aNode.id,
        label: aNode.data.label || "Ação de Notificação / Trava",
        type: aNode.data.type,
        outcome: aNode.data.config.actionOutcome || `Roteado para ${evaluationResult.approvalLevel}`,
        status: "executed",
        latencyMs: 34
      });
    });

    // Connector node (TOTVS Protheus)
    const connectorNode = nodes.find(n => n.type === "connectorNode" || n.data.type === "connector");
    if (connectorNode) {
      traceSteps.push({
        nodeId: connectorNode.id,
        label: connectorNode.data.label || "TOTVS Protheus SC5 Gateway",
        type: "connector",
        outcome: evaluationResult.approvalLevel === "Auto-Aprovado" 
          ? "MSExecAuto Pedido SC5 Incluído (Status: LIBERADO)"
          : `MSExecAuto Pedido SC5 Incluído (Status: BLOQUEADO - ${evaluationResult.statusText})`,
        status: evaluationResult.approvalLevel === "Auto-Aprovado" ? "success" : "warning",
        latencyMs: 140
      });
    }

    return traceSteps;
  }, [nodes, simData, evaluationResult, governanceRulesConfig]);

  // Handle Execute Simulation
  const handleExecute = () => {
    const nodeIdsToAnimate = executedTrace.map(t => t.nodeId);
    if (onRunSimulation) {
      onRunSimulation(nodeIdsToAnimate);
    }
    toast.success("Simulação de Regras Executada!", {
      description: `Resultado: ${evaluationResult.approvalLevel} (${evaluationResult.statusText}).`
    });
  };

  // Mock ERP Payload
  const protheusPayload = useMemo(() => {
    return {
      ERP_TARGET: "TOTVS PROTHEUS V12.1.2410",
      EMPRESA_FILIAL: "0101",
      TABELA: "SC5 - PEDIDOS DE VENDA",
      DATA_SIMULACAO: new Date().toISOString(),
      PAYLOAD_SC5: {
        C5_CLIENTE: simData.cliente.substring(0, 20),
        C5_VEND1: simData.vendedor.substring(0, 15),
        C5_VALBRUT: simData.valorBruto,
        C5_DESCONT: simData.descontoPct,
        C5_VALDESC: evaluationResult.valorDesconto,
        C5_TOTLIQ: evaluationResult.valorLiquido,
        C5_CUSTOT: simData.custoTotal,
        C5_LUCROB: evaluationResult.lucroBruto,
        C5_MARGEM: evaluationResult.margemEfetivaPct,
        C5_CONDPAG: `${simData.prazoDias}D`,
        C5_STATUS: evaluationResult.approvalLevel === "Auto-Aprovado" ? "01_LIBERADO" : "02_BLOQUEIO_ALCADA",
        C5_ALCADA: evaluationResult.approvalLevel,
        C5_REGRAS_VIOLADAS: evaluationResult.violatedRules
      },
      GOVERNANCE_AUDIT: {
        POLITICA_ID: governanceRulesConfig.docTitle,
        CLAUSULA_ID: governanceRulesConfig.clause,
        DESCONTO_MAX_REP: governanceRulesConfig.maxDiscountRep,
        DESCONTO_MAX_GER: governanceRulesConfig.maxDiscountManager,
        MARGEM_PISO_ESTATUTARIO: governanceRulesConfig.minMargin,
        CONFORMIDADE_SOX: evaluationResult.violatedRules.length === 0 ? "TOTAL" : "REQUER_CHANCELA"
      }
    };
  }, [simData, evaluationResult, governanceRulesConfig]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(protheusPayload, null, 2));
    setCopiedPayload(true);
    toast.success("Payload JSON copiado para a área de transferência!");
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-l border-neutral-200/80 dark:border-neutral-800/80 w-full overflow-hidden text-neutral-800 dark:text-neutral-100 shadow-xl">
      
      {/* ─── Header ────────────────────────────────────────── */}
      <div className="p-3.5 border-b border-neutral-200/80 dark:border-neutral-800/80 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent dark:from-violet-950/40 dark:via-indigo-950/20 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-2 bg-violet-600 text-white rounded-xl shadow-xs shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold leading-tight truncate">Simulador de Regras</h3>
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300 rounded uppercase">
                Gov Engine
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
              {activeTemplate.meta.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExecute}
            disabled={isSimulating}
            className={`px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all ${
              isSimulating ? "opacity-60 cursor-wait animate-pulse" : ""
            }`}
            title="Executar simulação no canvas"
          >
            <Play className="h-3 w-3 fill-white" />
            <span className="hidden sm:inline">{isSimulating ? "Simulando..." : "Simular"}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors"
              title="Fechar painel"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Test Mode Toggle & Scenario Selector Bar ───────── */}
      <div className="p-3 bg-neutral-50/80 dark:bg-neutral-950/60 border-b border-neutral-200/60 dark:border-neutral-800/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase text-neutral-500 flex items-center gap-1.5">
            <Database className="h-3 w-3 text-violet-500" /> Modo de Teste (Mock Data)
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isTestModeActive}
              onChange={(e) => setIsTestModeActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-neutral-300 dark:bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>

        {/* Mock Preset Selector */}
        {isTestModeActive && (
          <div className="space-y-1">
            <select
              value={selectedScenarioId}
              onChange={(e) => handleSelectScenario(e.target.value)}
              className="w-full h-8 text-xs bg-white dark:bg-neutral-900 border border-violet-200 dark:border-violet-800 rounded-lg px-2 font-semibold text-neutral-800 dark:text-neutral-100 focus:outline-violet-500 shadow-2xs"
            >
              {MOCK_TEST_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.category === "approved" ? "🟢" : sc.category === "manager" ? "🟡" : "🔴"} {sc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Navigation Tabs ────────────────────────────────── */}
      <div className="flex items-center border-b border-neutral-200/80 dark:border-neutral-800/80 px-2 pt-1 gap-1 bg-neutral-100/40 dark:bg-neutral-900/40 shrink-0">
        {[
          { id: "results", label: "Resultados", icon: Scale },
          { id: "inputs", label: "Parâmetros", icon: Sliders },
          { id: "trace", label: `Etapas (${executedTrace.length})`, icon: Layers },
          { id: "payload", label: "ERP SC5", icon: Database },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg flex items-center gap-1.5 transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-violet-600 text-violet-600 dark:text-violet-400 bg-white dark:bg-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Scrollable Content Body ────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3.5 pb-10 space-y-4 scrollbar-thin">

        {/* ─── TAB 1: RESULTS (DESCONTOS E MARGENS) ─────────── */}
        {activeTab === "results" && (
          <div className="space-y-3.5">
            
            {/* Decision Banner */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              evaluationResult.approvalLevel === "Auto-Aprovado"
                ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                : evaluationResult.approvalLevel === "Gerência Comercial"
                ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
                : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60"
            }`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-xl ${
                    evaluationResult.approvalLevel === "Auto-Aprovado"
                      ? "bg-emerald-600 text-white"
                      : evaluationResult.approvalLevel === "Gerência Comercial"
                      ? "bg-amber-600 text-white"
                      : "bg-rose-600 text-white"
                  }`}>
                    {evaluationResult.approvalLevel === "Auto-Aprovado" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">
                      Roteamento de Governança
                    </span>
                    <h4 className="text-sm font-extrabold leading-tight text-neutral-900 dark:text-neutral-100">
                      {evaluationResult.approvalLevel}
                    </h4>
                  </div>
                </div>

                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  evaluationResult.approvalLevel === "Auto-Aprovado"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : evaluationResult.approvalLevel === "Gerência Comercial"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                }`}>
                  {evaluationResult.statusText}
                </span>
              </div>

              <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-2 leading-relaxed bg-white/60 dark:bg-neutral-900/60 p-2 rounded-xl border border-neutral-200/40 dark:border-neutral-800/40">
                {evaluationResult.justification}
              </p>
            </div>

            {/* 2-Column Metrics Grid: Desconto & Margem */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Card 1: Desconto */}
              <div className="p-3 bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-900/50 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-neutral-400 flex items-center gap-1">
                    <Percent className="h-3 w-3 text-violet-500" /> Desconto
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    evaluationResult.discountApprovedRep 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : evaluationResult.discountApprovedManager
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}>
                    {evaluationResult.discountApprovedRep ? "Livre (Vendedor)" : evaluationResult.discountApprovedManager ? "Gerente" : "Diretoria"}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-black text-violet-700 dark:text-violet-300">
                    {simData.descontoPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    (R$ {evaluationResult.valorDesconto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })})
                  </span>
                </div>

                {/* Limits comparison */}
                <div className="text-[9px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-violet-100 dark:border-violet-900/40 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Teto Rep:</span>
                    <strong className="text-violet-600 dark:text-violet-400">≤ {governanceRulesConfig.maxDiscountRep}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Teto Gerente:</span>
                    <strong className="text-violet-600 dark:text-violet-400">≤ {governanceRulesConfig.maxDiscountManager}%</strong>
                  </div>
                </div>
              </div>

              {/* Card 2: Margem de Contribuição */}
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase text-neutral-400 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-emerald-500" /> Margem
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    evaluationResult.marginCompliant 
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                  }`}>
                    {evaluationResult.marginCompliant ? "Piso Conforme" : "Abaixo do Piso"}
                  </span>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-black ${
                    evaluationResult.marginCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    {evaluationResult.margemEfetivaPct}%
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    (Piso ≥ {governanceRulesConfig.minMargin}%)
                  </span>
                </div>

                {/* Lucro bruto */}
                <div className="text-[9px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-emerald-100 dark:border-emerald-900/40 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Lucro Bruto:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      R$ {evaluationResult.lucroBruto.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Líquido:</span>
                    <strong>R$ {evaluationResult.valorLiquido.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</strong>
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Summary & Conditions */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700 dark:text-neutral-200">
                <span>Resumo Financeiro da Proposta</span>
                <span className="font-mono text-violet-600 dark:text-violet-400">
                  R$ {evaluationResult.valorLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-200/60 dark:border-neutral-800/60">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Cliente</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                    {simData.cliente}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Vendedor / Emissor</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate block">
                    {simData.vendedor}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Prazo de Pagamento</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    evaluationResult.termCompliant ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}>
                    <Clock className="h-3 w-3" /> {simData.prazoDias} dias {simData.prazoDias > 60 ? "(Excede 60d)" : ""}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Score de Crédito Serasa</span>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    {simData.scoreSerasa} pts (Baixo Risco)
                  </span>
                </div>
              </div>
            </div>

            {/* Governance & Policy Link Card */}
            <div className="p-3 bg-gradient-to-r from-violet-50/50 to-indigo-50/30 dark:from-violet-950/20 dark:to-indigo-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase text-violet-600 dark:text-violet-400 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-violet-500" /> Governança & Auditoria
                </span>
                <span className="text-[8px] font-bold bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300 px-1.5 py-0.2 rounded">
                  {governanceRulesConfig.clause}
                </span>
              </div>
              <p className="text-[10px] text-neutral-600 dark:text-neutral-400 leading-tight">
                Validado contra <strong>{governanceRulesConfig.docTitle}</strong>. Trava aplicada conforme regulamento de precificação B2B.
              </p>
            </div>

            {/* Action Button to re-run on Canvas */}
            <button
              onClick={handleExecute}
              disabled={isSimulating}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              Executar Animação no Canvas
            </button>

          </div>
        )}

        {/* ─── TAB 2: EDITABLE INPUTS & SLIDERS ──────────────── */}
        {activeTab === "inputs" && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">
                Parâmetros Comerciais da Simulação
              </span>
              <button
                onClick={() => handleSelectScenario("mock-rep-ok")}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="h-2.5 w-2.5" /> Restaurar Padrão
              </button>
            </div>

            {/* Valor Bruto */}
            <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-semibold text-neutral-600 dark:text-neutral-300">Valor Bruto Total (R$)</label>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  R$ {simData.valorBruto.toLocaleString("pt-BR")}
                </span>
              </div>
              <input
                type="range"
                min="5000"
                max="1000000"
                step="5000"
                value={simData.valorBruto}
                onChange={(e) => setSimData(prev => ({ ...prev, valorBruto: Number(e.target.value) }))}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
            </div>

            {/* Desconto Slider */}
            <div className="space-y-1.5 bg-violet-50/40 dark:bg-violet-950/20 p-2.5 rounded-xl border border-violet-200/60 dark:border-violet-900/40">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-semibold text-violet-700 dark:text-violet-300">Desconto Solicitado (%)</label>
                <span className="font-mono font-bold text-violet-700 dark:text-violet-300">
                  {simData.descontoPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={simData.descontoPct}
                onChange={(e) => setSimData(prev => ({ ...prev, descontoPct: Number(e.target.value) }))}
                className="w-full h-1.5 bg-violet-200 dark:bg-violet-900 rounded-lg appearance-none cursor-pointer accent-violet-600"
              />
              <div className="flex justify-between text-[8px] text-neutral-400 font-mono">
                <span>0%</span>
                <span className="text-emerald-600 font-bold">Rep ≤ 8%</span>
                <span className="text-amber-600 font-bold">Ger ≤ 15%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Custo Total Estimado */}
            <div className="space-y-1.5 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-semibold text-emerald-700 dark:text-emerald-300">Custo Total de Mercadorias (R$)</label>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  R$ {simData.custoTotal.toLocaleString("pt-BR")}
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max={Math.max(simData.valorBruto, 10000)}
                step="1000"
                value={simData.custoTotal}
                onChange={(e) => setSimData(prev => ({ ...prev, custoTotal: Number(e.target.value) }))}
                className="w-full h-1.5 bg-emerald-200 dark:bg-emerald-900 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="text-[9px] text-emerald-700 dark:text-emerald-300 flex justify-between">
                <span>Margem resultante:</span>
                <strong>{evaluationResult.margemEfetivaPct}% (Piso: {governanceRulesConfig.minMargin}%)</strong>
              </div>
            </div>

            {/* Prazo de Pagamento */}
            <div className="space-y-1.5 bg-neutral-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex justify-between items-center text-[11px]">
                <label className="font-semibold text-neutral-600 dark:text-neutral-300">Prazo de Pagamento (Dias)</label>
                <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                  {simData.prazoDias} dias
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="15"
                value={simData.prazoDias}
                onChange={(e) => setSimData(prev => ({ ...prev, prazoDias: Number(e.target.value) }))}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[8px] text-neutral-400 font-mono">
                <span>À Vista (0d)</span>
                <span className="text-emerald-600 font-bold">Padrão (30d)</span>
                <span className="text-amber-600 font-bold">Teto (60d)</span>
                <span>180d</span>
              </div>
            </div>

            {/* Cliente & Vendedor fields */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Cliente</label>
                <input
                  type="text"
                  value={simData.cliente}
                  onChange={(e) => setSimData(prev => ({ ...prev, cliente: e.target.value }))}
                  className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-white dark:bg-neutral-900 font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Vendedor</label>
                <input
                  type="text"
                  value={simData.vendedor}
                  onChange={(e) => setSimData(prev => ({ ...prev, vendedor: e.target.value }))}
                  className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 bg-white dark:bg-neutral-900 font-medium"
                />
              </div>
            </div>

          </div>
        )}

        {/* ─── TAB 3: STEP-BY-STEP EXECUTION TRACE ──────────── */}
        {activeTab === "trace" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
              <span>Etapas Percorridas no Fluxo</span>
              <span>{executedTrace.length} nós acionados</span>
            </div>

            <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-violet-200 dark:before:bg-violet-900/60">
              {executedTrace.map((step, idx) => (
                <div 
                  key={step.nodeId + idx}
                  className="relative pl-7 group"
                >
                  <div className={`absolute left-2 top-2 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-neutral-900 z-10 transition-transform group-hover:scale-125 ${
                    step.status === "success" 
                      ? "bg-emerald-500" 
                      : step.status === "warning" 
                      ? "bg-amber-500" 
                      : step.status === "alert" 
                      ? "bg-rose-500" 
                      : "bg-violet-500"
                  }`} />

                  <div 
                    onClick={() => onFocusNode?.(step.nodeId)}
                    className="p-2.5 bg-neutral-50 dark:bg-neutral-950/80 hover:bg-violet-50/50 dark:hover:bg-violet-950/30 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
                        {step.label}
                      </h5>
                      <span className="text-[9px] font-mono text-neutral-400">
                        {step.latencyMs}ms
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-600 dark:text-neutral-400 leading-snug">
                      {step.outcome}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 4: MOCK ERP PROTHEUS PAYLOAD ─────────────── */}
        {activeTab === "payload" && (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                <Database className="h-3 w-3 text-blue-500" /> Payload REST TOTVS Protheus
              </span>
              <button
                onClick={handleCopyPayload}
                className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold rounded flex items-center gap-1 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                {copiedPayload ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copiedPayload ? "Copiado" : "Copiar JSON"}
              </button>
            </div>

            <pre className="p-3 bg-neutral-950 text-neutral-200 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed border border-neutral-800 max-h-[380px] scrollbar-thin">
              {JSON.stringify(protheusPayload, null, 2)}
            </pre>
          </div>
        )}

      </div>

    </div>
  );
}
