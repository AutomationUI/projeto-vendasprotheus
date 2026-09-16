export interface NodeLatencyMetric {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  category: string;
  avgWaitTimeSec: number; // Tempo de espera em fila / alçada humana
  avgProcessTimeSec: number; // Tempo de processamento ativo
  avgIntegrationTimeSec: number; // Tempo de latência de API/Protheus
  totalTimeSec: number;
  executionsCount: number;
  errorRatePercent: number;
  retryRatePercent: number;
  isBottleneck: boolean;
  bottleneckSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  bottleneckReason: string;
  suggestedAction: string;
  estimatedSavingPercent: number;
}

export interface TimeSeriesCompletionPoint {
  timestamp: string;
  displayTime: string;
  avgDurationMin: number;
  p90DurationMin: number;
  slaTargetMin: number;
  executions: number;
  slaCompliantPercent: number;
  bottlenecksDetected: number;
}

export interface FlowDurationDistribution {
  range: string;
  count: number;
  percentage: number;
  status: 'optimal' | 'acceptable' | 'warning' | 'critical';
}

export interface FlowAnalyticsSummary {
  flowId: string;
  flowName: string;
  category: string;
  categoryLabel: string;
  totalExecutions: number;
  avgCompletionTimeMin: number;
  medianCompletionTimeMin: number;
  p95CompletionTimeMin: number;
  slaTargetMin: number;
  slaComplianceRate: number; // 0 to 100%
  activeBottleneckNodeId: string;
  activeBottleneckName: string;
  bottleneckDelayHours: number;
  nodesMetrics: NodeLatencyMetric[];
  historicalTimes: TimeSeriesCompletionPoint[];
  distribution: FlowDurationDistribution[];
  integrationLatencyAvgMs: number;
  failedExecutions: number;
  simulatedOptimizedTimeMin: number;
}

export interface BottleneckInsight {
  id: string;
  flowId: string;
  flowName: string;
  nodeId: string;
  nodeName: string;
  severity: 'critical' | 'high' | 'medium';
  impactDescription: string;
  avgDelayFormatted: string;
  causeType: 'human_approval' | 'external_api' | 'totvs_lock' | 'complex_rule' | 'queue_backlog';
  causeLabel: string;
  recommendation: string;
  potentialGain: string;
}
