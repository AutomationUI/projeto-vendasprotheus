import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Order Status ────────────────────────────────
export type OrderStatus = "Pendente" | "Aprovado" | "Faturado" | "Cancelado";
// ─── Quote Status ────────────────────────────────
export type QuoteStatus = "Rascunho" | "Enviado" | "Aprovado" | "Recusado" | "Expirado";
// ─── Combined ────────────────────────────────────
export type AnyStatus = OrderStatus | QuoteStatus | string;

const statusConfig: Record<string, { className: string; dot: string }> = {
  // Order & Approvals
  Pendente:                       { className: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800", dot: "bg-amber-500" },
  Aprovar:                        { className: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800", dot: "bg-amber-500" },
  "Retido para Alçada":           { className: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800", dot: "bg-amber-500" },
  "Pendente de Liberação Comercial": { className: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800", dot: "bg-amber-500" },
  Aprovado:                       { className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", dot: "bg-emerald-500" },
  Faturado:                       { className: "bg-blue-50    text-blue-700    border-blue-200    dark:bg-blue-900/20    dark:text-blue-400    dark:border-blue-800",   dot: "bg-blue-500"   },
  Cancelado:                      { className: "bg-rose-50   text-rose-700   border-rose-200   dark:bg-rose-900/20   dark:text-rose-400   dark:border-rose-800",   dot: "bg-rose-500"   },
  // Quote
  Rascunho:                       { className: "bg-zinc-50   text-zinc-600   border-zinc-200   dark:bg-zinc-900/30   dark:text-zinc-400   dark:border-zinc-700",   dot: "bg-zinc-400"   },
  Enviado:                        { className: "bg-sky-50    text-sky-700    border-sky-200    dark:bg-sky-900/20    dark:text-sky-400    dark:border-sky-800",   dot: "bg-sky-500"   },
  Recusado:                       { className: "bg-rose-50   text-rose-700   border-rose-200   dark:bg-rose-900/20   dark:text-rose-400   dark:border-rose-800",   dot: "bg-rose-500"   },
  Expirado:                       { className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800", dot: "bg-orange-500" },
};

const defaultConfig = {
  className: "bg-muted text-muted-foreground border-border",
  dot: "bg-muted-foreground",
};

interface StatusBadgeProps {
  status: AnyStatus;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = true, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? defaultConfig;
  const displayLabel =
    status === "Aprovar" || status === "Retido para Alçada"
      ? "Pendente de Liberação Comercial"
      : status;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-xs px-2.5 py-0.5 rounded-full border transition-colors",
        config.className,
        className
      )}
    >
      {showDot && (
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      )}
      {displayLabel}
    </Badge>
  );
}
