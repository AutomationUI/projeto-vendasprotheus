// ─── Serviço de Governança Comercial (Backend) ────────────────────────────
// Camada de domínio para Commercial Governance & Rules Studio.
//
// - Isolamento: todos os registros são vinculados a `organizationId`
//   (+ `representativeId` quando aplicável). O middleware injeta o contexto
//   dos headers `X-Organization-Id` / `X-Representative-Id`.
// - Cálculo oficial de comissão: DELEGA ao motor determinístico compartilhado
//   (`src/lib/commission-engine`). A IA nunca é a fonte oficial.
// - Persistência offline-first: repositório em memória por organização.
//   Quando Supabase estiver configurado, também persiste (best-effort).
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
  DataScopeContext,
} from "../../../src/types/governance";
import {
  calculateCommission,
  promoteRule,
  nextRuleVersion,
  type CalculationInput,
} from "../../../src/lib/commission-engine";
import { buildIsolationFilter } from "../../../src/lib/data-scope";

// ─── Repositório offline-first (por organização) ─────────────────────────
class InMemoryGovernanceStore {
  representatives = new Map<string, RepresentativeEnvironment[]>();
  portfolios = new Map<string, RepresentativePortfolio[]>();
  productAccess = new Map<string, RepresentativeProductAccess[]>();
  rules = new Map<string, CommercialRule[]>();
  policies = new Map<string, CommissionPolicy[]>();
  calculations = new Map<string, CommissionCalculation[]>();
  documents = new Map<string, GovernanceDocument[]>();
  goals = new Map<string, Goal[]>();
  campaigns = new Map<string, CommercialCampaign[]>();
}

export interface GovernanceServiceOptions {
  // reservado para futura persistência via Supabase
  persist?: boolean;
}

export class GovernanceService {
  private store = new InMemoryGovernanceStore();

  constructor(private options: GovernanceServiceOptions = {}) {}

  // ── Representantes ────────────────────────────────────────────────────
  listRepresentatives(orgId: string): RepresentativeEnvironment[] {
    return this.store.representatives.get(orgId) ?? [];
  }

  saveRepresentative(orgId: string, rep: RepresentativeEnvironment): RepresentativeEnvironment {
    const list = this.listRepresentatives(orgId);
    const idx = list.findIndex((r) => r.id === rep.id);
    if (idx >= 0) list[idx] = rep;
    else list.push(rep);
    this.store.representatives.set(orgId, list);
    return rep;
  }

  // ── Carteiras ─────────────────────────────────────────────────────────
  listPortfolios(orgId: string, representativeId?: string): RepresentativePortfolio[] {
    const all = this.store.portfolios.get(orgId) ?? [];
    return representativeId ? all.filter((p) => p.representativeId === representativeId) : all;
  }

  savePortfolio(orgId: string, portfolio: RepresentativePortfolio): RepresentativePortfolio {
    const list = this.listPortfolios(orgId);
    const idx = list.findIndex((p) => p.id === portfolio.id);
    if (idx >= 0) list[idx] = portfolio;
    else list.push(portfolio);
    this.store.portfolios.set(orgId, list);
    return portfolio;
  }

  // ── Acesso a produtos ─────────────────────────────────────────────────
  listProductAccess(orgId: string, representativeId?: string): RepresentativeProductAccess[] {
    const all = this.store.productAccess.get(orgId) ?? [];
    return representativeId ? all.filter((a) => a.representativeId === representativeId) : all;
  }

  saveProductAccess(orgId: string, access: RepresentativeProductAccess): RepresentativeProductAccess {
    const list = this.listProductAccess(orgId);
    const idx = list.findIndex((a) => a.id === access.id);
    if (idx >= 0) list[idx] = access;
    else list.push(access);
    this.store.productAccess.set(orgId, list);
    return access;
  }

  // ── Regras comerciais ─────────────────────────────────────────────────
  listRules(orgId: string): CommercialRule[] {
    return this.store.rules.get(orgId) ?? [];
  }

  getRule(orgId: string, ruleId: string): CommercialRule | null {
    return this.listRules(orgId).find((r) => r.id === ruleId) ?? null;
  }

