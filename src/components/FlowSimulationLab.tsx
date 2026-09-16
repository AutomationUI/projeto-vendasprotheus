import React, { useState, useMemo } from "react";
import { 
  Play, Sparkles, CheckCircle2, AlertTriangle, AlertCircle, 
  Scale, FileText, ExternalLink, RotateCcw, Copy, Check, 
  Cpu, ArrowRight, Clock, ShieldCheck, Terminal, Code, Sliders, Layers
} from "lucide-react";
import { Node, Edge } from "reactflow";
import { CRMNodeData, FullFlowTemplate } from "@/types/crm-flow";
import { getDocumentsForFlow } from "@/lib/flow-document-connector";
import { toast } from "sonner";

interface FlowSimulationLabProps {
  activeTemplate: FullFlowTemplate;
  nodes: Node<CRMNodeData>[];
  edges: Edge[];
  simInputs: Record<string, any>;
  setSimInputs: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  connectedDocs: ReturnType<typeof getDocumentsForFlow>;
  onOpenDocumentsModal: () => void;
  onOpenCanvas: () => void;
}

export function FlowSimulationLab({
  activeTemplate,
  nodes,
  edges,
  simInputs,
  setSimInputs,
  connectedDocs,
  onOpenDocumentsModal,
  onOpenCanvas,
}: FlowSimulationLabProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "json">("form");
  const [copied, setCopied] = useState(false);
  const [jsonInputString, setJsonInputString] = useState(() => JSON.stringify(simInputs, null, 2));

  // Pre-configured test scenarios based on active flow
  const presetScenarios = useMemo(() => {
    const defaultIn = activeTemplate.meta.simDefaultInputs || {};
    const key = activeTemplate.meta.id || "";

    if (key.includes("lead") || activeTemplate.meta.category === "crm") {
      return [
        {
          title: "Lead Enterprise Estratégico",
          desc: "Faturamento > R$ 50M com score alto para VP Enterprise",
          inputs: { ...defaultIn, leadScore: 92, revenue: 55000000, companySize: "Enterprise", segment: "Agronegócio", fastTrack: true }
        },
        {
          title: "Lead Mid-Market Padrão",
          desc: "Faturamento R$ 15M roteado para Inside Sales",
          inputs: { ...defaultIn, leadScore: 65, revenue: 15000000, companySize: "Mid-Market", segment: "Manufatura", fastTrack: false }
        },
        {
          title: "Lead Incompatível / Nurturing",
          desc: "Lead inicial com score baixo direcionado à nutrição",
          inputs: { ...defaultIn, leadScore: 35, revenue: 2000000, companySize: "SMB", segment: "Serviços", fastTrack: false }
        }
      ];
    }

    if (key.includes("credit") || key.includes("order") || activeTemplate.meta.category === "finance") {
      return [
        {
          title: "Pedido Aprovado Imediato",
          desc: "Dentro do limite de crédito e sem atrasos no SE1",
          inputs: { ...defaultIn, orderValue: 250000, creditLimitAvailable: 800000, daysOverdue: 0, requestedDiscountPercent: 4.5, clientTier: "Tier A" }
        },
        {
          title: "Bloqueio Financeiro por Título em Atraso",
          desc: "Cliente com título SE1 protestado há mais de 15 dias",
          inputs: { ...defaultIn, orderValue: 120000, creditLimitAvailable: 500000, daysOverdue: 22, requestedDiscountPercent: 5.0, clientTier: "Tier B" }
        },
        {
          title: "Alçada de Diretoria Comercial",
          desc: "Desconto acima de 12% requer alçada executiva",
          inputs: { ...defaultIn, orderValue: 1500000, creditLimitAvailable: 2000000, daysOverdue: 0, requestedDiscountPercent: 14.0, clientTier: "Tier A" }
        }
      ];
    }

    if (key.includes("commission") || activeTemplate.meta.category === "governance") {
      return [
        {
          title: "Atingimento Meta Superada (125%)",
          desc: "Acelerador ativado com bônus de performance",
          inputs: { ...defaultIn, quotaAttainmentPercent: 125, marginPercent: 32, complianceDivergence: false, hasCustomerDefault: false }
        },
        {
          title: "Comissão com Trava de Margem Mínima",
          desc: "Margem abaixo do piso de 18% reduz fator multiplicador",
          inputs: { ...defaultIn, quotaAttainmentPercent: 105, marginPercent: 14, complianceDivergence: false, hasCustomerDefault: false }
        },
        {
          title: "Retenção por Inadimplência de Cliente",
          desc: "Pedido estornado por atraso no recebimento SE1",
          inputs: { ...defaultIn, quotaAttainmentPercent: 110, marginPercent: 28, complianceDivergence: true, hasCustomerDefault: true }
        }
      ];
    }

    // Default generic presets
    return [
      {
        title: "Cenário Padrão Recomendado",
        desc: "Execução com valores de referência do fluxo",
        inputs: { ...defaultIn }
      },
      {
        title: "Cenário de Limite Superior",
        desc: "Valores máximos para testar alçadas e aprovações especiais",
        inputs: Object.keys(defaultIn).reduce((acc: any, k) => {
          const val = defaultIn[k];
          acc[k] = typeof val === "number" ? val * 2 : typeof val === "boolean" ? true : val;
          return acc;
        }, {})
      }
    ];
  }, [activeTemplate]);

  // Dynamic execution engine calculation
  const simulationResult = useMemo(() => {
    // Traverse nodes starting from trigger
    const startNode = nodes.find(n => n.type === "triggerNode") || nodes[0];
    if (!startNode) {
      return {
        path: [],
        steps: [],
        totalLatencyMs: 0,
        status: "Indefinido",
        protheusImpact: "Nenhuma alteração",
        isSuccessful: false
      };
    }

    const path: string[] = [];
    const steps: Array<{
      nodeId: string;
      label: string;
      type: string;
      evaluation: string;
      outcome: "passed" | "branched_true" | "branched_false" | "executed" | "blocked";
      latencyMs: number;
      docTitle?: string;
      clause?: string;
      erpAction?: string;
    }> = [];

    let currentNode: Node<CRMNodeData> | undefined = startNode;
    let totalLatency = 0;
    let stepCount = 0;
    const visited = new Set<string>();

    while (currentNode && stepCount < 20) {
      if (visited.has(currentNode.id)) break;
      visited.add(currentNode.id);
      path.push(currentNode.id);
      stepCount++;

      const nodeData = currentNode.data;
      const nodeType = nodeData.type;
      const latency = Math.floor(Math.random() * 15) + 8;
      totalLatency += latency;

      let evaluation = "Etapa concluída";
      let outcome: "passed" | "branched_true" | "branched_false" | "executed" | "blocked" = "executed";
      let nextEdge: Edge | undefined = undefined;

      // Logic per node type
      if (nodeType === "trigger") {
        evaluation = `Disparo inicial capturado: ${nodeData.config.source || "Gatilho de Entrada"}`;
        outcome = "passed";
        nextEdge = edges.find(e => e.source === currentNode?.id);
      } else if (nodeType === "condition") {
        const field = nodeData.config.field || "Valor";
        const op = nodeData.config.operator || ">=";
        const targetVal = Number(nodeData.config.value) || 10000;
        
        // Check against simInputs
        let matched = true;
        const inputVal = simInputs[Object.keys(simInputs)[0]] ?? 50000;
        
        if (typeof inputVal === "number") {
          if (op === ">=" || op === ">") matched = inputVal >= targetVal;
          else if (op === "<=" || op === "<") matched = inputVal <= targetVal;
          else matched = inputVal === targetVal;
        } else if (typeof inputVal === "boolean") {
          matched = inputVal === true;
        }

        evaluation = `Condição (${field} ${op} ${targetVal}): ${matched ? "VERDADEIRO" : "FALSO"}`;
        outcome = matched ? "branched_true" : "branched_false";

        // Find edge for condition
        const outEdges = edges.filter(e => e.source === currentNode?.id);
        if (outEdges.length > 1) {
          nextEdge = outEdges.find(e => {
            const condType = (e.data as any)?.conditionType || (e.data as any)?.label?.toLowerCase();
            return matched ? (condType === "sim" || condType?.includes("sim") || condType?.includes("true")) : (condType === "nao" || condType?.includes("nao") || condType?.includes("false"));
          }) || outEdges[0];
        } else {
          nextEdge = outEdges[0];
        }
      } else if (nodeType === "validator") {
        const isOk = !simInputs.complianceDivergence && (simInputs.daysOverdue === undefined || simInputs.daysOverdue <= 0);
        evaluation = isOk 
          ? `Trava de Validação: Em conformidade com regras fiscais.` 
          : `Alerta Fiscal/Financeiro: Risco ou pendência identificada.`;
        outcome = isOk ? "passed" : "blocked";
        nextEdge = edges.find(e => e.source === currentNode?.id);
      } else {
        evaluation = `Execução realizada com sucesso: ${nodeData.label}`;
        outcome = "executed";
        nextEdge = edges.find(e => e.source === currentNode?.id);
      }

      const connectedDoc = connectedDocs.find(d => d.relevantNodes?.includes(currentNode?.id || ""));
      const clauseText = nodeData.config.connectedClauseTitle 
        ? `${nodeData.config.connectedClauseNumber || "Cláusula"}: ${nodeData.config.connectedClauseTitle}`
        : undefined;

      steps.push({
        nodeId: currentNode.id,
        label: nodeData.label,
        type: nodeType,
        evaluation,
        outcome,
        latencyMs: latency,
        docTitle: connectedDoc?.title || (nodeData.config.connectedDocumentTitle ?? undefined),
        clause: clauseText,
        erpAction: nodeData.config.protheusSyncEnabled ? `TOTVS ${nodeData.config.protheusTable || "Protheus"}` : undefined
      });

      if (!nextEdge) break;
      currentNode = nodes.find(n => n.id === nextEdge?.target);
    }

    const lastStep = steps[steps.length - 1];
    const isSuccessful = !steps.some(s => s.outcome === "blocked");
    const status = isSuccessful ? "Execução Aprovada & Concluída" : "Fluxo Interrompido / Pendente de Análise";
    const protheusImpact = activeTemplate.meta.erpTables && activeTemplate.meta.erpTables.length > 0 
      ? `Registro sincronizado nas tabelas: ${activeTemplate.meta.erpTables.join(", ")}` 
      : "Processamento interno sem gravação no ERP";

    return {
      path,
      steps,
      totalLatencyMs: totalLatency,
      status,
      protheusImpact,
      isSuccessful
    };
  }, [nodes, edges, simInputs, connectedDocs, activeTemplate]);

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
      toast.success("Simulação do fluxo executada com sucesso!", {
        description: `Percorreu ${simulationResult.steps.length} etapas em ${simulationResult.totalLatencyMs}ms.`
      });
    }, 450);
  };

  const handleApplyPreset = (preset: { title: string; inputs: Record<string, any> }) => {
    setSimInputs(preset.inputs);
    setJsonInputString(JSON.stringify(preset.inputs, null, 2));
    toast.info(`Cenário "${preset.title}" carregado.`);
  };

  const handleJsonUpdate = (str: string) => {
    setJsonInputString(str);
    try {
      const parsed = JSON.parse(str);
      setSimInputs(parsed);
    } catch {
      // Allow user to continue typing invalid JSON temporarily
    }
  };

  const handleCopyLogs = () => {
    const payload = {
      flowId: activeTemplate.meta.id,
      flowName: activeTemplate.meta.name,
      timestamp: new Date().toISOString(),
      inputs: simInputs,
      result: simulationResult
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Log de auditoria da simulação copiado!");
  };

  return (
    <div className="flex-1 w-full flex flex-col xl:flex-row gap-5 p-4 md:p-6 bg-neutral-50/50 dark:bg-neutral-950/40 overflow-y-auto">
      
      {/* ─── LEFT COLUMN: Simulation Controls & Parameter Presets ─────── */}
      <div className="w-full xl:w-[420px] shrink-0 flex flex-col gap-4">
        
        {/* Header Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Sandbox de Testes
            </span>
            <span className="text-[11px] font-bold text-neutral-400">
              {nodes.length} nós • {edges.length} transições
            </span>
          </div>

          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-2">
            Simulador de Roteamento & SLA
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Execute testes ponta a ponta com diferentes cenários para verificar decisões, tempos de execução e conformidade estatutária.
          </p>

          {/* Primary Simulation CTA */}
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className={`w-full mt-4 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all ${
              isRunning ? "opacity-75 cursor-wait" : ""
            }`}
          >
            <Play className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Simulando Roteamento..." : "Executar Simulação Completa"}
          </button>
        </div>

        {/* Pre-configured Scenarios */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-500" /> Cenários Rápidos de Teste
            </h3>
            <span className="text-[10px] font-semibold text-neutral-400">Clique para carregar</span>
          </div>

          <div className="space-y-1.5">
            {presetScenarios.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                className="w-full text-left p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-primary transition-colors">
                    {preset.title}
                  </span>
                  <ArrowRight className="h-3 w-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  {preset.desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Input Parameters Form & JSON Switcher */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs flex-1 flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2.5">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-500" /> Parâmetros de Entrada
            </h3>
            
            {/* View Switcher */}
            <div className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-[11px]">
              <button
                onClick={() => setActiveTab("form")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  activeTab === "form" ? "bg-white dark:bg-neutral-900 shadow-2xs text-neutral-900 dark:text-white" : "text-neutral-500"
                }`}
              >
                Formulário
              </button>
              <button
                onClick={() => {
                  setJsonInputString(JSON.stringify(simInputs, null, 2));
                  setActiveTab("json");
                }}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                  activeTab === "json" ? "bg-white dark:bg-neutral-900 shadow-2xs text-neutral-900 dark:text-white" : "text-neutral-500"
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          {activeTab === "form" ? (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 scrollbar-thin">
              {Object.keys(simInputs).length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  Nenhum parâmetro dinâmico requerido para este fluxo.
                </div>
              ) : (
                Object.keys(simInputs).map((paramKey) => {
                  const val = simInputs[paramKey];
                  const isNumber = typeof val === "number";
                  const isBoolean = typeof val === "boolean";
                  const label = paramKey.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

                  return (
                    <div key={paramKey} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                          {label}
                        </label>
                        <span className="text-[9px] font-mono text-neutral-400">
                          {typeof val}
                        </span>
                      </div>

                      {isBoolean ? (
                        <select
                          value={val ? "true" : "false"}
                          onChange={(e) => setSimInputs(prev => ({ ...prev, [paramKey]: e.target.value === "true" }))}
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 bg-neutral-50 dark:bg-neutral-950 font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-primary"
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
                          className="w-full h-8 text-xs border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 bg-neutral-50 dark:bg-neutral-950 font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-primary font-mono"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2 flex-1 flex flex-col">
              <textarea
                value={jsonInputString}
                onChange={(e) => handleJsonUpdate(e.target.value)}
                className="w-full h-52 text-xs font-mono p-3 bg-neutral-900 text-emerald-400 border border-neutral-800 rounded-xl focus:outline-primary resize-none"
                placeholder="Insira payload JSON para simular..."
              />
              <span className="text-[10px] text-neutral-400">
                Altere os campos acima para simular múltiplos payloads simultâneos.
              </span>
            </div>
          )}

          {/* Reset button */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
            <button
              onClick={() => {
                const defaults = activeTemplate.meta.simDefaultInputs || {};
                setSimInputs(defaults);
                setJsonInputString(JSON.stringify(defaults, null, 2));
                toast.info("Parâmetros redefinidos para os valores padrão.");
              }}
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1 font-semibold transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Restaurar Padrão
            </button>
          </div>
        </div>

      </div>

      {/* ─── RIGHT COLUMN: Interactive Visual Journey & Output Log ────── */}
      <div className="flex-1 flex flex-col gap-4">
        
        {/* Executive Summary Metrics Card */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  simulationResult.isSuccessful
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60"
                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60"
                }`}>
                  {simulationResult.isSuccessful ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-rose-600" />
                  )}
                  {simulationResult.status}
                </span>
                <span className="text-xs text-neutral-400">
                  ID: {activeTemplate.meta.id}
                </span>
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                Jornada de Execução Automatizada
              </h2>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado!" : "Copiar Log"}
              </button>
              <button
                onClick={onOpenCanvas}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Sliders className="h-3.5 w-3.5" /> Abrir no Canvas
              </button>
            </div>
          </div>

          {/* Quick Stat Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Latência Total</span>
              <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 flex items-center gap-1">
                <Clock className="h-4 w-4 text-blue-500" /> {simulationResult.totalLatencyMs} ms
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Nós Executados</span>
              <div className="text-base font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {simulationResult.steps.length} de {nodes.length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Impacto TOTVS</span>
              <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 truncate flex items-center gap-1" title={simulationResult.protheusImpact}>
                <Cpu className="h-4 w-4 text-purple-500 shrink-0" /> {activeTemplate.meta.erpTables?.[0] || "Sem ERP"}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Compliance</span>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> 100% Auditável
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Visual Timeline */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-500" /> Linha do Tempo da Execução
            </h3>
            <span className="text-xs text-neutral-400">
              {simulationResult.steps.length} eventos sequenciais
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {simulationResult.steps.map((step, idx) => {
              const isLast = idx === simulationResult.steps.length - 1;

              return (
                <div key={step.nodeId + idx} className="relative pl-6 pb-4 last:pb-0">
                  {/* Timeline connector line */}
                  {!isLast && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-800" />
                  )}

                  {/* Bullet */}
                  <div className={`absolute left-0 top-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs ${
                    step.outcome === "branched_true" || step.outcome === "passed"
                      ? "bg-emerald-500"
                      : step.outcome === "branched_false"
                      ? "bg-amber-500"
                      : step.outcome === "blocked"
                      ? "bg-rose-500"
                      : "bg-blue-600"
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Step Card */}
                  <div className="bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/70 dark:border-neutral-800/70 rounded-xl p-3.5 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          {step.label}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200/60 dark:bg-neutral-800 rounded-md text-neutral-600 dark:text-neutral-300 uppercase">
                          {step.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> +{step.latencyMs}ms
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                      {step.evaluation}
                    </p>

                    {/* Regulatory Clause & Compliance Badge if any */}
                    {(step.clause || step.docTitle) && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-200/40 dark:border-neutral-800/40 text-[11px] text-emerald-700 dark:text-emerald-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Scale className="h-3 w-3 shrink-0" />
                          <span className="font-semibold truncate">{step.docTitle || "Norma Corporativa"}</span>
                          {step.clause && (
                            <span className="text-neutral-500 dark:text-neutral-400 text-[10px] hidden sm:inline">
                              • {step.clause}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={onOpenDocumentsModal}
                          className="hover:underline text-[10px] font-bold shrink-0 flex items-center gap-0.5"
                        >
                          Ver Norma <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}

                    {/* ERP action tag */}
                    {step.erpAction && (
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono flex items-center gap-1 pt-0.5">
                        <Cpu className="h-3 w-3" /> Sincronização executada: {step.erpAction}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Raw JSON Outcome footer */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <details className="group">
              <summary className="text-xs font-bold text-neutral-600 dark:text-neutral-400 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Code className="h-3.5 w-3.5 text-neutral-500" /> Exibir Objeto JSON de Retorno
                </span>
                <span className="text-[10px] text-neutral-400 group-open:hidden">Clique para expandir</span>
              </summary>
              <pre className="mt-2 p-3 bg-neutral-900 text-emerald-400 text-[11px] font-mono rounded-xl overflow-x-auto max-h-48 border border-neutral-800">
                {JSON.stringify({
                  flowId: activeTemplate.meta.id,
                  status: simulationResult.status,
                  executionTimeMs: simulationResult.totalLatencyMs,
                  visitedNodes: simulationResult.path,
                  outputData: simInputs
                }, null, 2)}
              </pre>
            </details>
          </div>
        </div>

      </div>

    </div>
  );
}
