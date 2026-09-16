import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, AlertTriangle, RefreshCw, 
  Server, Zap, ShieldCheck, Database, 
  Clock, Activity, ChevronDown, Check, ExternalLink,
  Layers, Cpu, Radio, Sparkles, SlidersHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ErpTableHealth {
  table: string;
  name: string;
  records: number;
  lastSync: string;
  status: "synced" | "syncing" | "warning";
  latency: number;
}

const INITIAL_TABLES: ErpTableHealth[] = [
  { table: "SC5/SC6", name: "Pedidos de Venda & Itens", records: 1420, lastSync: "há 2 min", status: "synced", latency: 28 },
  { table: "SA1", name: "Cadastro de Clientes", records: 3840, lastSync: "há 5 min", status: "synced", latency: 19 },
  { table: "SB1/SB2", name: "Produtos & Saldos de Estoque", records: 12500, lastSync: "há 1 min", status: "synced", latency: 32 },
  { table: "SE1", name: "Contas a Receber & Crédito", records: 2190, lastSync: "há 4 min", status: "synced", latency: 24 },
  { table: "DA0/DA1", name: "Tabelas de Preços Comerciais", records: 8, lastSync: "há 12 min", status: "synced", latency: 15 },
];

export function ProtheusLiveStatus() {
  const [operationMode, setOperationMode] = useState<"standalone" | "protheus" | "sap" | "omie">("standalone");
  const [tables, setTables] = useState<ErpTableHealth[]>(INITIAL_TABLES);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pingLatency, setPingLatency] = useState(14);

  // Periodic subtle ping simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setPingLatency(Math.floor(operationMode === "standalone" ? 8 + Math.random() * 8 : 20 + Math.random() * 15));
    }, 15000);
    return () => clearInterval(interval);
  }, [operationMode]);

  const handleForceSync = () => {
    setIsSyncing(true);
    const targetName = operationMode === "standalone" ? "Banco Nativo Supabase Cloud" : operationMode.toUpperCase();
    toast.info(`Sincronizando base de dados com ${targetName}...`);

    setTimeout(() => {
      setTables(prev => prev.map(t => ({
        ...t,
        lastSync: "agora mesmo",
        status: "synced",
        latency: Math.floor(12 + Math.random() * 10)
      })));
      setIsSyncing(false);
      toast.success(`Sincronização concluída! Dados atualizados em modo ${operationMode === "standalone" ? "Autônomo" : "Integrado"}.`);
    }, 1400);
  };

  const handleModeChange = (mode: "standalone" | "protheus" | "sap" | "omie") => {
    setOperationMode(mode);
    if (mode === "standalone") {
      toast.success("Modo CRM Autônomo ativado: Operação 100% independente do Protheus com banco próprio nativo.");
    } else {
      toast.info(`Conector ${mode.toUpperCase()} selecionado: Sincronização e validações ativas.`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id="protheus-live-status-trigger"
          className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shadow-2xs ${
            operationMode === "standalone" 
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 hover:bg-blue-100/60"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60 hover:bg-emerald-100/60"
          }`}
          title="Modo de Operação e Conectividade do CRM"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              operationMode === "standalone" ? "bg-blue-400" : "bg-emerald-400"
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              operationMode === "standalone" ? "bg-blue-500" : "bg-emerald-500"
            }`}></span>
          </span>
          <span className="font-semibold">
            {operationMode === "standalone" ? "CRM Autônomo" : `ERP: ${operationMode.toUpperCase()}`}
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
            operationMode === "standalone" 
              ? "text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-neutral-900/70"
              : "text-emerald-600 dark:text-emerald-400 bg-white/70 dark:bg-neutral-900/70"
          }`}>
            {pingLatency}ms
          </span>
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-84 p-2.5 shadow-xl" id="protheus-live-status-dropdown">
        
        {/* Header */}
        <div className="flex items-center justify-between p-2 pb-1.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              operationMode === "standalone"
                ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
            }`}>
              {operationMode === "standalone" ? <Database className="h-4 w-4" /> : <Server className="h-4 w-4" />}
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground leading-none">
                {operationMode === "standalone" ? "CRM 100% Autônomo" : `Conector ${operationMode.toUpperCase()}`}
              </h4>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {operationMode === "standalone" ? "Banco Nativo Supabase / Local" : "Gateway REST Ativo"}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] font-bold ${
            operationMode === "standalone" 
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200"
          }`}>
            {operationMode === "standalone" ? "NATIVO" : "SINCRONIZADO"}
          </Badge>
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        {/* Modo de Operação Selector */}
        <div className="px-2 py-1.5">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
            Modo de Operação
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => handleModeChange("standalone")}
              className={`p-1.5 rounded-lg text-left text-xs border transition-all ${
                operationMode === "standalone"
                  ? "bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 font-bold"
                  : "bg-muted/30 border-transparent hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-blue-500" />
                <span>Autônomo (Nativo)</span>
              </div>
              <span className="text-[9px] block text-muted-foreground mt-0.5">Independente de ERP</span>
            </button>

            <button
              onClick={() => handleModeChange("protheus")}
              className={`p-1.5 rounded-lg text-left text-xs border transition-all ${
                operationMode === "protheus"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold"
                  : "bg-muted/30 border-transparent hover:bg-muted/60 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-emerald-500" />
                <span>TOTVS Protheus</span>
              </div>
              <span className="text-[9px] block text-muted-foreground mt-0.5">Conector REST/SOAP</span>
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1.5" />

        {/* Tables Health */}
        <div className="px-2 py-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {operationMode === "standalone" ? "Entidades de Dados Nativas" : "Tabelas Integradas"}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">5/5 ativas</span>
          </div>

          <div className="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-0.5">
            {tables.map((t) => (
              <div 
                key={t.table} 
                className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-xs hover:bg-muted/70 transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                    {t.table}
                  </span>
                  <div className="truncate">
                    <span className="text-foreground font-medium text-[11px] truncate block">{t.name}</span>
                    <span className="text-[9px] text-muted-foreground">{t.records.toLocaleString()} registros • {t.lastSync}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-mono text-muted-foreground">{t.latency}ms</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="my-2" />

        <div className="p-1">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Banco & Cache"}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

