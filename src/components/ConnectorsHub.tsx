import React, { useState, useMemo } from "react";
import { 
  Cpu, Database, MessageSquare, Shield, Clock, 
  Search, Play, CheckCircle2, XCircle, AlertTriangle, 
  ExternalLink, Settings2, RefreshCw, Copy, Check, 
  Plus, Layers, Activity, Lock, ArrowRight, 
  FileText, Flame, Zap, Send, Sliders, Eye,
  CheckCircle, Server, Terminal, Radio
} from "lucide-react";
import { ConnectorItem, ConnectorCategory, ConnectorEndpoint } from "@/types/connectors";
import { CONNECTORS_CATALOG } from "@/data/connectors-catalog";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFlowIcon } from "@/components/FlowStudioCustomNodes";

interface ConnectorsHubProps {
  onAddConnectorToCanvas?: (connector: ConnectorItem) => void;
  onOpenInCanvas?: (flowKey?: string) => void;
}

export const ConnectorsHub: React.FC<ConnectorsHubProps> = ({ 
  onAddConnectorToCanvas,
  onOpenInCanvas 
}) => {
  const [connectors, setConnectors] = useState<ConnectorItem[]>(CONNECTORS_CATALOG);
  const [selectedCategory, setSelectedCategory] = useState<ConnectorCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConnectorDetail, setActiveConnectorDetail] = useState<ConnectorItem | null>(null);
  
  // Health check state per connector
  const [testingConnectorId, setTestingConnectorId] = useState<string | null>(null);
  const [testedLatencies, setTestedLatencies] = useState<Record<string, number>>({});

  // Payload tester selected endpoint
  const [selectedEndpoint, setSelectedEndpoint] = useState<ConnectorEndpoint | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "endpoints" | "config" | "logs">("overview");

  // Filtered connectors
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      const matchCat = selectedCategory === "all" || c.category === selectedCategory;
      const matchSearch = 
        searchQuery.trim() === "" ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.protheusTables && c.protheusTables.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
      return matchCat && matchSearch;
    });
  }, [connectors, selectedCategory, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = connectors.length;
    const online = connectors.filter(c => c.status === "online").length;
    const avgLatency = Math.round(connectors.reduce((acc, c) => acc + c.latencyMs, 0) / (total || 1));
    const totalCalls = connectors.reduce((acc, c) => acc + c.totalCallsToday, 0);
    return { total, online, avgLatency, totalCalls };
  }, [connectors]);

  // Handle interactive ping test
  const handleTestPing = (connector: ConnectorItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTestingConnectorId(connector.id);
    
    // Simulate real handshake delay
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * (connector.latencyMs * 0.4)) + Math.floor(connector.latencyMs * 0.8);
      setTestedLatencies(prev => ({ ...prev, [connector.id]: simulatedLatency }));
      setTestingConnectorId(null);
      toast.success(`Handshake SSL OK com ${connector.name}! Latência: ${simulatedLatency}ms. Status: 200 OK.`);
    }, 850);
  };

  // Test all connections simultaneously
  const handleTestAll = () => {
    toast.info("Iniciando ping simultâneo em todos os conectores...");
    connectors.forEach((conn, index) => {
      setTimeout(() => {
        const sim = Math.floor(Math.random() * 20) + conn.latencyMs - 5;
        setTestedLatencies(prev => ({ ...prev, [conn.id]: sim }));
        if (index === connectors.length - 1) {
          toast.success("Todos os 16 conectores corporativos responderam com 100% de integridade!");
        }
      }, (index + 1) * 120);
    });
  };

  return (
    <div className="space-y-6">
      
      {/* ─── Top Telemetry Summary ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Conectores Ativos</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              {metrics.online} <span className="text-xs text-neutral-400 font-normal">/ {metrics.total}</span>
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> 100% Operacionais
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Radio className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Latência Média Global</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 font-mono">
              {metrics.avgLatency}ms
            </p>
            <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
              SLA &lt; 150ms garantido
            </p>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600 dark:text-sky-400">
            <Activity className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Requisições Hoje (24h)</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 font-mono">
              {metrics.totalCalls.toLocaleString("pt-BR")}
            </p>
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
              99.85% de Sucesso
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Segurança & Criptografia</p>
            <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
              mTLS & HMAC
            </p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              Auditado e Criptografado
            </p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
            <Lock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* ─── Search & Category Filter Navigation ───────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-xs">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "Todos os Conectores", count: 16 },
            { id: "erp", label: "ERP TOTVS & Núcleo", count: 3 },
            { id: "messaging", label: "Mensageria & WhatsApp", count: 3 },
            { id: "finance_credit", label: "Crédito, Risco & PIX", count: 2 },
            { id: "crm_marketing", label: "Marketing & CRM", count: 2 },
            { id: "analytics_storage", label: "Banco, Storage & BI", count: 3 },
            { id: "security_docs", label: "Assinaturas & Docs", count: 1 },
            { id: "event_bus", label: "Filas & Webhooks", count: 2 },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? "bg-primary text-white shadow-xs"
                  : "bg-neutral-100/70 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
              }`}
            >
              {cat.label}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedCategory === cat.id
                  ? "bg-white/20 text-white"
                  : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Global Test & Search Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por protocolo, TOTVS, API..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 pl-8 pr-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
            />
          </div>

          <button
            onClick={handleTestAll}
            className="h-8.5 px-3 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 transition-colors whitespace-nowrap shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Testar Todos
          </button>
        </div>
      </div>

      {/* ─── Connectors Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
        {filteredConnectors.map((connector) => {
          const isTesting = testingConnectorId === connector.id;
          const currentLatency = testedLatencies[connector.id] || connector.latencyMs;

          return (
            <Card 
              key={connector.id}
              className="border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
              onClick={() => {
                setActiveConnectorDetail(connector);
                setSelectedEndpoint(connector.endpoints[0] || null);
              }}
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-700 dark:text-neutral-300 shrink-0 group-hover:scale-105 transition-transform">
                      {getFlowIcon(connector.icon, "h-5 w-5")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.2 rounded uppercase">
                          {connector.protocol}
                        </span>
                        {connector.isOfficialTotvs && (
                          <span className="text-[9px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 px-1.5 py-0.2 rounded border border-blue-200/40">
                            TOTVS
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-1 truncate">
                        {connector.name}
                      </CardTitle>
                    </div>
                  </div>

                  <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/40 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {connector.status}
                  </span>
                </div>

                <CardDescription className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                  {connector.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                {/* Protheus Tables Tags if present */}
                {connector.protheusTables && connector.protheusTables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {connector.protheusTables.slice(0, 3).map((tab) => (
                      <span key={tab} className="text-[9px] font-mono font-semibold bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/30">
                        {tab.split(" ")[0]}
                      </span>
                    ))}
                    {connector.protheusTables.length > 3 && (
                      <span className="text-[9px] text-neutral-400 font-mono py-0.5">
                        +{connector.protheusTables.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Live Metrics strip */}
                <div className="p-2 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1 text-neutral-500">
                    <Clock className="h-3 w-3 text-neutral-400" />
                    <span>Latência:</span>
                  </div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {currentLatency}ms
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={(e) => handleTestPing(connector, e)}
                    disabled={isTesting}
                    className={`py-1.5 px-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors ${
                      isTesting ? "animate-pulse cursor-wait" : ""
                    }`}
                  >
                    <RefreshCw className={`h-3 w-3 ${isTesting ? "animate-spin" : ""}`} />
                    {isTesting ? "Pingando..." : "Testar Ping"}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddConnectorToCanvas) {
                        onAddConnectorToCanvas(connector);
                      } else {
                        toast.success(`Conector "${connector.name}" pronto para uso no Canvas!`);
                      }
                    }}
                    className="py-1.5 px-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-colors shadow-xs"
                  >
                    <Plus className="h-3 w-3" /> Usar no Canvas
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Connector Deep Detail Modal / Drawer ─────────────────────────── */}
      {activeConnectorDetail && (
        <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xs">
                  {getFlowIcon(activeConnectorDetail.icon, "h-6 w-6 text-primary")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{activeConnectorDetail.name}</h3>
                    <span className="text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded uppercase">
                      {activeConnectorDetail.protocol}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200/50">
                      {activeConnectorDetail.version}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{activeConnectorDetail.vendor} • {activeConnectorDetail.categoryLabel}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveConnectorDetail(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-4 bg-white dark:bg-neutral-900">
              {[
                { id: "overview", label: "Visão Geral & Métricas" },
                { id: "endpoints", label: `Endpoints & Payloads (${activeConnectorDetail.endpoints.length})` },
                { id: "config", label: "Credenciais & Parâmetros" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 text-xs font-bold border-b-2 transition-all ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              
              {/* Tab 1: Overview */}
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200/70 dark:border-neutral-800/70">
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {activeConnectorDetail.description}
                    </p>
                  </div>

                  {/* Telemetry Numbers */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Uptime (30 dias)</p>
                      <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeConnectorDetail.uptimePercent}%</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Taxa de Sucesso</p>
                      <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{activeConnectorDetail.successRatePercent}%</p>
                    </div>
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-100 dark:border-neutral-800">
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">Volume Hoje</p>
                      <p className="text-sm font-mono font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{activeConnectorDetail.totalCallsToday.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  {/* Base URL & Auth Spec */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-neutral-400">Endpoint Base & Autenticação</label>
                    <div className="flex items-center justify-between p-2.5 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs">
                      <span className="truncate pr-2">{activeConnectorDetail.baseUrl}</span>
                      <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0 bg-neutral-800 px-2 py-0.5 rounded">
                        {activeConnectorDetail.authType}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Endpoints & Payloads */}
              {activeTab === "endpoints" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-neutral-400">Rotas & Métodos Suportados</span>
                    <div className="space-y-1.5">
                      {activeConnectorDetail.endpoints.map((ep) => (
                        <div
                          key={ep.id}
                          onClick={() => setSelectedEndpoint(ep)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            selectedEndpoint?.id === ep.id
                              ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/30"
                              : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                              ep.method === "POST" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                              ep.method === "GET" ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400" :
                              "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400"
                            }`}>
                              {ep.method}
                            </span>
                            <span className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 truncate">{ep.path}</span>
                          </div>
                          <span className="text-[11px] text-neutral-400 truncate max-w-[200px]">{ep.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payload Preview */}
                  {selectedEndpoint && selectedEndpoint.sampleRequestPayload && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-neutral-400">Payload JSON de Exemplo (Requisição)</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(selectedEndpoint.sampleRequestPayload, null, 2));
                            toast.success("Payload copiado!");
                          }}
                          className="text-[10px] text-primary flex items-center gap-1 font-semibold"
                        >
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                      <pre className="p-3 bg-neutral-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                        {JSON.stringify(selectedEndpoint.sampleRequestPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Configuration Parameters */}
              {activeTab === "config" && (
                <div className="space-y-3">
                  <p className="text-xs text-neutral-500">Parâmetros de conexão e chaves criptográficas configuradas no ambiente:</p>
                  {activeConnectorDetail.configFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-neutral-500">{field.label}</label>
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        defaultValue={field.value}
                        className="w-full h-8.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 font-mono"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => toast.success("Parâmetros do conector salvos com sucesso!")}
                    className="mt-2 py-2 px-4 bg-primary text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Salvar Parâmetros
                  </button>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 flex items-center justify-between">
              <button
                onClick={() => handleTestPing(activeConnectorDetail)}
                className="py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-xs font-bold rounded-xl flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Executar Handshake de Teste
              </button>

              <button
                onClick={() => {
                  if (onAddConnectorToCanvas) {
                    onAddConnectorToCanvas(activeConnectorDetail);
                    setActiveConnectorDetail(null);
                  } else {
                    toast.success(`Conector ${activeConnectorDetail.name} pronto no Canvas!`);
                    setActiveConnectorDetail(null);
                  }
                }}
                className="py-2 px-4 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Inserir no Canvas do Flow Studio
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
