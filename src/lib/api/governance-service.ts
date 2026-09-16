// ─── Frontend: Governance Service ─────────────────────────────────────────
// Cliente do Commercial Governance & Rules Studio.
// - Modo mock (padrão): store em memória + motor determinístico compartilhado.
// - Modo real: consome `/api/v1/governance` com isolamento por organização.
import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type {
  CommercialRule,
  CommissionPolicy,
  CommissionCalculation,
  RepresentativeEnvironment,
  RepresentativePortfolio,
  RepresentativeProductAccess,
  GovernanceDocument,
  Goal,
  CommercialCampaign,
} from "@/types/governance";
import { calculateCommission } from "@/lib/commission-engine";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const DEFAULT_ORG = "org-1";

function orgHeaders(organizationId?: string): Record<string, string> {
  return { "X-Organization-Id": organizationId ?? DEFAULT_ORG };
}

// ─── Store em memória (modo mock) ─────────────────────────────────────────
class MockGovernanceStore {
  representatives = new Map<string, RepresentativeEnvironment[]>();
  portfolios = new Map<string, RepresentativePortfolio[]>();
  productAccess = new Map<string, RepresentativeProductAccess[]>();
  rules = new Map<string, CommercialRule[]>();
  policies = new Map<string, CommissionPolicy[]>();
  calculations = new Map<string, CommissionCalculation[]>();
  documents = new Map<string, GovernanceDocument[]>();
  goals = new Map<string, Goal[]>();
  campaigns = new Map<string, CommercialCampaign[]>();

