import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Target,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  Users,
  Brain,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  Shield,
  Folder,
  Microscope,
 Palette,
  Megaphone,
  FolderOpen,
  BarChart2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SystemStatus } from "@/components/SystemStatus";
import { CrmChannelGateway } from "@/components/crm/CrmChannelGateway";
import { CrmPipelineFunnel } from "@/components/crm/CrmPipelineFunnel";
import { CrmOpportunitiesView } from "@/components/crm/CrmOpportunitiesView";
import { financialService } from "@/lib/api/financial-service";
import { ordersService, quotesService } from "@/lib/api";
import { localDB } from "@/lib/local-db";
import type { Order, Quote, CrmOpportunity, OrderStatus } from "@/lib/mock-data";
import type { FinancialMetrics, CashFlowSummary, FinancialTitle } from "@/types/financial";

// ─── Alerts ──────────────────────────────────────────

const alerts = [
  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "ORC-2026-005 expirado",            desc: "DataCenter Brasil — R$ 84.000"   },
  { icon: Clock,         color: "text-rose-500",  bg: "bg-rose-500/10",  label: "PV-2026-001 pendente há 48h",      desc: "Tech Solutions — R$ 15.800"      },
  { icon: CheckCircle2,  color: "text-emerald-500",bg:"bg-emerald-500/10",label: "PV-2026-002 aguardando faturamento",desc: "Inovação Digital — R$ 32.400"   },
];

// ─── Rep Targets ─────────────────────────────────────

const repTargets = [
  { name: "Carlos Silva",  meta: 150000, realizado: 127000 },
  { name: "Maria Santos",  meta: 120000, realizado: 115000 },
  { name: "João Oliveira", meta: 100000, realizado:  68000 },
];

// ─── Timeline ────────────────────────────────────────

const timeline = [
  { icon: ShoppingCart, color: "bg-sky-500",     label: "Novo pedido criado",       detail: "PV-2026-001 • Carlos Silva",    time: "2 min" },
  { icon: CheckCircle2, color: "bg-emerald-500", label: "Orçamento aprovado",        detail: "ORC-2026-002 • Maria Santos",  time: "18 min" },
  { icon: Users,        color: "bg-violet-500",  label: "Cliente cadastrado",         detail: "DataCenter Brasil",            time: "1h" },
  { icon: Activity,     color: "bg-amber-500",   label: "Sincronização ERP concluída",detail: "48 registros atualizados",    time: "2h" },
];

// ─── Animations ──────────────────────────────────────

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ─── Custom Tooltip ──────────────────────────────────

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

