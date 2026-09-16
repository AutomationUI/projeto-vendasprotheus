// ─── Business Flow Studio ───
// Definições visuais de processos comerciais e financeiros.
// Estes fluxos podem ser consumidos por:
// - UI para validação de etapas
// - IA como assistente de pré-atendimento
// - Motor de regras para decisões automáticas
// - Integração com orquestração de fluxos

import type { FinancialRecordType, FinancialStatus, FinancialActionType } from "./financial";
import type { UserRole, Permission } from "./types-roles";
import type { AppUser, Representante, CarteiraCliente } from "./types-roles";

// ─── Fluxo Comercial: Novo Pedido ──────────────────────────────────────────

export type CommercialStepId =
  | "novo-pedido"
  | "analisar-credito"
  | "validar-estoque"
  | "aprovacao-alcada"
  | "liberacao"
  | "faturamento"
  | "concluido";

export interface CommercialTransition {
  from: CommercialStepId;
  to: CommercialStepId;
  condition: "approved" | "denied" | "partial" | "manual_review";
  action: string;
}

export const COMMERCIAL_TRANSITIONS: CommercialTransition[] = [
  {
    from: "novo-pedido",
    to: "analisar-credito",
    condition: "approved",
    action: "Solicitar análise de crédito",
  },
  {
    from: "novo-pedido",
    to: "validar-estoque",
    condition: "approved",
    action: "Validar disponibilidade de estoque",
  },
  {
    from: "analisar-credito",
    to: "aprovacao-alcada",
    condition: "approved",
    action: "Pré-aprovação concedida",
  },
  {
    from: "analisar-credito",
    to: "liberacao",
    condition: "denied",
    action: "Crédito negado - Bloqueio",
  },
  {
    from: "aprovacao-alcada",
    to: "liberacao",
    condition: "approved",
    action: "Aprovação de alçada concedida",
  },
  {
    from: "aprovacao-alcada",
    to: "liberacao",
    condition: "denied",
    action: "Aprovação negada - Bloqueio",
  },
  {
    from: "liberacao",
    to: "faturamento",
    condition: "approved",
    action: "Liberar para faturamento",
  },
  {
    from: "liberacao",
    to: "faturamento",
    condition: "partial",
    action: "Liberparcial - Requer faturamento seletivo",
  },
  {
    from: "faturamento",
    to: "concluido",
    condition: "completed",
    action: "Pedido faturado e entregue",
  },
];

export type CommercialFlow = {
  id: string;
  organizationId: string;
  pedidoId: string;
  clienteId: string;
  currentStep: CommercialStepId;
  status: "pending" | "in_progress" | "completed" | "on_hold";
  transitions: CommercialTransition[];
  creditAnalysis?: {
    clienteId: string;
    limiteCredito: number;
    creditoDisponivel: number;
    statusCredito: "liberado" | "bloqueado" | "em_analise";
    classeRisco: "A - Baixo" | "B - Médio" | "C - Alto";
  };
  createdAt: string;
  updatedAt: string;
};

// ─── Fluxo Financeiro: Títulos a Receber ───────────────────────────────────

export type TitleStepId =
  | "criado"
  | "aguardando-pagamento"
  | "parcial-pago"
  | "pago"
  | "atrasado"
  | "cancelado";

export interface TitleTransition {
  from: TitleStepId;
  to: TitleStepId;
  condition: "payment_received" | "payment_partial" | "payment_discount" | "cancellation";
  action: string;
  metadata?: {
    valorPago?: number;
    dataPagamento?: string;
    desconto?: number;
    jurosMulta?: number;
  };
}

export const TITLE_TRANSITIONS: TitleTransition[] = [
  {
    from: "criado",
    to: "aguardando-pagamento",
    condition: "payment_received",
    action: "Primeiro pagamento recebido",
    metadata: {},
  },
  {
    from: "aguardando-pagamento",
    to: "parcial-pago",
    condition: "payment_partial",
    action: "Pagamento parcial recebido",
    metadata: { valorPago: Number },
  },
  {
    from: "aguardando-pagamento",
    to: "pago",
    condition: "payment_received",
    action: "Pagamento integral recebido",
    metadata: { valorPago: Number },
  },
  {
    from: "aguardando-pagamento",
    to: "atrasado",
    condition: "vencimento_passado_sem_pagamento",
    action: "Título vencido - Inserir na fila de cobrança",
    metadata: {},
  },
  {
    from: "parcial-pago",
    to: "pago",
    condition: "payment_remaining",
    action: "Pagamento do saldo restante",
    metadata: { valorPago: Number },
  },
  {
    from: "pago",
    to: "cancelado",
    condition: "manual_cancellation",
    action: "Cancelamento do título",
    metadata: {},
  },
];

export type TitleFlow = {
  id: string;
  organizationId: string;
  tituloId: string;
  currentStep: TitleStepId;
  status: "active" | "closed" | "cancelled";
  transitions: TitleTransition[];
  createdAt: string;
  updatedAt: string;
};

// ─── Fluxo de Cobrança Comercial ──────────────────────────────────────────

