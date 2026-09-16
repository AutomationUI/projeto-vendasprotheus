// Shared audit log store — module-level state with subscribe/notify pattern

export type EventType = "login" | "logout" | "criacao" | "edicao" | "exclusao" | "aprovacao" | "rejeicao" | "visualizacao";

export interface AuditLog {
  id: string;
  usuario: string;
  evento: EventType;
  descricao: string;
  modulo: string;
  ip: string;
  dataHora: Date;
}

const initialLogs: AuditLog[] = [
  { id: "1", usuario: "Carlos Silva", evento: "login", descricao: "Login realizado com sucesso", modulo: "Autenticação", ip: "192.168.1.10", dataHora: new Date("2026-02-25T08:15:00") },
  { id: "2", usuario: "Carlos Silva", evento: "aprovacao", descricao: "Aprovou pedido PV-2026-001 — Tech Solutions Ltda", modulo: "Aprovações", ip: "192.168.1.10", dataHora: new Date("2026-02-25T08:32:00") },
  { id: "3", usuario: "Maria Santos", evento: "login", descricao: "Login realizado com sucesso", modulo: "Autenticação", ip: "192.168.1.22", dataHora: new Date("2026-02-25T09:00:00") },
  { id: "4", usuario: "Maria Santos", evento: "criacao", descricao: "Criou orçamento ORC-2026-007 para Rede Varejo Express", modulo: "Orçamentos", ip: "192.168.1.22", dataHora: new Date("2026-02-25T09:18:00") },
  { id: "5", usuario: "João Oliveira", evento: "edicao", descricao: "Editou dados do cliente Comércio Global ME (telefone)", modulo: "Clientes", ip: "192.168.1.35", dataHora: new Date("2026-02-25T09:45:00") },
  { id: "6", usuario: "Ana Costa", evento: "rejeicao", descricao: "Rejeitou orçamento ORC-2026-004 — justificativa: preço acima do mercado", modulo: "Aprovações", ip: "192.168.1.40", dataHora: new Date("2026-02-25T10:05:00") },
  { id: "7", usuario: "Carlos Silva", evento: "exclusao", descricao: "Excluiu produto CB-USB (Cabo USB-C 2m) do catálogo", modulo: "Produtos", ip: "192.168.1.10", dataHora: new Date("2026-02-25T10:30:00") },
  { id: "8", usuario: "Maria Santos", evento: "visualizacao", descricao: "Visualizou relatório de vendas por região", modulo: "Relatórios", ip: "192.168.1.22", dataHora: new Date("2026-02-25T11:00:00") },
  { id: "9", usuario: "João Oliveira", evento: "edicao", descricao: "Alterou condição de pagamento do pedido PV-2026-003", modulo: "Pedidos", ip: "192.168.1.35", dataHora: new Date("2026-02-25T11:22:00") },
  { id: "10", usuario: "Ana Costa", evento: "login", descricao: "Login realizado com sucesso", modulo: "Autenticação", ip: "192.168.1.40", dataHora: new Date("2026-02-25T07:50:00") },
  { id: "11", usuario: "Carlos Silva", evento: "criacao", descricao: "Criou pedido PV-2026-007 para DataCenter Brasil", modulo: "Pedidos", ip: "192.168.1.10", dataHora: new Date("2026-02-24T14:10:00") },
  { id: "12", usuario: "Maria Santos", evento: "logout", descricao: "Logout realizado", modulo: "Autenticação", ip: "192.168.1.22", dataHora: new Date("2026-02-24T18:00:00") },
  { id: "13", usuario: "João Oliveira", evento: "aprovacao", descricao: "Aprovou orçamento ORC-2026-006 — Rede Varejo Express", modulo: "Aprovações", ip: "192.168.1.35", dataHora: new Date("2026-02-24T15:30:00") },
  { id: "14", usuario: "Ana Costa", evento: "edicao", descricao: "Atualizou parâmetros ERP (URL do servidor)", modulo: "Configurações", ip: "192.168.1.40", dataHora: new Date("2026-02-24T16:45:00") },
  { id: "15", usuario: "Carlos Silva", evento: "visualizacao", descricao: "Visualizou detalhes do cliente Tech Solutions Ltda", modulo: "Clientes", ip: "192.168.1.10", dataHora: new Date("2026-02-24T09:20:00") },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let logs = [...initialLogs];

export function getAuditLogs(): AuditLog[] {
  return logs;
}

export function addAuditLog(entry: Omit<AuditLog, "id" | "dataHora" | "ip">) {
  const newLog: AuditLog = {
    ...entry,
    id: `audit_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    dataHora: new Date(),
    ip: "—", // Resolved server-side in production
  };
  logs = [newLog, ...logs];
  listeners.forEach((fn) => fn());
}

export function subscribeAuditLogs(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
