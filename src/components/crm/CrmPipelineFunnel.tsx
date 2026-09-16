import { Sparkles, Target, FileText, Scale, CheckCircle2, ChevronRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CrmOpportunity, type CrmStage } from "@/lib/mock-data";

interface CrmPipelineFunnelProps {
  opportunities: CrmOpportunity[];
  selectedStage: string;
  onSelectStage: (stage: string) => void;
}

const STAGES: { id: CrmStage; label: string; icon: typeof Sparkles; color: string; bg: string; border: string }[] = [
  {
    id: "lead",
    label: "1. Prospecção & Leads",
    icon: Sparkles,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    border: "border-sky-200 dark:border-sky-800/40",
  },
  {
    id: "qualificacao",
    label: "2. Qualificação & ICP",
    icon: Target,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    border: "border-indigo-200 dark:border-indigo-800/40",
  },
  {
    id: "proposta",
    label: "3. Propostas & Cotações",
    icon: FileText,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  {
    id: "negociacao",
    label: "4. Negociação & Alçadas",
    icon: Scale,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200 dark:border-purple-800/40",
  },
  {
    id: "ganho",
    label: "5. Fechados & Ganhos",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/40",
  },
];

const fmt = (v?: number | null) =>
  (typeof v === "number" && !isNaN(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CrmPipelineFunnel({ opportunities = [], selectedStage, onSelectStage }: CrmPipelineFunnelProps) {
  const safeOpps = Array.isArray(opportunities) ? opportunities : [];

  // Calculate counts and values per stage
  const stageStats = STAGES.map((s) => {
    const opps = safeOpps.filter((o) => o && o.estagio === s.id);
    const count = opps.length;
    const totalValue = opps.reduce((sum, o) => sum + (o.valor || 0), 0);
    return {
      ...s,
      count,
      totalValue,
    };
  });

  const totalPipelineValue = safeOpps
    .filter((o) => o && o.estagio !== "perdido")
    .reduce((sum, o) => sum + (o.valor || 0), 0);

  const totalOpps = safeOpps.length || 1;
  const wonOpps = safeOpps.filter((o) => o && o.estagio === "ganho").length;
  const globalConversionRate = Math.round((wonOpps / totalOpps) * 100);

  return (
    <Card className="card-premium border-0 overflow-hidden">
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Funil Comercial & Pipeline de Vendas (CRM)
            </CardTitle>
            <Badge variant="secondary" className="text-[11px] font-normal">
              {safeOpps.length} Oportunidades Ativas
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fluxo contínuo desde a captura multicanal até o fechamento com emissão de pedido
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px]">Volume em Negociação</span>
            <span className="font-bold text-foreground text-sm">{fmt(totalPipelineValue)}</span>
          </div>
          <div className="border-l border-border/60 pl-3">
            <span className="text-muted-foreground block text-[10px]">Taxa de Conversão</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {globalConversionRate}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Funnel Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {stageStats.map((st, idx) => {
            const Icon = st.icon;
            const isSelected = selectedStage === st.id;

            return (
              <div
                key={st.id}
                onClick={() => onSelectStage(isSelected ? "all" : st.id)}
                className={`relative group rounded-xl p-3 border transition-all duration-200 cursor-pointer ${st.bg} ${st.border} ${
                  isSelected
                    ? "ring-2 ring-primary border-primary shadow-sm"
                    : "hover:shadow-xs hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${st.color}`} />
                    <span className="text-xs font-semibold text-foreground truncate">
                      {st.label.includes(".") ? st.label.split(".")[1]?.trim() : st.label}
                    </span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-bold ${st.color} bg-background/80`}>
                    {st.count}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">{fmt(st.totalValue)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {st.count === 1 ? "1 negócio ativo" : `${st.count} negócios ativos`}
                  </p>
                </div>

                {/* Arrow connector indicator */}
                {idx < stageStats.length - 1 && (
                  <div className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-background border border-border items-center justify-center text-muted-foreground/60 shadow-xs">
                    <ChevronRight className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedStage !== "all" && (
          <div className="mt-3 pt-2 flex items-center justify-between text-xs border-t border-border/40">
            <span className="text-muted-foreground">
              Exibindo apenas negócios no estágio: <strong className="text-foreground">{stageStats.find(s => s.id === selectedStage)?.label}</strong>
            </span>
            <button
              onClick={() => onSelectStage("all")}
              className="text-primary hover:underline font-medium text-xs"
            >
              Limpar filtro do funil
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
