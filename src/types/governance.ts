// ─── Commercial Governance Domain ─────────────────────────────────────────
// Modelagem central de governança comercial, isolamento entre representantes,
// regras comerciais, políticas de comissão e fluxos de decisão.
//
// Princípio arquitetural: o Core do sistema possui modelos de domínio próprios,
// NÃO dependentes de tabelas de ERP. O isolamento de dados é feito por
// `organization_id` (tenant) + `representative_id` (scope) + `dataScope`
// (nível de visibilidade), validado no backend/persistência (RLS), não só na UI.

// ─── Data Scope (validado em multiplas camadas) ───────────────────────────
// Separa "O QUE o usuário pode fazer" (permissions) de "SOBRE QUAIS dados"
// (data scope). Aplicado de forma consistente em queries e providers.
export type DataScope =
  | "meus_dados"        // apenas registros de propriedade do próprio usuário
  | "minha_carteira"    // clientes/produtos/oportunidades da carteira do representante
  | "minha_equipe"      // dados da equipe sob gestão do usuário (gerente/supervisor)
  | "toda_organizacao"  // todos os dados dentro da organização (admin)
  | "global";           // visão multi-tenant (super admin / governança)

export interface DataScopeContext {
  organizationId: string | null;
  representativeId: string | null;
  userId: string | null;
  dataScope: DataScope;
}

export const DATA_SCOPE_PRIORITY: DataScope[] = [
  "meus_dados",
  "minha_carteira",
  "minha_equipe",
  "toda_organizacao",
  "global",
];

// Retorna true se `candidate` consegue acessar dados de escopo `target`.
export function scopeCovers(candidate: DataScope, target: DataScope): boolean {
  const ci = DATA_SCOPE_PRIORITY.indexOf(candidate);
  const ti = DATA_SCOPE_PRIORITY.indexOf(target);
  return ci >= ti;
}

// ─── Representante como Ambiente Isolado ──────────────────────────────────
export interface RepresentativeEnvironment {
  id: string;
  organizationId: string;
  representativeId: string;
  nome?: string;
  email?: string;
  telefone?: string;
  metaMensal?: number;
  comissao?: number;
  codigo: string;
  regiao: string;
  segmentos: string[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// Carteira flexível (híbrida): cliente / região / segmento / produto
export type PortfolioCriterion =
  | { type: "cliente"; clienteId: string }
  | { type: "regiao"; regiao: string }
  | { type: "segmento"; segmento: string }
  | { type: "produto"; produtoId: string };

export interface RepresentativePortfolio {
  id: string;
  representativeId: string;
  organizationId: string;
  criteria: PortfolioCriterion[];
  createdAt: string;
  updatedAt: string;
}

export interface RepresentativeProductAccess {
  id: string;
  representativeId: string;
  organizationId: string;
  produtoId: string;
  liberado: boolean;
  precoTabela?: number;
  descontoMaximo?: number; // % máximo permitido para este representante/produto
  margemMinima?: number;   // % mínima de margem
  createdAt: string;
  updatedAt: string;
}

// ─── Regras Comerciais Estruturadas (não texto livre) ─────────────────────
export type ConditionField =
  | "margem"
  | "desconto"
  | "valor"
  | "volume"
  | "meta_atingimento"
  | "categoria_produto"
  | "produto"
  | "cliente"
  | "regiao"
  | "segmento"
  | "campanha";

export type ConditionOperator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "not_in" | "contains";

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | boolean | (string | number)[];
}

export interface RuleExpression {
  combinator: "and" | "or";
  conditions: RuleCondition[];
  // Suporte a sub-expressões aninhadas (regras combinadas)
  groups?: RuleExpression[];
}

export type RuleAction =
  | { type: "comissao"; percentual: number }
  | { type: "bonus"; percentual: number }
  | { type: "bloquear" }
  | { type: "exigir_aprovacao" }
  | { type: "liberar_produto"; produtoId: string }
  | { type: "restringir_produto"; produtoId: string }
  | { type: "definir_desconto_maximo"; percentual: number }
  | { type: "definir_margem_minima"; percentual: number };

export type RuleStatus = "rascunho" | "publicada" | "ativa" | "substituida" | "arquivada";

export interface CommercialRule {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  expression: RuleExpression;
  actions: RuleAction[];
  priority: number;
  status: RuleStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  supersededBy?: string;
}

// ─── Políticas de Comissão ────────────────────────────────────────────────
export type CommissionReleasePolicy =
  | "pedido"          // libera no pedido aprovado
  | "faturamento"     // libera no faturamento
  | "recebimento";    // libera após recebimento

export interface CommissionPolicy {
  id: string;
  organizationId: string;
  name: string;
  comissaoBase: number;          // % base
  releasePolicy: CommissionReleasePolicy;
  ruleIds: string[];             // regras vinculadas que adicionam bônus/condições
  version: number;
  status: RuleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// ─── Status do ciclo de comissão ──────────────────────────────────────────
export type CommissionStatus =
  | "rascunho"
  | "prevista"
  | "em_validacao"
  | "aprovada"
  | "liberada"
  | "a_pagar"
  | "paga";

export interface CommissionEvent {
  id: string;
  comissaoId: string;
  from: CommissionStatus;
  to: CommissionStatus;
  responsavel: string;
  observacao?: string;
  dataHora: string;
}

// Cálculo auditável: vincula qual versão de regra/política foi usada e o trace
export interface CommissionCalculation {
  id: string;
  organizationId: string;
  representativeId: string;
  pedidoId?: string;
  orcamentoId?: string;
  faturaId?: string;
  clienteId: string;
  valorBase: number;
  margem?: number;
  metaAtingimento?: number;
  // Campos auditáveis (determinismo + transparência)
  policyId: string;
  policyVersion: number;
  appliedRuleIds: string[];
  appliedRuleVersions: Record<string, number>;
  trace: RuleTraceEntry[];
  comissaoBasePercentual: number;
  bonusPercentual: number;
  comissaoFinalPercentual: number;
  comissaoValor: number;
  status: CommissionStatus;
  events: CommissionEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleTraceEntry {
  ruleId: string;
  ruleName: string;
  version: number;
  condition: string;
  matched: boolean;
  evaluatedValue?: string | number | boolean;
}

// ─── Metas, Campanhas e Documentos ────────────────────────────────────────
export type GoalType = "valor_venda" | "volume" | "novos_clientes" | "margem_media";

export interface Goal {
  id: string;
  organizationId: string;
  representativeId?: string; // meta global se ausente
  tipo: GoalType;
  objetivo: number;
  periodoInicio: string;
  periodoFim: string;
  atingido: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialCampaign {
  id: string;
  organizationId: string;
  name: string;
  descricao?: string;
  produtoIds: string[];
  regrasVinculadas: string[];
  ativo: boolean;
  inicio: string;
  fim?: string;
  createdAt: string;
}

export type DocumentScope =
  | "global"
  | "organizacao"
  | "representante"
  | "produto"
  | "campanha"
  | "regra"
  | "privado";

export interface GovernanceDocument {
  id: string;
  organizationId: string;
  ownerId: string;
  title: string;
  scope: DocumentScope;
  scopeRefId?: string;
  accessPolicy: "publico" | "restrito" | "privado";
  classification: "publico" | "interno" | "confidencial";
  version: number;
  status: "rascunho" | "publicado" | "expirado" | "arquivado";
  mimeType: string;
  contentRef?: string;
  publishedAt?: string;
  expiresAt?: string;
  connectedFlowIds?: string[];
  categoryLabel?: string;
  clausesCount?: number;
  createdAt: string;
  updatedAt: string;
}