import type { Request, Response } from "express";
import { randomUUID as uuidv4 } from "node:crypto";
  import { supabaseDb } from "../lib/supabase-db";

// ─── Tipos ──────────────────────────────────────────────────────────────
export type StatusFatura = "ABERTA" | "PAGA" | "VENCIDA" | "CANCELADA" | "PARCIAL";

export type StatusParcela = "PENDENTE" | "PAGA" | "VENCIDA" | "DESCONTADA" | "IMPAGA";

export interface Fatura {
  id: string;
  numero: string;
  cliente_id: string;
  vendedor?: string;
  data_emissao: string;
  data_vencimento: string;
  valor_total: number;
  valor_pago: number;
  status: StatusFatura;
  condicao_pagamento?: string;
  observacoes?: string;
  metodo_pagamento?: string;
  referencia_externa?: string;
  created_at: string;
  updated_at: string;
}

export interface ParcelasResponse {
  id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string;
  status_status: StatusParcela;
  juros: number;
  multa: number;
  desconto: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Cálculo Matemático de Parcelas (Precisão de Centavos) ──────────────
// Usa a biblioteca de Decimal para evitar arredondamento floating-point.
// Em produção, seria importado de 'decimal.js' ou similar.
// Esta é uma implementação simplificada usando arredondamento estratégico.

/**
 * Divide um valor total em parcelas com precisão de centavos.
 * Garante que a soma das parcelas seja exatamente igual ao valor total.
 * @param totalValor Valor total a ser parcelado (em centavos)
 * @param numeroParcelas Quantidade de parcelas
 * @returns Array de objetos { valor, resto } onde a soma dos valores = total
 */
function dividirEmParcelasExato(totalValor: number, numeroParcelas: number): Array<{ valor: number; resto: number }> {
  if (numeroParcelas <= 0) return [];

  const totalCentavos = Math.round(totalValor * 100);
  const valorBaseCentavos = Math.floor(totalCentavos / numeroParcelas);
  const restoCentavos = totalCentavos % numeroParcelas;

  const resultado: Array<{ valor: number; resto: number }> = [];

  for (let i = 0; i < numeroParcelas; i++) {
    const valorCentavos = i < restoCentavos ? valorBaseCentavos + 1 : valorBaseCentavos;
    const valor = valorCentavos / 100;
    resultado.push({ valor, resto: i < restoCentavos ? 1 : 0 });
  }

  return resultado;
}

/**
 * Calcula juros com base em taxa percentual e período em dias.
 * Fórmula: juros = valor * (taxa/100) * (dias/360)
 * Usa convenção bancária de 360 dias (juros simples).
 */
function calcularJuros(valor: number, taxaAnual: number, dias: number): number {
  const taxaDiaria = taxaAnual / 360;
  return Math.round((valor * taxaDiaria * dias) * 100) / 100;
}

/**
 * Calcula multa percentual sobre um valor.
 * @param valor Base de cálculo
 * @param multaPercentual Percentual da multa (ex: 2 para 2%)
 * @returns Valor da multa arredondado para centavos
 */
function calcularMulta(valor: number, multaPercentual: number): number {
  return Math.round((valor * multaPercentual / 100) * 100) / 100;
}

/**
 * Calcula desconto percentual sobre um valor.
 * @param valor Base de cálculo
 * @param descontoPercentual Percentual do desconto (ex: 10 para 10%)
 * @returns Valor do desconto arredondado para centavos
 */
function calcularDesconto(valor: number, descontoPercentual: number): number {
  return Math.round((valor * descontoPercentual / 100) * 100) / 100;
}

// ─── Serviço de Faturas ──────────────────────────────────────────────
export class FaturaService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  /** LISTAR FATURAS */
  async list(filters?: {
    status?: StatusFatura;
    onlyAbertas?: boolean;
    onlyVencidas?: boolean;
    dataInicial?: string;
    dataFinal?: string;
  }): Promise<Fatura[]> {
    try {
      let query = supabaseDb.supabase.from("faturas").select("*").eq("organization_id", this.organizationId);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.onlyAbertas === true) {
        query = query.eq("status", "ABERTA");
      }
      if (filters?.onlyVencidas === true) {
        query = query.eq("status", "VENCIDA");
      }
      if (filters?.dataInicial) {
        query = query.gte("data_emissao", filters.dataInicial);
      }
      if (filters?.dataFinal) {
        query = query.lte("data_emissao", filters.dataFinal);
      }

      const { data, error } = await query.order("data_emissao", { ascending: false });

      if (error) throw error;
      return data as Fatura[];
    } catch (err) {
      console.error("[FaturaService] Erro ao listar faturas:", err);
      return [];
    }
  }

  /** OBTER FATURA POR ID */
  async get(id: string): Promise<Fatura | null> {
    try {
      const { data, error } = await supabaseDb.supabase.from("faturas").select("*").eq("id", id).single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        numero: data.numero,
        cliente_id: data.cliente_id,
        vendedor: data.vendedor,
        data_emissao: typeof data.data_emissao === "string" ? data.data_emissao : new Date(data.data_emissao).toISOString(),
        data_vencimento: typeof data.data_vencimento === "string" ? data.data_vencimento : new Date(data.data_vencimento).toISOString(),
        valor_total: Number(data.valor_total),
        valor_pago: Number(data.valor_pago),
        status: data.status as StatusFatura,
        condicao_pagamento: data.condicao_pagamento,
        observacoes: data.observacoes,
        metodo_pagamento: data.metodo_pagamento,
        referencia_externa: data.referencia_externa,
        created_at: typeof data.created_at === "string" ? data.created_at : new Date(data.created_at).toISOString(),
        updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(data.updated_at).toISOString(),
      };
    } catch (err) {
      console.error("[FaturaService] Erro ao obter fatura:", err);
      return null;
    }
  }

  /** CRIAR FATURA */
  async create(dados: Omit<Fatura, "id">): Promise<Fatura | null> {
    try {
      const id = uuidv4();
      const numero = `FAT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;

      const now = new Date().toISOString();

      const fatura: Fatura = {
        id,
        numero,
        cliente_id: dados.cliente_id,
        vendedor: dados.vendedor,
        data_emissao: now,
        data_vencimento: dados.data_vencimento,
        valor_total: dados.valor_total,
        valor_pago: 0,
        status: "ABERTA",
        condicao_pagamento: dados.condicao_pagamento,
        observacoes: dados.observacoes,
        metodo_pagamento: dados.metodo_pagamento,
        referencia_externa: dados.referencia_externa,
        created_at: now,
        updated_at: now,
      };

      const payload = {
        id: fatura.id,
        organization_id: this.organizationId,
        numero: fatura.numero,
        cliente_id: fatura.cliente_id,
        vendedor: fatura.vendedor,
        data_emissao: fatura.data_emissao,
        data_vencimento: fatura.data_vencimento,
        valor_total: fatura.valor_total,
        valor_pago: fatura.valor_pago,
        status: fatura.status,
        condicao_pagamento: fatura.condicao_pagamento,
        observacoes: fatura.observacoes,
        metodo_pagamento: fatura.metodo_pagamento,
        referencia_externa: fatura.referencia_externa,
        created_at: fatura.created_at,
        updated_at: fatura.updated_at,
      };

      const { data, error } = await supabaseDb.supabase.from("faturas").insert(payload).select().single();

      if (error) throw error;

      return {
        id: data.id,
        numero: data.numero,
        cliente_id: data.cliente_id,
        vendedor: data.vendedor,
        data_emissao: typeof data.data_emissao === "string" ? data.data_emissao : new Date(data.data_emissao).toISOString(),
        data_vencimento: typeof data.data_vencimento === "string" ? data.data_vencimento : new Date(data.data_vencimento).toISOString(),
        valor_total: Number(data.valor_total),
        valor_pago: Number(data.valor_pago),
        status: data.status as StatusFatura,
        condicao_pagamento: data.condicao_pagamento,
        observacoes: data.observacoes,
        metodo_pagamento: data.metodo_pagamento,
        referencia_externa: data.referencia_externa,
        created_at: typeof data.created_at === "string" ? data.created_at : new Date(data.created_at).toISOString(),
        updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(data.updated_at).toISOString(),
      };
    } catch (err) {
      console.error("[FaturaService] Erro ao criar fatura:", err);
      return null;
    }
  }

  /** ATUALIZAR FATURA (recebimento de pagamento) */
  async receberPagamento(id: string, valorPago: number): Promise<{ fatura: Fatura | null; parcelasAtualizadas: number }> {
    try {
      // 1. Obter fatura atual
      const faturaAtual = await this.get(id);
      if (!faturaAtual) return { fatura: null, parcelasAtualizadas: 0 };

      // 2. Atualizar valor pago da fatura
      const novoValorPago = Math.min(faturaAtual.valor_total, faturaAtual.valor_pago + valorPago);
      const statusAnterior = faturaAtual.status;

      let novoStatus: StatusFatura;
      if (novoValorPago >= faturaAtual.valor_total) {
        novoStatus = "PAGA";
      } else if (novoValorPago > 0) {
        novoStatus = "PARCIAL";
      } else {
        novoStatus = faturaAtual.status;
      }

      // 3. Atualizar fatura no banco
      const { data, error } = await supabaseDb.supabase.from("faturas").update({
        valor_pago: novoValorPago,
        status: novoStatus,
        updated_at: new Date().toISOString(),
      }).eq("id", id).select().single();

      if (error) throw error;

      const faturaAtualizada: Fatura = {
        id: data.id,
        numero: data.numero,
        cliente_id: data.cliente_id,
        vendedor: data.vendedor,
        data_emissao: typeof data.data_emissao === "string" ? data.data_emissao : new Date(data.data_emissao).toISOString(),
        data_vencimento: typeof data.data_vencimento === "string" ? data.data_vencimento : new Date(data.data_vencimento).toISOString(),
        valor_total: Number(data.valor_total),
        valor_pago: Number(data.valor_pago),
        status: data.status as StatusFatura,
        condicao_pagamento: data.condicao_pagamento,
        observacoes: data.observacoes,
        metodo_pagamento: data.metodo_pagamento,
        referencia_externa: data.referencia_externa,
        created_at: typeof data.created_at === "string" ? data.created_at : new Date(data.created_at).toISOString(),
        updated_at: typeof data.updated_at === "string" ? data.updated_at : new Date(data.updated_at).toISOString(),
      };

      // 4. Se houve pagamento, atualizar parcelas relacionadas
      let parcelasAtualizadas = 0;
      if (novoStatus === "PAGA" || novoStatus === "PARCIAL") {
        // Buscar parcelas pendentes desta fatura
        const { data: parcelas, error: pe } = await supabaseDb.supabase.from("fatura_parcelas").select("*").eq("fatura_id", id).eq("status_status", "PENDENTE");

        if (pe) throw pe;

        // Atualizar cada parcela conforme o pagamento
        if (parcelas && parcelas.length > 0) {
          let restoPagamento = valorPago;

          for (const parcela of parcelas) {
            if (restoPagamento <= 0) break;

            const valorParcela = Number(parcela.valor_parcela);
            const valorAplicar = Math.min(valorParcela, restoPagamento);

            const novaDataPagamento = new Date().toISOString();
            const novoStatusParcela: StatusParcela = valorAplicar >= valorParcela ? "PAGA" : "PARCIAL";

            await supabaseDb.supabase.from("fatura_parcelas").update({
              data_pagamento: novaDataPagamento,
              status_status: novoStatusParcela,
              juros: parcela.juros, // juros já calculados anteriormente
              multa: parcela.multa,
              observacoes: parcela.observacoes,
            }).eq("id", parcela.id);

            parcelasAtualizadas++;
            restoPagamento -= valorAplicar;
          }
        }
      }

      return { fatura: faturaAtualizada, parcelasAtualizadas };
    } catch (err) {
      console.error("[FaturaService] Erro ao receber pagamento:", err);
      return { fatura: null, parcelasAtualizadas: 0 };
    }
  }

  /** GERAR PARCELAS DE UMA FATURA */
  async gerarParcelas(id: string, numeroParcelas: number, diasVencimento?: number): Promise<{ fatura: Fatura | null; parcelas: any[] }> {
    try {
      // 1. Obter fatura atual
      const fatura = await this.get(id);
      if (!fatura) return { fatura: null, parcelas: [] };

      // 2. Calcular valor por parcela (com precisão exata)
      const parcelasDivididas = dividirEmParcelasExato(fatura.valor_total * 100, numeroParcelas);

      // 3. Definir data de vencimento da primeira parcula
      const dataBase = new Date(fatura.data_vencimento);
      const primeiroVencimento = diasVencimento
        ? new Date(dataBase.getTime() + (diasVencimento * 24 * 60 * 60 * 1000))
        : new Date(dataBase.getTime() + 30 * 24 * 60 * 60 * 1000); // default: 30 dias

      // 4. Gerar parcelas
      const parcelas: any[] = [];

      parcelasDivididas.forEach((item, index) => {
        const vencimento = new Date(primeiroVencimento);
        vencimento.setDate(vencimento.getDate() + index); // cada parcela um dia após a outra (simplificado)

        const valorParcela = item.valor;
        const diasParaVencimento = diasVencimento || 30;
        const juros = 0; // juros seriam calculados se parcela vença e não for paga
        const multa = 0;

        parcelas.push({
          numero_parcela: index + 1,
          valor_parcela: Number(valorParcela.toFixed(2)),
          data_vencimento: vencimento.toISOString().split("T")[0],
          status_status: "PENDENTE" as StatusParcela,
          juros,
          multa,
          desconto: 0,
          observacoes: `Parcela ${index + 1} de ${numeroParcelas} - Fatura ${fatura.numero}`,
        });
      });

      // 5. Inserir parcelas no banco
      const payloads = parcelas.map(p => ({
        id: uuidv4(),
        fatura_id: id,
        organization_id: this.organizationId,
        numero_parcela: p.numero_parcela,
        valor_parcela: p.valor_parcela,
        data_vencimento: p.data_vencimento,
        status_status: "PENDENTE" as StatusParcela,
        juros: p.juros,
        multa: p.multa,
        desconto: p.desconto,
        observacoes: p.observacoes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseDb.supabase.from("fatura_parcelas").insert(payloads);

      if (error) throw error;

      return { fatura, parcelas };
    } catch (err) {
      console.error("[FaturaService] Erro ao gerar parcelas:", err);
      return { fatura: null, parcelas: [] };
    }
  }

  /** LISTAR PARCELAS DE UMA FATURA */
  async listParcelas(faturaId: string, statusFiltro?: StatusParcela): Promise<any[]> {
    try {
      let query = supabaseDb.supabase.from("fatura_parcelas").select("*").eq("fatura_id", faturaId);

      if (statusFiltro) {
        query = query.eq("status_status", statusFiltro);
      }

      const { data, error } = await query.order("numero_parcela", { ascending: true });

      if (error) throw error;
      return data as any[];
    } catch (err) {
      console.error("[FaturaService] Erro ao listar parcelas:", err);
      return [];
    }
  }
}

// Exporta instância factory para injeção de dependência
export function criarFaturaService(organizationId: string) {
  return new FaturaService(organizationId);
}