  constructor() {
    const org = "org-1";

    const reps: RepresentativeEnvironment[] = [
      {
        id: "rep-1",
        organizationId: org,
        representativeId: "u1",
        nome: "João Silva",
        codigo: "REP001",
        regiao: "Sudeste",
        segmentos: ["Industrial", "Automotivo"],
        ativo: true,
        email: "joao.silva@parceiro.com",
        telefone: "(11) 98765-4321",
        metaMensal: 100000,
        comissao: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rep-2",
        organizationId: org,
        representativeId: "u2",
        nome: "Maria Santos",
        codigo: "REP002",
        regiao: "Nordeste",
        segmentos: ["Varejo", "E-commerce"],
        ativo: true,
        email: "maria.santos@parceiro.com",
        telefone: "(81) 99876-5432",
        metaMensal: 80000,
        comissao: 4.5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rep-3",
        organizationId: org,
        representativeId: "u3",
        nome: "Carlos Oliveira",
        codigo: "REP003",
        regiao: "Sul",
        segmentos: ["Distribuição"],
        ativo: false,
        email: "carlos.oliveira@parceiro.com",
        telefone: "(51) 97765-1122",
        metaMensal: 120000,
        comissao: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.representatives.set(org, reps);

    const portfolios: RepresentativePortfolio[] = [
      {
        id: "port-1",
        representativeId: "rep-1",
        organizationId: org,
        criteria: [
          { type: "regiao", regiao: "Sudeste" },
          { type: "segmento", segmento: "Industrial" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "port-2",
        representativeId: "rep-2",
        organizationId: org,
        criteria: [
          { type: "regiao", regiao: "Nordeste" },
          { type: "segmento", segmento: "Varejo" }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.portfolios.set(org, portfolios);

    const pAccess: RepresentativeProductAccess[] = [
      {
        id: "acc-1",
        representativeId: "rep-1",
        organizationId: org,
        produtoId: "prod-1",
        liberado: true,
        precoTabela: 150.00,
        descontoMaximo: 15,
        margemMinima: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc-2",
        representativeId: "rep-1",
        organizationId: org,
        produtoId: "prod-2",
        liberado: true,
        precoTabela: 300.00,
        descontoMaximo: 10,
        margemMinima: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "acc-3",
        representativeId: "rep-2",
        organizationId: org,
        produtoId: "prod-1",
        liberado: true,
        precoTabela: 160.00,
        descontoMaximo: 20,
        margemMinima: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.productAccess.set(org, pAccess);

    const rulesList: CommercialRule[] = [
      {
        id: "rule-1",
        organizationId: org,
        name: "Bônus por Margem Alta",
        description: "Se a margem da venda for igual ou superior a 15%, adiciona 1% de comissão bônus.",
        expression: {
          combinator: "and",
          conditions: [
            { field: "margem", operator: "gte", value: 15 }
          ]
        },
        actions: [{ type: "bonus", percentual: 1 }],
        priority: 10,
        status: "ativa",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rule-2",
        organizationId: org,
        name: "Bloqueio de Margem Crítica",
        description: "Se a margem for inferior a 5%, exige aprovação manual do gestor e bloqueia o faturamento automático.",
        expression: {
          combinator: "and",
          conditions: [
            { field: "margem", operator: "lt", value: 5 }
          ]
        },
        actions: [{ type: "exigir_aprovacao" }, { type: "bloquear" }],
        priority: 100,
        status: "ativa",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "rule-3",
        organizationId: org,
        name: "Bônus Campanha Nordeste",
        description: "Adiciona 1.5% de bônus para vendas efetuadas na região Nordeste.",
        expression: {
          combinator: "and",
          conditions: [
            { field: "regiao", operator: "eq", value: "Nordeste" }
          ]
        },
        actions: [{ type: "bonus", percentual: 1.5 }],
        priority: 5,
        status: "ativa",
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.rules.set(org, rulesList);

    const policiesList: CommissionPolicy[] = [
      {
        id: "pol-1",
        organizationId: org,
        name: "Política Comercial Padrão Q3",
        comissaoBase: 5,
        releasePolicy: "faturamento",
        ruleIds: ["rule-1", "rule-2", "rule-3"],
        version: 1,
        status: "publicada",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.policies.set(org, policiesList);

    const docsList: GovernanceDocument[] = [
      {
        id: "doc-1",
        organizationId: org,
        ownerId: "u1",
        title: "Manual de Diretrizes de Preço e Desconto v3.2.pdf",
        scope: "global",
        accessPolicy: "publico",
        classification: "interno",
        version: 3,
        status: "publicado",
        mimeType: "application/pdf",
        categoryLabel: "Política de Preços & Descontos",
        clausesCount: 8,
        connectedFlowIds: ["discount-approval", "sales-rep-flow", "protheus-sync-flow", "high-ticket-deal"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
      {
        id: "doc-2",
        organizationId: org,
        ownerId: "u1",
        title: "Regulamento Geral de Comissionamento 2026.pdf",
        scope: "global",
        accessPolicy: "publico",
        classification: "interno",
        version: 1,
        status: "publicado",
        mimeType: "application/pdf",
        categoryLabel: "Regulamento de Comissões",
        clausesCount: 7,
        connectedFlowIds: ["commission-engine", "sales-rep-flow", "post-sales-onboarding"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
      {
        id: "doc-3",
        organizationId: org,
        ownerId: "u1",
        title: "Política Comercial e Condições de Fornecimento B2B.pdf",
        scope: "global",
        accessPolicy: "publico",
        classification: "interno",
        version: 2,
        status: "publicado",
        mimeType: "application/pdf",
        categoryLabel: "Termos Comerciais & Fornecimento",
        clausesCount: 6,
        connectedFlowIds: ["high-ticket-deal", "lead-qualification", "protheus-sync-flow"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
      {
        id: "doc-4",
        organizationId: org,
        ownerId: "u1",
        title: "Manual de Gestão de Crédito e Risco Financeiro.pdf",
        scope: "global",
        accessPolicy: "restrito",
        classification: "confidencial",
        version: 2,
        status: "publicado",
        mimeType: "application/pdf",
        categoryLabel: "Crédito, Risco & Compliance",
        clausesCount: 5,
        connectedFlowIds: ["credit-analysis", "high-ticket-deal", "discount-approval"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      },
      {
        id: "doc-5",
        organizationId: org,
        ownerId: "u1",
        title: "Diretrizes de Pós-Venda, Garantia e Devolução.pdf",
        scope: "global",
        accessPolicy: "publico",
        classification: "interno",
        version: 1,
        status: "publicado",
        mimeType: "application/pdf",
        categoryLabel: "Pós-Venda & Garantia",
        clausesCount: 5,
        connectedFlowIds: ["churn-prevention", "post-sales-onboarding", "sla-escalation"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
      }
    ];
    this.documents.set(org, docsList);

    const goalsList: Goal[] = [
      {
        id: "goal-1",
        organizationId: org,
        representativeId: "rep-1",
        tipo: "valor_venda",
        objetivo: 100000,
        atingido: 78500,
        periodoInicio: "2026-09-01",
        periodoFim: "2026-09-30",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "goal-2",
        organizationId: org,
        representativeId: "rep-2",
        tipo: "valor_venda",
        objetivo: 80000,
        atingido: 34200,
        periodoInicio: "2026-09-01",
        periodoFim: "2026-09-30",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    this.goals.set(org, goalsList);

    const campaignsList: CommercialCampaign[] = [
      {
        id: "camp-1",
        organizationId: org,
        name: "Acelera Nordeste Q3",
        descricao: "Foco no desenvolvimento de novos canais no Nordeste com comissão bônus.",
        produtoIds: ["prod-1", "prod-2"],
        regrasVinculadas: ["rule-3"],
        ativo: true,
        inicio: "2026-07-01",
        fim: "2026-09-30",
        createdAt: new Date().toISOString(),
      }
    ];
    this.campaigns.set(org, campaignsList);
  }
}

const mockStore = new MockGovernanceStore();

function mockList<T>(map: Map<string, T[]>, org: string, repId?: string, repKey?: (x: any) => string): T[] {
  const all = map.get(org) ?? [];
  return repId && repKey ? all.filter((x) => repKey(x) === repId) : all;
}

function mockSave<T extends { id: string }>(map: Map<string, T[]>, org: string, item: T): T {
  const list = map.get(org) ?? [];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  map.set(org, list);
  return item;
}

export const governanceService = {
  // ── Representantes ────────────────────────────────────────────────────
  async getRepresentatives(organizationId?: string): Promise<RepresentativeEnvironment[]> {
    const org = organizationId ?? DEFAULT_ORG;
    if (API_CONFIG.useMock) return mockList(mockStore.representatives, org);
    const res = await http.get<ApiResponse<RepresentativeEnvironment[]>>("/governance/representatives", { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async saveRepresentative(data: RepresentativeEnvironment, organizationId?: string): Promise<RepresentativeEnvironment> {
    if (API_CONFIG.useMock) return mockSave(mockStore.representatives, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<RepresentativeEnvironment>>("/governance/representatives", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Carteiras ─────────────────────────────────────────────────────────
  async getPortfolios(organizationId?: string, representativeId?: string): Promise<RepresentativePortfolio[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.portfolios, organizationId ?? DEFAULT_ORG, representativeId, (p) => p.representativeId);
    const headers = { ...orgHeaders(organizationId), ...(representativeId ? { "X-Representative-Id": representativeId } : {}) };
    const res = await http.get<ApiResponse<RepresentativePortfolio[]>>("/governance/portfolios", { headers });
    return res.data;
  },

  async savePortfolio(data: RepresentativePortfolio, organizationId?: string): Promise<RepresentativePortfolio> {
    if (API_CONFIG.useMock) return mockSave(mockStore.portfolios, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<RepresentativePortfolio>>("/governance/portfolios", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Acesso a produtos ─────────────────────────────────────────────────
  async getProductAccess(organizationId?: string, representativeId?: string): Promise<RepresentativeProductAccess[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.productAccess, organizationId ?? DEFAULT_ORG, representativeId, (p) => p.representativeId);
    const headers = { ...orgHeaders(organizationId), ...(representativeId ? { "X-Representative-Id": representativeId } : {}) };
    const res = await http.get<ApiResponse<RepresentativeProductAccess[]>>("/governance/product-access", { headers });
    return res.data;
  },

  async saveProductAccess(data: RepresentativeProductAccess, organizationId?: string): Promise<RepresentativeProductAccess> {
    if (API_CONFIG.useMock) return mockSave(mockStore.productAccess, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<RepresentativeProductAccess>>("/governance/product-access", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Regras ────────────────────────────────────────────────────────────
  async getRules(organizationId?: string): Promise<CommercialRule[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.rules, organizationId ?? DEFAULT_ORG);
    const res = await http.get<ApiResponse<CommercialRule[]>>("/governance/rules", { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async saveRule(data: CommercialRule, organizationId?: string): Promise<CommercialRule> {
    if (API_CONFIG.useMock) return mockSave(mockStore.rules, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<CommercialRule>>("/governance/rules", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async changeRuleStatus(ruleId: string, status: "publicada" | "ativa" | "arquivada", organizationId?: string): Promise<CommercialRule> {
    if (API_CONFIG.useMock) {
      const list = mockStore.rules.get(organizationId ?? DEFAULT_ORG) ?? [];
      const rule = list.find((r) => r.id === ruleId);
      if (!rule) throw new Error("Regra não encontrada");
      const updated = { ...rule, status };
      return mockSave(mockStore.rules, organizationId ?? DEFAULT_ORG, updated);
    }
    const res = await http.post<ApiResponse<CommercialRule>>(`/governance/rules/${ruleId}/status`, { status }, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async createRuleVersion(ruleId: string, changes: Partial<CommercialRule>, organizationId?: string): Promise<CommercialRule> {
    if (API_CONFIG.useMock) {
      const list = mockStore.rules.get(organizationId ?? DEFAULT_ORG) ?? [];
      const current = list.find((r) => r.id === ruleId);
      if (!current) throw new Error("Regra não encontrada");
      const versioned = { ...current, ...changes, id: `${current.id}-v${current.version + 1}`, version: current.version + 1, status: "rascunho" as const };
      return mockSave(mockStore.rules, organizationId ?? DEFAULT_ORG, versioned);
    }
    const res = await http.post<ApiResponse<CommercialRule>>(`/governance/rules/${ruleId}/versions`, changes, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Políticas de comissão ─────────────────────────────────────────────
  async getPolicies(organizationId?: string): Promise<CommissionPolicy[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.policies, organizationId ?? DEFAULT_ORG);
    const res = await http.get<ApiResponse<CommissionPolicy[]>>("/governance/policies", { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async savePolicy(data: CommissionPolicy, organizationId?: string): Promise<CommissionPolicy> {
    if (API_CONFIG.useMock) return mockSave(mockStore.policies, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<CommissionPolicy>>("/governance/policies", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Cálculo de comissão (determinístico) ──────────────────────────────
  async calculateCommission(
    params: { policyId: string; representativeId: string; input: any; metadata: { pedidoId?: string; orcamentoId?: string; faturaId?: string; clienteId: string } },
    organizationId?: string
  ): Promise<CommissionCalculation> {
    const org = organizationId ?? DEFAULT_ORG;
    if (API_CONFIG.useMock) {
      const policy = (mockStore.policies.get(org) ?? []).find((p) => p.id === params.policyId);
      if (!policy) throw new Error("Política não encontrada");
      const rules = (mockStore.rules.get(org) ?? []).filter((r) => policy.ruleIds.includes(r.id) && (r.status === "ativa" || r.status === "publicada"));
      const result = calculateCommission(policy, rules, params.input);
      const calc: CommissionCalculation = {
        id: `calc-${Date.now()}`,
        organizationId: org,
        representativeId: params.representativeId,
        pedidoId: params.metadata.pedidoId,
        orcamentoId: params.metadata.orcamentoId,
        faturaId: params.metadata.faturaId,
        clienteId: params.metadata.clienteId,
        valorBase: params.input.valorBase,
        margem: params.input.margem,
        metaAtingimento: params.input.metaAtingimento,
        policyId: policy.id,
        policyVersion: policy.version,
        appliedRuleIds: result.appliedRules.map((r) => r.ruleId),
        appliedRuleVersions: Object.fromEntries(result.appliedRules.map((r) => [r.ruleId, r.version])),
        trace: result.trace,
        comissaoBasePercentual: result.comissaoBasePercentual,
        bonusPercentual: result.bonusPercentual,
        comissaoFinalPercentual: result.comissaoFinalPercentual,
        comissaoValor: result.comissaoValor,
        status: result.blocked ? "rascunho" : "prevista",
        events: [{ id: `ev-${Date.now()}`, comissaoId: `calc-${Date.now()}`, from: "rascunho", to: result.blocked ? "rascunho" : "prevista", responsavel: params.representativeId, dataHora: new Date().toISOString() }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const list = mockStore.calculations.get(org) ?? [];
      list.unshift(calc);
      mockStore.calculations.set(org, list);
      return calc;
    }
    const res = await http.post<ApiResponse<CommissionCalculation>>("/governance/commissions/calculate", params, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async getCalculations(organizationId?: string, representativeId?: string): Promise<CommissionCalculation[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.calculations, organizationId ?? DEFAULT_ORG, representativeId, (c) => c.representativeId);
    const headers = { ...orgHeaders(organizationId), ...(representativeId ? { "X-Representative-Id": representativeId } : {}) };
    const res = await http.get<ApiResponse<CommissionCalculation[]>>("/governance/commissions", { headers });
    return res.data;
  },

  // ── Documentos ────────────────────────────────────────────────────────
  async getDocuments(organizationId?: string): Promise<GovernanceDocument[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.documents, organizationId ?? DEFAULT_ORG);
    const res = await http.get<ApiResponse<GovernanceDocument[]>>("/governance/documents", { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async saveDocument(data: GovernanceDocument, organizationId?: string): Promise<GovernanceDocument> {
    if (API_CONFIG.useMock) return mockSave(mockStore.documents, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<GovernanceDocument>>("/governance/documents", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  // ── Metas e Campanhas ─────────────────────────────────────────────────
  async getGoals(organizationId?: string, representativeId?: string): Promise<Goal[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.goals, organizationId ?? DEFAULT_ORG, representativeId, (g) => g.representativeId ?? "");
    const headers = { ...orgHeaders(organizationId), ...(representativeId ? { "X-Representative-Id": representativeId } : {}) };
    const res = await http.get<ApiResponse<Goal[]>>("/governance/goals", { headers });
    return res.data;
  },

  async saveGoal(data: Goal, organizationId?: string): Promise<Goal> {
    if (API_CONFIG.useMock) return mockSave(mockStore.goals, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<Goal>>("/governance/goals", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async getCampaigns(organizationId?: string): Promise<CommercialCampaign[]> {
    if (API_CONFIG.useMock) return mockList(mockStore.campaigns, organizationId ?? DEFAULT_ORG);
    const res = await http.get<ApiResponse<CommercialCampaign[]>>("/governance/campaigns", { headers: orgHeaders(organizationId) });
    return res.data;
  },

  async saveCampaign(data: CommercialCampaign, organizationId?: string): Promise<CommercialCampaign> {
    if (API_CONFIG.useMock) return mockSave(mockStore.campaigns, organizationId ?? DEFAULT_ORG, data);
    const res = await http.post<ApiResponse<CommercialCampaign>>("/governance/campaigns", data, { headers: orgHeaders(organizationId) });
    return res.data;
  },
};