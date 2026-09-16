import { useState, useEffect, useCallback, useMemo } from "react";

export type NotificationType = "pedido" | "producao" | "aprovacao" | "estoque" | "sistema" | "mensagem";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

const TYPE_CONFIG: Record<NotificationType, { label: string }> = {
  pedido: { label: "Pedido" },
  producao: { label: "Produção" },
  aprovacao: { label: "Aprovação" },
  estoque: { label: "Estoque" },
  sistema: { label: "Sistema" },
  mensagem: { label: "Mensagem" },
};

/* ─── Mock notifications seed ─── */
const now = new Date();
const mins = (m: number) => new Date(now.getTime() - m * 60_000);

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "pedido", title: "Novo pedido recebido", message: "PV-2026-012 — Tech Solutions Ltda (R$ 28.500)", timestamp: mins(2), read: false, link: "/pedidos" },
  { id: "n2", type: "producao", title: "Lote atrasado", message: "LOT-2026-0102 passou da previsão de entrega", timestamp: mins(8), read: false, link: "/producao" },
  { id: "n3", type: "aprovacao", title: "Aprovação pendente", message: "Orçamento ORC-2026-045 aguarda aprovação", timestamp: mins(15), read: false, link: "/aprovacoes" },
  { id: "n4", type: "estoque", title: "Estoque baixo", message: "Disco de Corte 12\" abaixo do mínimo (23 un.)", timestamp: mins(32), read: true, link: "/produtos" },
  { id: "n5", type: "producao", title: "Queima finalizada", message: "LOT-2026-0104 concluiu a etapa de queima", timestamp: mins(45), read: true, link: "/producao" },
  { id: "n6", type: "sistema", title: "Backup concluído", message: "Backup automático realizado com sucesso", timestamp: mins(120), read: true },
];

/* ─── Periodic mock events ─── */
const LIVE_EVENTS: Omit<AppNotification, "id" | "timestamp" | "read">[] = [
  { type: "pedido", title: "Pedido atualizado", message: "PV-2026-008 — status alterado para Faturado", link: "/pedidos" },
  { type: "producao", title: "Lote avançou etapa", message: "LOT-2026-0111 entrou em Moldagem", link: "/producao" },
  { type: "aprovacao", title: "Nova aprovação", message: "Desconto de 12% no pedido PV-2026-010 requer aprovação", link: "/aprovacoes" },
  { type: "estoque", title: "Reposição necessária", message: "Rebolo Reto 300x50x127 — estoque crítico (8 un.)", link: "/produtos" },
  { type: "producao", title: "Inspeção reprovada", message: "LOT-2026-0108 — 5 peças reprovadas na inspeção", link: "/producao" },
  { type: "sistema", title: "Relatório gerado", message: "Relatório mensal de vendas disponível para download", link: "/relatorios" },
];

let counter = 100;

/* ─── Hook ─── */
export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);

  // Simulate real-time notifications every 20-40s
  useEffect(() => {
    const schedule = () => {
      const delay = 20_000 + Math.random() * 20_000;
      return setTimeout(() => {
        const template = LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)];
        const newNotif: AppNotification = {
          ...template,
          id: `n${++counter}`,
          timestamp: new Date(),
          read: false,
        };
        setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
        timerRef = schedule();
      }, delay);
    };
    let timerRef = schedule();
    return () => clearTimeout(timerRef);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification };
}

export { TYPE_CONFIG };
