import React, { memo } from "react";
import { 
  EdgeProps, 
  getBezierPath, 
  getSmoothStepPath, 
  EdgeLabelRenderer,
  BaseEdge 
} from "reactflow";
import { 
  CheckCircle2, XCircle, Clock, Zap, Shield, 
  Lock, ArrowRight, Activity, Cpu, AlertTriangle 
} from "lucide-react";
import { FlowEdgeData } from "@/types/connectors";

// 1. Data Pipe Edge (Animated high-throughput connector)
export const DataPipeEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected
}: EdgeProps<FlowEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const protocol = data?.protocol || "REST";
  const latency = data?.latencyMs || 28;
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2.5,
          stroke: selected ? "#6366f1" : (style.stroke || "#0284c7"),
          strokeDasharray: "6 4",
          animation: "dashdraw 0.8s linear infinite",
        }}
      />
      
      {/* Background glow when selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#818cf8"
          strokeWidth={8}
          strokeOpacity={0.25}
          className="pointer-events-none"
        />
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-white/95 dark:bg-neutral-900/95 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 shadow-xs backdrop-blur-xs hover:scale-105 transition-transform cursor-pointer">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="uppercase">{protocol}</span>
            <span className="text-neutral-400">|</span>
            <span className="text-neutral-600 dark:text-neutral-300">{latency}ms</span>
            {label && (
              <>
                <span className="text-neutral-300">·</span>
                <span className="font-sans font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>
              </>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

DataPipeEdge.displayName = "DataPipeEdge";

// 2. Conditional Branch Edge (Sim / Não / Fallback / Alçada)
export const ConditionalBranchEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected
}: EdgeProps<FlowEdgeData>) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16
  });

  const conditionType = data?.conditionType || "default";
  const label = data?.label || (conditionType === "sim" || conditionType === "aprovado" ? "Sim / Aprovado" : "Não / Rejeitado");

  // Semantic styles based on condition outcome
  const getBadgeStyle = () => {
    switch (conditionType) {
      case "sim":
      case "aprovado":
        return {
          stroke: "#10b981",
          badgeBg: "bg-emerald-50 dark:bg-emerald-950/90",
          badgeBorder: "border-emerald-300 dark:border-emerald-800",
          badgeText: "text-emerald-700 dark:text-emerald-300",
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        };
      case "nao":
      case "reprovado":
        return {
          stroke: "#f43f5e",
          badgeBg: "bg-rose-50 dark:bg-rose-950/90",
          badgeBorder: "border-rose-300 dark:border-rose-800",
          badgeText: "text-rose-700 dark:text-rose-300",
          icon: <XCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
        };
      case "timeout":
      case "fallback":
        return {
          stroke: "#f59e0b",
          badgeBg: "bg-amber-50 dark:bg-amber-950/90",
          badgeBorder: "border-amber-300 dark:border-amber-800",
          badgeText: "text-amber-700 dark:text-amber-300",
          icon: <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
        };
      default:
        return {
          stroke: "#64748b",
          badgeBg: "bg-neutral-50 dark:bg-neutral-900/90",
          badgeBorder: "border-neutral-200 dark:border-neutral-700",
          badgeText: "text-neutral-700 dark:text-neutral-300",
          icon: <ArrowRight className="h-3 w-3 text-neutral-500" />
        };
    }
  };

  const badgeConfig = getBadgeStyle();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2,
          stroke: selected ? "#4f46e5" : (style.stroke || badgeConfig.stroke),
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeConfig.badgeBg} ${badgeConfig.badgeBorder} ${badgeConfig.badgeText} shadow-xs backdrop-blur-xs hover:scale-105 transition-transform cursor-pointer`}>
            {badgeConfig.icon}
            <span>{label}</span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ConditionalBranchEdge.displayName = "ConditionalBranchEdge";

// 3. Step Connector Edge (Orthogonal Step with Retries & Latency)
export const StepConnectorEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected
}: EdgeProps<FlowEdgeData>) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12
  });

  const label = data?.label;
  const retries = data?.retryPolicy?.maxRetries;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 1.8,
          stroke: selected ? "#6366f1" : (style.stroke || "#94a3b8"),
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 shadow-xs">
              <span>{label}</span>
              {retries && retries > 0 && (
                <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 px-1 rounded font-mono">
                  {retries}x retry
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

StepConnectorEdge.displayName = "StepConnectorEdge";

// 4. Security Edge (Encrypted TLS / mTLS Compliance Pipe)
export const SecurityEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected
}: EdgeProps<FlowEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3.5 : 2,
          stroke: selected ? "#10b981" : (style.stroke || "#059669"),
          strokeDasharray: "4 2",
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 shadow-xs">
            <Lock className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
            <span>mTLS 1.3 (Auditado)</span>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

SecurityEdge.displayName = "SecurityEdge";
