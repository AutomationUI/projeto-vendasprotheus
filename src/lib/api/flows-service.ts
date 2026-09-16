// ─── Serviço Frontend de Gestão e CRUD de Flows ─────────────────────────────
// Comunicação com a API REST `/api/v1/flows` com fallback automático offline-first (localStorage).

import { http, ApiError } from "./http-client";
import { FullFlowTemplate } from "@/types/flows";

export const CUSTOM_FLOWS_STORAGE_KEY = "nexus_crm_custom_flows_v2";

export interface ApiFlowResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

export class FlowsApiService {
  private isOnline = true;

  /**
   * Helper: recupera fluxos locais do localStorage
   */
  private getLocalFlows(): Record<string, FullFlowTemplate> {
    try {
      const saved = localStorage.getItem(CUSTOM_FLOWS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Falha ao ler fluxos do localStorage", e);
    }
    return {};
  }

  /**
   * Helper: salva fluxos locais no localStorage
   */
  private setLocalFlows(flows: Record<string, FullFlowTemplate>): void {
    try {
      localStorage.setItem(CUSTOM_FLOWS_STORAGE_KEY, JSON.stringify(flows));
    } catch (e) {
      console.warn("Falha ao salvar fluxos no localStorage", e);
    }
  }

  /**
   * LIST / READ ALL: Lista fluxos da API com fallback local
   */
  async listFlows(category?: string, search?: string): Promise<{
    source: "server" | "local";
    flows: Record<string, FullFlowTemplate>;
  }> {
    try {
      const params = new URLSearchParams();
      if (category && category !== "todos") params.append("category", category);
      if (search && search.trim()) params.append("search", search.trim());

      const url = `/api/v1/flows${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await http.get<ApiFlowResponse<any[]>>(url, { timeout: 3000 });

      if (res?.success && Array.isArray(res.data)) {
        const flowMap: Record<string, FullFlowTemplate> = {};
        for (const item of res.data) {
          flowMap[item.id] = {
            meta: {
              id: item.id,
              name: item.name,
              category: item.category,
              categoryLabel: item.categoryLabel || "Geral",
              description: item.description || "",
              status: item.status || "Ativo",
              version: item.version || "v1.0",
              tags: item.tags || [],
              erpTables: item.erpTables || [],
              nodesCount: item.nodesCount || item.nodes?.length || 0,
              simDefaultInputs: item.simDefaultInputs || {},
              calculateSimPath: () => (item.nodes || []).map((n: any) => n.id)
            },
            nodes: item.nodes || [],
            edges: item.edges || []
          };
        }
        return { source: "server", flows: flowMap };
      }
    } catch (err) {
      // Backend inacessível ou erro de rede -> fallback offline
      this.isOnline = false;
    }

    // Fallback Local
    return {
      source: "local",
      flows: this.getLocalFlows()
    };
  }

  /**
   * CREATE: Cria um novo fluxo personalizado
   */
  async createFlow(flow: FullFlowTemplate): Promise<{
    success: boolean;
    flow: FullFlowTemplate;
    source: "server" | "local";
  }> {
    const payload = {
      id: flow.meta.id,
      name: flow.meta.name,
      category: flow.meta.category,
      categoryLabel: flow.meta.categoryLabel,
      description: flow.meta.description,
      status: flow.meta.status,
      version: flow.meta.version,
      tags: flow.meta.tags,
      erpTables: flow.meta.erpTables,
      nodes: flow.nodes,
      edges: flow.edges
    };

    // Tenta persistir no servidor
    try {
      const res = await http.post<ApiFlowResponse<any>>("/api/v1/flows", payload, { timeout: 3500 });
      if (res?.success && res.data) {
        // Atualiza cache local espelho
        const local = this.getLocalFlows();
        local[flow.meta.id] = flow;
        this.setLocalFlows(local);
        return { success: true, flow, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    // Fallback: persiste no localStorage
    const local = this.getLocalFlows();
    local[flow.meta.id] = flow;
    this.setLocalFlows(local);
    return { success: true, flow, source: "local" };
  }

  /**
   * UPDATE: Salva modificações em um fluxo
   */
  async updateFlow(flowId: string, flow: FullFlowTemplate): Promise<{
    success: boolean;
    flow: FullFlowTemplate;
    source: "server" | "local";
  }> {
    const payload = {
      name: flow.meta.name,
      category: flow.meta.category,
      categoryLabel: flow.meta.categoryLabel,
      description: flow.meta.description,
      status: flow.meta.status,
      version: flow.meta.version,
      tags: flow.meta.tags,
      erpTables: flow.meta.erpTables,
      nodes: flow.nodes,
      edges: flow.edges
    };

    try {
      const res = await http.put<ApiFlowResponse<any>>(`/api/v1/flows/${flowId}`, payload, { timeout: 3500 });
      if (res?.success) {
        const local = this.getLocalFlows();
        local[flowId] = flow;
        this.setLocalFlows(local);
        return { success: true, flow, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    // Fallback Local
    const local = this.getLocalFlows();
    local[flowId] = flow;
    this.setLocalFlows(local);
    return { success: true, flow, source: "local" };
  }

  /**
   * SAVE FLOW: Alias para persistir ou criar fluxo completo
   */
  async saveFlow(flowId: string, flow: FullFlowTemplate): Promise<{
    success: boolean;
    flow: FullFlowTemplate;
    source: "server" | "local";
  }> {
    return this.updateFlow(flowId, flow);
  }

  /**
   * SAVE LAYOUT: Persiste a posição atual de cada nó e as conexões no banco de dados via API
   * Garantindo que o desenho seja carregado exatamente como o usuário deixou.
   */
  async saveLayout(
    flowId: string,
    nodes: any[],
    edges: any[],
    extra?: {
      viewport?: { x: number; y: number; zoom: number };
      name?: string;
      status?: string;
      category?: string;
      description?: string;
    }
  ): Promise<{
    success: boolean;
    flow?: FullFlowTemplate;
    source: "server" | "local";
    message?: string;
  }> {
    const payload = {
      nodes,
      edges,
      viewport: extra?.viewport,
      name: extra?.name,
      status: extra?.status,
      category: extra?.category,
      description: extra?.description
    };

    // Atualiza imediatamente o espelho local para garantir persistência offline e reatividade instantânea
    const localFlows = this.getLocalFlows();
    const existingLocal = localFlows[flowId];
    if (existingLocal) {
      existingLocal.nodes = nodes;
      existingLocal.edges = edges;
      existingLocal.meta.nodesCount = nodes.length;
      if (extra?.name) existingLocal.meta.name = extra.name;
      if (extra?.status) existingLocal.meta.status = extra.status as any;
      localFlows[flowId] = existingLocal;
      this.setLocalFlows(localFlows);
    }

    try {
      const res = await http.put<ApiFlowResponse<any>>(`/api/v1/flows/${flowId}/layout`, payload, { timeout: 4000 });
      if (res?.success && res.data) {
        const item = res.data;
        const savedTemplate: FullFlowTemplate = {
          meta: {
            id: item.id,
            name: item.name,
            category: item.category,
            categoryLabel: item.categoryLabel || "Geral",
            description: item.description || "",
            status: item.status || "Ativo",
            version: item.version || "v1.0",
            tags: item.tags || [],
            erpTables: item.erpTables || [],
            nodesCount: item.nodesCount || item.nodes?.length || nodes.length,
            simDefaultInputs: item.simDefaultInputs || existingLocal?.meta?.simDefaultInputs || {},
            calculateSimPath: existingLocal?.meta?.calculateSimPath || (() => (item.nodes || []).map((n: any) => n.id))
          },
          nodes: item.nodes || nodes,
          edges: item.edges || edges
        };

        // Atualiza cache local sincronizado
        const currentLocals = this.getLocalFlows();
        currentLocals[flowId] = savedTemplate;
        this.setLocalFlows(currentLocals);

        return {
          success: true,
          flow: savedTemplate,
          source: "server",
          message: res.message || "Layout salvo com sucesso no banco de dados via API"
        };
      }
    } catch (err) {
      console.warn("[FlowsApiService] Servidor indisponível ao salvar layout, gravando localmente:", err);
      this.isOnline = false;
    }

    // Fallback: Se o fluxo não estava no localFlows ainda, cria entrada correspondente
    if (!existingLocal) {
      const fallbackTemplate: FullFlowTemplate = {
        meta: {
          id: flowId,
          name: extra?.name || flowId,
          category: extra?.category || "crm",
          categoryLabel: "Comercial & CRM",
          description: extra?.description || "Fluxo com layout customizado.",
          status: (extra?.status as any) || "Personalizado",
          version: "v1.0",
          tags: ["Layout Salvo"],
          erpTables: ["SA1 - Clientes"],
          nodesCount: nodes.length,
          simDefaultInputs: {},
          calculateSimPath: () => nodes.map((n: any) => n.id)
        },
        nodes,
        edges
      };
      localFlows[flowId] = fallbackTemplate;
      this.setLocalFlows(localFlows);
      return {
        success: true,
        flow: fallbackTemplate,
        source: "local",
        message: "Layout persistido no armazenamento local offline"
      };
    }

    return {
      success: true,
      flow: existingLocal,
      source: "local",
      message: "Layout persistido no armazenamento local offline"
    };
  }

  /**
   * GET BY ID: Busca um fluxo específico com fallback
   */
  async getFlowById(flowId: string): Promise<{
    flow: FullFlowTemplate | null;
    source: "server" | "local";
  }> {
    try {
      const res = await http.get<ApiFlowResponse<any>>(`/api/v1/flows/${flowId}`, { timeout: 3000 });
      if (res?.success && res.data) {
        const item = res.data;
        const flow: FullFlowTemplate = {
          meta: {
            id: item.id,
            name: item.name,
            category: item.category,
            categoryLabel: item.categoryLabel || "Geral",
            description: item.description || "",
            status: item.status || "Ativo",
            version: item.version || "v1.0",
            tags: item.tags || [],
            erpTables: item.erpTables || [],
            nodesCount: item.nodesCount || item.nodes?.length || 0,
            simDefaultInputs: item.simDefaultInputs || {},
            calculateSimPath: () => (item.nodes || []).map((n: any) => n.id)
          },
          nodes: item.nodes || [],
          edges: item.edges || []
        };
        return { flow, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    const local = this.getLocalFlows();
    return { flow: local[flowId] || null, source: "local" };
  }

  /**
   * DELETE: Remove fluxo customizado
   */
  async deleteFlow(flowId: string): Promise<{
    success: boolean;
    source: "server" | "local";
  }> {
    try {
      const res = await http.delete<ApiFlowResponse<any>>(`/api/v1/flows/${flowId}`, { timeout: 3000 });
      if (res?.success) {
        const local = this.getLocalFlows();
        delete local[flowId];
        this.setLocalFlows(local);
        return { success: true, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    // Fallback Local
    const local = this.getLocalFlows();
    delete local[flowId];
    this.setLocalFlows(local);
    return { success: true, source: "local" };
  }

  /**
   * DUPLICATE: Duplica fluxo existente
   */
  async duplicateFlow(sourceFlowId: string, customName?: string): Promise<{
    success: boolean;
    newFlow: FullFlowTemplate;
    source: "server" | "local";
  }> {
    try {
      const res = await http.post<ApiFlowResponse<any>>(`/api/v1/flows/${sourceFlowId}/duplicate`, { name: customName }, { timeout: 3500 });
      if (res?.success && res.data) {
        const item = res.data;
        const newFlow: FullFlowTemplate = {
          meta: {
            id: item.id,
            name: item.name,
            category: item.category,
            categoryLabel: item.categoryLabel || "Geral",
            description: item.description || "",
            status: item.status || "Personalizado",
            version: item.version || "v1.0 (Cópia)",
            tags: item.tags || [],
            erpTables: item.erpTables || [],
            nodesCount: item.nodes?.length || 0,
            simDefaultInputs: {},
            calculateSimPath: () => (item.nodes || []).map((n: any) => n.id)
          },
          nodes: item.nodes || [],
          edges: item.edges || []
        };
        const local = this.getLocalFlows();
        local[newFlow.meta.id] = newFlow;
        this.setLocalFlows(local);
        return { success: true, newFlow, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    // Fallback Local se API offline
    const local = this.getLocalFlows();
    const source = local[sourceFlowId];
    const newId = `flow-dup-${Date.now()}`;
    const duplicatedFlow: FullFlowTemplate = {
      meta: {
        ...(source?.meta || {
          id: newId,
          name: "Novo Fluxo",
          category: "crm",
          categoryLabel: "CRM",
          description: "",
          status: "Personalizado",
          version: "v1.0",
          tags: ["Personalizado"],
          erpTables: ["SA1 - Clientes"],
          simDefaultInputs: {},
          calculateSimPath: () => []
        }),
        id: newId,
        name: customName || `${source?.meta.name || 'Fluxo'} (Cópia)`,
        version: "v1.0 (Cópia)",
        status: "Personalizado"
      },
      nodes: source ? JSON.parse(JSON.stringify(source.nodes)) : [],
      edges: source ? JSON.parse(JSON.stringify(source.edges)) : []
    };

    local[newId] = duplicatedFlow;
    this.setLocalFlows(local);
    return { success: true, newFlow: duplicatedFlow, source: "local" };
  }

  /**
   * PATCH STATUS: Altera o status do fluxo (Rascunho, Homologação, Produção, Ativo)
   */
  async changeStatus(flowId: string, status: string): Promise<{
    success: boolean;
    source: "server" | "local";
  }> {
    try {
      const res = await http.patch<ApiFlowResponse<any>>(`/api/v1/flows/${flowId}/status`, { status }, { timeout: 3000 });
      if (res?.success) {
        const local = this.getLocalFlows();
        if (local[flowId]) {
          local[flowId].meta.status = status as any;
          this.setLocalFlows(local);
        }
        return { success: true, source: "server" };
      }
    } catch {
      this.isOnline = false;
    }

    // Fallback Local
    const local = this.getLocalFlows();
    if (local[flowId]) {
      local[flowId].meta.status = status as any;
      this.setLocalFlows(local);
    }
    return { success: true, source: "local" };
  }
}

export const flowsApiService = new FlowsApiService();
