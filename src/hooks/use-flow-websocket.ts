import { useState, useEffect, useCallback, useRef } from "react";

export interface FlowUser {
  id: string;
  name: string;
  activeFlow?: string;
}

export interface FlowStepEvent {
  flowId: string;
  step: number;
  label: string;
  outcome: string;
  time: string;
}

function getEventHubWsUrl(): string {
  if (import.meta.env.VITE_EVENT_HUB_WS_URL) {
    return import.meta.env.VITE_EVENT_HUB_WS_URL;
  }
  if (typeof window === "undefined") return "wss://websocket-full.internal/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useFlowWebSocket(activeFlowId?: string, currentUser?: { id: string; name: string }) {
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<FlowUser[]>([]);
  const [liveSteps, setLiveSteps] = useState<FlowStepEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(getEventHubWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(
          JSON.stringify({
            action: "subscribe",
            rooms: ["flows", activeFlowId ? `flow:${activeFlowId}` : "flow:all"],
            tenantId: import.meta.env.VITE_EVENT_HUB_TENANT_ID || "vendasprotheus-saas",
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const payload = msg.payload || msg.data;
          const eventName = msg.eventName || msg.type;

          if (eventName === "presence.update" && payload?.users) {
            setOnlineUsers(payload.users);
          } else if ((eventName === "flow.step" || eventName === "flow:step") && payload) {
            setLiveSteps((prev) => [...prev.slice(-19), payload]);
          }
        } catch {
          // message parse handled
        }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch {
      setConnected(false);
    }
  }, [activeFlowId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  const broadcastStep = useCallback((step: FlowStepEvent) => {
    setLiveSteps((prev) => [...prev.slice(-19), step]);
    fetch("/api/v1/omnichannel/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "flow.step",
        rooms: ["flows", `flow:${step.flowId}`],
        payload: step,
      }),
    }).catch(() => {});
  }, []);

  return {
    connected,
    onlineUsers,
    liveSteps,
    broadcastStep,
  };
}
