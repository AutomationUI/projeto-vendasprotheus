import { useState, useEffect, useCallback, useRef } from "react";
import type { OmnichannelThread, OmnichannelMessage, OmnichannelNote, OmnichannelEventName, OmnichannelEventPayload } from "@/types/governance";

/* ─── Types ─── */

export type ThreadStatus = OmnichannelThread["status"];
export type ThreadSource = OmnichannelThread["source"];
export type ThreadPriority = OmnichannelThread["priority"];
export type MessageRole = OmnichannelMessage["role"];
export type MessageType = OmnichannelMessage["messageType"];

export interface UseOmnichannelWebSocketReturn {
  threads: OmnichannelThread[];
  messages: Map<string, OmnichannelMessage[]>; // keyed by threadId
  notes: Map<string, OmnichannelNote[]>; // keyed by threadId
  connected: boolean;
  error: string | null;
  activeThreadId: string | null;
  setActiveThread: (threadId: string | null) => void;
  // Event producer mutations via HTTP POST
  createThread: (thread: Omit<OmnichannelThread, "id" | "createdAt" | "updatedAt">) => Promise<OmnichannelThread | null>;
  updateThreadStatus: (threadId: string, status: ThreadStatus, assignedTo?: string) => Promise<OmnichannelThread | null>;
  sendMessage: (threadId: string, content: string, messageType?: MessageType, externalMessageId?: string) => Promise<OmnichannelMessage | null>;
  addNote: (threadId: string, authorId: string, text: string) => Promise<OmnichannelNote | null>;
}

