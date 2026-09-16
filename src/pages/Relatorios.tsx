import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { salesMonthly, salesByRegion, salesByCategory, type Order } from "@/lib/mock-data";
import { ordersService } from "@/lib/api";
import { TrendingUp, MapPin, Package, DollarSign, Download, FileSpreadsheet, Clock, Calendar as CalendarIcon } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ── Period Presets ──────────────────────────────────
const PERIOD_PRESETS = [
  { label: "Hoje",        days: 0  },
  { label: "7 dias",      days: 7  },
  { label: "30 dias",     days: 30 },
  { label: "90 dias",     days: 90 },
  { label: "Este ano",    days: 365 },
] as const;

const reportTypes = [
  { value: "vendas",     label: "Resumo de Vendas" },
  { value: "financeiro", label: "Relatório Financeiro & DRE" },
  { value: "categoria",  label: "Vendas por Categoria" },
  { value: "regiao",     label: "Vendas por Região" },
  { value: "comissoes",  label: "Comissões" },
];

interface TooltipPayloadEntry {
  color: string;
  value: number;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function RelatoriosPage() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const initialTipo = searchParams.get("tipo") || "vendas";
  const [tipo, setTipo] = useState(initialTipo);
  const [preset, setPreset] = useState<number>(30);

  useEffect(() => {
    const qTipo = searchParams.get("tipo");
    if (qTipo && qTipo !== tipo) {
      setTipo(qTipo);
    }
  }, [searchParams, tipo]);

  useEffect(() => {
    let active = true;
    ordersService.getAll()
      .then((r) => { if (active) setOrders(r?.data ?? []); })
      .catch(() => { if (active) setOrders([]); });
    return () => { active = false; };
  }, []);

  const salesByVendedor = useMemo(() => Object.entries(
    orders.reduce<Record<string, { total: number; pedidos: number }>>((acc, o) => {
      if (!acc[o.vendedor]) acc[o.vendedor] = { total: 0, pedidos: 0 };
      acc[o.vendedor].total += o.valor;
      acc[o.vendedor].pedidos += 1;
      return acc;
    }, {})
  ).map(([vendedor, data]) => ({
    vendedor, total: data.total, pedidos: data.pedidos, comissao: data.total * 0.05,
  })), [orders]);

  const totalVendas = salesMonthly.reduce((a, s) => a + s.vendas, 0);

  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Simulate filtered KPIs based on period
  const filteredTotal = useMemo(() => {
    let days = preset;
    if (preset === -1 && dateRange?.from && dateRange?.to) {
      days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    } else if (preset === -1) {
      days = 30; // fallback if incomplete custom range
    }
    const targetDays = Math.max(1, Math.min(days || 1, 365));
    const factor = targetDays / 365;
    return totalVendas * factor;
  }, [preset, dateRange, totalVendas]);

  const kpis = useMemo(() => [
    { title: "Vendas no Período",  value: fmt(filteredTotal),                       change: "+12,5%", positive: true,  icon: DollarSign,   gradient: "brand"   as const },
    { title: "Regiões Ativas",     value: salesByRegion.length.toString(),           change: "+2",     positive: true,  icon: MapPin,        gradient: "success" as const },
    { title: "Categorias",         value: salesByCategory.length.toString(),          change: "Igual",  positive: true,  icon: Package,       gradient: "warning" as const },
    { title: "Ticket Médio",       value: fmt(salesMonthly.length > 0 ? filteredTotal / salesMonthly.length : 0),  change: "-2,1%",  positive: false, icon: TrendingUp,    gradient: "brand"   as const },
  ], [filteredTotal]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <PageHeader
        title="Relatórios"
        subtitle="Análises detalhadas por período, região e categoria"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exportar Excel
            </Button>
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar PDF
            </Button>
          </div>
        }
      />

