import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  GitBranch,
  ShieldCheck,
  Zap,
  Scale,
  Play,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Percent,
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  Layers,
  FileText
} from "lucide-react";
import {
  DEFAULT_GOVERNANCE_RULES,
  getFlowsConsumingGovernanceRule,
  evaluateProposalWithGovernanceRules,
  GovernanceEvaluationOutcome,
  GovernanceProposalInput
} from "@/lib/governance-flow-bridge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GovernanceFlowSyncPanelProps {
  organizationId?: string;
  onNavigateToFlow?: (flowId: string) => void;
}

export function GovernanceFlowSyncPanel({
  organizationId = "org-1",
  onNavigateToFlow
}: GovernanceFlowSyncPanelProps) {
  // Simulator State
  const [simValor, setSimValor] = useState<number>(38000);
  const [simDesconto, setSimDesconto] = useState<number>(7.5);
  const [simMargem, setSimMargem] = useState<number>(32);
  const [simPrazo, setSimPrazo] = useState<string>("30/60");
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string>("all");

  const proposalInput: GovernanceProposalInput = {
    total: simValor,
    descontoMedioPct: simDesconto,
    margemMediaPct: simMargem,
    condicaoPagamento: simPrazo,
    cliente: "Indústria Metalúrgica Paulista S/A",
    vendedor: "Carlos Silva (Representante SP-01)"
  };

  const evalResult: GovernanceEvaluationOutcome = evaluateProposalWithGovernanceRules(
    proposalInput,
    DEFAULT_GOVERNANCE_RULES
  );

  const isAuto = evalResult.aprovadoAutomatico;
  const isGerencia = evalResult.nivelAprovacao === "Gerência Comercial";
  const isDiretoria = evalResult.nivelAprovacao === "Diretoria Comercial" || evalResult.nivelAprovacao === "Comitê de Crédito & Diretoria";

  return (
    <div className="space-y-6">
      {/* Top Banner: Status da Integração Nativa */}
      <div className="rounded-2xl border bg-gradient-to-br from-indigo-50/70 via-slate-50 to-blue-50/50 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 p-6 border-indigo-200/70 dark:border-indigo-800/50 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 py-1 px-3">
                <Zap className="h-3.5 w-3.5" />
                Nativamente Integrado
              </Badge>
              <Badge variant="outline" className="border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 text-xs">
                Flow Studio v3.1 ⇄ Governance Studio
              </Badge>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              Consumo Nativo de Regras de Governança nos Fluxos
            </h3>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              As diretrizes comerciais cadastradas no Governance Studio (tetos de desconto, margens mínimas de contribuição, prazos de pagamento e alçadas) são injetadas em tempo de execução dentro dos grafos de automação do Flow Studio.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/flow-studio?flow=discount-approval">
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <GitBranch className="h-4 w-4" />
                Abrir no Flow Studio
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-indigo-100 dark:border-indigo-900/60">
          <div className="bg-white/80 dark:bg-slate-950/60 rounded-xl p-3 border shadow-2xs">
            <span className="text-xs text-muted-foreground block">Regras Ativas Sincronizadas</span>
            <span className="text-xl font-bold text-indigo-600">{DEFAULT_GOVERNANCE_RULES.length} regras</span>
          </div>
          <div className="bg-white/80 dark:bg-slate-950/60 rounded-xl p-3 border shadow-2xs">
            <span className="text-xs text-muted-foreground block">Fluxos Automatizados Conectados</span>
            <span className="text-xl font-bold text-emerald-600">4 esteiras BPMN</span>
          </div>
          <div className="bg-white/80 dark:bg-slate-950/60 rounded-xl p-3 border shadow-2xs">
            <span className="text-xs text-muted-foreground block">Teto Desconto Representante</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-200">≤ 8.0%</span>
          </div>
          <div className="bg-white/80 dark:bg-slate-950/60 rounded-xl p-3 border shadow-2xs">
            <span className="text-xs text-muted-foreground block">Piso Margem Estatutária</span>
            <span className="text-xl font-bold text-blue-600">≥ 25.0%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Governance-Flow Simulator & Rules Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Execution Simulator */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Play className="h-4 w-4 text-emerald-600" />
                  Simulador de Execução em Tempo Real
                </CardTitle>
                <Badge variant="outline" className="text-[11px] font-mono">
                  Engine BPMN v3.1
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Teste como o Flow Studio consome as regras de negócio em tempo real para orçamentos e pedidos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Slider Valor da Venda */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-medium">Valor Total da Proposta</Label>
                  <span className="font-mono font-bold text-foreground">
                    R$ {simValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Slider
                  value={[simValor]}
                  min={5000}
                  max={150000}
                  step={1000}
                  onValueChange={(val) => setSimValor(val[0])}
                  className="py-1"
                />
              </div>

              {/* Slider Desconto */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-medium">Desconto Comercial Aplicado</Label>
                  <span className={cn(
                    "font-mono font-bold px-2 py-0.5 rounded",
                    simDesconto <= 8 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                    simDesconto <= 15 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" :
                    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  )}>
                    {simDesconto.toFixed(1)}%
                  </span>
                </div>
                <Slider
                  value={[simDesconto]}
                  min={0}
                  max={30}
                  step={0.5}
                  onValueChange={(val) => setSimDesconto(val[0])}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Vendedor (≤8%)</span>
                  <span>Gerência (≤15%)</span>
                  <span>Diretoria (&gt;15%)</span>
                </div>
              </div>

              {/* Slider Margem */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-medium">Margem de Contribuição Estimada</Label>
                  <span className={cn(
                    "font-mono font-bold px-2 py-0.5 rounded",
                    simMargem >= 25 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" :
                    "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  )}>
                    {simMargem.toFixed(1)}%
                  </span>
                </div>
                <Slider
                  value={[simMargem]}
                  min={10}
                  max={55}
                  step={1}
                  onValueChange={(val) => setSimMargem(val[0])}
                  className="py-1"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="text-rose-500 font-semibold">Crítica (&lt;25%)</span>
                  <span className="text-emerald-600 font-semibold">Piso Estatutário (≥25%)</span>
                </div>
              </div>

              {/* Select Prazo de Pagamento */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Condição de Pagamento (Prazo)</Label>
                <Select value={simPrazo} onValueChange={setSimPrazo}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o prazo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À vista">À vista (0 dias)</SelectItem>
                    <SelectItem value="30 dias">30 dias</SelectItem>
                    <SelectItem value="30/60">30/60 dias (Prazo Médio 45d)</SelectItem>
                    <SelectItem value="30/60/90">30/60/90 dias (Prazo Máximo 90d - Requer Alçada)</SelectItem>
                    <SelectItem value="30/60/90/120">30/60/90/120 dias (Prazo Especial 120d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resultado Visual do Motor de Governança */}
              <div className={cn(
                "rounded-xl border p-4 transition-all text-xs space-y-3",
                isAuto
                  ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : isGerencia
                  ? "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                  : "bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg text-white",
                      isAuto ? "bg-emerald-600" : isGerencia ? "bg-amber-600" : "bg-rose-600"
                    )}>
                      {isAuto ? <CheckCircle2 className="h-4 w-4" /> : isGerencia ? <AlertTriangle className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="font-bold text-sm text-foreground block">{evalResult.nivelAprovacao}</span>
                      <span className="text-[11px] text-muted-foreground">{evalResult.motivoPrincipal}</span>
                    </div>
                  </div>
                </div>

                {/* Trilha BPMN de Nós Executados */}
                <div className="p-2.5 rounded-lg bg-background/90 border text-[11px] space-y-1.5">
                  <span className="font-semibold text-muted-foreground block text-[10px] uppercase tracking-wider">
                    Trilha de Nós Executados no Flow Studio:
                  </span>
                  <div className="flex flex-wrap items-center gap-1 font-mono text-[10px]">
                    {evalResult.flowExecutado.nosAcionados.map((nodeId, idx) => (
                      <React.Fragment key={idx}>
                        <span className="bg-muted px-1.5 py-0.5 rounded border text-foreground">
                          #{nodeId}
                        </span>
                        {idx < evalResult.flowExecutado.nosAcionados.length - 1 && (
                          <span className="text-muted-foreground">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {evalResult.sugestaoConformidade && (
                  <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-300 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{evalResult.sugestaoConformidade}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Matriz de Regras e Conexões com o Flow Studio */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-base text-foreground">
                Regras de Negócio Nativas & Fluxos Consumidores
              </h4>
              <p className="text-xs text-muted-foreground">
                Cada regra cadastrada abaixo governa automaticamente as decisões tomadas pelos nós do Flow Studio.
              </p>
            </div>
            <Badge variant="outline" className="text-xs gap-1">
              <Layers className="h-3 w-3" />
              {DEFAULT_GOVERNANCE_RULES.length} Regras Ativas
            </Badge>
          </div>

          <div className="space-y-3">
            {DEFAULT_GOVERNANCE_RULES.map((rule) => {
              const consumingFlows = getFlowsConsumingGovernanceRule(rule.id);
              const traceMatch = evalResult.trace.find((t) => t.ruleId === rule.id);
              const isTriggered = traceMatch?.matched;

              return (
                <Card
                  key={rule.id}
                  className={cn(
                    "transition-all border-border/60 hover:border-indigo-300 dark:hover:border-indigo-800",
                    isTriggered && "border-l-4 border-l-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/10"
                  )}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {rule.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            v{rule.version}.0
                          </Badge>
                          {isTriggered && (
                            <Badge className="bg-indigo-600 text-white text-[10px] py-0">
                              Acionada no Teste
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {rule.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            rule.status === "ativa"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          {rule.status.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Consuming Flows Mapping */}
                    <div className="pt-2 border-t border-dashed flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                          <GitBranch className="h-3 w-3 text-indigo-500" />
                          Consumido em:
                        </span>
                        {consumingFlows.map((flow, fIdx) => (
                          <Link
                            key={fIdx}
                            to={`/flow-studio?flow=${flow.flowId}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/80 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-[11px] font-medium text-foreground transition-colors border"
                          >
                            <span>{flow.flowTitle}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              (Nó: #{flow.targetNodeId})
                            </span>
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </Link>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link to={`/flow-studio?flow=${consumingFlows[0]?.flowId || "discount-approval"}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 p-1.5 gap-1">
                            <span>Ver Grafo BPMN</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
