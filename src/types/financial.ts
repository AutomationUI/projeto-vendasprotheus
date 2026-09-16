// ─── Types for Commercial Financial Module (Operational & Non-Accounting) ───

export type FinancialRecordType = "receber" | "pagar";
export type FinancialStatus = "pendente" | "pago" | "parcial" | "atrasado" | "cancelado";

export interface PartialPaymentRecord {
  id: string;
  data: string;
  valorPago: number;
  desconto?: number;
  jurosMulta?: number;
  formaPagamento: "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro";
  observacao?: string;
}

export interface FinancialTitle {
  id: string;
  prefixo: string; // Ex: FAT, REC, FIN
  numero: string; // Ex: 000102
  parcela: string; // Ex: 01/03, 02/03
  tipo: FinancialRecordType;
  clienteFornecedorId: string;
  clienteFornecedorNome: string;
  cnpjCpf?: string;
  pedidoId?: string; // Vínculo com Pedido de Venda
  orcamentoId?: string; // Vínculo com Orçamento
  faturamentoId?: string; // Vínculo com Nota/Faturamento
  categoriaGerencial?: string; // Categoria operacional (Matéria-prima, Frete, Energia, Vendas)
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  valorOriginal: number;
  valorPagoTotal: number;
  saldo: number;
  status: FinancialStatus;
  formaPagamento: "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro";
  historico?: string;
  historicoPagamentos?: PartialPaymentRecord[];
  protheusRecno?: number;
}

// ─── Análise de Crédito Comercial ───
export interface CustomerCreditAnalysis {
  clienteId: string;
  clienteNome: string;
  cnpjCpf: string;
  limiteCredito: number;
  creditoUtilizado: number;
  creditoDisponivel: number;
  titulosAbertoCount: number;
  titulosVencidosCount: number;
  valorVencidoTotal: number;
  statusCredito: "liberado" | "bloqueado" | "em_analise";
  motivoBloqueio?: string;
  classeRisco: "A - Baixo" | "B - Médio" | "C - Alto" | "D - Crítico";
  prazoMedioPagamentoDias: number;
}

// ─── Fila & Histórico de Cobrança ───
export type CollectionInteractionType = "ligacao" | "whatsapp" | "email" | "reuniao";
export type CollectionResultStatus = "promessa_pagamento" | "em_negociacao" | "sem_sucesso" | "acordo_fechado" | "quitado";

export interface CollectionInteraction {
  id: string;
  tituloId: string;
  tituloNumero: string;
  clienteId: string;
  clienteNome: string;
  dataHora: string;
  tipo: CollectionInteractionType;
  responsavel: string;
  observacao: string;
  promessaData?: string;
  valorPrometido?: number;
  resultado: CollectionResultStatus;
}

// ─── Aging de Contas a Receber ───
export interface AgingReport {
  aVencer: number;
  vencido1a30: number;
  vencido31a60: number;
  vencido61a90: number;
  vencidoMais90: number;
  totalGeral: number;
}

// ─── Conciliação Financeira Operacional ───
export interface ReconciliationItem {
  id: string;
  dataMovimento: string;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
  status: "pendente" | "conciliado";
  sugestaoTituloId?: string;
  sugestaoTituloNumero?: string;
  tituloConciliadoId?: string;
  dataConciliacao?: string;
}

// ─── Fluxo de Caixa Gerencial (Diário / Mensal) ───
export interface CashFlowSummary {
  periodo: string; // Ex: "2026-09-04" ou "Set/26"
  entradasPrevistas: number;
  entradasRealizadas: number;
  saidasPrevistas: number;
  saidasRealizadas: number;
  saldoLiquidado: number;
  saldoProjetado: number;
}

// ─── Indicadores Financeiros Gerenciais ───
export interface FinancialMetrics {
  totalAReceber: number;
  totalAPagar: number;
  saldoPrevisto: number;
  recebidoMes: number;
  pagoMes: number;
  totalInadimplencia: number;
  taxaInadimplencia: number;
  titulosVencidosCount: number;
  prazoMedioRecebimentoDias: number;
  aging: AgingReport;
}
