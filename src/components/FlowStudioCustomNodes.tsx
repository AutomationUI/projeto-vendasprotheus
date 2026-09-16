import React, { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { 
  Zap, GitFork, Mail, UserPlus, Bell, Clock, 
  Send, Database, AlertTriangle, ShieldCheck, Cpu,
  Calculator, MessageSquare, CheckCircle, Flame,
  FileText, ShieldAlert, Sparkles, AlertOctagon,
  Layers, Lock, Play, Scale, RefreshCw, BadgePercent,
  TrendingUp, Calendar
} from "lucide-react";
import { CRMNodeData } from "@/types/crm-flow";

// Icon mapper helper
export const getFlowIcon = (iconName: string, className: string = "h-4 w-4") => {
  switch (iconName) {
    case "scale": return <Scale className={`${className} text-violet-600 dark:text-violet-400`} />;
    case "zap": return <Zap className={`${className} text-indigo-600 dark:text-indigo-400`} />;
    case "fork": return <GitFork className={`${className} text-amber-600 dark:text-amber-400`} />;
    case "mail": return <Mail className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case "user-plus": return <UserPlus className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case "bell": return <Bell className={`${className} text-sky-600 dark:text-sky-400`} />;
    case "clock": return <Clock className={`${className} text-blue-600 dark:text-blue-400`} />;
    case "database": return <Database className={`${className} text-violet-600 dark:text-violet-400`} />;
    case "send": return <Send className={`${className} text-blue-600 dark:text-blue-400`} />;
    case "warning": return <AlertTriangle className={`${className} text-rose-600 dark:text-rose-400`} />;
    case "shield": return <ShieldCheck className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case "shield-alert": return <ShieldAlert className={`${className} text-rose-600 dark:text-rose-400`} />;
    case "calc": return <Calculator className={`${className} text-cyan-600 dark:text-cyan-400`} />;
    case "whatsapp": return <MessageSquare className={`${className} text-green-600 dark:text-green-400`} />;
    case "check": return <CheckCircle className={`${className} text-emerald-600 dark:text-emerald-400`} />;
    case "flame": return <Flame className={`${className} text-amber-500 dark:text-amber-400`} />;
    case "file": return <FileText className={`${className} text-purple-600 dark:text-purple-400`} />;
    case "lock": return <Lock className={`${className} text-rose-500 dark:text-rose-400`} />;
    case "sparkles": return <Sparkles className={`${className} text-indigo-500 dark:text-indigo-400`} />;
    case "alert-octagon": return <AlertOctagon className={`${className} text-rose-600 dark:text-rose-400`} />;
    default: return <Zap className={className} />;
  }
};

// 1. Trigger Node Component
export const TriggerNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  return (
    <div className={`w-[250px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-indigo-500 ring-2 ring-indigo-500/25 shadow-md shadow-indigo-500/10" 
        : "border-indigo-200/80 dark:border-indigo-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-indigo-50/90 dark:bg-indigo-950/50 px-3.5 py-2.5 border-b border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-indigo-500/15 rounded-lg shrink-0">
            {getFlowIcon(data.icon, "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">Gatilho / Início</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        {data.config.protheusSyncEnabled && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase border border-blue-200/50 dark:border-blue-900/30">
            <Cpu className="h-2.5 w-2.5" /> ERP
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        {data.config.source && (
          <div className="mt-2.5 flex items-center gap-1">
            <span className="text-[9px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-100/60 dark:border-indigo-900/40">
              Origem: {data.config.source}
            </span>
          </div>
        )}

        {data.config.protheusSyncEnabled && data.config.protheusTable && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 p-1 rounded border border-blue-100/30 dark:border-blue-900/10">
            <span>Tabela:</span>
            <span className="font-mono bg-blue-100/60 dark:bg-blue-950/60 px-1 rounded">{data.config.protheusTable.split(" ")[0]}</span>
            {data.config.protheusTriggerEvent && (
              <span className="text-[8px] opacity-85">({data.config.protheusTriggerEvent})</span>
            )}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-indigo-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-indigo-500/40 transition-all cursor-pointer shadow-lg"
        title="Ponto de partida: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";

// 2. Condition Node Component
export const ConditionNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  return (
    <div className={`w-[250px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-amber-500 ring-2 ring-amber-500/25 shadow-md shadow-amber-500/10" 
        : "border-amber-200/80 dark:border-amber-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-amber-50/90 dark:bg-amber-950/50 px-3.5 py-2.5 border-b border-amber-100 dark:border-amber-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-amber-500/15 rounded-lg shrink-0">
            {getFlowIcon(data.icon, "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-amber-600 dark:text-amber-400 uppercase">Condicional / Split</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        {data.config.protheusSyncEnabled && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase border border-blue-200/50 dark:border-blue-900/30">
            <Cpu className="h-2.5 w-2.5" /> ERP
          </span>
        )}
      </div>
      <div className="p-3 pb-4">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        {data.config.field && (
          <div className="mt-2.5 flex items-center gap-1 flex-wrap">
            <span className="text-[9px] font-bold text-neutral-400 uppercase">Se</span>
            <span className="text-[9px] font-semibold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/50 dark:border-neutral-700/50">
              {data.config.field}
            </span>
            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">{data.config.operator}</span>
            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-100/60 dark:border-amber-900/40">
              {data.config.value}
            </span>
          </div>
        )}

        {data.config.protheusSyncEnabled && data.config.protheusTable && (
          <div className="mt-2 flex items-center gap-1.5 text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 p-1 rounded border border-blue-100/30 dark:border-blue-900/10">
            <span>Tabela:</span>
            <span className="font-mono bg-blue-100/60 dark:bg-blue-950/60 px-1 rounded">{data.config.protheusTable.split(" ")[0]}</span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-amber-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-amber-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada do fluxo"
      />

      {/* Dual source handles for conditional routing (Left for True, Right for False) */}
      <div className="absolute w-full bottom-[-12px] left-0 flex justify-between px-6 pointer-events-none">
        <div className="relative pointer-events-auto">
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="w-7 h-7 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full hover:scale-125 hover:ring-4 hover:ring-emerald-500/40 transition-all cursor-pointer shadow-lg"
            title="Conexão para SIM / Condição Aprovada"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-white dark:bg-neutral-950 px-1 rounded border border-emerald-100 dark:border-emerald-950">Sim</span>
        </div>
        <div className="relative pointer-events-auto">
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="w-7 h-7 bg-rose-500 border-2 border-white dark:border-neutral-900 rounded-full hover:scale-125 hover:ring-4 hover:ring-rose-500/40 transition-all cursor-pointer shadow-lg"
            title="Conexão para NÃO / Condição Reprovada"
          />
          <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-white dark:bg-neutral-950 px-1 rounded border border-rose-100 dark:border-rose-950">Não</span>
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";

// 3. Action Node Component
export const ActionNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  return (
    <div className={`w-[250px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-emerald-500 ring-2 ring-emerald-500/25 shadow-md shadow-emerald-500/10" 
        : "border-emerald-200/80 dark:border-emerald-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-emerald-50/90 dark:bg-emerald-950/50 px-3.5 py-2.5 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-emerald-500/15 rounded-lg shrink-0">
            {getFlowIcon(data.icon, "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">Ação / Tarefa</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        {data.config.protheusSyncEnabled && (
          <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-1.5 py-0.5 rounded-full uppercase border border-blue-200/50 dark:border-blue-900/30">
            <Cpu className="h-2.5 w-2.5" /> ERP
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        {/* Dynamic Context Parameters display */}
        {data.config.assigneeGroup && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium">
            Destinatário: <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded font-bold">{data.config.assigneeGroup}</span>
          </div>
        )}
        {data.config.slackChannel && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium">
            Canal: <span className="text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded font-bold">{data.config.slackChannel}</span>
          </div>
        )}
        {data.config.emailTemplate && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium truncate">
            Template: <span className="text-emerald-700 dark:text-emerald-300 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-bold">{data.config.emailTemplate}</span>
          </div>
        )}
        {data.config.whatsappTemplate && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium truncate">
            WhatsApp: <span className="text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-1.5 py-0.5 rounded font-bold">{data.config.whatsappTemplate}</span>
          </div>
        )}
        {data.config.delayDays !== undefined && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium">
            Espera: <span className="text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-bold">{data.config.delayDays} dias</span>
          </div>
        )}

        {data.config.protheusSyncEnabled && data.config.protheusTable && (
          <div className="mt-2 flex items-center justify-between text-[9px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20 p-1.5 rounded border border-blue-100/30 dark:border-blue-900/10">
            <div className="flex items-center gap-1">
              <span>Op:</span>
              <span className="font-mono bg-blue-100/60 dark:bg-blue-950/60 px-1 rounded capitalize">{data.config.protheusOperation ?? "incluir"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Tab:</span>
              <span className="font-mono bg-blue-100/60 dark:bg-blue-950/60 px-1 rounded">{data.config.protheusTable.split(" ")[0]}</span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-emerald-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada da instrução"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-emerald-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-emerald-500/40 transition-all cursor-pointer shadow-lg"
        title="Saída: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

ActionNode.displayName = "ActionNode";

// 4. Operation / Calculation Node Component
export const OperationNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  return (
    <div className={`w-[250px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-sky-500 ring-2 ring-sky-500/25 shadow-md shadow-sky-500/10" 
        : "border-sky-200/80 dark:border-sky-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-sky-50/90 dark:bg-sky-950/50 px-3.5 py-2.5 border-b border-sky-100 dark:border-sky-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-sky-500/15 rounded-lg shrink-0">
            {getFlowIcon(data.icon, "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">Cálculo / Processo</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        {data.config.formula && (
          <div className="mt-2 text-[9px] text-sky-700 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/60 p-1.5 rounded border border-sky-100/70 dark:border-sky-900/40 font-mono">
            ƒ(x): {data.config.formula}
          </div>
        )}

        {data.config.delayHours !== undefined && (
          <div className="mt-2 text-[9px] text-neutral-500 font-medium flex items-center gap-1">
            <Clock className="h-3 w-3 text-sky-500" />
            <span>Temporizador: <strong>{data.config.delayHours} horas</strong></span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-sky-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-sky-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada da instrução"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-sky-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-sky-500/40 transition-all cursor-pointer shadow-lg"
        title="Saída: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

OperationNode.displayName = "OperationNode";

// 5. Validator / Exception Node Component
export const ValidatorNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  return (
    <div className={`w-[250px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-rose-500 ring-2 ring-rose-500/25 shadow-md shadow-rose-500/10" 
        : "border-rose-200/80 dark:border-rose-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-rose-50/90 dark:bg-rose-950/50 px-3.5 py-2.5 border-b border-rose-100 dark:border-rose-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-rose-500/15 rounded-lg shrink-0">
            {getFlowIcon(data.icon, "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">Validador / Trava</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 py-0.5 rounded-full uppercase border border-rose-200/50 dark:border-rose-900/30">
          <ShieldAlert className="h-2.5 w-2.5" /> Compliance
        </span>
      </div>
      <div className="p-3">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        {data.config.validationRule && (
          <div className="mt-2 text-[9px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded border border-rose-100 dark:border-rose-900/40 font-medium">
            Regra: {data.config.validationRule}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-rose-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-rose-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada da instrução"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-rose-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-rose-500/40 transition-all cursor-pointer shadow-lg"
        title="Saída: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

ValidatorNode.displayName = "ValidatorNode";

// 6. Connector / Integration Gateway Node Component
export const ConnectorNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  const protocol = data.config.connectorProtocol || "REST";
  const vendor = data.config.connectorVendor || "Enterprise API";
  const latency = data.config.connectorLatency || 28;
  const status = data.config.connectorStatus || "online";

  return (
    <div className={`w-[265px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-sky-500 ring-2 ring-sky-500/25 shadow-lg shadow-sky-500/15" 
        : "border-sky-200/80 dark:border-sky-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      <div className="bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-sky-500/5 dark:from-sky-950/40 dark:to-indigo-950/40 px-3.5 py-2.5 border-b border-sky-100 dark:border-sky-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-sky-500/15 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-lg shrink-0">
            {getFlowIcon(data.icon || "database", "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-wider text-sky-600 dark:text-sky-400 uppercase">Conector de Integração</span>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Conector Online" />
          <span className="text-[8px] font-mono font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 px-1.5 py-0.5 rounded uppercase">
            {protocol}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">{data.description}</p>
        
        <div className="flex items-center justify-between text-[10px] bg-neutral-50 dark:bg-neutral-950 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800 font-mono">
          <span className="text-neutral-500 truncate max-w-[140px]">{data.config.connectorEndpoint || data.config.erpEndpoint || "/api/v1/sync"}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{latency}ms</span>
        </div>

        <div className="flex items-center justify-between pt-0.5 text-[9px] text-neutral-400 font-semibold">
          <span className="truncate">Provedor: <strong className="text-neutral-700 dark:text-neutral-300">{vendor}</strong></span>
          <span className="text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">{status}</span>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-sky-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-sky-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada da instrução"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-sky-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-sky-500/40 transition-all cursor-pointer shadow-lg"
        title="Saída: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

ConnectorNode.displayName = "ConnectorNode";

// 7. Business Rule / Governance Studio Connected Node Component
export const BusinessRuleNode = memo(({ data, selected }: NodeProps<CRMNodeData>) => {
  const maxDiscount = data.config.maxDiscountPct ?? 8;
  const maxManagerDiscount = data.config.maxDiscountManagerPct ?? 15;
  const minMargin = data.config.minMarginPct ?? 25;
  const maxTermDays = data.config.maxPaymentTermDays ?? 60;
  const syncStatus = data.config.governanceSyncStatus || "synced";
  const version = data.config.governanceVersion ?? 3;

  return (
    <div className={`w-[275px] bg-white dark:bg-neutral-900 border ${
      selected 
        ? "border-violet-500 ring-2 ring-violet-500/25 shadow-lg shadow-violet-500/15" 
        : "border-violet-200/80 dark:border-violet-800/60 shadow-sm"
    } rounded-xl overflow-hidden transition-all duration-200 group`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/15 via-indigo-500/10 to-violet-500/5 dark:from-violet-950/50 dark:to-indigo-950/40 px-3.5 py-2.5 border-b border-violet-100 dark:border-violet-900/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-violet-500/15 dark:bg-violet-500/25 text-violet-600 dark:text-violet-400 rounded-lg shrink-0">
            {getFlowIcon(data.icon || "scale", "h-4 w-4")}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold tracking-wider text-violet-600 dark:text-violet-400 uppercase">Regra de Negócio</span>
            </div>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 leading-tight mt-0.5 truncate">{data.label}</h4>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1 text-[8px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 px-1.5 py-0.5 rounded-full uppercase border border-violet-200/60 dark:border-violet-800/40">
          <Scale className="h-2.5 w-2.5" /> Governance v{version}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2.5">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal line-clamp-2">
          {data.description || "Aplica validações de margem e descontos sincronizadas com o Governance Studio."}
        </p>

        {/* Dynamic Governance Parameters Grid */}
        <div className="grid grid-cols-2 gap-1.5 bg-violet-50/40 dark:bg-violet-950/20 p-2 rounded-lg border border-violet-100/60 dark:border-violet-900/30">
          <div className="space-y-0.5">
            <div className="text-[8px] font-bold uppercase text-neutral-400 flex items-center gap-0.5">
              <BadgePercent className="h-2.5 w-2.5 text-violet-500" /> Teto Desconto
            </div>
            <div className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
              ≤ {maxDiscount}% <span className="text-[9px] font-normal text-muted-foreground">({maxManagerDiscount}% Ger.)</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[8px] font-bold uppercase text-neutral-400 flex items-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5 text-emerald-500" /> Piso Margem
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              ≥ {minMargin}%
            </div>
          </div>

          {maxTermDays && (
            <div className="space-y-0.5 col-span-2 pt-1 border-t border-violet-100/50 dark:border-violet-900/20 flex items-center justify-between text-[9px]">
              <span className="text-neutral-500 flex items-center gap-1 font-medium">
                <Calendar className="h-2.5 w-2.5 text-sky-500" /> Prazo Máx: <strong>{maxTermDays} dias</strong>
              </span>
              <span className="font-mono text-[8px] text-neutral-400">SE1 Protheus</span>
            </div>
          )}
        </div>

        {/* Governance Auto-Sync Status Tag */}
        <div className="flex items-center justify-between text-[9px] pt-0.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate">
              {syncStatus === "synced" ? "Sincronizado c/ Governança" : "Auto-Sincronizando..."}
            </span>
          </div>
          {data.config.connectedClauseNumber && (
            <span className="text-[8px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-1 py-0.5 rounded border border-violet-100 dark:border-violet-900/40">
              {data.config.connectedClauseNumber}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-7 h-7 bg-violet-500 border-2 border-white dark:border-neutral-900 rounded-full !top-[-12px] hover:scale-125 hover:ring-4 hover:ring-violet-500/40 transition-all cursor-pointer shadow-lg"
        title="Entrada da instrução"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-7 h-7 bg-violet-500 border-2 border-white dark:border-neutral-900 rounded-full !bottom-[-12px] hover:scale-125 hover:ring-4 hover:ring-violet-500/40 transition-all cursor-pointer shadow-lg"
        title="Saída: clique e arraste para ligar à próxima instrução"
      />
    </div>
  );
});

BusinessRuleNode.displayName = "BusinessRuleNode";


