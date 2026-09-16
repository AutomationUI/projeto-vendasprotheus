import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Scale,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from "lucide-react";
import {
  CommercialProposalInput,
  evaluateCommercialRules,
  CommercialEvaluationResult
} from "@/lib/sales-flow-engine";
import { cn } from "@/lib/utils";

interface FlowEvaluationBadgeProps {
  proposal: CommercialProposalInput;
  className?: string;
  showDetails?: boolean;
}

export function FlowEvaluationBadge({
  proposal,
  className,
  showDetails = true
}: FlowEvaluationBadgeProps) {
  const [showTrace, setShowTrace] = useState(false);
  const result: CommercialEvaluationResult = evaluateCommercialRules(proposal);

  const isAuto = result.aprovadoAutomatico;
  const isGerencia = result.nivelAprovacao === "Gerência Comercial";
  const isDiretoria = result.nivelAprovacao === "Diretoria Comercial" || result.nivelAprovacao === "Comitê de Crédito & Diretoria";

  return (
    <div
      className={cn(
        "rounded-xl border p-3.5 transition-all text-xs space-y-2",
        isAuto
          ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
          : isGerencia
          ? "bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/60"
          : "bg-rose-50/70 border-rose-200 dark:bg-rose-950/20 dark:border-rose-800/60",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded-md text-white shrink-0",
              isAuto ? "bg-emerald-600" : isGerencia ? "bg-amber-600" : "bg-rose-600"
            )}
          >
            {isAuto ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : isGerencia ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <ShieldAlert className="h-3.5 w-3.5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">
                {result.nivelAprovacao}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                (Flow: #{result.flowExecutado.flowId})
              </span>
              <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-indigo-50/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 gap-0.5">
                <Scale className="h-2.5 w-2.5" /> Governance v3.1
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {result.motivoPrincipal}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium gap-1",
              isAuto
                ? "bg-emerald-100/80 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300"
                : isGerencia
                ? "bg-amber-100/80 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-rose-100/80 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300"
            )}
          >
            <GitBranch className="h-2.5 w-2.5" />
            {result.flowExecutado.flowName}
          </Badge>
        </div>
      </div>

      {showDetails && (
        <div className="pt-1.5 border-t border-dashed border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div>
            <span className="text-muted-foreground block text-[10px]">Desconto Médio:</span>
            <span className="font-semibold">{result.metricasCalculadas.descontoMedioPct}%</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Margem Estimada:</span>
            <span
              className={cn(
                "font-semibold",
                result.bloqueadoPorMargem ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {result.metricasCalculadas.margemMediaPct}%
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Total Líquido:</span>
            <span className="font-semibold font-mono">
              R$ {result.metricasCalculadas.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Liberação:</span>
            <span className="font-semibold">
              {isAuto ? "Instantânea" : "Exige Validação"}
            </span>
          </div>
        </div>
      )}

      {result.sugestaoAjuste && (
        <div className="p-2 rounded bg-background/90 border text-[11px] text-muted-foreground flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>{result.sugestaoAjuste}</span>
          </div>
          {result.governanceTrace && result.governanceTrace.length > 0 && (
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5 shrink-0"
            >
              <span>{showTrace ? "Ocultar Regras" : "Ver Regras"}</span>
              {showTrace ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}
        </div>
      )}

      {showTrace && result.governanceTrace && (
        <div className="p-2.5 rounded-lg bg-background/95 border text-[10px] space-y-1.5 animate-in fade-in">
          <div className="font-semibold text-foreground flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-indigo-600" />
            <span>Regras Auditadas do Governance Studio:</span>
          </div>
          <div className="space-y-1 font-mono">
            {result.governanceTrace.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 text-muted-foreground">
                <span className="truncate">{entry.ruleName} (v{entry.version})</span>
                <span className={entry.matched ? "text-amber-600 font-bold" : "text-slate-400"}>
                  {entry.matched ? "ACIONADA" : "OK"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
