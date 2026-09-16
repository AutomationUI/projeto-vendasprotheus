import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area, 
  Line, 
  Bar, 
  BarChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  TrendingDown, 
  TrendingUp, 
  Filter, 
  Play, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  Cpu, 
  Layers, 
  ChevronRight,
  RefreshCw,
  Gauge,
  Sliders,
  Maximize2
} from 'lucide-react';
import { ALL_FLOW_TEMPLATES } from '@/data/all-flows-templates';
import { 
  FLOW_ANALYTICS_DATASET, 
  GLOBAL_BOTTLENECKS_CATALOG, 
  getFlowAnalytics 
} from '@/data/flow-analytics-data';
import { FlowAnalyticsSummary } from '@/types/flow-analytics';
import { toast } from 'sonner';

interface FlowAnalyticsDashboardProps {
  initialFlowKey?: string;
  onOpenFlowInCanvas?: (flowKey: string) => void;
}

const PIE_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f97316', '#ef4444'];

export const FlowAnalyticsDashboard: React.FC<FlowAnalyticsDashboardProps> = ({
  initialFlowKey = 'lead-routing',
  onOpenFlowInCanvas
}) => {
  const [selectedFlowKey, setSelectedFlowKey] = useState<string>(initialFlowKey);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [isSimulatingBenchmark, setIsSimulatingBenchmark] = useState(false);
  const [simulatedAutomationLevel, setSimulatedAutomationLevel] = useState<number>(0); // 0% to 100% optimization
  const [benchmarkRunCount, setBenchmarkRunCount] = useState<number>(0);

  // Active Flow Analytics
  const activeFlow = ALL_FLOW_TEMPLATES[selectedFlowKey];
  const baseAnalytics = useMemo(() => {
    return getFlowAnalytics(selectedFlowKey, activeFlow?.meta.name);
  }, [selectedFlowKey, activeFlow]);

  // Adjust metrics dynamically if automation simulator is active
  const analytics: FlowAnalyticsSummary = useMemo(() => {
    if (simulatedAutomationLevel === 0 && benchmarkRunCount === 0) {
      return baseAnalytics;
    }

    const optFactor = 1 - (simulatedAutomationLevel / 100) * 0.65;
    const adjustedAvg = Math.max(0.8, Number((baseAnalytics.avgCompletionTimeMin * optFactor).toFixed(1)));
    const adjustedSlaCompliance = Math.min(99.9, Number((baseAnalytics.slaComplianceRate + (simulatedAutomationLevel / 100) * 12).toFixed(1)));

    return {
      ...baseAnalytics,
      avgCompletionTimeMin: adjustedAvg,
      slaComplianceRate: adjustedSlaCompliance,
      historicalTimes: baseAnalytics.historicalTimes.map(h => ({
        ...h,
        avgDurationMin: Number((h.avgDurationMin * optFactor).toFixed(1)),
        p90DurationMin: Number((h.p90DurationMin * optFactor).toFixed(1)),
        slaCompliantPercent: Math.min(100, Number((h.slaCompliantPercent + (simulatedAutomationLevel / 100) * 8).toFixed(1)))
      })),
      nodesMetrics: baseAnalytics.nodesMetrics.map(nm => {
        if (nm.isBottleneck) {
          const waitReduction = (simulatedAutomationLevel / 100) * 0.75;
          const newWait = Math.round(nm.avgWaitTimeSec * (1 - waitReduction));
          return {
            ...nm,
            avgWaitTimeSec: newWait,
            totalTimeSec: newWait + nm.avgProcessTimeSec + nm.avgIntegrationTimeSec,
            bottleneckSeverity: simulatedAutomationLevel > 50 ? 'low' : nm.bottleneckSeverity
          };
        }
        return nm;
      })
    };
  }, [baseAnalytics, simulatedAutomationLevel, benchmarkRunCount]);

  // Benchmark Run simulation handler
  const handleRunBenchmark = () => {
    setIsSimulatingBenchmark(true);
    toast.info(`Iniciando bateria de benchmark com 120 execuções para "${analytics.flowName}"...`);

    setTimeout(() => {
      setIsSimulatingBenchmark(false);
      setBenchmarkRunCount(prev => prev + 1);
      toast.success(`Benchmark concluído! 120 transações computadas com sucesso. MTTC aferido: ${analytics.avgCompletionTimeMin} min.`);
    }, 1200);
  };

  // Node Latency Bar Chart data
  const nodeLatencyChartData = useMemo(() => {
    return analytics.nodesMetrics.map(node => ({
      name: node.nodeName.length > 24 ? node.nodeName.substring(0, 22) + '...' : node.nodeName,
      fullName: node.nodeName,
      esperaFila: node.avgWaitTimeSec,
      processamentoLocal: node.avgProcessTimeSec,
      latenciaIntegracao: node.avgIntegrationTimeSec,
      totalSegundos: node.totalTimeSec,
      isBottleneck: node.isBottleneck,
      severity: node.bottleneckSeverity,
      errorRate: node.errorRatePercent
    }));
  }, [analytics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ─── HEADER & CONTROLS BAR ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Flow selector & description */}
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shrink-0">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Telemetria de Conclusão & Diagnóstico de Gargalos
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Engine Recharts Ativa
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Monitoramento do tempo de ciclo (MTTC), cumprimento de SLA e isolamento de latência por nó do processo.
              </p>
            </div>
          </div>

          {/* Action buttons & Flow selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Flow Switcher */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase">Fluxo:</span>
              <select
                value={selectedFlowKey}
                onChange={(e) => setSelectedFlowKey(e.target.value)}
                className="h-9 text-xs font-bold bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 text-neutral-800 dark:text-neutral-100 focus:outline-primary"
              >
                {Object.keys(ALL_FLOW_TEMPLATES).map((key) => (
                  <option key={key} value={key}>
                    {ALL_FLOW_TEMPLATES[key].meta.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
              {(['24h', '7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                    timeRange === range
                      ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Benchmark Runner Button */}
            <button
              onClick={handleRunBenchmark}
              disabled={isSimulatingBenchmark}
              className="h-9 px-3.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              {isSimulatingBenchmark ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              {isSimulatingBenchmark ? 'Testando...' : 'Rodar Benchmark'}
            </button>

            {onOpenFlowInCanvas && (
              <button
                onClick={() => onOpenFlowInCanvas(selectedFlowKey)}
                className="h-9 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 transition-colors"
                title="Editar este fluxo no Canvas"
              >
                <Sliders className="h-3.5 w-3.5 text-primary" /> Editar Canvas
              </button>
            )}

          </div>

        </div>
      </div>

      {/* ─── KPI SUMMARY CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: MTTC (Mean Time to Complete) */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tempo Médio (MTTC)</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {analytics.avgCompletionTimeMin >= 60 
                  ? `${(analytics.avgCompletionTimeMin / 60).toFixed(1)}h` 
                  : `${analytics.avgCompletionTimeMin} min`}
              </span>
              <span className="text-xs text-neutral-400">
                (Mediana: {analytics.medianCompletionTimeMin >= 60 
                  ? `${(analytics.medianCompletionTimeMin / 60).toFixed(1)}h` 
                  : `${analytics.medianCompletionTimeMin}m`})
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>-18.4% vs semana anterior</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex justify-between">
            <span>Meta SLA: <strong>{analytics.slaTargetMin >= 60 ? `${analytics.slaTargetMin/60}h` : `${analytics.slaTargetMin} min`}</strong></span>
            <span>P95: <strong>{analytics.p95CompletionTimeMin >= 60 ? `${(analytics.p95CompletionTimeMin/60).toFixed(1)}h` : `${analytics.p95CompletionTimeMin}m`}</strong></span>
          </div>
        </div>

        {/* KPI 2: SLA Compliance Rate */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Conformidade com SLA</span>
            <div className={`p-2 rounded-xl ${
              analytics.slaComplianceRate >= 95 
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
            }`}>
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
                {analytics.slaComplianceRate}%
              </span>
              <span className="text-xs text-neutral-400">
                ({analytics.totalExecutions.toLocaleString()} execs)
              </span>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full mt-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  analytics.slaComplianceRate >= 95 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, analytics.slaComplianceRate)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex justify-between">
            <span>Falhas/Retries: <strong>{analytics.failedExecutions}</strong></span>
            <span className="text-emerald-600 font-bold">Excelente</span>
          </div>
        </div>

        {/* KPI 3: Principal Gargalo Ativo */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Maior Gargalo Ativo</span>
            <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-100 line-clamp-2" title={analytics.activeBottleneckName}>
              {analytics.activeBottleneckName}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Gargalo Crítico de Retenção</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex justify-between">
            <span>Latência média: <strong>{analytics.bottleneckDelayHours > 0.5 ? `${analytics.bottleneckDelayHours}h` : `${Math.round(analytics.bottleneckDelayHours * 60)} min`}</strong></span>
            <span className="text-rose-500 font-bold">Foco nº 1</span>
          </div>
        </div>

        {/* KPI 4: Potencial de Otimização */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Potencial Otimizado</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-purple-600 dark:text-purple-400">
                {analytics.simulatedOptimizedTimeMin >= 60 
                  ? `${(analytics.simulatedOptimizedTimeMin / 60).toFixed(1)}h` 
                  : `${analytics.simulatedOptimizedTimeMin} min`}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                (-{Math.round((1 - analytics.simulatedOptimizedTimeMin / analytics.avgCompletionTimeMin) * 100)}%)
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Tempo atingível com automação de alçadas e cache Protheus
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex justify-between">
            <span>Integrações: <strong>{analytics.integrationLatencyAvgMs}ms</strong></span>
            <span className="text-purple-600 font-semibold">Simular Abaixo</span>
          </div>
        </div>

      </div>

      {/* ─── CHARTS ROW 1: TIME SERIES & DURATION BREAKDOWN ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Chart 1: Time Series MTTC & SLA Limit (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Histórico do Tempo de Ciclo vs SLA (Minutos)
              </h3>
              <p className="text-xs text-neutral-400">
                Comparativo diário entre o tempo médio apurado, percentil P90 e teto contratual de SLA.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">Tempo Médio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-300" />
                <span className="text-neutral-600 dark:text-neutral-300 font-medium">P90</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-rose-500 border border-dashed border-rose-500" />
                <span className="text-rose-600 font-medium">Teto SLA ({analytics.slaTargetMin}m)</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.historicalTimes} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis 
                  dataKey="displayTime" 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={{ stroke: '#cbd5e1' }}
                  unit="m"
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-900 text-white p-3 rounded-xl shadow-xl text-xs border border-neutral-800 space-y-1.5 min-w-[190px]">
                          <p className="font-bold text-neutral-200 border-b border-neutral-800 pb-1">{label}</p>
                          <div className="flex justify-between text-blue-400">
                            <span>Tempo Médio:</span>
                            <span className="font-bold">{data.avgDurationMin} min</span>
                          </div>
                          <div className="flex justify-between text-indigo-300">
                            <span>Percentil P90:</span>
                            <span className="font-bold">{data.p90DurationMin} min</span>
                          </div>
                          <div className="flex justify-between text-emerald-400">
                            <span>Conformidade SLA:</span>
                            <span className="font-bold">{data.slaCompliantPercent}%</span>
                          </div>
                          <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-800">
                            <span>Execuções Totais:</span>
                            <span>{data.executions}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={analytics.slaTargetMin} 
                  stroke="#ef4444" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ value: `SLA: ${analytics.slaTargetMin}m`, fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="p90DurationMin" 
                  stroke="#818cf8" 
                  strokeWidth={1.5}
                  fillOpacity={1} 
                  fill="url(#colorP90)" 
                  name="Percentil P90"
                />
                <Area 
                  type="monotone" 
                  dataKey="avgDurationMin" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAvg)" 
                  name="Tempo Médio"
                />
                <Line 
                  type="monotone" 
                  dataKey="avgDurationMin" 
                  stroke="#1d4ed8" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#1d4ed8' }} 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribution of Execution Times (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-500" /> Distribuição de Tempo
            </h3>
            <p className="text-xs text-neutral-400">
              Faixas de duração de conclusão das instâncias.
            </p>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {analytics.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-neutral-900 text-white p-2.5 rounded-xl shadow-lg text-xs border border-neutral-800">
                          <p className="font-bold">{data.range}</p>
                          <p className="text-neutral-300">{data.count.toLocaleString()} execuções ({data.percentage}%)</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Grid */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px]">
            {analytics.distribution.map((item, idx) => (
              <div key={item.range} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-neutral-600 dark:text-neutral-300">{item.range}</span>
                </div>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{item.percentage}% ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ─── CHARTS ROW 2: BOTTLENECK ANALYSIS BY STEP / NODE ───────────── */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Decomposição de Latência & Gargalos por Etapa (Segundos)
            </h3>
            <p className="text-xs text-neutral-400">
              Isolamento do tempo de fila/espera humana, processamento de regra em memória e latência de integrações Protheus/APIs.
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-500" />
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">Fila / Espera Humana</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-blue-500" />
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">Processamento Regra</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-cyan-500" />
              <span className="text-neutral-600 dark:text-neutral-300 font-medium">Latência Integração</span>
            </div>
          </div>
        </div>

        {/* Horizontal Stacked Bar Chart */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={nodeLatencyChartData}
              margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} horizontal={false} />
              <XAxis 
                type="number" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                unit="s"
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                width={160}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-neutral-900 text-white p-3 rounded-xl shadow-xl text-xs border border-neutral-800 space-y-1.5 min-w-[220px]">
                        <p className="font-bold text-neutral-100 border-b border-neutral-800 pb-1">{data.fullName}</p>
                        <div className="flex justify-between text-amber-400">
                          <span>Fila / Espera:</span>
                          <span className="font-bold">{data.esperaFila}s</span>
                        </div>
                        <div className="flex justify-between text-blue-400">
                          <span>Processamento Regra:</span>
                          <span className="font-bold">{data.processamentoLocal}s</span>
                        </div>
                        <div className="flex justify-between text-cyan-400">
                          <span>Latência API/ERP:</span>
                          <span className="font-bold">{data.latenciaIntegracao}s</span>
                        </div>
                        <div className="flex justify-between font-bold text-neutral-200 pt-1 border-t border-neutral-800">
                          <span>Tempo Total:</span>
                          <span>{data.totalSegundos}s</span>
                        </div>
                        {data.isBottleneck && (
                          <div className="mt-1 pt-1 bg-rose-950/40 text-rose-400 p-1.5 rounded-lg border border-rose-900/40 text-[10px]">
                            ⚠️ Gargalo Identificado: Severidade <strong>{data.severity}</strong>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="esperaFila" stackId="a" fill="#f59e0b" name="Fila / Espera Humana" radius={[0, 0, 0, 0]} />
              <Bar dataKey="processamentoLocal" stackId="a" fill="#3b82f6" name="Processamento Local" radius={[0, 0, 0, 0]} />
              <Bar dataKey="latenciaIntegracao" stackId="a" fill="#06b6d4" name="Latência de Integração" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── INTERACTIVE BOTTLENECK REMEDIATION & OPTIMIZATION SIMULATOR ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Interactive Optimization Slider (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-neutral-900 to-neutral-950 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold">Simulador de Otimização</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Impacto em Tempo Real
            </span>
          </div>

          <p className="text-xs text-neutral-300">
            Ajuste o grau de automação e regras determinísticas para calcular o ganho projetado no MTTC e eliminação de gargalos humanos.
          </p>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-neutral-300">Nível de Automação & Cache Protheus:</span>
              <span className="text-indigo-400">{simulatedAutomationLevel}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={simulatedAutomationLevel}
              onChange={(e) => setSimulatedAutomationLevel(Number(e.target.value))}
              className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>0% (Manual / Padrão)</span>
              <span>50% (Híbrido)</span>
              <span>100% (Hiperautomação)</span>
            </div>
          </div>

          {/* Simulation Outcome Card */}
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Tempo de Ciclo Projetado:</span>
              <span className="font-bold text-white text-sm">
                {analytics.avgCompletionTimeMin} min
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Conformidade com SLA:</span>
              <span className="font-bold text-emerald-400">
                {analytics.slaComplianceRate}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Redução de Horas/Mês:</span>
              <span className="font-bold text-indigo-300">
                ~{Math.round((baseAnalytics.avgCompletionTimeMin - analytics.avgCompletionTimeMin) * analytics.totalExecutions / 60)} horas economizadas
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setSimulatedAutomationLevel(80);
              toast.success("Otimização recomendada aplicada com sucesso na projeção do fluxo!");
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs"
          >
            <Zap className="h-3.5 w-3.5" /> Aplicar Configuração Recomendada (80%)
          </button>
        </div>

        {/* Global Bottleneck Catalog & Actions (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800/80 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-500" /> Matriz de Gargalos & Recomendações de Engenharia
              </h3>
              <p className="text-xs text-neutral-400">
                Ações prescritivas para destravar os maiores ofensores de tempo da organização.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {GLOBAL_BOTTLENECKS_CATALOG.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 space-y-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.severity === 'critical'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {item.severity.toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {item.nodeName}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      Fluxo: <strong>{item.flowName}</strong> • {item.causeLabel} ({item.avgDelayFormatted})
                    </p>
                  </div>

                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg shrink-0">
                    {item.potentialGain}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 p-2 rounded-lg border border-neutral-200/50 dark:border-neutral-800/50 flex items-start gap-1.5">
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Prescrição:</strong> {item.recommendation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
