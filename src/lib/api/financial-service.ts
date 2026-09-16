import { API_CONFIG } from "./config";
import { http } from "./http-client";
import {
  FinancialTitle,
  CashFlowSummary,
  FinancialMetrics,
  CustomerCreditAnalysis,
  CollectionInteraction,
  ReconciliationItem,
} from "@/types/financial";
import {
  mockFinancialTitles,
  mockCashFlow,
  mockCustomerCreditAnalysis,
  mockCollectionInteractions,
  mockReconciliationItems,
} from "@/lib/financial-mock-data";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export const financialService = {
  // ─── Títulos (Contas a Receber & Pagar) ───
  async getTitles(params?: {
    tipo?: "receber" | "pagar";
    status?: string;
    search?: string;
    clienteFornecedorId?: string;
    dataInicio?: string;
    dataFim?: string;
    categoriaGerencial?: string;
  }): Promise<FinancialTitle[]> {
    if (API_CONFIG.useMock) {
      let filtered = [...mockFinancialTitles];
      if (params?.tipo) {
        filtered = filtered.filter((t) => t.tipo === params.tipo);
      }
      if (params?.status && params.status !== "todos") {
        filtered = filtered.filter((t) => t.status === params.status);
      }
      if (params?.categoriaGerencial && params.categoriaGerencial !== "todas") {
        filtered = filtered.filter((t) =>
          t.categoriaGerencial?.toLowerCase().includes(params.categoriaGerencial!.toLowerCase())
        );
      }
      if (params?.dataInicio) {
        filtered = filtered.filter((t) => t.dataVencimento >= params.dataInicio! || t.dataEmissao >= params.dataInicio!);
      }
      if (params?.dataFim) {
        filtered = filtered.filter((t) => t.dataVencimento <= params.dataFim! || t.dataEmissao <= params.dataFim!);
      }
      if (params?.clienteFornecedorId) {
        filtered = filtered.filter((t) => t.clienteFornecedorId === params.clienteFornecedorId);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.clienteFornecedorNome.toLowerCase().includes(q) ||
            t.numero.toLowerCase().includes(q) ||
            (t.categoriaGerencial && t.categoriaGerencial.toLowerCase().includes(q)) ||
            (t.faturamentoId && t.faturamentoId.toLowerCase().includes(q)) ||
            (t.pedidoId && t.pedidoId.toLowerCase().includes(q))
        );
      }
      return filtered;
    }

    const query = new URLSearchParams();
    if (params?.tipo) query.append("tipo", params.tipo);
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    if (params?.clienteFornecedorId) query.append("clienteFornecedorId", params.clienteFornecedorId);
    if (params?.dataInicio) query.append("dataInicio", params.dataInicio);
    if (params?.dataFim) query.append("dataFim", params.dataFim);
    if (params?.categoriaGerencial) query.append("categoriaGerencial", params.categoriaGerencial);

    const endpoint = `/financial/titles${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await http.get<ApiResponse<FinancialTitle[]>>(endpoint);
    return res.data;
  },

  async createTitle(data: Partial<FinancialTitle>): Promise<FinancialTitle> {
    if (API_CONFIG.useMock) {
      const valorOrig = Number(data.valorOriginal || 0);
      const newTitle: FinancialTitle = {
        id: `tit-${Date.now()}`,
        prefixo: data.prefixo || (data.tipo === "receber" ? "FAT" : "FIN"),
        numero: data.numero || `${Math.floor(100000 + Math.random() * 900000)}`,
        parcela: data.parcela || "01/01",
        tipo: data.tipo || "receber",
        clienteFornecedorId: data.clienteFornecedorId || `cli-${Date.now()}`,
        clienteFornecedorNome: data.clienteFornecedorNome || "Parceiro Genérico",
        cnpjCpf: data.cnpjCpf,
        pedidoId: data.pedidoId,
        orcamentoId: data.orcamentoId,
        faturamentoId: data.faturamentoId,
        categoriaGerencial: data.categoriaGerencial || "Operacional",
        dataEmissao: data.dataEmissao || new Date().toISOString().split("T")[0],
        dataVencimento: data.dataVencimento || new Date().toISOString().split("T")[0],
        valorOriginal: valorOrig,
        valorPagoTotal: 0,
        saldo: valorOrig,
        status: data.status || "pendente",
        formaPagamento: data.formaPagamento || "Boleto",
        historico: data.historico,
      };
      mockFinancialTitles.unshift(newTitle);
      return newTitle;
    }

    const res = await http.post<ApiResponse<FinancialTitle>>("/financial/titles", data);
    return res.data;
  },

  async updateTitle(id: string, data: Partial<FinancialTitle>): Promise<FinancialTitle> {
    if (API_CONFIG.useMock) {
      const index = mockFinancialTitles.findIndex((t) => t.id === id);
      if (index !== -1) {
        const item = mockFinancialTitles[index];
        const novoValorOriginal = data.valorOriginal !== undefined ? Number(data.valorOriginal) : item.valorOriginal;
        const novoSaldo = Math.max(0, novoValorOriginal - item.valorPagoTotal);
        let novoStatus = data.status || item.status;
        if (novoSaldo === 0 && item.valorPagoTotal > 0) {
          novoStatus = "pago";
        }

        mockFinancialTitles[index] = {
          ...item,
          ...data,
          valorOriginal: novoValorOriginal,
          saldo: novoSaldo,
          status: novoStatus,
        };
        return mockFinancialTitles[index];
      }
      throw new Error("Título não encontrado para edição");
    }

    const res = await http.put<ApiResponse<FinancialTitle>>(`/financial/titles/${id}`, data);
    return res.data;
  },

  async deleteTitle(id: string): Promise<boolean> {
    if (API_CONFIG.useMock) {
      const index = mockFinancialTitles.findIndex((t) => t.id === id);
      if (index !== -1) {
        mockFinancialTitles.splice(index, 1);
        return true;
      }
      return false;
    }

    await http.delete<ApiResponse<void>>(`/financial/titles/${id}`);
    return true;
  },

  async settleTitle(
    id: string,
    data: {
      valorPago: number;
      dataPagamento: string;
      formaPagamento?: "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro";
      desconto?: number;
      jurosMulta?: number;
      observacao?: string;
    }
  ): Promise<FinancialTitle> {
    if (API_CONFIG.useMock) {
      const index = mockFinancialTitles.findIndex((t) => t.id === id);
      if (index !== -1) {
        const item = mockFinancialTitles[index];
        const novoValorPagoTotal = item.valorPagoTotal + data.valorPago;
        const novoSaldo = Math.max(0, item.valorOriginal - novoValorPagoTotal);
        const novoStatus = novoSaldo === 0 ? "pago" : "parcial";

        const pagamentoRecord = {
          id: `pag-${Date.now()}`,
          data: data.dataPagamento,
          valorPago: data.valorPago,
          desconto: data.desconto,
          jurosMulta: data.jurosMulta,
          formaPagamento: data.formaPagamento || item.formaPagamento,
          observacao: data.observacao,
        };

        const historicoAtualizado = item.historicoPagamentos
          ? [...item.historicoPagamentos, pagamentoRecord]
          : [pagamentoRecord];

        mockFinancialTitles[index] = {
          ...item,
          status: novoStatus,
          valorPagoTotal: novoValorPagoTotal,
          dataPagamento: data.dataPagamento,
          saldo: novoSaldo,
          historicoPagamentos: historicoAtualizado,
        };
        return mockFinancialTitles[index];
      }
      throw new Error("Título não encontrado");
    }

    const res = await http.post<ApiResponse<FinancialTitle>>(`/financial/titles/${id}/settle`, data);
    return res.data;
  },

  // Aliases for compatibility
  getFinancialMetrics() {
    return this.getMetrics();
  },
  getCashFlowProjection() {
    return this.getCashFlow();
  },
  getCustomerCreditAnalysis() {
    return this.getCreditAnalyses();
  },
  getReconciliationItems() {
    return this.getReconciliations();
  },

  // ─── Indicadores & Fluxo de Caixa ───
  async getMetrics(): Promise<FinancialMetrics> {
    if (API_CONFIG.useMock) {
      const aReceberTitulos = mockFinancialTitles.filter((t) => t.tipo === "receber");
      const aPagarTitulos = mockFinancialTitles.filter((t) => t.tipo === "pagar");

      const aReceberPendentes = aReceberTitulos.filter((t) => t.status !== "pago");
      const aPagarPendentes = aPagarTitulos.filter((t) => t.status !== "pago");

      const totalAReceber = aReceberPendentes.reduce((sum, t) => sum + t.saldo, 0);
      const totalAPagar = aPagarPendentes.reduce((sum, t) => sum + t.saldo, 0);

      const recebidoMes = aReceberTitulos.reduce((sum, t) => sum + t.valorPagoTotal, 0);
      const pagoMes = aPagarTitulos.reduce((sum, t) => sum + t.valorPagoTotal, 0);

      const titulosVencidos = aReceberTitulos.filter((t) => t.status === "atrasado");
      const totalInadimplencia = titulosVencidos.reduce((sum, t) => sum + t.saldo, 0);
      const baseReceberTotal = totalAReceber + recebidoMes;
      const taxaInadimplencia =
        baseReceberTotal > 0 ? Number(((totalInadimplencia / baseReceberTotal) * 100).toFixed(1)) : 0;

      return {
        totalAReceber,
        totalAPagar,
        saldoPrevisto: totalAReceber - totalAPagar,
        recebidoMes,
        pagoMes,
        totalInadimplencia,
        taxaInadimplencia,
        titulosVencidosCount: titulosVencidos.length,
        prazoMedioRecebimentoDias: 29,
        aging: {
          aVencer: totalAReceber - totalInadimplencia,
          vencido1a30: totalInadimplencia,
          vencido31a60: 0,
          vencido61a90: 0,
          vencidoMais90: 0,
          totalGeral: totalAReceber,
        },
      };
    }
    const res = await http.get<ApiResponse<FinancialMetrics>>("/financial/metrics");
    return res.data;
  },

  async getCashFlow(): Promise<CashFlowSummary[]> {
    if (API_CONFIG.useMock) {
      return mockCashFlow;
    }
    const res = await http.get<ApiResponse<CashFlowSummary[]>>("/financial/cash-flow");
    return res.data;
  },

  // ─── Análise de Crédito Comercial ───
  async getCreditAnalyses(): Promise<CustomerCreditAnalysis[]> {
    if (API_CONFIG.useMock) {
      return mockCustomerCreditAnalysis;
    }
    const res = await http.get<ApiResponse<CustomerCreditAnalysis[]>>("/financial/credit-analysis");
    return res.data;
  },

  async updateCreditStatus(
    clienteId: string,
    data: { statusCredito: "liberado" | "bloqueado" | "em_analise"; limiteCredito?: number; motivoBloqueio?: string }
  ): Promise<CustomerCreditAnalysis> {
    if (API_CONFIG.useMock) {
      const idx = mockCustomerCreditAnalysis.findIndex((c) => c.clienteId === clienteId);
      if (idx !== -1) {
        mockCustomerCreditAnalysis[idx] = {
          ...mockCustomerCreditAnalysis[idx],
          statusCredito: data.statusCredito,
          motivoBloqueio: data.motivoBloqueio,
          limiteCredito: data.limiteCredito ?? mockCustomerCreditAnalysis[idx].limiteCredito,
          creditoDisponivel:
            (data.limiteCredito ?? mockCustomerCreditAnalysis[idx].limiteCredito) -
            mockCustomerCreditAnalysis[idx].creditoUtilizado,
        };
        return mockCustomerCreditAnalysis[idx];
      }
      throw new Error("Cliente não encontrado");
    }

    const res = await http.patch<ApiResponse<CustomerCreditAnalysis>>(`/financial/credit-analysis/${clienteId}`, data);
    return res.data;
  },

  // ─── Cobrança & Interações ───
  async getCollectionInteractions(tituloId?: string): Promise<CollectionInteraction[]> {
    if (API_CONFIG.useMock) {
      if (tituloId) {
        return mockCollectionInteractions.filter((c) => c.tituloId === tituloId);
      }
      return mockCollectionInteractions;
    }
    const endpoint = tituloId ? `/financial/collections?tituloId=${tituloId}` : "/financial/collections";
    const res = await http.get<ApiResponse<CollectionInteraction[]>>(endpoint);
    return res.data;
  },

  async addCollectionInteraction(data: Omit<CollectionInteraction, "id">): Promise<CollectionInteraction> {
    if (API_CONFIG.useMock) {
      const newInteraction: CollectionInteraction = {
        ...data,
        id: `cob-${Date.now()}`,
      };
      mockCollectionInteractions.unshift(newInteraction);
      return newInteraction;
    }

    const res = await http.post<ApiResponse<CollectionInteraction>>("/financial/collections", data);
    return res.data;
  },

  // ─── Conciliação Financeira Operacional ───
  async getReconciliations(): Promise<ReconciliationItem[]> {
    if (API_CONFIG.useMock) {
      return mockReconciliationItems;
    }
    const res = await http.get<ApiResponse<ReconciliationItem[]>>("/financial/reconciliations");
    return res.data;
  },

  async reconcileItem(id: string, tituloId: string): Promise<ReconciliationItem> {
    if (API_CONFIG.useMock) {
      const idx = mockReconciliationItems.findIndex((r) => r.id === id);
      if (idx !== -1) {
        mockReconciliationItems[idx] = {
          ...mockReconciliationItems[idx],
          status: "conciliado",
          tituloConciliadoId: tituloId,
          dataConciliacao: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
        return mockReconciliationItems[idx];
      }
      throw new Error("Item de conciliação não encontrado");
    }

    const res = await http.post<ApiResponse<ReconciliationItem>>(`/financial/reconciliations/${id}/match`, { tituloId });
    return res.data;
  },
};
