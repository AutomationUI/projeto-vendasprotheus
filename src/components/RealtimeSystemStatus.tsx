import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Database,
  MessageSquare,
  Radio,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Clock,
  Pulse,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useSystemStatusWebSocket,
  SubServiceStatus,
} from "@/hooks/use-system-status-websocket";

export function RealtimeSystemStatus() {
  const {
    connectionState,
    statusData,
    statusLogs,
    pingServer,
    toggleSimulatedDegradation,
  } = useSystemStatusWebSocket();

  const [isExpanded, setIsExpanded] = useState(false);

  const getOverallStatusBadge = () => {
    switch (statusData.status) {
      case "healthy":
        return {
          label: "100% Operacional",
          color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
          dotBg: "bg-emerald-500",
        };
      case "warning":
      case "degraded":
        return {
          label: "Atenção / Oscilação",
          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
          icon: AlertTriangle,
          dotBg: "bg-amber-500",
        };
      default:
        return {
          label: "Indisponível",
          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
          icon: XCircle,
          dotBg: "bg-rose-500",
        };
    }
  };

  const getWsBadge = () => {
    switch (connectionState) {
      case "connected":
        return {
          text: "WebSocket Conectado",
          color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800",
          icon: Wifi,
          pulsing: true,
        };
      case "connecting":
      case "reconnecting":
        return {
          text: "Reconectando WS...",
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800",
          icon: RefreshCw,
          pulsing: false,
        };
      default:
        return {
          text: "Modo Local / Standby",
          color: "text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
          icon: WifiOff,
          pulsing: false,
        };
    }
  };

  const overall = getOverallStatusBadge();
  const wsBadge = getWsBadge();
  const OverallIcon = overall.icon;
  const WsIcon = wsBadge.icon;

  const serviceItems: { name: string; key: keyof SubServiceStatus; icon: any }[] = [
    { name: "TOTVS Protheus REST API", key: "protheusApi", icon: Server },
    { name: "Banco Próprio (Postgres)", key: "localDatabase", icon: Database },
    { name: "Gateway WhatsApp Engine", key: "whatsappGateway", icon: MessageSquare },
    { name: "Event Hub (EventProducer)", key: "eventHub", icon: Radio },
    { name: "Conector Bancário (CNAB)", key: "bankConnector", icon: Building2 },
  ];

  return (
    <Card className="border-emerald-500/20 dark:border-emerald-500/10 bg-card shadow-sm overflow-hidden">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className={`p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400`}>
              <Activity className="h-5 w-5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${overall.dotBg} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${overall.dotBg}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold text-foreground">
                Saúde do Sistema & Eventos WS
              </CardTitle>
              <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${overall.color}`}>
                <OverallIcon className="h-3 w-3 mr-1" />
                {overall.label} ({statusData.healthScore}%)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Escutando barramento <code className="text-[11px] font-mono text-primary font-semibold">sistema.status</code> em tempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Latency & WS Status */}
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1.5 ${wsBadge.color}`}>
              <WsIcon className={`h-3.5 w-3.5 ${wsBadge.pulsing ? "animate-spin-slow" : ""}`} />
              {wsBadge.text}
            </span>

            <span className="text-xs font-mono font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground flex items-center gap-1 border border-border/50">
              <Zap className="h-3 w-3 text-amber-500" />
              {statusData.latencyMs}ms
            </span>
          </div>

          <button
            onClick={pingServer}
            title="Sincronizar Status Via WS"
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 text-xs font-medium px-2"
          >
            <span>{isExpanded ? "Ocultar" : "Detalhes"}</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Compact Micro-services bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1">
          {serviceItems.map((s) => {
            const st = statusData.services[s.key];
            const SIcon = s.icon;
            const isOnline = st === "online";
            const isDegraded = st === "degraded";

            return (
              <div
                key={s.key}
                className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50 text-xs"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <SIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate text-foreground/90">{s.name.split(" ")[0]}</span>
                </div>
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    isOnline
                      ? "bg-emerald-500"
                      : isDegraded
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  title={`${s.name}: ${st}`}
                />
              </div>
            );
          })}
        </div>

        {/* Expanded Telemetry & Stream Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-3 pt-3 border-t border-border/60 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Services Full Health Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Server className="h-3.5 w-3.5" /> Matriz de Micro-Serviços
                  </h4>
                  <div className="space-y-1.5">
                    {serviceItems.map((s) => {
                      const st = statusData.services[s.key];
                      const SIcon = s.icon;

                      return (
                        <div
                          key={s.key}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-card border border-border/60"
                        >
                          <div className="flex items-center gap-2">
                            <SIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-semibold text-foreground">{s.name}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              st === "online"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : st === "degraded"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            ● {st}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Stream Log */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Stream de Eventos ('sistema.status')
                    </h4>
                    <button
                      onClick={toggleSimulatedDegradation}
                      className="text-[11px] text-primary hover:underline font-semibold"
                    >
                      Simular Oscilação
                    </button>
                  </div>

                  <div className="bg-neutral-950 text-neutral-200 rounded-xl p-2.5 font-mono text-[11px] max-h-44 overflow-y-auto space-y-1.5 border border-neutral-800">
                    {statusLogs.length === 0 ? (
                      <p className="text-neutral-500 italic text-center py-4">Aguardando eventos WS...</p>
                    ) : (
                      statusLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between py-1 border-b border-neutral-800/60 last:border-0"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400">⚡ [{log.eventName}]</span>
                            <span className="text-neutral-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-400">{log.latencyMs}ms</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                log.status === "healthy"
                                  ? "bg-emerald-900/60 text-emerald-300"
                                  : "bg-amber-900/60 text-amber-300"
                              }`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
