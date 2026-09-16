import { useState, useEffect, useRef, useCallback } from "react";

export interface SubServiceStatus {
  protheusApi: "online" | "degraded" | "offline";
  localDatabase: "online" | "degraded" | "offline";
  whatsappGateway: "online" | "degraded" | "offline";
  eventHub: "online" | "degraded" | "offline";
  bankConnector: "online" | "degraded" | "offline";
}

export interface SystemStatusData {
  status: "healthy" | "warning" | "degraded";
  healthScore: number;
  uptimeSeconds: number;
  latencyMs: number;
  services: SubServiceStatus;
  activeConnections: number;
  timestamp: string;
}

export interface StatusLogEvent {
  id: string;
  eventName: "sistema.status";
  status: "healthy" | "warning" | "degraded";
  healthScore: number;
  latencyMs: number;
  timestamp: string;
  isSimulated?: boolean;
}

export type ConnectionState = "connected" | "connecting" | "reconnecting" | "offline";

export function useSystemStatusWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [statusData, setStatusData] = useState<SystemStatusData>({
    status: "healthy",
    healthScore: 100,
    uptimeSeconds: 3600,
    latencyMs: 12,
    services: {
      protheusApi: "online",
      localDatabase: "online",
      whatsappGateway: "online",
      eventHub: "online",
      bankConnector: "online",
    },
    activeConnections: 1,
    timestamp: new Date().toISOString(),
  });
  const [statusLogs, setStatusLogs] = useState<StatusLogEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((data: SystemStatusData, isSimulated = false) => {
    const logItem: StatusLogEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      eventName: "sistema.status",
      status: data.status,
      healthScore: data.healthScore,
      latencyMs: data.latencyMs,
      timestamp: data.timestamp || new Date().toISOString(),
      isSimulated,
    };
    setStatusLogs((prev) => [logItem, ...prev.slice(0, 19)]);
  }, []);

  const connect = useCallback(() => {
    try {
      const envWsUrl = import.meta.env.VITE_EVENT_HUB_WS_URL;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = envWsUrl || `${protocol}//${host}/ws`;

      setConnectionState("connecting");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("connected");
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === "sistema.status" && parsed.data) {
            setStatusData(parsed.data);
            addLog(parsed.data, false);
          }
        } catch {
          // ignore invalid messages
        }
      };

      ws.onerror = () => {
        setConnectionState("reconnecting");
      };

      ws.onclose = () => {
        setConnectionState("offline");
        // Attempt reconnection after 3 seconds
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch {
      setConnectionState("offline");
    }
  }, [addLog]);

  useEffect(() => {
    connect();

    // Fallback heartbeat timer in case WebSocket cannot be established in sandboxed browser frame
    fallbackIntervalRef.current = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const simulatedData: SystemStatusData = {
          status: "healthy",
          healthScore: 100,
          uptimeSeconds: Math.floor(performance.now() / 1000) + 1200,
          latencyMs: Math.floor(10 + Math.random() * 8),
          services: {
            protheusApi: "online",
            localDatabase: "online",
            whatsappGateway: "online",
            eventHub: "online",
            bankConnector: "online",
          },
          activeConnections: 1,
          timestamp: new Date().toISOString(),
        };
        setStatusData(simulatedData);
        addLog(simulatedData, true);
      }
    }, 5000);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [connect, addLog]);

  const pingServer = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "ping" }));
      wsRef.current.send(JSON.stringify({ action: "get_status" }));
    } else {
      // Re-connect or trigger fallback update
      connect();
    }
  }, [connect]);

  const toggleSimulatedDegradation = useCallback(() => {
    setStatusData((prev) => {
      const isDegraded = prev.status === "degraded";
      const newStatus: SystemStatusData = {
        ...prev,
        status: isDegraded ? "healthy" : "degraded",
        healthScore: isDegraded ? 100 : 78,
        latencyMs: isDegraded ? 12 : 145,
        services: {
          ...prev.services,
          protheusApi: isDegraded ? "online" : "degraded",
        },
        timestamp: new Date().toISOString(),
      };
      addLog(newStatus, true);
      return newStatus;
    });
  }, [addLog]);

  return {
    connectionState,
    statusData,
    statusLogs,
    pingServer,
    toggleSimulatedDegradation,
  };
}
