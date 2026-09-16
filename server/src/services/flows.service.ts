// ─── Serviço de Gestão e CRUD de Flows (Backend SaaS) ──────────────────────
// Suporte a Multi-Tenancy (X-Organization-Id), validação estrutural e persistência no banco de dados.

import fs from "fs";
import path from "path";
import { supabase } from "../lib/supabase.js";

export interface FlowRecord {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  categoryLabel: string;
  description: string;
  status: 'Ativo' | 'Homologação' | 'Produção' | 'Rascunho' | 'Personalizado';
  version: string;
  tags: string[];
  erpTables: string[];
  nodesCount: number;
  nodes: any[];
  edges: any[];
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
  authorEmail?: string;
  viewport?: { x: number; y: number; zoom: number };
}

export class FlowsService {
  // Store isolado por organização
  private flowsByOrg = new Map<string, Map<string, FlowRecord>>();
  private storageFilePath = path.join(process.cwd(), "server", "data", "flows-store.json");

  constructor() {
    this.seedDefaultOrgFlows("default");
    this.seedDefaultOrgFlows("org-1");
    this.loadFromDisk();
    this.syncFromSupabase();
  }

  /**
   * Carrega fluxos persistidos do arquivo local de backup
   */
  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, "utf-8");
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          for (const [orgId, flows] of Object.entries(data)) {
            if (!this.flowsByOrg.has(orgId)) {
              this.flowsByOrg.set(orgId, new Map());
            }
            const orgMap = this.flowsByOrg.get(orgId)!;
            for (const [flowId, flow] of Object.entries(flows as Record<string, FlowRecord>)) {
              orgMap.set(flowId, flow);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[FlowsService] Aviso ao ler persistência local:", err);
    }
  }

  /**
   * Salva estado atualizado em disco
   */
  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const serializable: Record<string, Record<string, FlowRecord>> = {};
      for (const [orgId, orgMap] of this.flowsByOrg.entries()) {
        serializable[orgId] = {};
        for (const [flowId, flow] of orgMap.entries()) {
          serializable[orgId][flowId] = flow;
        }
      }
      fs.writeFileSync(this.storageFilePath, JSON.stringify(serializable, null, 2), "utf-8");
    } catch (err) {
      console.warn("[FlowsService] Aviso ao persistir no disco:", err);
    }
  }

  /**
   * Sincroniza layouts salvos do banco Supabase
   */
  private async syncFromSupabase(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("id, data, updated_at")
        .like("id", "flow_layout_%");

      if (error || !data) return;

      for (const row of data) {
        if (row.data && row.data.flowId) {
          const orgId = row.data.orgId || "default";
          const orgMap = this.getOrgMap(orgId);
          const existing = orgMap.get(row.data.flowId);

          if (existing && Array.isArray(row.data.nodes) && Array.isArray(row.data.edges)) {
            orgMap.set(row.data.flowId, {
              ...existing,
              nodes: row.data.nodes,
              edges: row.data.edges,
              nodesCount: row.data.nodes.length,
              viewport: row.data.viewport || existing.viewport,
              updatedAt: row.updated_at || existing.updatedAt,
            });
          }
        }
      }
    } catch (err) {
      console.warn("[FlowsService] Aviso ao sincronizar com Supabase:", err);
    }
  }

  private seedDefaultOrgFlows(orgId: string) {
    if (!this.flowsByOrg.has(orgId)) {
      this.flowsByOrg.set(orgId, new Map());
    }
    const orgMap = this.flowsByOrg.get(orgId)!;

    const initialTemplates: Array<Omit<FlowRecord, "organizationId">> = [
      {
        id: "lead-routing",
        name: "Roteamento Inteligente de Leads",
        category: "crm",
        categoryLabel: "Comercial & CRM",
        description: "Qualifica leads por porte, score de crédito e roteia para representantes conforme carteira Protheus.",
        status: "Produção",
        version: "v2.4",
        tags: ["CRM", "Leads", "SLA", "Protheus"],
        erpTables: ["SA1 - Clientes", "SA3 - Vendedores"],
        nodesCount: 5,
        nodes: [
          {
            id: "node-start",
            type: "triggerNode",
            position: { x: 260, y: 40 },
            data: {
              label: "Recebimento de Novo Lead",
              type: "trigger",
              icon: "zap",
              description: "Entrada omnicanal (Portal B2B, WhatsApp ou Webhook)",
              config: { source: "TOTVS Webhook", protheusSyncEnabled: true, protheusTable: "SA1 - Clientes" }
            }
          },
          {
            id: "node-cond-score",
            type: "conditionNode",
            position: { x: 260, y: 190 },
            data: {
              label: "Verificação de Score",
              type: "condition",
              icon: "fork",
              description: "Avalia faturamento e limite cadastrado no Serasa/ERP.",
              config: { field: "Faturamento Anual", operator: ">=", value: "R$ 500.000" }
            }
          },
          {
            id: "node-route-key",
            type: "actionNode",
            position: { x: 100, y: 350 },
            data: {
              label: "Roteamento Key Account",
              type: "action",
              icon: "user-plus",
              description: "Distribui para gerente sênior de grandes contas.",
              config: { assigneeGroup: "Gerência Comercial", emailTemplate: "Alerta de Lead Premium" }
            }
          },
          {
            id: "node-route-field",
            type: "actionNode",
            position: { x: 420, y: 350 },
            data: {
              label: "Roteamento Representante",
              type: "action",
              icon: "mail",
              description: "Encaminha para representante local da microrregião.",
              config: { assigneeGroup: "Força de Vendas Externa", emailTemplate: "Novo Lead Atribuído" }
            }
          }
        ],
        edges: [
          { id: "e1-2", source: "node-start", target: "node-cond-score", type: "stepConnectorEdge", animated: true },
          { id: "e2-3", source: "node-cond-score", target: "node-route-key", type: "conditionalEdge", data: { conditionType: "sim" } },
          { id: "e2-4", source: "node-cond-score", target: "node-route-field", type: "conditionalEdge", data: { conditionType: "nao" } }
        ],
        isCustom: false,
        createdAt: "2026-01-10T10:00:00Z",
        updatedAt: "2026-02-15T14:30:00Z"
      },
      {
        id: "credit-approval",
        name: "Esteira de Alçada e Aprovação de Crédito",
        category: "finance",
        categoryLabel: "Financeiro & Crédito",
        description: "Aprova pedidos automaticamente abaixo de R$ 50k ou dispara alçada de diretoria.",
        status: "Produção",
        version: "v3.1",
        tags: ["Crédito", "Financeiro", "Protheus SC5", "SE1"],
        erpTables: ["SC5 - Pedidos de Venda", "SE1 - Contas a Receber"],
        nodesCount: 4,
        nodes: [
          {
            id: "node-sc5",
            type: "triggerNode",
            position: { x: 260, y: 40 },
            data: {
              label: "Pedido Digitado no Protheus",
              type: "trigger",
              icon: "zap",
              description: "Monitor de inclusão de pedido no ERP (SC5).",
              config: { source: "Protheus CDC", protheusSyncEnabled: true, protheusTable: "SC5 - Pedidos de Venda" }
            }
          },
          {
            id: "node-val-credit",
            type: "conditionNode",
            position: { x: 260, y: 190 },
            data: {
              label: "Alçada de Valor",
              type: "condition",
              icon: "fork",
              description: "Checa se pedido excede alçada padrão da filial.",
              config: { field: "Valor Total", operator: "<=", value: "R$ 50.000" }
            }
          },
          {
            id: "node-auto-appr",
            type: "actionNode",
            position: { x: 120, y: 350 },
            data: {
              label: "Liberação Automática ERP",
              type: "action",
              icon: "check",
              description: "Libera pedido no Protheus e envia espelho para faturamento.",
              config: { actionOutcome: "Liberado no ERP" }
            }
          },
          {
            id: "node-dir-appr",
            type: "actionNode",
            position: { x: 400, y: 350 },
            data: {
              label: "Alçada da Diretoria Financeira",
              type: "action",
              icon: "lock",
              description: "Bloqueia pedido preventivamente e notifica diretor financeiro.",
              config: { assigneeGroup: "Diretoria Financeira" }
            }
          }
        ],
        edges: [
          { id: "e-cr-1", source: "node-sc5", target: "node-val-credit", type: "stepConnectorEdge" },
          { id: "e-cr-2", source: "node-val-credit", target: "node-auto-appr", type: "conditionalEdge" },
          { id: "e-cr-3", source: "node-val-credit", target: "node-dir-appr", type: "conditionalEdge" }
        ],
        isCustom: false,
        createdAt: "2026-01-15T09:00:00Z",
        updatedAt: "2026-03-01T11:20:00Z"
      }
    ];

    for (const t of initialTemplates) {
      orgMap.set(t.id, { ...t, organizationId: orgId });
    }
  }

  private getOrgMap(orgId: string): Map<string, FlowRecord> {
    if (!this.flowsByOrg.has(orgId)) {
      this.seedDefaultOrgFlows(orgId);
    }
    return this.flowsByOrg.get(orgId)!;
  }

  // ─── CRUD Operations ──────────────────────────────────────────────────

  /**
   * READ: List flows with optional search and category filters
   */
  listFlows(orgId: string, query?: { category?: string; search?: string; status?: string }): FlowRecord[] {
    const orgMap = this.getOrgMap(orgId);
    let items = Array.from(orgMap.values());

    if (query?.category && query.category !== "todos") {
      items = items.filter((f) => f.category === query.category);
    }

    if (query?.status) {
      items = items.filter((f) => f.status.toLowerCase() === query.status?.toLowerCase());
    }

    if (query?.search && query.search.trim()) {
      const q = query.search.toLowerCase().trim();
      items = items.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.tags.some((t) => t.toLowerCase().includes(q)) ||
          f.erpTables.some((tbl) => tbl.toLowerCase().includes(q))
      );
    }

    return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  /**
   * READ: Get a single flow by ID
   */
  getFlowById(orgId: string, flowId: string): FlowRecord | null {
    const orgMap = this.getOrgMap(orgId);
    return orgMap.get(flowId) || null;
  }

  /**
   * CREATE: Create a new custom flow
   */
  createFlow(orgId: string, data: Partial<FlowRecord> & { name: string }): FlowRecord {
    const orgMap = this.getOrgMap(orgId);
    const flowId = data.id || `flow-${Date.now()}`;
    const now = new Date().toISOString();

    const newFlow: FlowRecord = {
      id: flowId,
      organizationId: orgId,
      name: data.name,
      category: data.category || "crm",
      categoryLabel: data.categoryLabel || "Comercial & CRM",
      description: data.description || "Fluxo de decisão automatizado customizado.",
      status: data.status || "Rascunho",
      version: data.version || "v1.0",
      tags: data.tags && data.tags.length > 0 ? data.tags : ["Personalizado"],
      erpTables: data.erpTables && data.erpTables.length > 0 ? data.erpTables : ["SA1 - Clientes"],
      nodesCount: Array.isArray(data.nodes) ? data.nodes.length : 1,
      nodes: data.nodes || [
        {
          id: "node-start",
          type: "triggerNode",
          position: { x: 260, y: 60 },
          data: {
            label: "Disparo Inicial",
            type: "trigger",
            icon: "zap",
            description: "Ponto de entrada do processo.",
            config: { source: "CRM / Webhook" }
          }
        }
      ],
      edges: data.edges || [],
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      authorEmail: data.authorEmail
    };

    orgMap.set(flowId, newFlow);
    this.persistToDisk();
    return newFlow;
  }

  /**
   * SAVE LAYOUT: Persiste a posição atual de cada nó e as conexões no banco de dados
   * Garantindo que o desenho seja recarregado exatamente como o usuário deixou.
   */
  async saveLayout(
    orgId: string,
    flowId: string,
    data: {
      nodes: any[];
      edges: any[];
      viewport?: { x: number; y: number; zoom: number };
      name?: string;
      category?: string;
      categoryLabel?: string;
      description?: string;
      status?: string;
    }
  ): Promise<FlowRecord> {
    const orgMap = this.getOrgMap(orgId);
    let existing = orgMap.get(flowId);
    const now = new Date().toISOString();

    if (!existing) {
      // Se não encontrado nesta organização, busca da default ou inicializa
      const defaultMap = this.getOrgMap("default");
      const defaultTmpl = defaultMap.get(flowId);

      if (defaultTmpl) {
        existing = {
          ...JSON.parse(JSON.stringify(defaultTmpl)),
          organizationId: orgId,
          isCustom: true
        };
      } else {
        existing = {
          id: flowId,
          organizationId: orgId,
          name: data.name || flowId,
          category: data.category || "crm",
          categoryLabel: data.categoryLabel || "Comercial & CRM",
          description: data.description || "Fluxo de processos salvo via Flow Studio.",
          status: (data.status as any) || "Personalizado",
          version: "v1.0",
          tags: ["Layout Salvo"],
          erpTables: ["SA1 - Clientes"],
          nodesCount: data.nodes.length,
          nodes: data.nodes,
          edges: data.edges,
          isCustom: true,
          createdAt: now,
          updatedAt: now
        };
      }
    }

    const updated: FlowRecord = {
      ...existing,
      nodes: data.nodes,
      edges: data.edges,
      nodesCount: data.nodes.length,
      viewport: data.viewport || existing.viewport,
      updatedAt: now,
      ...(data.name ? { name: data.name } : {}),
      ...(data.status ? { status: data.status as any } : {})
    };

    orgMap.set(flowId, updated);
    this.persistToDisk();

    // Persistência assíncrona no banco de dados Supabase (tabela configuracoes)
    try {
      const recordKey = `flow_layout_${orgId}_${flowId}`;
      await supabase.from("configuracoes").upsert({
        id: recordKey,
        data: {
          flowId,
          orgId,
          name: updated.name,
          nodes: updated.nodes,
          edges: updated.edges,
          viewport: updated.viewport,
          nodesCount: updated.nodesCount,
          updatedAt: now
        },
        updated_at: now
      }, { onConflict: "id" });
    } catch (dbErr) {
      console.warn("[FlowsService] Aviso ao persistir layout no Supabase:", dbErr);
    }

    return updated;
  }

  /**
   * UPDATE: Update flow structure or metadata
   */
  updateFlow(orgId: string, flowId: string, patch: Partial<FlowRecord>): FlowRecord | null {
    const orgMap = this.getOrgMap(orgId);
    let existing = orgMap.get(flowId);
    
    // Se o fluxo ainda não existe na org, tenta clonar da default ou criar
    if (!existing) {
      const defaultMap = this.getOrgMap("default");
      const inDefault = defaultMap.get(flowId);
      if (inDefault) {
        existing = { ...JSON.parse(JSON.stringify(inDefault)), organizationId: orgId };
      }
    }

    const now = new Date().toISOString();
    const updated: FlowRecord = existing ? {
      ...existing,
      ...patch,
      id: existing.id,
      organizationId: orgId,
      nodesCount: patch.nodes ? patch.nodes.length : existing.nodesCount,
      updatedAt: now
    } : {
      id: flowId,
      organizationId: orgId,
      name: patch.name || flowId,
      category: patch.category || "crm",
      categoryLabel: patch.categoryLabel || "Comercial & CRM",
      description: patch.description || "",
      status: patch.status || "Personalizado",
      version: patch.version || "v1.0",
      tags: patch.tags || [],
      erpTables: patch.erpTables || [],
      nodesCount: patch.nodes?.length || 0,
      nodes: patch.nodes || [],
      edges: patch.edges || [],
      isCustom: true,
      createdAt: now,
      updatedAt: now,
      ...patch
    };

    orgMap.set(flowId, updated);
    this.persistToDisk();
    return updated;
  }

  /**
   * DELETE: Delete custom flow or reset standard template
   */
  deleteFlow(orgId: string, flowId: string): { success: boolean; isCustom: boolean } {
    const orgMap = this.getOrgMap(orgId);
    const existing = orgMap.get(flowId);
    if (!existing) return { success: false, isCustom: false };

    if (existing.isCustom) {
      orgMap.delete(flowId);
      this.persistToDisk();
      return { success: true, isCustom: true };
    } else {
      // Re-seed original state for standard template
      this.seedDefaultOrgFlows(orgId);
      this.persistToDisk();
      return { success: true, isCustom: false };
    }
  }

  /**
   * DUPLICATE / CLONE: Clone an existing flow into a new independent custom flow
   */
  duplicateFlow(orgId: string, flowId: string, customName?: string): FlowRecord | null {
    const orgMap = this.getOrgMap(orgId);
    const source = orgMap.get(flowId);
    if (!source) return null;

    const newId = `flow-copy-${Date.now()}`;
    const now = new Date().toISOString();

    const duplicated: FlowRecord = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      organizationId: orgId,
      name: customName || `${source.name} (Cópia)`,
      version: "v1.0 (Cópia)",
      status: "Personalizado",
      isCustom: true,
      createdAt: now,
      updatedAt: now
    };

    orgMap.set(newId, duplicated);
    this.persistToDisk();
    return duplicated;
  }

  /**
   * STATUS CHANGE: Promote or alter lifecycle status
   */
  changeStatus(orgId: string, flowId: string, status: FlowRecord["status"]): FlowRecord | null {
    return this.updateFlow(orgId, flowId, { status });
  }
}

export const flowsService = new FlowsService();
