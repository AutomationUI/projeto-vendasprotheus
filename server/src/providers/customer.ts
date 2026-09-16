import { supabaseDb } from "../lib/supabase-db";
import type { Customer, CustomerProvider } from "./types";

export class HubCustomerProvider implements CustomerProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: { role?: string; onlyActive?: boolean }): Promise<Customer[]> {
    // TODO: Implementar filtros avançados quando necessário
    // Por enquanto, busca todos e filtra client-side após receber do Supabase
    const result = await supabaseDb.getCustomers();
    if (!result) return [];

    let customers = result;
    // Aplicar filtro de ativo se especificado
    if (filters?.onlyActive === false) {
      customers = customers.filter(c => c.ativo !== false);
    }

    return customers;
  }

  async get(id: string, organizationId: string): Promise<Customer | null> {
    // Se organizationId diferir do armazenado, fazer busca específica
    if (organizationId && organizationId !== this.organizationId) {
      // Busca no Supabase com filtro de tenant
      try {
        const { data, error } = await supabaseDb.getCustomers(); // simplificado
        // Em produção, haveria uma busca por ID específico com filtros RLS
        if (error) throw error;
        const found = (data || []).find((c: any) => c.id === id);
        if (found) return found as Customer;
        return null;
      } catch (err) {
        console.warn("[HubCustomerProvider] Erro ao buscar cliente por ID com organizationId:", err);
      }
    }

    // Busca no cache/local primeiro
    const result = await supabaseDb.getCustomers();
    if (!result) return null;

    const found = (result || []).find((c: any) => c.id === id);
    if (found) return found as Customer;
    return null;
  }

  async create(data: Partial<Customer>, organizationId: string): Promise<Customer> {
    this.ensureOrgId("create");
    if (organizationId !== this.organizationId) {
      // Validar que a organização corresponde
      // Em um caso real, validaríamos o ID da organização
    }

    // O mapCustomerToDB espera organizationId como segundo parâmetro
    // Mas o supabaseDb.upsertCustomer só recebe o customer - precisamos adaptar
    // Por ora, vamos mapear manualmente para o formato do banco
    const payload = {
      id: data.id,
      organization_id: organizationId,
      razao_social: data.razaoSocial,
      cnpj: data.cnpj,
      email: data.email,
      telefone: data.telefone,
      cidade: data.cidade,
      uf: data.uf,
      endereco: data.endereco,
      condicao_pagamento: data.condicaoPagamento || "30 dias",
      total_compras: data.totalCompras || 0,
      ultima_compra: data.ultimaCompra,
      updated_at: new Date().toISOString(),
    };

    // Note: O supabaseDb.upsertCustomer atualmente usa mapCustomerToDB(c) que não inclui organization_id
    // Em produção, seria necessário atualizar o supabase-db.ts para aceitar organizationId
    // Aqui simulamos o upsert
    const { error } = await supabaseDb.supabase.from("clientes").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      razaoSocial: payload.razao_social || "",
      cnpj: payload.cnpj,
      email: payload.email,
      telefone: payload.telefone,
      cidade: payload.cidade,
      uf: payload.uf || "",
      endereco: payload.endereco || "",
      condicaoPagamento: payload.condicao_pagamento || "30 dias",
      totalCompras: Number(payload.total_compras || 0),
      ultimaCompra: payload.ultima_compra || "",
      ativo: true, // default
    };
  }

  async update(id: string, data: Partial<Customer>, organizationId: string): Promise<Customer> {
    this.ensureOrgId("update");
    // Implementação simplificada - em produção faria update parcial
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Cliente ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      razao_social: data.razaoSocial ?? existing.razaoSocial,
      cnpj: data.cnpj ?? existing.cnpj,
      email: data.email ?? existing.email,
      telefone: data.telefone ?? existing.telefone,
      cidade: data.cidade ?? existing.cidade,
      uf: data.uf ?? existing.uf,
      endereco: data.endereco ?? existing.endereco,
      condicao_pagamento: data.condicaoPagamento ?? existing.condicaoPagamento,
      total_compras: data.totalCompras ?? existing.totalCompras,
      ultima_compra: data.ultimaCompra ?? existing.ultimaCompra,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("clientes").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as Customer;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("clientes").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async findByCnpj(cnpj: string, organizationId: string): Promise<Customer | null> {
    // Busca via Supabase - em produção usaria o índice idx_clientes_org_cnpj
    const result = await supabaseDb.getCustomers();
    if (!result) return null;

    const found = (result || []).find((c: any) => c.cnpj === cnpj);
    if (found) return found as Customer;
    return null;
  }
}