function getEventHubWsUrl(): string {
  if (import.meta.env.VITE_EVENT_HUB_WS_URL) {
    return import.meta.env.VITE_EVENT_HUB_WS_URL;
  }
  if (typeof window === "undefined") return "wss://websocket-full.internal/ws";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

const TENANT_ID = import.meta.env.VITE_EVENT_HUB_TENANT_ID || "vendasprotheus-saas";

/* ─── Hook ─── */
export function useOmnichannelWebSocket(organizationId: string): UseOmnichannelWebSocketReturn {
  const [threads, setThreads] = useState<OmnichannelThread[]>([]);
  const [messages, setMessages] = useState<Map<string, OmnichannelMessage[]>>(new Map());
  const [notes, setNotes] = useState<Map<string, OmnichannelNote[]>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeThreadId, setActiveThread] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageQueue = useRef<OmnichannelEventPayload[]>([]);

  const handleMessage = useCallback((event: any) => {
    // Handle Unified Event Hub broadcast format or direct payloads
    const payload = event.payload || event.data || event;
    const type = event.eventName || event.type;

    switch (type as OmnichannelEventName) {
      case "omnichannel.thread.created":
      case "omnichannel.thread.updated":
        if (payload.thread) {
          const thread = payload.thread as OmnichannelThread;
          setThreads((prev) => {
            const idx = prev.findIndex((t) => t.id === thread.id);
            if (idx === -1) return [thread, ...prev];
            const next = [...prev];
            next[idx] = thread;
            return next;
          });
        }
        break;

      case "omnichannel.thread.closed":
        if (payload.thread) {
          const thread = payload.thread as OmnichannelThread;
          setThreads((prev) => {
            const idx = prev.findIndex((t) => t.id === thread.id);
            if (idx === -1) return [thread, ...prev];
            const next = [...prev];
            next[idx] = thread;
            return next;
          });
        }
        break;

      case "omnichannel.message.received":
      case "omnichannel.message.sent":
        if (payload.message && payload.thread) {
          const message = payload.message as OmnichannelMessage;
          const thread = payload.thread as OmnichannelThread;

          // Update thread's lastMessageAt
          setThreads((prev) => {
            const idx = prev.findIndex((t) => t.id === thread.id);
            if (idx === -1) return [thread, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], lastMessageAt: thread.lastMessageAt };
            return next;
          });

          // Add message to thread's message list
          setMessages((prev) => {
            const threadMessages = prev.get(thread.id) || [];
            const exists = threadMessages.some((m) => m.id === message.id);
            if (exists) return prev;
            const next = new Map(prev);
            next.set(thread.id, [...threadMessages, message]);
            return next;
          });
        }
        break;

      case "omnichannel.note.added":
        if (payload.note && payload.threadId) {
          const note = payload.note as OmnichannelNote;
          const threadId = payload.threadId as string;

          setNotes((prev) => {
            const threadNotes = prev.get(threadId) || [];
            const exists = threadNotes.some((n) => n.id === note.id);
            if (exists) return prev;
            const next = new Map(prev);
            next.set(threadId, [...threadNotes, note]);
            return next;
          });
        }
        break;

      case "omnichannel.sla.alerted":
      case "omnichannel.sla.exceeded":
        if (payload.threadId) {
          // Could update thread with SLA status or show notification
          console.debug("[Omnichannel WS] SLA event:", type, payload);
        }
        break;

      case "initial":
        // Bulk initial load from server
        if (payload.threads) {
          setThreads(payload.threads);
        }
        if (payload.messages) {
          const msgMap = new Map<string, OmnichannelMessage[]>();
          for (const [threadId, msgs] of Object.entries(payload.messages)) {
            msgMap.set(threadId, msgs as OmnichannelMessage[]);
          }
          setMessages(msgMap);
        }
        if (payload.notes) {
          const notesMap = new Map<string, OmnichannelNote[]>();
          for (const [threadId, nts] of Object.entries(payload.notes)) {
            notesMap.set(threadId, nts as OmnichannelNote[]);
          }
          setNotes(notesMap);
        }
        break;

      default:
        console.debug("[Omnichannel WS] Unhandled event:", type, payload);
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

        // Subscribe to omnichannel room on Event Hub
        ws.send(
          JSON.stringify({
            action: "subscribe",
            rooms: ["omnichannel"],
            tenantId: TENANT_ID,
          })
        );

        // Request initial data
        ws.send(
          JSON.stringify({
            action: "fetch",
            resource: "omnichannel",
            organizationId,
            tenantId: TENANT_ID,
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleMessage(event);
        } catch (err) {
          console.debug("[Omnichannel WS] Received message:", e.data);
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
  }, [organizationId, handleMessage]);

  useEffect(() => {
    if (!organizationId) return;
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, organizationId]);

  // ─── Event Producer Mutations via HTTP POST ───

  const apiPost = useCallback(
    async <T,>(eventName: string, payload: Record<string, any>, rooms: string[] = ["omnichannel"]): Promise<T | null> => {
      try {
        const response = await fetch("/api/v1/omnichannel/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Organization-Id": organizationId,
          },
          body: JSON.stringify({
            eventName,
            source: "frontend-omnichannel",
            tenantId: TENANT_ID,
            rooms,
            payload,
          }),
        });

        if (!response.ok) {
          console.error(`[Omnichannel WS] Failed to post event ${eventName}:`, response.status);
          return null;
        }

        const result = await response.json();
        return result.data as T;
      } catch (err) {
        console.error(`[Omnichannel WS] Error posting event ${eventName}:`, err);
        return null;
      }
    },
    [organizationId]
  );

  const createThread = useCallback(
    async (thread: Omit<OmnichannelThread, "id" | "createdAt" | "updatedAt">): Promise<OmnichannelThread | null> => {
      const newThread = await apiPost<OmnichannelThread>("omnichannel.thread.created", { thread }, ["omnichannel"]);
      if (newThread) {
        setThreads((prev) => [newThread, ...prev]);
      }
      return newThread;
    },
    [apiPost]
  );

  const updateThreadStatus = useCallback(
    async (threadId: string, status: ThreadStatus, assignedTo?: string): Promise<OmnichannelThread | null> => {
      const thread = await apiPost<OmnichannelThread>(
        status === "closed" ? "omnichannel.thread.closed" : "omnichannel.thread.updated",
        { thread: { id: threadId, status, assignedTo } },
        ["omnichannel", `thread:${threadId}`]
      );
      if (thread) {
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === threadId);
          if (idx === -1) return [thread, ...prev];
          const next = [...prev];
          next[idx] = thread;
          return next;
        });
      }
      return thread;
    },
    [apiPost]
  );

  const sendMessage = useCallback(
    async (
      threadId: string,
      content: string,
      messageType: MessageType = "text",
      externalMessageId?: string
    ): Promise<OmnichannelMessage | null> => {
      const message = await apiPost<OmnichannelMessage>(
        "omnichannel.message.sent",
        { threadId, content, messageType, externalMessageId },
        ["omnichannel", `thread:${threadId}`]
      );
      if (message) {
        setMessages((prev) => {
          const threadMessages = prev.get(threadId) || [];
          const next = new Map(prev);
          next.set(threadId, [...threadMessages, message]);
          return next;
        });

        // Update thread's lastMessageAt
        setThreads((prev) => {
          const idx = prev.findIndex((t) => t.id === threadId);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], lastMessageAt: message.createdAt };
          return next;
        });
      }
      return message;
    },
    [apiPost]
  );

  const addNote = useCallback(
    async (threadId: string, authorId: string, text: string): Promise<OmnichannelNote | null> => {
      const note = await apiPost<OmnichannelNote>(
        "omnichannel.note.added",
        { threadId, authorId, text },
        ["omnichannel", `thread:${threadId}`]
      );
      if (note) {
        setNotes((prev) => {
          const threadNotes = prev.get(threadId) || [];
          const next = new Map(prev);
          next.set(threadId, [...threadNotes, note]);
          return next;
        });
      }
      return note;
    },
    [apiPost]
  );

  return {
    threads,
    messages,
    notes,
    connected,
    error,
    activeThreadId,
    setActiveThread,
    createThread,
    updateThreadStatus,
    sendMessage,
    addNote,
  };
}