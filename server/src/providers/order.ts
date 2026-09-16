import type { Order, OrderProvider } from "./types";
import { supabaseDb } from "../lib/supabase-db";

export class HubOrderProvider implements OrderProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: {
    status?: string;
    onlyOpen?: boolean;
    dateRange?: { from: string; to: string };
  }): Promise<Order[]> {
    const result = await supabaseDb.getOrders();
    if (!result) return [];

    let orders = result;

    // Filtrar por status se especificado
    if (filters?.status) {
      orders = orders.filter((o: any) => o.status === filters.status);
    }

    // Filtrar apenas pedidos abertos (não faturados/cancelados) se onlyOpen
    if (filters?.onlyOpen === true) {
      orders = orders.filter((o: any) => 
        o.status && !["Faturado", "Cancelado", "Recusado"].includes(o.status)
      );
    }

    // Filtrar por dataRange se especificado
    if (filters?.dateRange) {
      const { from, to } = filters.dateRange;
      orders = orders.filter((o: any) => {
        const orderDate = o.data;
        return orderDate >= from && orderDate <= to;
      });
    }

    return orders;
  }

  async get(id: string, organizationId: string): Promise<Order | null> {
    this.ensureOrgId("get");
    const result = await supabaseDb.getOrders();
    if (!result) return null;

    const found = (result || []).find((o: any) => o.id === id);
    if (found) return found as Order;
    return null;
  }

  async create(data: Partial<Order>, organizationId: string): Promise<Order> {
    this.ensureOrgId("create");
    // Mapear para o formato snake_case do banco
    const payload = {
      id: data.id,
      organization_id: organizationId,
      numero: data.numero,
      cliente: data.cliente,
      vendedor: data.vendedor,
      data: data.data,
      valor: data.valor ?? 0,
      status: data.status ?? "Pendente",
      condicao_pagamento: data.condicaoPagamento || "30 dias",
      observacoes: data.observacoes ?? "",
      itens: data.itens ?? [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("pedidos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      numero: payload.numero || "",
      cliente: payload.cliente || "",
      vendedor: payload.vendedor || "",
      data: payload.data || "",
      valor: Number(payload.valor || 0),
      status: payload.status || "Pendente",
      condicaoPagamento: payload.condicao_pagamento || "30 dias",
      observacoes: payload.observacoes || "",
      itens: payload.itens || [],
    };
  }

  async update(id: string, data: Partial<Order>, organizationId: string): Promise<Order> {
    this.ensureOrgId("update");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Pedido ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      numero: data.numero ?? existing.numero,
      cliente: data.cliente ?? existing.cliente,
      vendedor: data.vendedor ?? existing.vendedor,
      data: data.data ?? existing.data,
      valor: data.valor ?? existing.valor,
      status: data.status ?? existing.status,
      condicao_pagamento: data.condicao_pagamento ?? existing.condicao_pagamento,
      observacoes: data.observacoes ?? existing.observacoes,
      itens: data.itens ?? existing.itens,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("pedidos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as Order;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("pedidos").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async fromQuote(quoteId: string, organizationId: string): Promise<Order | null> {
    this.ensureOrgId("fromQuote");
    // Buscar o orçamento e converter para pedido
    // Simplificação: em produção, buscaria o orçamento e mapearia itens/preços
    const quotes = await supabaseDb.getQuotes();
    if (!quotes) return null;

    const quote = (quotes || []).find((q: any) => q.id === quoteId);
    if (!quote) return null;

    // Converter orçamento em pedido - exemplo simplificado
    const newOrder: Order = {
      id: `auto-${Date.now()}`,
      numero: `PV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      cliente: quote.cliente,
      vendedor: quote.vendedor,
      data: new Date().toISOString().split('T')[0],
      valor: quote.valor,
      status: "Pendente",
      condicaoPagamento: quote.condicao_pagamento || "30 dias",
      observacoes: `Conversão automática do orçamento ${quote.numero}`,
      itens: quote.itens || [],
    };

    // Persistir o pedido
    const payload = {
      id: newOrder.id,
      organization_id: organizationId,
      numero: newOrder.numero,
      cliente: newOrder.cliente,
      vendedor: newOrder.vendedor,
      data: newOrder.data,
      valor: newOrder.valor,
      status: newOrder.status,
      condicao_pagamento: newOrder.condicao_pagamento,
      observacoes: newOrder.observacoes,
      itens: newOrder.itens,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("pedidos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return newOrder;
  }

  private ensureOrgId(operation: string): void {
    if (!this.organizationId) {
      throw new Error(`[HubOrderProvider] ${operation} requer organizationId.`);
    }
  }
}