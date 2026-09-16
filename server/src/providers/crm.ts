import type { CrmOpportunity, CrmProvider } from "./types";
import { supabaseDb } from "../lib/supabase-db";

export class HubCrmProvider implements CrmProvider {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  async list(filters?: { stage?: string; onlyOpen?: boolean }): Promise<CrmOpportunity[]> {
    const result = await supabaseDb.getOpportunities();
    if (!result) return [];

    let opportunities = result;

    // Filtrar por estágio se especificado
    if (filters?.stage) {
      opportunities = opportunities.filter((o: any) => o.estagio === filters.stage);
    }

    // Apenas oportunidades abertas (lead, contato, proposta, negociacao)
    if (filters?.onlyOpen === true) {
      opportunities = opportunities.filter((o: any) =>
        ["lead", "contato", "proposta", "negociacao"].includes(o.estagio)
      );
    }

    return opportunities;
  }

  async get(id: string, organizationId: string): Promise<CrmOpportunity | null> {
    this.ensureOrgId("get");
    const result = await supabaseDb.getOpportunities();
    if (!result) return null;

    const found = (result || []).find((o: any) => o.id === id);
    if (found) return found as CrmOpportunity;
    return null;
  }

  async create(data: Partial<CrmOpportunity>, organizationId: string): Promise<CrmOpportunity> {
    this.ensureOrgId("create");
    const payload = {
      id: data.id,
      organization_id: organizationId,
      titulo: data.titulo,
      cliente_id: data.cliente,
      contato: data.contato,
      telefone: data.telefone,
      email: data.email,
      canal: data.canal || "portal",
      estagio: data.estagio || "lead",
      valor: data.valor ?? 0,
      probabilidade: data.probabilidade ?? 50,
      vendedor: data.vendedor,
      data_criacao: data.data_criacao || new Date().toISOString(),
      previsao_fechamento: data.previsaoFechamento,
      proximo_passo: data.proximoPasso,
      origem_descricao: data.origemDescricao,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("oportunidades_crm").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return {
      id: payload.id,
      titulo: payload.titulo || "",
      cliente: payload.cliente_id || "",
      contato: payload.contato || "",
      telefone: payload.telefone || "",
      email: payload.email || "",
      canal: payload.canal || "portal",
      estagio: payload.estagio || "lead",
      valor: Number(payload.valor || 0),
      probabilidade: Number(payload.probabilidade || 50),
      vendedor: payload.vendedor || "",
      data_criacao: payload.data_criacao || "",
      previsao_fechamento: payload.previsao_fechamento || "",
      proximo_passo: payload.proximo_passo || "",
      origem_descricao: payload.origem_descricao || "",
    };
  }

  async update(id: string, data: Partial<CrmOpportunity>, organizationId: string): Promise<CrmOpportunity> {
    this.ensureOrgId("update");
    const existing = await this.get(id, organizationId);
    if (!existing) throw new Error(`Oportunidade ${id} não encontrada`);

    const payload = {
      id,
      organization_id: organizationId,
      titulo: data.titulo ?? existing.titulo,
      cliente_id: data.cliente ?? existing.cliente,
      contato: data.contato ?? existing.contato,
      telefone: data.telefone ?? existing.telefone,
      email: data.email ?? existing.email,
      canal: data.canal ?? existing.canal,
      estagio: data.estagio ?? existing.estagio,
      valor: data.valor ?? existing.valor,
      probabilidade: data.probabilidade ?? existing.probabilidade,
      vendedor: data.vendedor ?? existing.vendedor,
      data_criacao: existing.data_criacao,
      previsao_fechamento: data.previsaoFechamento ?? existing.previsao_fechamento,
      proximo_passo: data.proximo_passo ?? existing.proximo_passo,
      origem_descricao: data.origem_descricao ?? existing.origem_descricao,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseDb.supabase.from("oportunidades_crm").upsert(payload as any, { onConflict: "id" });
    if (error) throw error;

    return { ...existing, ...data } as CrmOpportunity;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    this.ensureOrgId("delete");
    const { error } = await supabaseDb.supabase.from("oportunidades_crm").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  private ensureOrgId(operation: string): void {
    if (!this.organizationId) {
      throw new Error(`[HubCrmProvider] ${operation} requer organizationId.`);
    }
  }
}