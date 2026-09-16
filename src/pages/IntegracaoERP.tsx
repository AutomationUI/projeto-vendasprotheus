import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  RefreshCw, Zap, Search, Filter, CheckCircle2, XCircle, AlertCircle, Clock, Save, Pencil, Database,
  Cpu, Server, Globe, Link2, ShieldCheck, ArrowRight, Layers, Activity, Radio, Lock, ShieldAlert, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SupabaseSyncManager } from "@/components/SupabaseSyncManager";

type LogLevel = "success" | "error" | "info";
type ServiceStatus = "Online" | "Degradado";

interface Endpoint {
  method: "POST" | "GET";
  path: string;
  description: string;
}

interface LogEntry {
  id: string;
  message: string;
  source: string;
  payload: string;
  time: string;
  level: LogLevel;
}

interface ServiceInfo {
  name: string;
  status: ServiceStatus;
  latency: string;
}

const initialEndpoints: Endpoint[] = [
  { method: "POST", path: "/api/protheus/orders", description: "Envia pedidos bloqueados para o Protheus" },
  { method: "GET", path: "/api/protheus/stock", description: "Atualiza saldo de produtos em tempo real" },
  { method: "POST", path: "/api/protheus/credit", description: "Consulta limite e cobrança no financeiro" },
  { method: "GET", path: "/api/protheus/prices", description: "Importa atualizações de preços do ERP" },
];

const logs: LogEntry[] = [
  { id: "1", message: "Sincronização de Pedido PED-2024-001", source: "Protheus API", payload: "Payload v1.2", time: "10:42:01", level: "success" },
  { id: "2", message: "Atualização de Estoque (SKU: PROD001)", source: "WMS", payload: "Payload v1.2", time: "10:41:55", level: "success" },
  { id: "3", message: "Falha na consulta de limite de crédito (Timeout)", source: "Credit Service", payload: "Payload v1.2", time: "10:39:12", level: "error" },
  { id: "4", message: "Sincronização de Clientes (Delta)", source: "CRM", payload: "Payload v1.2", time: "10:00:00", level: "success" },
  { id: "5", message: "Health Check - API Gateway", source: "System", payload: "Payload v1.2", time: "09:55:00", level: "success" },
  { id: "6", message: "Atualização de Tabelas de Preço", source: "ERP Core", payload: "Payload v1.2", time: "09:00:00", level: "success" },
];

const services: ServiceInfo[] = [
  { name: "API Gateway", status: "Online", latency: "45ms" },
  { name: "DB Protheus", status: "Online", latency: "12ms" },
  { name: "Mensageria", status: "Online", latency: "3ms" },
  { name: "Preços", status: "Degradado", latency: "850ms" },
];

const multiErpConnectors = [
  {
    id: "protheus",
    name: "TOTVS Protheus v12",
    type: "REST / SOAP / ADVPL",
    description: "Conector nativo bidirecional para SA1 (Clientes), SB1/SB2 (Produtos/Estoque), SC5/SC6 (Pedidos) e SE1 (Financeiro).",
    status: "Conectado",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    icon: Server,
    defaultEndpoint: "https://erp.empresa.com.br/rest/api/v1",
    authType: "Bearer JWT + mTLS",
  },
  {
    id: "sap",
    name: "SAP Business One / S4HANA",
    type: "Service Layer / OData",
    description: "Sincronização de Business Partners (OCRD), Itens (OITM), Ordens de Venda (ORDR) e Condições de Pagamento.",
    status: "Disponível",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    icon: Globe,
    defaultEndpoint: "https://sap.empresa.com.br:50000/b1s/v1",
    authType: "Session Cookie / OAuth2",
  },
  {
    id: "omie",
    name: "Omie ERP",
    type: "REST API v1 / Webhooks",
    description: "Integração simplificada para PMEs, emissão de NFe, faturamento automático e gestão de contas correntes.",
    status: "Disponível",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
    icon: Zap,
    defaultEndpoint: "https://app.omie.com.br/api/v1/",
    authType: "App Key + App Secret",
  },
  {
    id: "senior",
    name: "Senior ERP (Sapiens)",
    type: "Webservices SOAP / REST",
    description: "Mapeamento comercial para indústria e agronegócio com gestão de tabelas de frete e alçadas de desconto.",
    status: "Disponível",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    icon: Link2,
    defaultEndpoint: "https://senior.empresa.com.br/g5-server/rest",
    authType: "Token Bearer",
  },
  {
    id: "rest",
    name: "API REST / Webhooks Universais",
    type: "JSON / HTTP Open API",
    description: "Conecte qualquer ERP proprietário, e-commerce (Shopify, VTEX, WooCommerce) ou plataforma financeira.",
    status: "Ativo",
    badgeColor: "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300",
    icon: Cpu,
    defaultEndpoint: "https://api.empresa.com.br/webhook",
    authType: "HMAC Signature",
  }
];

