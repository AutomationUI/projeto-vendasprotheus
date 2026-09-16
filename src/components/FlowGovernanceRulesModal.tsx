import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Scale,
  GitBranch,
  ShieldCheck,
  ExternalLink,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Percent,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import {
  DEFAULT_GOVERNANCE_RULES,
  getFlowsConsumingGovernanceRule,
  evaluateProposalWithGovernanceRules,
  GovernanceProposalInput
} from "@/lib/governance-flow-bridge";
import { cn } from "@/lib/utils";

interface FlowGovernanceRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeFlowId?: string;
  activeFlowName?: string;
}

export function FlowGovernanceRulesModal({
  open,
  onOpenChange,
  activeFlowId = "discount-approval",
  activeFlowName = "Aprovação de Descontos & Alçadas Comerciais"
}: FlowGovernanceRulesModalProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(DEFAULT_GOVERNANCE_RULES[0]?.id || "");

  const selectedRule = DEFAULT_GOVERNANCE_RULES.find((r) => r.id === selectedRuleId) || DEFAULT_GOVERNANCE_RULES[0];
  const consumingFlows = selectedRule ? getFlowsConsumingGovernanceRule(selectedRule.id) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-indigo-50/80 via-slate-50 to-blue-50/80 dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600 text-white gap-1 py-0.5 text-[10px]">
                <Scale className="h-3 w-3" /> Governance Studio
              </Badge>
              <Badge variant="outline" className="text-[10px] font-mono border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                Consumo Nativo Ativo
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              Regras de Negócio & Governança no Flow Studio
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Parâmetros corporativos de descontos, margens e prazos definidos no Governance Studio consumidos por este fluxo.
            </DialogDescription>
          </div>

          <Link to="/governance" onClick={() => onOpenChange(false)}>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-700">
              <Scale className="h-3.5 w-3.5" />
              Abrir Governance Studio
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Button>
          </Link>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
          {/* Rules List Sidebar */}
          <div className="md:col-span-5 border-r p-4 overflow-y-auto space-y-2 bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block px-1 mb-2">
              Regras Cadastradas ({DEFAULT_GOVERNANCE_RULES.length})
            </span>

            {DEFAULT_GOVERNANCE_RULES.map((rule) => {
              const isSelected = rule.id === selectedRuleId;
              const isUsedInActiveFlow = consumingFlows.some((f) => f.flowId === activeFlowId);

              return (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all text-xs space-y-1.5",
                    isSelected
                      ? "bg-indigo-50/80 border-indigo-300 shadow-xs dark:bg-indigo-950/40 dark:border-indigo-800"
                      : "bg-background hover:bg-muted/60 border-border/60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground line-clamp-1">
                      {rule.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      v{rule.version}.0
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {rule.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Rule Detail & Flow Binding */}
          <div className="md:col-span-7 p-6 overflow-y-auto space-y-6">
            {selectedRule && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-foreground">
                      {selectedRule.name}
                    </h3>
                    <Badge className="bg-emerald-600 text-white text-[10px]">
                      {selectedRule.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedRule.description}
                  </p>
                </div>

                {/* Condition & Action Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border bg-muted/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Condição de Ativação
                    </span>
                    <div className="font-mono font-medium text-foreground">
                      {selectedRule.expression.conditions.map((c, i) => (
                        <div key={i}>
                          {c.field} {c.operator} {String(c.value)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-muted/30 space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                      Ação no Fluxo
                    </span>
                    <div className="font-medium text-foreground">
                      {selectedRule.actions.map((act, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-amber-500" />
                          <span>{act.type.replace(/_/g, " ")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nodes Consuming This Rule */}
                <div className="space-y-3 pt-2 border-t">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4 text-indigo-600" />
                    Nós do Flow Studio Vinculados:
                  </span>

                  <div className="space-y-2">
                    {consumingFlows.map((cf, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border bg-background flex items-center justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground block">
                            {cf.flowTitle}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Nó de Decisão: #{cf.targetNodeId} ({cf.nodeTitle})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-indigo-600 border-indigo-200">
                          {cf.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auditability Notice */}
                <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-[11px] text-indigo-900 dark:text-indigo-300 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    Rastreabilidade e Imutabilidade
                  </span>
                  <p className="text-[10px] leading-relaxed">
                    Toda execução de fluxo gera um log com o ID ({selectedRule.id}) e versão (v{selectedRule.version}) da regra ativa para auditoria fiscal e conformidade no Governance Studio.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground">
            Sincronizado com Governance Engine v3.1
          </span>
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
