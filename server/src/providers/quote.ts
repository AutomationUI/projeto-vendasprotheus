import type { Quote, QuoteProvider } from "./types";
import { supabaseDb } from "../lib/supabase-db";

export class HubQuoteProvider implements QuoteProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: { status?: string; onlyOpen?: boolean }): Promise<Quote[]> {
    const result = await supabaseDb.getQuotes();
    if (!result) return [];

    let quotes = result;

    // Filtrar por status se especificado
    if (filters?.status) {
      quotes = quotes.filter((q: any) => q.status === filters.status);
    }

    // Apenas orçamentos abertos (Rascunho, Enviado, Pendente de Aprovação)
    if (filters?.onlyOpen === true) {
      quotes = quotes.filter((q: any) =>
        ["Rascunho", "Enviado", "Pendente de Aprovação"].includes(q.status)
      );
    }

    return quotes;
  }

  async get(id: string, organizationId: string): Promise<Quote | null> {
    this.ensureOrgId("get");
    const result = await supabaseDb.getQuotes();
    if (!result) return null;

    const found = (result || []).find((q: any) => q.id === id);
    if (found) return found as Quote;
    return null;
  }

  async create(data: Partial<Quote>, organizationId: string): Promise<Quote> {
    this.ensureOrgId("create");
    const payload = {
      id: data.id,
      organization_id: organizationId,
      numero: data.numero,
      cliente: data.cliente,
      vendedor: data.vendedor,
      data: data.data,
      validade: data.validade,
      valor: data.valor ?? 0,
      status: data.status ?? "Rascunho",
      condicao_pagamento: data.condicao_pagamento || "30 dias",
      observacoes: data.observacoes ?? "",
      itens: data.itens ?? [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("orcamentos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      numero: payload.numero || "",
      cliente: payload.cliente || "",
      vendedor: payload.vendedor || "",
      data: payload.data || "",
      validade: payload.validade || "",
      valor: Number(payload.valor || 0),
      status: payload.status || "Rascunho",
      condicao_pagamento: payload.condicao_pagamento || "30 dias",
      observacoes: payload.observacoes || "",
      itens: payload.itens || [],
    };
  }

  async update(id: string, data: Partial<Quote>, organizationId: string): Promise<Quote> {
    this.ensureOrgId("update");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Orçamento ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      numero: data.numero ?? existing.numero,
      cliente: data.cliente ?? existing.cliente,
      vendedor: data.vendedor ?? existing.vendedor,
      data: data.data ?? existing.data,
      validade: data.validade ?? existing.validade,
      valor: data.valor ?? existing.valor,
      status: data.status ?? existing.status,
      condicao_pagamento: data.condicao_pagamento ?? existing.condicao_pagamento,
      observacoes: data.observacoes ?? existing.observacoes,
      itens: data.itens ?? existing.itens,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("orcamentos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as Quote;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("orcamentos").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async approve(id: string, approverId: string, organizationId: string): Promise<Quote> {
    this.ensureOrgId("approve");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Orçamento ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      numero: existing.numero,
      cliente: existing.cliente,
      vendedor: existing.vendedor,
      data: existing.data,
      validade: existing.validade,
      valor: existing.valor,
      status: "Aprovado", // Status final após aprovação
      condicao_pagamento: existing.condicao_pagamento,
      observacoes: `${existing.observacoes || ""} Aprovado por ${approverId}`,
      itens: existing.itens,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("orcamentos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    // Em um sistema completo, aqui também seria criado o pedido automaticamente
    // ou enviaria notificação ao cliente

    return { ...existing, status: "Aprovado" } as Quote;
  }

  private ensureOrgId(operation: string): void {
    if (!this.organizationId) {
      throw new Error(`[HubQuoteProvider] ${operation} requer organizationId.`);
    }
  }
}