const methodColor: Record<string, string> = {
  POST: "text-info",
  GET: "text-success",
};

const levelIcon: Record<LogLevel, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  info: <AlertCircle className="h-4 w-4 text-info" />,
};

export default function IntegracaoERPPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [endpointList, setEndpointList] = useState<Endpoint[]>(initialEndpoints);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [logFilter, setLogFilter] = useState<"all" | "success" | "error">("all");
  const [logSearch, setLogSearch] = useState("");

  const [activeIntegrationTab, setActiveIntegrationTab] = useState<"standalone" | "supabase" | "protheus" | "multierp">("standalone");
  
  // Interactive testing state
  const [testingConnectorId, setTestingConnectorId] = useState<string | null>(null);
  const [testedLatencies, setTestedLatencies] = useState<Record<string, number>>({});
  const [configModalConnector, setConfigModalConnector] = useState<typeof multiErpConnectors[0] | null>(null);

  const filteredLogs = logs.filter((l) => {
    const matchFilter =
      logFilter === "all" ||
      (logFilter === "success" && l.level === "success") ||
      (logFilter === "error" && l.level === "error");
    const matchSearch =
      (l.message || "").toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.source || "").toLowerCase().includes(logSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  useEffect(() => {
    const tabQuery = searchParams.get("tab");
    if (location.pathname.includes("/sync") || tabQuery === "sync" || tabQuery === "supabase") {
      setActiveIntegrationTab("supabase");
    } else if (tabQuery === "protheus") {
      setActiveIntegrationTab("protheus");
    } else if (tabQuery === "multierp" || tabQuery === "connectors") {
      setActiveIntegrationTab("multierp");
    } else if (tabQuery === "logs") {
      setActiveIntegrationTab("standalone");
      setLogFilter("all");
    }
  }, [location.pathname, searchParams]);

  const handleTestPing = (connector: typeof multiErpConnectors[0]) => {
    setTestingConnectorId(connector.id);
    setTimeout(() => {
      const simulatedLatency = Math.floor(Math.random() * 40) + 12;
      setTestedLatencies((prev) => ({ ...prev, [connector.id]: simulatedLatency }));
      setTestingConnectorId(null);
      toast({
        title: `Conexão Estabelecida: ${connector.name}`,
        description: `Handshake SSL/TLS 1.3 bem-sucedido. Latência: ${simulatedLatency}ms. Status HTTP 200 OK.`,
      });
    }, 800);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Home &gt; Arquitetura & Conectores</p>
          <h1 className="text-2xl font-bold text-foreground">Conectividade, Banco & Multi-ERP</h1>
          <p className="text-sm text-muted-foreground">
            O CRM opera de forma 100% autônoma com banco de dados próprio e suporta conectores plug-and-play para TOTVS Protheus, SAP e APIs REST.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast({ title: "Sincronização iniciada", description: "Verificando integridade dos dados e conectores..." });
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Sincronizar Tudo
          </Button>
          <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 px-3 py-1.5 text-sm font-medium">
            ● CRM Autônomo & Multi-Conector
          </Badge>
        </div>
      </div>

      {/* Standalone Architecture Banner */}
      <Card className="border-blue-200/70 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-background dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-background overflow-hidden">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5" /> Arquitetura Independente
              </span>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                100% Autônomo (Sem Dependência Obrigatória de ERP)
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              O CRM possui banco de dados próprio, regras de comissão, simulador de margens, emissão de orçamentos e esteira de aprovação autônoma. Conexões com TOTVS Protheus, SAP ou Omie funcionam como <strong>conectores opcionais desacoplados</strong>, garantindo disponibilidade total mesmo quando o ERP estiver offline.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={activeIntegrationTab === "standalone" ? "default" : "outline"}
              onClick={() => setActiveIntegrationTab("standalone")}
              className="text-xs font-bold"
            >
              <Cpu className="mr-1.5 h-3.5 w-3.5" />
              Visão Autônoma
            </Button>
            <Button
              size="sm"
              variant={activeIntegrationTab === "multierp" ? "default" : "outline"}
              onClick={() => setActiveIntegrationTab("multierp")}
              className="text-xs font-bold"
            >
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Conectores ERP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Tab Switcher */}
      <Tabs value={activeIntegrationTab} onValueChange={(v) => setActiveIntegrationTab(v as any)} className="w-full">
        <TabsList className="grid w-full sm:w-[680px] grid-cols-4">
          <TabsTrigger value="standalone" className="gap-1.5 text-xs">
            <Cpu className="h-3.5 w-3.5 text-blue-500" />
            CRM Autônomo
          </TabsTrigger>
          <TabsTrigger value="supabase" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5 text-emerald-500" />
            Banco Próprio
          </TabsTrigger>
          <TabsTrigger value="protheus" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5 text-primary" />
            TOTVS Protheus
          </TabsTrigger>
          <TabsTrigger value="multierp" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5 text-indigo-500" />
            Outros ERPs
          </TabsTrigger>
        </TabsList>

        {/* Tab 0: CRM Autônomo */}
        <TabsContent value="standalone" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Database className="h-4 w-4" /> Base de Dados Nativa
              </div>
              <h3 className="text-sm font-bold text-foreground">Gestão 100% Local / Nuvem</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Leads, contas de clientes, catálogo de SKUs com fotos em 2 estágios, propostas e pedidos são gravados no banco relacional nativo sem depender de nenhum ERP.
              </p>
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                Ativo & Desacoplado
              </Badge>
            </Card>

            <Card className="p-4 space-y-2 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <ShieldCheck className="h-4 w-4" /> Alçadas & Governança
              </div>
              <h3 className="text-sm font-bold text-foreground">Esteira Comercial Independente</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Regras de alçada de desconto por vendedor, gerente e diretoria são validadas em tempo real pelo motor comercial do próprio CRM.
              </p>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Motor Nativo
              </Badge>
            </Card>

            <Card className="p-4 space-y-2 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Globe className="h-4 w-4" /> Conectores Sob Demanda
              </div>
              <h3 className="text-sm font-bold text-foreground">Plug-and-Play com Qualquer ERP</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ative conexões quando desejar: sincronize pedidos com Protheus, SAP, Omie ou Senior via fila assíncrona com tolerância a falhas.
              </p>
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Multi-ERP Ready
              </Badge>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 1: Supabase / Banco Próprio */}
        <TabsContent value="supabase" className="mt-6 space-y-6">
          <SupabaseSyncManager />
        </TabsContent>

        {/* Tab 2: Protheus REST API */}
        <TabsContent value="protheus" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Endpoints */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Endpoints de Integração Protheus
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {endpointList.map((ep, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${methodColor[ep.method]}`}>{ep.method}</span>
                        <div className="flex gap-1">
                          {editingIdx === i ? (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                              setEditingIdx(null);
                              toast({ title: "Endpoint salvo" });
                            }}>
                              <Save className="h-3 w-3 text-success" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingIdx(i)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {editingIdx === i ? (
                        <Input
                          className="font-mono text-sm"
                          value={ep.path}
                          onChange={(e) => {
                            const updated = [...endpointList];
                            updated[i] = { ...updated[i], path: e.target.value };
                            setEndpointList(updated);
                          }}
                        />
                      ) : (
                        <p className="text-sm font-mono text-foreground">{ep.path}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{ep.description}</p>
                      {i < endpointList.length - 1 && <div className="border-b pt-2" />}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Sincronizados</p>
                  <p className="text-xl font-bold text-foreground">142</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Falhas</p>
                  <p className="text-xl font-bold text-destructive">3</p>
                </Card>
                <Card className="p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Uptime</p>
                  <p className="text-xl font-bold text-emerald-600">99.8%</p>
                </Card>
              </div>

              {/* Service Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Status dos Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {services.map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{s.name}</span>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            s.status === "Online"
                              ? "bg-success/15 text-success border-success/30 text-xs"
                              : "bg-destructive/15 text-destructive border-destructive/30 text-xs"
                          }
                        >
                          {s.status}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.latency}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Logs */}
            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Tabs value={logFilter} onValueChange={(v) => setLogFilter(v as "all" | "success" | "error")}>
                      <TabsList>
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="success">Sucesso</TabsTrigger>
                        <TabsTrigger value="error">Erros</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar logs..."
                        className="pl-9"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 rounded-md px-3 py-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="mt-0.5">{levelIcon[log.level]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{log.message}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              📦 {log.source}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              ◎ {log.payload}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{log.time}</span>
                      </div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <div className="text-center text-muted-foreground py-8 text-sm">
                        Nenhum log encontrado
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Outros Conectores Multi-ERP */}
        <TabsContent value="multierp" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {multiErpConnectors.map((c) => {
              const Icon = c.icon;
              const latency = testedLatencies[c.id];
              const isTesting = testingConnectorId === c.id;

              return (
                <Card key={c.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{c.name}</h4>
                          <span className="text-[10px] font-mono text-muted-foreground">{c.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {latency !== undefined && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                            {latency}ms
                          </Badge>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badgeColor}`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {c.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1.5"
                      disabled={isTesting}
                      onClick={() => handleTestPing(c)}
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" /> Testando...
                        </>
                      ) : (
                        <>
                          <Activity className="h-3 w-3 text-emerald-600" /> Testar Ping
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      className="text-xs font-semibold h-8 gap-1 bg-primary hover:bg-primary/90"
                      onClick={() => setConfigModalConnector(c)}
                    >
                      Configurar Conector <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog for Connectors */}
      <Dialog open={!!configModalConnector} onOpenChange={(open) => !open && setConfigModalConnector(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Server className="h-5 w-5 text-primary" />
              Configurar Conector: {configModalConnector?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Parâmetros de autenticação e endpoints REST/SOAP para produção.
            </DialogDescription>
          </DialogHeader>

          {configModalConnector && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Endpoint Base URL</label>
                <Input defaultValue={configModalConnector.defaultEndpoint} className="font-mono text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Protocolo & Autenticação</label>
                <Input defaultValue={configModalConnector.authType} className="font-mono text-xs" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Chave de API / Token Secret</label>
                <Input type="password" value="sk_live_99f82a1bc77e380091" readOnly className="font-mono text-xs bg-muted" />
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-relaxed">
                  As credenciais são armazenadas de forma segura com criptografia AES-256 e transmitidas via canal mTLS exclusivo.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfigModalConnector(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 gap-1.5"
              onClick={() => {
                toast({ title: "Configurações salvas", description: `Parâmetros do conector ${configModalConnector?.name} atualizados com sucesso.` });
                setConfigModalConnector(null);
              }}
            >
              <Check className="h-3.5 w-3.5" /> Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}


