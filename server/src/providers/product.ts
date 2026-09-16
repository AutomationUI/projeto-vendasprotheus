import type { Product, ProductProvider } from "./types";
import { supabaseDb } from "../lib/supabase-db";

export class HubProductProvider implements ProductProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: {
    category?: string;
    onlyActive?: boolean;
    onlyWithStock?: boolean;
  }): Promise<Product[]> {
    const result = await supabaseDb.getProducts();
    if (!result) return [];

    let products = result;

    // Filtrar por categoria se especificado
    if (filters?.category) {
      products = products.filter((p: any) => p.categoria === filters.category);
    }

    // Filtrar apenas itens com estoque > 0 se especificado
    if (filters?.onlyWithStock === true) {
      products = products.filter((p: any) => (p.estoque || 0) > 0);
    }

    // Aplicar filtro de ativo
    if (filters?.onlyActive === false) {
      // Nota: products não têm campo ativo direto neste modelo simplificado
    }

    return products;
  }

  async get(id: string, organizationId: string): Promise<Product | null> {
    this.ensureOrgId("get");
    const result = await supabaseDb.getProducts();
    if (!result) return null;

    const found = (result || []).find((p: any) => p.id === id);
    if (found) return found as Product;
    return null;
  }

  async search(query: string, organizationId: string): Promise<Product[]> {
    this.ensureOrgId("search");
    const result = await supabaseDb.getProducts();
    if (!result) return [];

    const lowerQuery = query.toLowerCase();
    return (result || []).filter((p: any) =>
      (p.nome && p.nome.toLowerCase().includes(lowerQuery)) ||
      (p.codigo && p.codigo.toLowerCase().includes(lowerQuery)) ||
      (p.tags && p.tags.some((t: string) => t.toLowerCase().includes(lowerQuery)))
    );
  }

  async create(data: Partial<Product>, organizationId: string): Promise<Product> {
    this.ensureOrgId("create");
    // Mapear para o formato do banco (snake_case)
    const payload = {
      id: data.id,
      organization_id: organizationId,
      codigo: data.codigo,
      nome: data.nome,
      categoria: data.categoria || "Geral",
      preco: data.preco ?? 0,
      custo: data.custo ?? 0,
      estoque: data.estoque ?? 0,
      estoque_minimo: data.estoqueMinimo ?? 0,
      unidade: data.unidade || "UN",
      sugestoes: data.sugestoes ?? [],
      tags: data.tags ?? [],
      media_venda_mensal: data.mediaVendaMensal ?? 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("produtos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      codigo: payload.codigo || "",
      nome: payload.nome || "",
      categoria: payload.categoria || "Geral",
      preco: Number(payload.preco || 0),
      custo: Number(payload.custo || 0),
      estoque: Number(payload.estoque || 0),
      estoqueMinimo: Number(payload.estoque_minimo || 0),
      unidade: payload.unidade || "UN",
      sugestoes: payload.sugestoes || [],
      tags: payload.tags || [],
      mediaVendaMensal: Number(payload.media_venda_mensal || 0),
    };
  }

  async update(id: string, data: Partial<Product>, organizationId: string): Promise<Product> {
    this.ensureOrgId("update");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Produto ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      codigo: data.codigo ?? existing.codigo,
      nome: data.nome ?? existing.nome,
      categoria: data.categoria ?? existing.categoria,
      preco: data.preco ?? existing.preco,
      custo: data.custo ?? existing.custo,
      estoque: data.estoque ?? existing.estoque,
      estoque_minimo: data.estoque_minimo ?? existing.estoque_minimo,
      unidade: data.unidade ?? existing.unidade,
      sugestoes: data.sugestoes ?? existing.sugestoes,
      tags: data.tags ?? existing.tags,
      media_venda_mensal: data.mediaVendaMensal ?? existing.mediaVendaMensal,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("produtos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as Product;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("produtos").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  async adjustStock(id: string, delta: number, organizationId: string): Promise<Product | null> {
    this.ensureOrgId("adjustStock");
    const existing = await this.get(id, organizationId);
    if (!existing) return null;

    const newStock = (existing.estoque || 0) + delta;
    const payload = {
      id,
      organization_id: organizationId,
      estoque: newStock,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("produtos").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, estoque: newStock } as Product;
  }

  private ensureOrgId(operation: string): void {
    if (!this.organizationId) {
      throw new Error(`[HubProductProvider] ${operation} requer organizationId.`);
    }
  }
}