import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Flame,
  AlertTriangle,
  User,
  Calendar,
  Package,
  Hash,
  Ruler,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";
import type { ProductionBatch, ProductionStatus } from "@/hooks/use-production-websocket";

const STATUS_ORDER: ProductionStatus[] = [
  "Mistura", "Moldagem", "Prensado", "Secagem",
  "Aguardando Queima", "Em Queima", "Queimado",
  "Acabamento", "Inspeção", "Expedição",
];

const STATUS_CONFIG: Record<ProductionStatus, { bg: string; text: string; dot: string }> = {
  Mistura:            { bg: "bg-amber-500/10",  text: "text-amber-700",   dot: "bg-amber-500" },
  Moldagem:           { bg: "bg-orange-500/10", text: "text-orange-700",  dot: "bg-orange-500" },
  Prensado:           { bg: "bg-yellow-500/10", text: "text-yellow-700",  dot: "bg-yellow-600" },
  Secagem:            { bg: "bg-sky-500/10",    text: "text-sky-700",     dot: "bg-sky-400" },
  "Aguardando Queima":{ bg: "bg-slate-500/10",  text: "text-slate-600",   dot: "bg-slate-400" },
  "Em Queima":        { bg: "bg-red-500/10",    text: "text-red-700",     dot: "bg-red-500" },
  Queimado:           { bg: "bg-rose-500/10",   text: "text-rose-700",    dot: "bg-rose-700" },
  Acabamento:         { bg: "bg-violet-500/10", text: "text-violet-700",  dot: "bg-violet-500" },
  Inspeção:           { bg: "bg-blue-500/10",   text: "text-blue-700",    dot: "bg-blue-500" },
  Expedição:          { bg: "bg-emerald-500/10",text: "text-emerald-700", dot: "bg-emerald-500" },
};

const PRIORITY_CONFIG = {
  Alta:  "bg-destructive/10 text-destructive border-destructive/30",
  Média: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  Baixa: "bg-muted text-muted-foreground border-border",
};

interface Props {
  batch: ProductionBatch;
  onClose: () => void;
}

export function BatchDetailPanel({ batch, onClose }: Props) {
  const sc = STATUS_CONFIG[batch.status] || {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  const stepIdx = STATUS_ORDER.findIndex(
    (s) => s.toLowerCase().trim() === (batch.status || "").toLowerCase().trim()
  );
  const currentStep = stepIdx >= 0 ? stepIdx : 0;
  const progress = Math.round(((currentStep + 1) / STATUS_ORDER.length) * 100);
  const isLate = new Date(batch.previsao) < new Date();
  const isActive = batch.status === "Em Queima";

  return (
    <>
      {/* Backdrop Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-2xs"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed right-0 top-0 bottom-0 z-[100] w-full sm:w-[420px] bg-card text-card-foreground shadow-2xl shadow-slate-900/30 border-l border-border p-5 overflow-y-auto flex flex-col justify-between"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground font-mono font-bold">{batch.lote}</p>
              <h3 className="text-base font-bold text-foreground leading-tight">{batch.produto}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Fechar (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status + Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 gap-1.5`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${isActive ? "animate-pulse" : ""}`} />
              {batch.status}
              {isActive && <Flame className="h-3 w-3 animate-pulse" />}
            </Badge>
            <Badge variant="outline" className={`text-[10px] ${PRIORITY_CONFIG[batch.prioridade]}`}>
              {batch.prioridade}
            </Badge>
            {isLate && (
              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Atrasado
              </Badge>
            )}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border/80">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
              <span>Progresso Geral</span>
              <span className="font-mono font-bold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Separator />

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-900/70 border border-border/60 text-xs">
            <InfoItem icon={Package} label="Tipo" value={batch.tipo} />
            <InfoItem icon={Ruler} label="Granulação" value={batch.granulacao} />
            <InfoItem icon={Hash} label="Quantidade" value={`${batch.quantidade.toLocaleString("pt-BR")} ${batch.unidade}`} />
            <InfoItem icon={User} label="Operador" value={batch.operador} />
            <InfoItem icon={Calendar} label="Início" value={new Date(batch.inicio).toLocaleDateString("pt-BR")} />
            <InfoItem
              icon={Clock}
              label="Previsão"
              value={new Date(batch.previsao).toLocaleDateString("pt-BR")}
              alert={isLate}
            />
          </div>

          {batch.observacoes && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" />
                  Observações
                </div>
                <p className="text-sm text-foreground">{batch.observacoes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Timeline */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Etapas de produção</p>
            <div className="space-y-0.5">
              {STATUS_ORDER.map((step, i) => {
                const isDone = i <= currentStep;
                const isCurrent = i === currentStep;
                const stepSc = STATUS_CONFIG[step];

                return (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                      isCurrent ? "bg-amber-500/10 font-bold" : isDone ? "text-foreground font-medium" : "text-muted-foreground/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`h-2.5 w-2.5 rounded-full border-2 transition-colors ${
                          isCurrent
                            ? `${stepSc.dot} border-transparent ring-2 ring-offset-1 ring-offset-background ${stepSc.dot.replace("bg-", "ring-")}`
                            : isDone
                            ? `${stepSc.dot} border-transparent`
                            : "bg-background border-muted-foreground/30"
                        }`}
                      />
                      <span>{step}</span>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                        Em Andamento <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border mt-6">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold text-xs text-foreground transition-colors"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
    </>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={`text-sm font-medium ${alert ? "text-destructive" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
