import type { ProductionBatch, ProductionProvider } from "./types";
import { supabaseDb } from "../lib/supabase-db";

export class HubProductionProvider implements ProductionProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: { status?: string; onlyActive?: boolean }): Promise<ProductionBatch[]> {
    const result = await supabaseDb.getBatches();
    if (!result) return [];

    let batches = result;

    // Filtrar por status se especificado
    if (filters?.status) {
      batches = batches.filter((b: any) => b.status === filters.status);
    }

    // Apenas lotes ativos (não finalizados)
    if (filters?.onlyActive === true) {
      batches = batches.filter((b: any) => 
        !["Queimado", "Expedição", "Concluído"].includes(b.status)
      );
    }

    return batches;
  }

  async get(id: string, organizationId: string): Promise<ProductionBatch | null> {
    this.ensureOrgId("get");
    const result = await supabaseDb.getBatches();
    if (!result) return null;

    const found = (result || []).find((b: any) => b.id === id);
    if (found) return found as ProductionBatch;
    return null;
  }

  async create(data: Partial<ProductionBatch>, organizationId: string): Promise<ProductionBatch> {
    this.ensureOrgId("create");
    const payload = {
      id: data.id,
      organization_id: organizationId,
      lote: data.lote,
      produto: data.produto,
      tipo: data.tipo,
      granulacao: data.granulacao,
      quantidade: data.quantidade ?? 0,
      unidade: data.unidade || "PÇ",
      status: data.status ?? "Mistura",
      inicio: data.inicio,
      previsao: data.previsao,
      operador: data.operador,
      prioridade: data.prioridade ?? "Média",
      observacoes: data.observacoes ?? "",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("producao_lotes").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      lote: payload.lote || "",
      produto: payload.produto || "",
      tipo: payload.tipo || "",
      granulacao: payload.granulacao || "",
      quantidade: Number(payload.quantidade || 0),
      unidade: payload.unidade || "PÇ",
      status: payload.status || "Mistura",
      inicio: payload.inicio || "",
      previsao: payload.previsao || "",
      operador: payload.operador || "",
      prioridade: payload.prioridade || "Média",
      observacoes: payload.observacoes || "",
    };
  }

  async update(id: string, data: Partial<ProductionBatch>, organizationId: string): Promise<ProductionBatch> {
    this.ensureOrgId("update");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Lote ${id} não encontrado`);

    const payload = {
      id,
      organization_id: organizationId,
      lote: data.lote ?? existing.lote,
      produto: data.produto ?? existing.produto,
      tipo: data.tipo ?? existing.tipo,
      granulacao: data.granulacao ?? existing.granulacao,
      quantidade: data.quantidade ?? existing.quantidade,
      unidade: data.unidade ?? existing.unidade,
      status: data.status ?? existing.status,
      inicio: data.inicio ?? existing.inicio,
      previsao: data.previsao ?? existing.previsao,
      operador: data.operador ?? existing.operador,
      prioridade: data.prioridade ?? existing.prioridade,
      observacoes: data.observacoes ?? existing.observacoes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("producao_lotes").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as ProductionBatch;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("producao_lotes").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  private ensureOrgId(operation: string): void {
    if (!this.organizationId) {
      throw new Error(`[HubProductionProvider] ${operation} requer organizationId.`);
    }
  }
}