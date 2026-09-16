import { useState, useEffect, useCallback, useRef } from "react";
import { initialProductionBatches } from "@/lib/mock-production";

/* ─── Types ─── */
export type ProductionStatus =
  | "Mistura"
  | "Moldagem"
  | "Prensado"
  | "Secagem"
  | "Aguardando Queima"
  | "Em Queima"
  | "Queimado"
  | "Acabamento"
  | "Inspeção"
  | "Expedição";

export interface ProductionBatch {
  id: string;
  lote: string;
  produto: string;
  tipo: string;
  granulacao: string;
  quantidade: number;
  unidade: string;
  status: ProductionStatus;
  inicio: string;
  previsao: string;
  operador: string;
  prioridade: "Alta" | "Média" | "Baixa";
  observacoes?: string;
}

export type WsEvent =
  | { type: "initial"; data: ProductionBatch[] }
  | { type: "update"; data: ProductionBatch }
  | { type: "create"; data: ProductionBatch }
  | { type: "remove"; data: { id: string } }
  | { type: "pong"; timestamp?: number };

function getEventHubWsUrl(): string {
  if (import.meta.env.VITE_EVENT_HUB_WS_URL) {
    return import.meta.env.VITE_EVENT_HUB_WS_URL;
  }
  if (typeof window === "undefined") return "wss://websocket-full.internal/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

/* ─── Hook ─── */
export function useProductionWebSocket() {
  const [batches, setBatches] = useState<ProductionBatch[]>(initialProductionBatches || []);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMessage = useCallback((event: any) => {
    // Handle Unified Event Hub broadcast format or direct payloads
    const payload = event.payload || event.data || event;
    const type = event.eventName || event.type;

    switch (type) {
      case "producao.inicial":
      case "initial":
        if (Array.isArray(payload) && payload.length > 0) {
          setBatches(payload);
        }
        break;
      case "producao.atualizada":
      case "producao.criada":
      case "update":
      case "create":
        if (payload && payload.id) {
          setBatches((prev) => {
            const idx = prev.findIndex((b) => b.id === payload.id);
            if (idx === -1) return [payload, ...prev];
            const next = [...prev];
            next[idx] = payload;
            return next;
          });
        }
        break;
      case "producao.removida":
      case "remove":
        if (payload && payload.id) {
          setBatches((prev) => prev.filter((b) => b.id !== payload.id));
        }
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getEventHubWsUrl();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectAttempts.current = 0;

        // Subscribe to producao room on Event Hub
        ws.send(
          JSON.stringify({
            action: "subscribe",
            rooms: ["producao", "lotes"],
            tenantId: import.meta.env.VITE_EVENT_HUB_TENANT_ID || "vendasprotheus-saas",
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleMessage(event);
        } catch (err) {
          console.debug("[Event Hub WS] Recebeu mensagem:", e.data);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10_000);
        reconnectAttempts.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setError("Não foi possível conectar ao Event Hub central em tempo real.");
      };
    } catch {
      setConnected(false);
    }
  }, [handleMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingInterval.current) clearInterval(pingInterval.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  // ─── Event Producer Mutations via HTTP POST ───
  const updateBatch = useCallback((updated: ProductionBatch) => {
    setBatches((prev) => {
      const idx = prev.findIndex((b) => b.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const next = [...prev];
      next[idx] = updated;
      return next;
    });

    // Send HTTP event to backend, which publishes to Event Hub
    fetch("/api/v1/omnichannel/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "producao.atualizada",
        rooms: ["producao"],
        payload: updated,
      }),
    }).catch(() => {
      // Graceful fallback
    });
  }, []);

  const createBatch = useCallback((newBatch: ProductionBatch) => {
    setBatches((prev) => [newBatch, ...prev]);
    fetch("/api/v1/omnichannel/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "producao.criada",
        rooms: ["producao"],
        payload: newBatch,
      }),
    }).catch(() => {});
  }, []);

  const deleteBatch = useCallback((id: string) => {
    setBatches((prev) => prev.filter((b) => b.id !== id));
    fetch("/api/v1/omnichannel/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "producao.removida",
        rooms: ["producao"],
        payload: { id },
      }),
    }).catch(() => {});
  }, []);

  return { 
    batches, 
    connected, 
    error,
    updateBatch,
    createBatch,
    deleteBatch,
  };
}