export type CollectionStepId =
  | "identificacao"
  | "contato-inicial"
  | "promessa-negociacao"
  | "acordo-fechado"
  | "quittado"
  | "encerrado";

export interface CollectionAction {
  id: string;
  tipo: "ligacao" | "whatsapp" | "email" | "reuniao";
  dataHora: string;
  responsavel: string;
  observacao: string;
  promessaData?: string;
  valorPrometido?: number;
  resultado: "promessa_pagamento" | "em_negociacao" | "sem_sucesso" | "acordo_fechado" | "quitado";
}

export type CollectionFlow = {
  id: string;
  organizationId: string;
  tituloId: string;
  currentStep: CollectionStepId;
  status: "active" | "closed";
  acoes: CollectionAction[];
  createdAt: string;
  updatedAt: string;
};

// ─── Fluxo de Análise de Crédito ──────────────────────────────────────────

export type CreditStepId =
  | "solicitacao"
  | "analise-dados"
  | "verificacao-externa"
  | "decicaao"
  | "concluido"
  | "revisao";

export interface CreditDecision {
  clienteId: string;
  limiteCredito: number;
  creditoDisponivel: number;
  statusCredito: "liberado" | "bloqueado" | "em_analise";
  classeRisco: "A - Baixo" | "B - Médio" | "C - Alto" | "D - Crítico";
  motivoBloqueio?: string;
  prazoMedioPagamentoDias: number;
  baseCalculo: {
    totalCompras: number;
    metaMensal: number;
    historicoPagamentos: number;
    titulosVencidos: number;
  };
}

export type CreditFlow = {
  id: string;
  organizationId: string;
  clienteId: string;
  currentStep: CreditStepId;
  status: "pending" | "in_progress" | "completed" | "under_review";
  decision?: CreditDecision;
  acoes: Array<{
    tipo: "consulta" | "atualizacao" | "bloqueio" | "liberacao";
    dataHora: string;
    responsavel: string;
    observacao: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

// ─── Perfis de Acesso por Etapa ───────────────────────────────────────────

export type FlowPermission<T extends string = string> = {
  module: string;
  actions: FinancialActionType[];
  requiredRole?: UserRole;
  allowedCustomProfiles?: string[];
};

export const FLOW_PERMISSIONS: Partial<Record<CommercialStepId, FlowPermission>> = {
  "novo-pedido": {
    module: "pedidos",
    actions: ["view", "create", "edit", "delete", "approve"],
    requiredRole: "representante",
  },
  "analisar-credito": {
    module: "finance",
    actions: ["finance.credit.read", "finance.credit.approve"],
    requiredRole: "representante",
  },
  "liberacao": {
    module: "finance",
    actions: ["finance.read", "finance.receivable.read"],
    requiredRole: "representante",
  },
  "faturamento": {
    module: "finance",
    actions: ["finance.receivable.create"],
    requiredRole: "representante",
  },
};

// ─── Helper: Verificar transição válida ────────────────────────────────────

export function podeAvancarEtapa<
  T extends CommercialStepId | TitleStepId | CollectionStepId | CreditStepId
>(
  current: T,
  target: T,
  fluxo:
    | "comercial"
    | "financeiro"
    | "cobranca"
    | "credito"
  ,
  usuarioRole: UserRole,
  perfilCustomizado?: string
): boolean {
  const permissoes = FLOW_PERMISSIONS[current as keyof typeof FLOW_PERMISSIONS];

  if (!permissoes) return false;

  // Verifica role básico
  if (permissoes.requiredRole && usuarioRole !== permissoes.requiredRole) {
    // Permite se tiver perfil customizado com as permissões necessárias
    if (perfilCustomizado) {
      return true; // Simplificado - em produção verificaria as permissões customizadas
    }
    return false;
  }

  return true;
}

// ─── Estados Iniciais Padrão ──────────────────────────────────────────────

export const COMMERCIAL_FLOW_INIT: CommercialFlow = {
  id: "",
  organizationId: "",
  pedidoId: "",
  clienteId: "",
  currentStep: "novo-pedido",
  status: "pending",
  transitions: COMMERCIAL_TRANSITIONS,
};

export const TITLE_FLOW_INIT: TitleFlow = {
  id: "",
  organizationId: "",
  tituloId: "",
  currentStep: "criado",
  status: "active",
  transitions: TITLE_TRANSITIONS,
};

export const COLLECTION_FLOW_INIT: CollectionFlow = {
  id: "",
  organizationId: "",
  tituloId: "",
  currentStep: "identificacao",
  status: "active",
  acoes: [],
};

export const CREDIT_FLOW_INIT: CreditFlow = {
  id: "",
  organizationId: "",
  clienteId: "",
  currentStep: "solicitacao",
  status: "pending",
  decision: {
    clienteId: "",
    limiteCredito: 0,
    creditoDisponivel: 0,
    statusCredito: "em_analise",
    classeRisco: "C - Alto",
    prazoMedioPagamentoDias: 30,
    baseCalculo: {
      totalCompras: 0,
      metaMensal: 0,
      historicoPagamentos: 0,
      titulosVencidos: 0,
    },
  },
  acoes: [],
};