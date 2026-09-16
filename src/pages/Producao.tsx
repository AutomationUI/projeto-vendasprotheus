import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Factory,
  Search,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wifi,
  WifiOff,
  FileSpreadsheet,
  FileText,
  LayoutList,
  LayoutGrid,
  X,
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  useProductionWebSocket,
  type ProductionBatch,
  type ProductionStatus,
} from "@/hooks/use-production-websocket";
import { BatchDetailPanel } from "@/components/BatchDetailPanel";
import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF } from "@/lib/export-production";

/* ─── Status config ─── */
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

const statusProgress = (s: ProductionStatus) =>
  (STATUS_ORDER.indexOf(s) + 1) * 10;

/* ─── Animation variants ─── */
const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

const kpiVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.07, type: "spring" as const, stiffness: 400, damping: 20 },
  }),
};

/* ─── Page ─── */
export default function ProducaoPage() {
  const [searchParams] = useSearchParams();
  const { batches, connected } = useProductionWebSocket();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [quickFilter, setQuickFilter] = useState<"all" | "late" | "urgent">("all");

  useEffect(() => {
    const f = searchParams.get("filter");
    if (f === "atrasados" || f === "late") {
      setQuickFilter("late");
    } else if (f === "urgente" || f === "urgent") {
      setQuickFilter("urgent");
    }
  }, [searchParams]);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    setLastSync(new Date());
  }, [batches]);

  // Press ESC to close detail panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedBatch) {
        setSelectedBatch(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedBatch]);

  // Lock body scroll when kanban fullscreen is open
  useEffect(() => {
    if (viewMode === "kanban") {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [viewMode]);

  const types = useMemo(() => [...new Set(batches.map((b) => b.tipo))], [batches]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch = !q || (b.lote || "").toLowerCase().includes(q) || (b.produto || "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || b.status === filterStatus;
      const matchPriority = filterPriority === "all" || b.prioridade === filterPriority;
      const matchType = filterType === "all" || b.tipo === filterType;
      
      const matchQuick = 
        quickFilter === "all" ? true :
        quickFilter === "late" ? new Date(b.previsao) < new Date() :
        quickFilter === "urgent" ? b.prioridade === "Alta" : true;

      return matchSearch && matchStatus && matchPriority && matchType && matchQuick;
    });
  }, [batches, search, filterStatus, filterPriority, filterType, quickFilter]);

  // KPIs
  const total = batches.length;
  const emQueima = batches.filter((b) => b.status === "Em Queima").length;
  const aguardando = batches.filter((b) => b.status === "Aguardando Queima").length;
  const expedidos = batches.filter((b) => b.status === "Expedição").length;
  const atrasados = batches.filter((b) => new Date(b.previsao) < new Date()).length;
  const avgProgress = total > 0 ? Math.round(batches.reduce((acc, b) => acc + statusProgress(b.status), 0) / total) : 0;

  const kpis = [
    { label: "Total", value: total, icon: Layers, color: "text-primary" },
    { label: "Em Queima", value: emQueima, icon: Flame, color: "text-red-500" },
    { label: "Ag. Queima", value: aguardando, icon: Clock, color: "text-slate-500" },
    { label: "Expedição", value: expedidos, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Atrasados", value: atrasados, icon: AlertTriangle, color: "text-destructive" },
    { label: "Progresso Geral", value: `${avgProgress}%`, icon: Activity, color: "text-blue-500" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            <Factory className="h-5 w-5 text-primary" />
          </motion.div>
          <h1 className="text-lg font-bold text-foreground">Acompanhamento da Produção – Abrasivos</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => {
              setLastSync(new Date());
              // toast simulated logic could go here if available
            }}
          >
            <motion.div whileTap={{ rotate: 180 }}><RefreshCw className="h-4 w-4 text-muted-foreground" /></motion.div>
          </Button>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.3 }}
          >
            <Badge
              variant="outline"
              className={`ml-2 text-[10px] gap-1 ${
                connected
                  ? "text-emerald-600 border-emerald-300"
                  : "text-destructive border-destructive/30"
              }`}
            >
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? "Conectado" : "Desconectado"}
              {connected && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </Badge>
          </motion.div>
        </div>

        {/* KPIs inline */}
        <div className="flex items-center gap-2 flex-wrap">
          {kpis.map((k, i) => (
            <motion.div
              key={k.label}
              custom={i}
              variants={kpiVariants}
              initial="hidden"
              animate="show"
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-1.5 border rounded-md bg-card px-2.5 py-1 cursor-default"
            >
              <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
              <motion.span
                key={k.value}
                initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                transition={{ duration: 0.4 }}
                className="text-sm font-bold"
              >
                {k.value}
              </motion.span>
              <span className="text-[10px] text-muted-foreground">{k.label}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lote ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[170px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                  {s}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-9 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AnimatePresence>
          {(filterStatus !== "all" || filterPriority !== "all" || filterType !== "all" || search) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => { setSearch(""); setFilterStatus("all"); setFilterPriority("all"); setFilterType("all"); }}
              className="text-xs text-primary hover:underline"
            >
              Limpar filtros
            </motion.button>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center rounded-md border bg-muted p-0.5 mr-2">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("table")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => exportToExcel(filtered)}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => exportToPDF(filtered)}
          >
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </motion.div>

      {/* Table / Kanban + Detail Panel */}
      <div className="flex gap-4 items-start">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="flex-1 min-w-0"
        >
          {viewMode === "table" ? (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Lote</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gran.</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[120px]">Progresso</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Previsão</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                        Nenhum lote encontrado
                      </TableCell>
                    </TableRow>
                  )}
                  <AnimatePresence mode="popLayout">
                    {filtered.map((b, i) => {
                      const progress = statusProgress(b.status);
                      const isLate = new Date(b.previsao) < new Date();
                      const isActive = b.status === "Em Queima";
                      const isSelected = selectedBatch?.id === b.id;
                      const sc = STATUS_CONFIG[b.status];

                      return (
                        <motion.tr
                          key={b.id}
                          variants={rowVariants}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          layout
                          onClick={() => setSelectedBatch(isSelected ? null : b)}
                          className={`border-b transition-colors cursor-pointer hover:bg-muted/50 ${
                            isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                          } ${isLate && !isSelected ? "bg-destructive/[0.03]" : ""
                          } ${isActive && !isSelected ? "bg-red-500/[0.04]" : ""}`}
                        >
                          <TableCell className="font-mono text-xs">{b.lote}</TableCell>
                          <TableCell className="font-medium">{b.produto}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.tipo}</TableCell>
                          <TableCell className="text-sm">{b.granulacao}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {b.quantidade.toLocaleString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${sc.bg} ${sc.text} border-0 gap-1.5`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${isActive ? "animate-pulse" : ""}`} />
                              {b.status}
                              {isActive && (
                                <Flame className="h-3 w-3 text-red-500 animate-pulse" />
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <motion.div className="flex-1" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ originX: 0 }} transition={{ delay: i * 0.04 + 0.3, duration: 0.5 }}>
                                <Progress value={progress} className="h-1.5" />
                              </motion.div>
                              <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">
                                {progress}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{b.operador}</TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {new Date(b.inicio).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm tabular-nums ${isLate ? "text-destructive font-semibold" : ""}`}>
                              {new Date(b.previsao).toLocaleDateString("pt-BR")}
                              {isLate && (
                                <motion.span
                                  animate={{ scale: [1, 1.2, 1] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                  className="inline-block ml-1"
                                >
                                  <AlertTriangle className="inline h-3 w-3" />
                                </motion.span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${PRIORITY_CONFIG[b.prioridade]}`}>
                              {b.prioridade}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          ) : null}
        </motion.div>
      </div>

      {/* ══════ KANBAN FULLSCREEN PORTAL ══════ */}
      {viewMode === "kanban" && createPortal(
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col bg-background"
        >
          {/* ── Fullscreen Header ── */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <Factory className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">Kanban de Produção</h2>
              <Badge
                variant="outline"
                className={`text-[10px] gap-1 ${connected ? "text-emerald-600 border-emerald-300" : "text-destructive border-destructive/30"}`}
              >
                {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {connected ? "Online" : "Offline"}
              </Badge>
              <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                Atualizado às {lastSync.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* KPIs compact */}
            <div className="flex items-center gap-1.5">
              {kpis.map((k) => (
                <div key={k.label} className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50 text-xs">
                  <k.icon className={`h-3 w-3 ${k.color}`} />
                  <span className="font-bold">{k.value}</span>
                  <span className="text-[9px] text-muted-foreground hidden xl:inline">{k.label}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Quick Filters */}
              <div className="hidden lg:flex items-center border rounded-md p-1 bg-muted/20 mr-2 shadow-sm">
                <button
                  onClick={() => setQuickFilter("all")}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${quickFilter === "all" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setQuickFilter("urgent")}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${quickFilter === "urgent" ? "bg-amber-500/20 text-amber-700 font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Urgentíssimos
                </button>
                <button
                  onClick={() => setQuickFilter("late")}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${quickFilter === "late" ? "bg-destructive/20 text-destructive font-bold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Atrasados
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 h-7 text-xs w-[140px]"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewMode("table")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Kanban Board — fills remaining height ── */}
          <div className="flex-1 flex gap-2 p-3 min-h-0 overflow-hidden">
            {STATUS_ORDER.map((status) => {
              const cols = filtered.filter((b) => b.status === status);
              const sc = STATUS_CONFIG[status];
              const isActiveStatus = status === "Em Queima";

              const borderColorMap: Record<string, string> = {
                Mistura: "border-l-amber-500",
                Moldagem: "border-l-orange-500",
                Prensado: "border-l-yellow-600",
                Secagem: "border-l-sky-400",
                "Aguardando Queima": "border-l-slate-400",
                "Em Queima": "border-l-red-500",
                Queimado: "border-l-rose-700",
                Acabamento: "border-l-violet-500",
                "Inspeção": "border-l-blue-500",
                "Expedição": "border-l-emerald-500",
              };

              return (
                <div key={status} className="flex flex-col gap-1.5 flex-1 min-w-0">
                  {/* Column Header */}
                  <div className={`flex items-center justify-between rounded-md px-2 py-1.5 ${sc.bg} shrink-0`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${sc.dot} ${isActiveStatus ? "animate-pulse" : ""}`} />
                      <span className={`text-[10px] font-bold truncate ${sc.text}`}>{status}</span>
                      {isActiveStatus && <Flame className="h-2.5 w-2.5 text-red-500 animate-pulse shrink-0" />}
                    </div>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-[16px] justify-center shrink-0">
                      {cols.length}
                    </Badge>
                  </div>

                  {/* Cards — scrolls vertically only */}
                  <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden min-h-0 pr-1 pb-1">
                    <AnimatePresence mode="popLayout">
                      {cols.map((b) => {
                        const progress = statusProgress(b.status);
                        const isLate = new Date(b.previsao) < new Date();
                        const isSelected = selectedBatch?.id === b.id;

                        return (
                          <motion.div
                            key={b.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            layout
                            whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                            onClick={() => setSelectedBatch(isSelected ? null : b)}
                            className={`relative rounded-md border border-l-[3px] ${borderColorMap[b.status] || ""} bg-card p-2 shadow-sm cursor-pointer transition-all shrink-0 ${
                              isSelected 
                                ? "ring-2 ring-primary/50 bg-primary/5" 
                                : isLate 
                                  ? "bg-red-500/[0.05] ring-1 ring-red-500/40 hover:bg-red-500/[0.08]" 
                                  : b.prioridade === "Alta"
                                    ? "bg-amber-500/[0.03] ring-1 ring-amber-500/20 hover:bg-amber-500/[0.08]"
                                    : "hover:bg-muted/30"
                            }`}
                          >
                            {/* Ping dot for late bottlenecks */}
                            {isLate && !isSelected && (
                              <span className="absolute top-1 right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-background"></span>
                              </span>
                            )}

                            {/* Lote + Priority */}
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-mono font-bold text-primary truncate">{b.lote}</span>
                              <Badge variant="outline" className={`text-[7px] px-1 py-0 h-3 leading-none shrink-0 ml-1 mr-2 ${PRIORITY_CONFIG[b.prioridade]}`}>
                                {b.prioridade}
                              </Badge>
                            </div>

                            {/* Produto */}
                            <p className="text-[10px] font-semibold text-foreground truncate">{b.produto}</p>

                            {/* Progress */}
                            <div className="flex items-center gap-1 mt-1">
                              <Progress value={progress} className="h-1 flex-1" />
                              <span className="text-[8px] text-muted-foreground tabular-nums">{progress}%</span>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
                              <span className="truncate max-w-[55%]">{b.operador}</span>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {isLate && <AlertTriangle className="h-2 w-2 text-destructive" />}
                                <span className={isLate ? "text-destructive font-bold" : ""}>
                                  {new Date(b.previsao).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>

                    {cols.length === 0 && (
                      <div className="flex-1 rounded-md border border-dashed border-border/30 flex items-center justify-center min-h-[40px]">
                        <p className="text-[9px] text-muted-foreground/30">Vazio</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>,
        document.body
      )}

      {/* ══════ DETAIL PANEL OVERLAY PORTAL (Must render after Kanban portal so it stacks on top) ══════ */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedBatch && (
            <BatchDetailPanel
              key={selectedBatch.id}
              batch={selectedBatch}
              onClose={() => setSelectedBatch(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