      {/* ── Filters ── */}
      <Card className="card-premium border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* Report type */}
            <div className="space-y-1.5 min-w-[200px]">
              <Label className="text-xs font-semibold text-muted-foreground">Tipo de Relatório</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period presets */}
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-semibold text-muted-foreground">Período</Label>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex gap-1.5 flex-wrap">
                  {PERIOD_PRESETS.map((p) => (
                    <button
                      key={p.days}
                      onClick={() => { setPreset(p.days); setDateRange(undefined); }}
                      className={cn(
                        "px-3 h-9 rounded-lg text-xs font-medium border transition-all",
                        preset === p.days
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Range Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 justify-start text-left font-normal text-xs px-3 min-w-[200px]",
                        preset === -1 ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd LLL yy", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd LLL yy", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd LLL yy", { locale: ptBR })
                        )
                      ) : (
                        <span>Personalizado</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        if (range?.from || range?.to) setPreset(-1); // -1 marks custom date range
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Atualizado há 2 min</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <KpiCard key={kpi.title} {...kpi} delay={i * 0.07} />
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Area Chart — Evolução */}
        <Card className="card-premium border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Evolução de Vendas — {preset === -1 ? `Período selecionado (${Math.max(1, Math.ceil(((dateRange?.to?.getTime() ?? 0) - (dateRange?.from?.getTime() ?? 0)) / 86400000))} dias)` : PERIOD_PRESETS.find(p => p.days === preset)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={salesMonthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRelatorio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(215,80%,50%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(215,80%,50%)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="vendas" stroke="hsl(215,80%,50%)" strokeWidth={2.5} fill="url(#gradRelatorio)"
                  dot={{ fill: "hsl(215,80%,50%)", r: 3, strokeWidth: 2, stroke: "white" }}
                  activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dynamic second chart */}
        <Card className="card-premium border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              {tipo === "categoria" ? "Vendas por Categoria" 
               : tipo === "regiao" ? "Vendas por Região" 
               : tipo === "comissoes" ? "Comissões por Vendedor"
               : "Top Vendedores do Período"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tipo === "categoria" ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={salesByCategory} dataKey="valor" nameKey="categoria"
                    cx="50%" cy="50%" outerRadius={90} innerRadius={48} paddingAngle={2}>
                    {salesByCategory.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : tipo === "regiao" ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={salesByRegion} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBar2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="hsl(158,56%,42%)" />
                      <stop offset="100%" stopColor="hsl(175,60%,36%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="regiao" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="vendas" fill="url(#gradBar2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={salesByVendedor.slice(0, 5)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} layout="vertical">
                  <defs>
                    <linearGradient id="gradBarVend" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="hsl(215,80%,50%)" />
                      <stop offset="100%" stopColor="hsl(215,80%,65%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="vendedor" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey={tipo === "comissoes" ? "comissao" : "total"} fill="url(#gradBarVend)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Detalhamento por Vendedor ── */}
      <Card className="card-premium border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {tipo === "comissoes" ? "Comissões por Vendedor" : "Desempenho por Vendedor"}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {salesByVendedor.length} vendedores
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-right">% do Total</TableHead>
                {tipo === "comissoes" && <TableHead className="text-right text-emerald-600 dark:text-emerald-400">Comissão (5%)</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesByVendedor.map((s) => (
                <TableRow key={s.vendedor} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-semibold">{s.vendedor}</TableCell>
                  <TableCell className="text-right">{s.pedidos}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(s.total)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {((s.total / salesByVendedor.reduce((a, v) => a + v.total, 0)) * 100).toFixed(1)}%
                  </TableCell>
                  {tipo === "comissoes" && (
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{fmt(s.comissao)}</TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="font-bold bg-muted/30">
                <TableCell>Total Geral</TableCell>
                <TableCell className="text-right">{salesByVendedor.reduce((a, s) => a + s.pedidos, 0)}</TableCell>
                <TableCell className="text-right">{fmt(salesByVendedor.reduce((a, s) => a + s.total, 0))}</TableCell>
                <TableCell className="text-right">100%</TableCell>
                {tipo === "comissoes" && (
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400">{fmt(salesByVendedor.reduce((a, s) => a + s.comissao, 0))}</TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
