import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import type { ProductionBatch, ProductionStatus } from "@/hooks/use-production-websocket";

const STATUS_ORDER: ProductionStatus[] = [
  "Mistura", "Moldagem", "Prensado", "Secagem",
  "Aguardando Queima", "Em Queima", "Queimado",
  "Acabamento", "Inspeção", "Expedição",
];

const STATUS_COLORS: Record<ProductionStatus, string> = {
  Mistura: "#f59e0b",
  Moldagem: "#f97316",
  Prensado: "#eab308",
  Secagem: "#38bdf8",
  "Aguardando Queima": "#94a3b8",
  "Em Queima": "#ef4444",
  Queimado: "#e11d48",
  Acabamento: "#8b5cf6",
  Inspeção: "#3b82f6",
  Expedição: "#10b981",
};

const PRIORITY_COLORS = {
  Alta: "#ef4444",
  Média: "#f59e0b",
  Baixa: "#94a3b8",
};

interface Props {
  batches: ProductionBatch[];
  onFilterStatus?: (status: string) => void;
  onFilterPriority?: (priority: string) => void;
  onFilterType?: (type: string) => void;
  activeStatus?: string;
  activePriority?: string;
}

export function ProductionCharts({
  batches,
  onFilterStatus,
  onFilterPriority,
  onFilterType,
  activeStatus,
  activePriority,
}: Props) {
  // Distribution by status
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => (counts[s] = 0));
    batches.forEach((b) => counts[b.status]++);
    return STATUS_ORDER.map((s) => ({
      name: s,
      value: counts[s],
      fill: STATUS_COLORS[s],
    }));
  }, [batches]);

  // Distribution by priority (pie)
  const priorityData = useMemo(() => {
    const counts = { Alta: 0, Média: 0, Baixa: 0 };
    batches.forEach((b) => counts[b.prioridade]++);
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        fill: PRIORITY_COLORS[name as keyof typeof PRIORITY_COLORS],
      }));
  }, [batches]);

  // Trend: batches by start date (simulated weekly)
  const trendData = useMemo(() => {
    const byWeek: Record<string, { total: number; concluidos: number }> = {};
    batches.forEach((b) => {
      const d = new Date(b.inicio);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (!byWeek[key]) byWeek[key] = { total: 0, concluidos: 0 };
      byWeek[key].total++;
      if (b.status === "Expedição") byWeek[key].concluidos++;
    });
    return Object.entries(byWeek)
      .sort(([a], [b]) => {
        const [da, ma] = a.split("/").map(Number);
        const [db, mb] = b.split("/").map(Number);
        return ma - mb || da - db;
      })
      .map(([semana, data]) => ({ semana, ...data }));
  }, [batches]);

  // Distribution by type (horizontal bar)
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    batches.forEach((b) => {
      counts[b.tipo] = (counts[b.tipo] || 0) + b.quantidade;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [batches]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {/* Status distribution bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Lotes por Etapa
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9 }}
                angle={-35}
                textAnchor="end"
                height={60}
                interval={0}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Bar
                dataKey="value"
                name="Lotes"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data: { name: string }) => {
                  if (onFilterStatus) {
                    onFilterStatus(activeStatus === data.name ? "all" : data.name);
                  }
                }}
              >
                {statusData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.fill}
                    opacity={!activeStatus || activeStatus === "all" || activeStatus === entry.name ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Priority pie chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Distribuição por Prioridade
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={priorityData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={4}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
                cursor="pointer"
                onClick={(data: { name: string }) => {
                  if (onFilterPriority) {
                    onFilterPriority(activePriority === data.name ? "all" : data.name);
                  }
                }}
              >
                {priorityData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.fill}
                    opacity={!activePriority || activePriority === "all" || activePriority === entry.name ? 1 : 0.3}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend area chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Tendência Semanal de Lotes
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradConcluidos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Iniciados"
                stroke="#3b82f6"
                fill="url(#gradTotal)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="concluidos"
                name="Expedidos"
                stroke="#10b981"
                fill="url(#gradConcluidos)"
                strokeWidth={2}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Type distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Volume por Tipo de Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={typeData} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} />
              <Tooltip
                formatter={(value: number) => value.toLocaleString("pt-BR") + " pç"}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Bar
                dataKey="value"
                name="Quantidade"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(data: { name?: string }) => {
                  if (onFilterType) {
                    onFilterType(data.name || "all");
                  }
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
}
