import { useState, useEffect, useCallback, useMemo } from "react";
import { ordersService, type OrderFilters } from "@/lib/api/orders-service";
import { approvalsService, type ApprovalFilters } from "@/lib/api/approvals-service";
import { useNotifications, type AppNotification } from "./use-notifications";
import { useAuth } from "./use-auth";

export interface NavbarCounters {
  pedidosPendentes: number;
  aprovacoesPendentes: number;
  notificacoesNaoLidas: number;
  orcamentosAguardando: number;
  producaoAtrasada: number;
  estoqueBaixo: number;
}

export interface NavbarDataState {
  counters: NavbarCounters;
  notifications: AppNotification[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

const INITIAL_COUNTERS: NavbarCounters = {
  pedidosPendentes: 0,
  aprovacoesPendentes: 0,
  notificacoesNaoLidas: 0,
  orcamentosAguardando: 0,
  producaoAtrasada: 0,
  estoqueBaixo: 0,
};

const POLLING_INTERVAL = 30_000;

function computeNotifCounts(notifications: AppNotification[]): Omit<NavbarCounters, "pedidosPendentes" | "aprovacoesPendentes" | "notificacoesNaoLidas"> {
  const counts = {
    orcamentosAguardando: 0,
    producaoAtrasada: 0,
    estoqueBaixo: 0,
  };
  notifications.forEach((n) => {
    if (!n.read) {
      switch (n.type) {
        case "pedido":
          if (n.title.includes("Orçamento") || n.title.includes("orcamento")) counts.orcamentosAguardando++;
          break;
        case "producao":
          if (n.title.includes("atrasado") || n.title.includes("Atrasado")) counts.producaoAtrasada++;
          break;
        case "estoque":
          counts.estoqueBaixo++;
          break;
      }
    }
  });
  return counts;
}

export function useNavbarData() {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  const [state, setState] = useState<NavbarDataState>({
    counters: INITIAL_COUNTERS,
    notifications: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  const notifCounts = useMemo(() => computeNotifCounts(notifications), [notifications]);

  const fetchCounters = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [ordersResult, approvalsResult] = await Promise.allSettled([
        ordersService.getAll({ status: "Aprovar", limit: 1 } as OrderFilters),
        approvalsService.getAll({ status: "Pendente", limit: 1 } as ApprovalFilters),
      ]);

      const pedidosPendentes = ordersResult.status === "fulfilled" ? ordersResult.value.total : 0;
      const aprovacoesPendentes = approvalsResult.status === "fulfilled" ? approvalsResult.value.total : 0;

      setState((prev) => ({
        ...prev,
        counters: {
          ...prev.counters,
          pedidosPendentes,
          aprovacoesPendentes,
          notificacoesNaoLidas: unreadCount,
          ...notifCounts,
        },
        notifications,
        lastUpdated: new Date(),
        error: null,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Erro ao buscar dados da navbar",
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated, notifications, unreadCount, notifCounts]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCounters();
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isAuthenticated, fetchCounters]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(fetchCounters, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchCounters]);

  useEffect(() => {
    const handleDBChange = () => fetchCounters();
    window.addEventListener("local-db-change", handleDBChange);
    window.addEventListener("approvalsChanged", handleDBChange);
    window.addEventListener("orderStatusChanged", handleDBChange);
    return () => {
      window.removeEventListener("local-db-change", handleDBChange);
      window.removeEventListener("approvalsChanged", handleDBChange);
      window.removeEventListener("orderStatusChanged", handleDBChange);
    };
  }, [fetchCounters]);

  const refresh = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true }));
    fetchCounters();
  }, [fetchCounters]);

  return {
    ...state,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}

export function useNavbarCounters() {
  const { counters } = useNavbarData();
  return counters;
}