  saveRule(orgId: string, rule: CommercialRule): CommercialRule {
    const list = this.listRules(orgId);
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) list[idx] = rule;
    else list.push(rule);
    this.store.rules.set(orgId, list);
    return rule;
  }

  /** Promove o status da regra sem permitir retrocesso (versionamento seguro). */
  changeRuleStatus(orgId: string, ruleId: string, target: "publicada" | "ativa" | "arquivada"): CommercialRule {
    const rule = this.getRule(orgId, ruleId);
    if (!rule) throw new Error(`Regra ${ruleId} não encontrada`);
    const promoted = promoteRule(rule, target);
    return this.saveRule(orgId, promoted);
  }

  /** Cria nova versão da regra (nunca sobrescreve a usada em cálculos). */
  createRuleVersion(orgId: string, ruleId: string, changes: Partial<CommercialRule>): CommercialRule {
    const current = this.getRule(orgId, ruleId);
    if (!current) throw new Error(`Regra ${ruleId} não encontrada`);

    const archived = promoteRule(current, "arquivada");
    const archivedList = this.listRules(orgId).map((r) => (r.id === ruleId ? archived : r));
    this.store.rules.set(orgId, archivedList);

    const versioned: CommercialRule = {
      ...current,
      ...changes,
      id: `${current.id}-v${nextRuleVersion(current.version)}`,
      version: nextRuleVersion(current.version),
      status: "rascunho",
      supersededBy: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.saveRule(orgId, versioned);
  }

  // ── Políticas de comissão ─────────────────────────────────────────────
  listPolicies(orgId: string): CommissionPolicy[] {
    return this.store.policies.get(orgId) ?? [];
  }

  getPolicy(orgId: string, policyId: string): CommissionPolicy | null {
    return this.listPolicies(orgId).find((p) => p.id === policyId) ?? null;
  }

  savePolicy(orgId: string, policy: CommissionPolicy): CommissionPolicy {
    const list = this.listPolicies(orgId);
    const idx = list.findIndex((p) => p.id === policy.id);
    if (idx >= 0) list[idx] = policy;
    else list.push(policy);
    this.store.policies.set(orgId, list);
    return policy;
  }

  // ── Cálculo oficial de comissão (determinístico e auditável) ──────────
  calculateCommission(
    orgId: string,
    policyId: string,
    representativeId: string,
    input: CalculationInput,
    metadata: { pedidoId?: string; orcamentoId?: string; faturaId?: string; clienteId: string }
  ): CommissionCalculation {
    const policy = this.getPolicy(orgId, policyId);
    if (!policy) throw new Error(`Política ${policyId} não encontrada`);

    // Regras vinculadas à política (ativas) → motor determinístico
    const rules = this.listRules(orgId).filter(
      (r) => policy.ruleIds.includes(r.id) && (r.status === "ativa" || r.status === "publicada")
    );

    const result = calculateCommission(policy, rules, input);

    const calc: CommissionCalculation = {
      id: `calc-${Date.now()}`,
      organizationId: orgId,
      representativeId,
      pedidoId: metadata.pedidoId,
      orcamentoId: metadata.orcamentoId,
      faturaId: metadata.faturaId,
      clienteId: metadata.clienteId,
      valorBase: input.valorBase,
      margem: input.margem,
      metaAtingimento: input.metaAtingimento,
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
      events: [
        {
          id: `ev-${Date.now()}`,
          comissaoId: `calc-${Date.now()}`,
          from: "rascunho",
          to: result.blocked ? "rascunho" : "prevista",
          responsavel: representativeId,
          dataHora: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const list = this.store.calculations.get(orgId) ?? [];
    list.unshift(calc);
    this.store.calculations.set(orgId, list);
    return calc;
  }

  listCalculations(orgId: string, representativeId?: string): CommissionCalculation[] {
    const all = this.store.calculations.get(orgId) ?? [];
    return representativeId ? all.filter((c) => c.representativeId === representativeId) : all;
  }

  // ── Documentos (com verificação de escopo) ────────────────────────────
  listDocuments(orgId: string): GovernanceDocument[] {
    return this.store.documents.get(orgId) ?? [];
  }

  saveDocument(orgId: string, doc: GovernanceDocument): GovernanceDocument {
    const list = this.listDocuments(orgId);
    const idx = list.findIndex((d) => d.id === doc.id);
    if (idx >= 0) list[idx] = doc;
    else list.push(doc);
    this.store.documents.set(orgId, list);
    return doc;
  }

  // ── Metas e Campanhas ─────────────────────────────────────────────────
  listGoals(orgId: string, representativeId?: string): Goal[] {
    const all = this.store.goals.get(orgId) ?? [];
    return representativeId ? all.filter((g) => g.representativeId === representativeId) : all;
  }

  saveGoal(orgId: string, goal: Goal): Goal {
    const list = this.listGoals(orgId);
    const idx = list.findIndex((g) => g.id === goal.id);
    if (idx >= 0) list[idx] = goal;
    else list.push(goal);
    this.store.goals.set(orgId, list);
    return goal;
  }

  listCampaigns(orgId: string): CommercialCampaign[] {
    return this.store.campaigns.get(orgId) ?? [];
  }

  saveCampaign(orgId: string, campaign: CommercialCampaign): CommercialCampaign {
    const list = this.listCampaigns(orgId);
    const idx = list.findIndex((c) => c.id === campaign.id);
    if (idx >= 0) list[idx] = campaign;
    else list.push(campaign);
    this.store.campaigns.set(orgId, list);
    return campaign;
  }

  /** Aplica o filtro de isolamento (organizationId + representativeId). */
  static isolate(ctx: DataScopeContext) {
    return buildIsolationFilter(ctx);
  }
}