// ─── Component ───────────────────────────────────────

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allQuotes, setAllQuotes] = useState<Quote[]>([]);
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [activeTab, setActiveTab] = useState<"crm" | "analytics">("crm");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "analytics" || tabParam === "kpi" || tabParam === "kpis") {
      setActiveTab("analytics");
    } else if (tabParam === "crm" || tabParam === "funil") {
      setActiveTab("crm");
    }
  }, [searchParams]);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);

  const loadOpportunities = useCallback(() => {
    setOpportunities(localDB.getOpportunities());
  }, []);

  useEffect(() => {
    loadOpportunities();
    const handleStorage = () => loadOpportunities();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("local-db-change", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("local-db-change", handleStorage);
    };
  }, [loadOpportunities]);

  useEffect(() => {
    let active = true;
    ordersService.getAll()
      .then((r) => { if (active) setOrders(r?.data ?? []); })
      .catch(() => { if (active) setOrders([]); });
    quotesService.getAll()
      .then((r) => { if (active) setAllQuotes(r?.data ?? []); })
      .catch(() => { if (active) setAllQuotes([]); });
    return () => { active = false; };
  }, []);

  // ─── Data Isolation ─────────────────────────────
  const canViewOrders = hasPermission("pedidos", "view");
  const canViewQuotes = hasPermission("orcamentos", "view");

  const filteredOrders = !canViewOrders ? [] : (orders || []).filter(o => {
    if (!o) return false;
    const clientName = o.cliente || "";
    const userName = user?.nome || "";
    const userEmailPrefix = user?.email ? user.email.split('@')[0] : "";
    if (user?.role === "cliente") return clientName.includes(userName) || (userEmailPrefix ? clientName.toLowerCase().includes(userEmailPrefix.toLowerCase()) : false);
    if (user?.role === "representante") return o.vendedor === user?.nome;
    return true;
  });

  const filteredQuotes = !canViewQuotes ? [] : (allQuotes || []).filter(q => {
    if (!q) return false;
    const clientName = q.cliente || "";
    const userName = user?.nome || "";
    const userEmailPrefix = user?.email ? user.email.split('@')[0] : "";
    if (user?.role === "cliente") return clientName.includes(userName) || (userEmailPrefix ? clientName.toLowerCase().includes(userEmailPrefix.toLowerCase()) : false);
    if (user?.role === "representante") return q.vendedor === user?.nome;
    return true;
  });

  // Reference date for relative filtering
  const orderDates = (orders || []).map(o => new Date(o.data).getTime()).filter(t => !isNaN(t));
  const maxOrderTime = orderDates.length > 0 ? Math.max(...orderDates) : new Date("2026-02-25").getTime();
  const refDate = new Date(maxOrderTime);

  const timeFilteredOrders = filteredOrders.filter(o => {
    if (periodFilter === "all") return true;
    const oDate = new Date(o.data);
    if (isNaN(oDate.getTime())) return true;
    const diffDays = (refDate.getTime() - oDate.getTime()) / (1000 * 3600 * 24);
    if (periodFilter === "today") return diffDays <= 1;
    if (periodFilter === "week") return diffDays <= 7;
    if (periodFilter === "month") return diffDays <= 30;
    return true;
  });

  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);

  useEffect(() => {
    let active = true;
    financialService.getMetrics().then((m) => {
      if (active && m) setMetrics(m);
    }).catch(() => {});
    financialService.getCashFlow().then((cf) => {
      if (active && cf) setCashFlow(cf);
    }).catch(() => {});
    financialService.getTitles({ tipo: "receber" }).then((t) => {
      if (active && t) setTitles(t);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const periodFactor = 
    periodFilter === "today" ? 0.12 :
    periodFilter === "week" ? 0.35 :
    periodFilter === "month" ? 0.70 : 1.0;

  // Calculate dynamic KPIs using real financial data
  const aReceberTitles = titles.filter((t) => t.tipo === "receber" && t.status !== "pago");
  const baseVendas = aReceberTitles.length > 0
    ? aReceberTitles.reduce((acc: number, t: any) => acc + Number(t.valorOriginal || 0), 0)
    : filteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const totalVendas = (metrics?.totalAReceber || baseVendas) * periodFactor;
  const pedidosMes = Math.max(1, aReceberTitles.length > 0 ? aReceberTitles.length : filteredOrders.length);
  const ticketMedio = totalVendas / pedidosMes;

  const dynamicKpis = [
    { title: "Total de Vendas",  value: fmt(totalVendas), change: periodFilter === "today" ? "+2,1%" : "+12,5%", positive: true,  icon: DollarSign,  gradient: "brand"       as const },
    { title: "Pedidos no Período",   value: (Math.round(pedidosMes * periodFactor) || 1).toString(), change: periodFilter === "today" ? "+1,0%" : "+8,2%",  positive: true,  icon: ShoppingCart,gradient: "success"     as const },
    { title: "Ticket Médio",     value: fmt(ticketMedio),  change: "-2,1%",  positive: false, icon: TrendingUp,  gradient: "warning"     as const },
    { title: "Meta Atingida",    value: periodFilter === "today" ? "24%" : periodFilter === "week" ? "58%" : "87%",         change: "+5,3%",  positive: true,  icon: Target,      gradient: "brand"       as const },
  ];

  // Filtered chart datasets
  const filteredSalesMonthly = periodFilter === "today" ? (cashFlow[cashFlow.length-1]?.saldoProjetado || 0) : periodFilter === "week" ? (cashFlow[cashFlow.length-2]?.saldoProjetado || 0) : periodFilter === "month" ? (cashFlow[cashFlow.length-4]?.saldoProjetado || 0) : cashFlow[cashFlow.length-1]?.saldoProjetado || 0;

  const filteredSalesByRegion = [
    { nome: "São Paulo", vendas: Math.round(totalVendas * 0.45) },
    { nome: "Rio de Janeiro", vendas: Math.round(totalVendas * 0.25) },
    { nome: "Belo Horizonte", vendas: Math.round(totalVendas * 0.18) },
    { nome: "Curitiba", vendas: Math.round(totalVendas * 0.12) },
  ];

  const filteredSalesByCategory = [
    { categoria: "Vendas", valor: Math.round(totalVendas * 0.60) },
    { categoria: "Operacional", valor: Math.round(totalVendas * 0.20) },
    { categoria: "Matéria-Prima", valor: Math.round(totalVendas * 0.15) },
    { categoria: "Frete", valor: Math.round(totalVendas * 0.05) },
  ];

  // Filter Alerts (Filtro Absoluto)
  const filteredAlerts = alerts.filter(alert => {
    // Hide orders/quotes that don't belong to the client
    if (user?.role === "cliente") {
      const isRelevant = filteredOrders.some(o => o?.numero ? alert.label.includes(o.numero.split('-').pop() || "") : false) || 
                         filteredQuotes.some(q => q?.numero ? alert.label.includes(q.numero.split('-').pop() || "") : false);
      if (!isRelevant) return false;
    }
    
    // Hide based on module permissions
    if (alert.label.startsWith("ORC") && !canViewQuotes) return false;
    if (alert.label.startsWith("PV") && !canViewOrders) return false;
    
    return true;
  });

  // CRM Metrics
  const totalPipelineValue = opportunities
    .filter((o) => o.estagio !== "perdido")
    .reduce((sum, o) => sum + (o.valor || 0), 0);
  const activeOppsCount = opportunities.filter((o) => o.estagio !== "perdido").length;
  const wonOppsCount = opportunities.filter((o) => o.estagio === "ganho").length;
  const conversionRate = opportunities.length > 0 ? Math.round((wonOppsCount / opportunities.length) * 100) : 0;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <PageHeader
            title="Nexus CRM & Hub Comercial"
            subtitle={`Bem-vindo, ${user?.nome}. Gestão comercial integrada com WhatsApp, E-commerce e TOTVS Protheus.`}
          />
        </div>

        {/* View Switcher & Period Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Mode Toggle: CRM vs Indicadores */}
          <div className="flex items-center p-1 bg-card rounded-xl border border-border/70 shadow-xs">
            <button
              onClick={() => setActiveTab("crm")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "crm"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>CRM & Pipeline</span>
              <Badge variant="secondary" className="text-[10px] h-4.5 px-1.5">
                {opportunities.length}
              </Badge>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "analytics"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Indicadores & ERP</span>
            </button>
          </div>

          {/* Period Filter Bar */}
          <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-border/70 shadow-xs">
            <div className="flex items-center gap-1 px-1.5 text-xs text-muted-foreground hidden sm:flex">
              <Calendar className="h-3 w-3" />
            </div>
            {(
              [
                { id: "all", label: "Tudo" },
                { id: "today", label: "Hoje" },
                { id: "week", label: "Semana" },
                { id: "month", label: "Mês" },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodFilter(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  periodFilter === p.id
                    ? "bg-secondary text-secondary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Real-time System Status Component (WebSocket Listener) */}
      <motion.div variants={item}>
        <SystemStatus />
      </motion.div>

      {/* ── CRM View Mode ── */}
      {activeTab === "crm" && (
        <motion.div variants={container} className="space-y-6">
          {/* CRM Quick High-Level KPIs */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Pipeline Ativo"
              value={fmt(totalPipelineValue)}
              icon={TrendingUp}
              gradient="brand"
              change="+14,5%"
              positive={true}
              delay={0}
            />
            <KpiCard
              title="Oportunidades Ativas"
              value={activeOppsCount.toString()}
              icon={ShoppingCart}
              gradient="success"
              change="+8 novas"
              positive={true}
              delay={0.08}
            />
            <KpiCard
              title="Taxa de Conversão"
              value={`${conversionRate}%`}
              icon={Target}
              gradient="warning"
              change="+3,2%"
              positive={true}
              delay={0.16}
            />
            <KpiCard
              title="Canais Conectados"
              value="4 Ativos"
              icon={Layers}
              gradient="brand"
              change="Totalmente integrados"
              positive={true}
              delay={0.24}
            />
          </div>

          {/* Omnichannel Connectors Gateway */}
          <motion.div variants={item}>
            <CrmChannelGateway
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
            />
          </motion.div>

          {/* Pipeline Funnel */}
          <motion.div variants={item}>
            <CrmPipelineFunnel
              opportunities={opportunities}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
            />
          </motion.div>

          {/* CRM Opportunities Board/Table */}
          <motion.div variants={item}>
            <CrmOpportunitiesView
              opportunities={opportunities}
              selectedChannel={selectedChannel}
              selectedStage={selectedStage}
              onRefresh={loadOpportunities}
            />
          </motion.div>
        </motion.div>
      )}

      {/* ── Analytics & ERP View Mode ── */}
      {activeTab === "analytics" && (
        <motion.div variants={container} className="space-y-6">
          {/* ── KPIs ── */}
          {hasPermission("dashboard", "view") && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              {dynamicKpis.map((kpi, i) => {
                const isSensitive = kpi.title.includes("Vendas") || kpi.title.includes("Ticket") || kpi.title.includes("Meta");
                const isOrders = kpi.title.includes("Pedidos");
                
                if (isSensitive && !hasPermission("relatorios", "view")) return null;
                if (isOrders && !hasPermission("pedidos", "view")) return null;
                
                return <KpiCard key={kpi.title} {...kpi} delay={i * 0.08} />;
              })}
            </div>
          )}

      {/* ── Charts Row ── */}
      {hasPermission("relatorios", "view") && (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {/* Area Chart — Evolução de Vendas */}
          <motion.div variants={item}>
            <Card className="card-premium border-0 overflow-hidden">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Evolução de Vendas</CardTitle>
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                   <Brain className="h-3 w-3 text-indigo-600" />
                   <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-tighter">I.A. Forecasting</span>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={filteredSalesMonthly} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(215,80%,50%)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(215,80%,50%)" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="vendas"
                      stroke="hsl(215,80%,50%)"
                      strokeWidth={3}
                      fill="url(#gradVendas)"
                      dot={{ fill: "hsl(215,80%,50%)", r: 4, strokeWidth: 2, stroke: "white" }}
                      activeDot={{ r: 6, stroke: "hsl(215,80%,50%)", strokeWidth: 2 }}
                      name="Realizado"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bar Chart — Vendas por Região */}
          <motion.div variants={item}>
            <Card className="card-premium border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Vendas por Região</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={filteredSalesByRegion} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="hsl(158,56%,42%)" />
                        <stop offset="100%" stopColor="hsl(175,60%,38%)" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="regiao" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="vendas" fill="url(#gradBar)" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* ── Bottom Row ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Pie + Legend */}
        {hasPermission("relatorios", "view") && (
          <motion.div variants={item}>
            <Card className="card-premium border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={filteredSalesByCategory} dataKey="valor" nameKey="categoria"
                      cx="50%" cy="50%" outerRadius={75} innerRadius={44} paddingAngle={2}>
                      {filteredSalesByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-1.5">
                  {filteredSalesByCategory.map((c) => (
                    <div key={c.categoria} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.fill }} />
                      <span className="flex-1 text-muted-foreground truncate">{c.categoria}</span>
                      <span className="font-medium text-foreground">{fmt(c.valor)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pedidos Recentes */}
        {hasPermission("pedidos", "view") && (
          <motion.div variants={item} className={hasPermission("relatorios", "view") ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="card-premium border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Pedidos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/50">
                  {timeFilteredOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono font-medium text-foreground">{order.numero}</p>
                        <p className="text-xs text-muted-foreground truncate">{order.cliente}</p>
                      </div>
                      <span className="text-xs text-muted-foreground hidden sm:block">{order.vendedor}</span>
                      <span className="text-xs font-semibold text-foreground shrink-0">{fmt(order.valor)}</span>
                      <StatusBadge status={order.status as OrderStatus} />
                    </div>
                  ))}
                  {timeFilteredOrders.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground">Nenhum pedido encontrado para o período selecionado</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Alerts + Targets + Timeline ── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Alertas */}
        {(hasPermission("dashboard", "view") || hasPermission("aprovacoes", "view")) && (
          <motion.div variants={item}>
            <Card className="card-premium border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Atenção Necessária
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredAlerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
                      <a.icon className={`h-3.5 w-3.5 ${a.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-tight">{a.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Metas por Representante */}
        {hasPermission("relatorios", "view") && (
          <motion.div variants={item}>
            <Card className="card-premium border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Metas do Mês</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {repTargets.map((rep) => {
                  const adjustedRealizado = Math.round(rep.realizado * periodFactor);
                  const pct = Math.min(100, Math.round((adjustedRealizado / rep.meta) * 100));
                  return (
                    <div key={rep.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground truncate">{rep.name}</span>
                        <span className={`font-bold ${pct >= 90 ? "text-emerald-600 dark:text-emerald-400" : pct >= 60 ? "text-amber-600 dark:text-amber-400" : "text-rose-500"}`}>
                          {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="text-[11px] text-muted-foreground">
                        {fmt(adjustedRealizado)} de {fmt(rep.meta)}
                      </p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Timeline */}
        {hasPermission("auditoria", "view") && (
          <motion.div variants={item}>
            <Card className="card-premium border-0 h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">Atividade Recente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative pl-5 space-y-4">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {timeline.map((t, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className={`absolute -left-3 flex h-5 w-5 items-center justify-center rounded-full ${t.color} shadow-sm`}>
                        <t.icon className="h-2.5 w-2.5 text-white" />
                      </div>
                      <div className="min-w-0 pl-2">
                        <p className="text-xs font-medium text-foreground leading-tight">{t.label}</p>
                        <p className="text-[11px] text-muted-foreground">{t.detail}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground/60 shrink-0 ml-auto">{t.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
        </motion.div>
      )}
    </motion.div>
  );
}
