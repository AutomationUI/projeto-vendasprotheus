// ─── Deterministic Commission Rule Engine ─────────────────────────────────
// A IA NÃO é a fonte definitiva do cálculo de comissão.
// O cálculo oficial é executado por este motor determinístico, versionado e
// auditável, seguindo o fluxo:
//
//   FLUXO VISUAL → REGRA ESTRUTURADA → MOTOR DE REGRAS
//      → CÁLCULO DETERMINÍSTICO → RESULTADO AUDITÁVEL
//
// Este módulo é puro (sem dependência de React/DB/Supabase) para poder ser
// reutilizado tanto no frontend (simulação) quanto no backend (cálculo oficial).

import type {
  CommercialRule,
  RuleCondition,
  RuleExpression,
  RuleTraceEntry,
  CommissionPolicy,
  RuleStatus,
} from "../types/governance";

// ─── Entrada do cálculo ───────────────────────────────────────────────────
export interface CalculationInput {
  valorBase: number;
  margem?: number;          // % de margem
  desconto?: number;        // % de desconto
  volume?: number;          // quantidade/unidades
  metaAtingimento?: number; // % da meta atingida (ex: 108)
  categoriaProduto?: string;
  produtoId?: string;
  clienteId?: string;
  regiao?: string;
  segmento?: string;
  campanha?: string;
}

// ─── Resultado ────────────────────────────────────────────────────────────
export interface CalculationResult {
  comissaoBasePercentual: number;
  bonusPercentual: number;
  comissaoFinalPercentual: number;
  comissaoValor: number;
  appliedRules: { ruleId: string; version: number; name: string }[];
  trace: RuleTraceEntry[];
  blocked: boolean;
  requireApproval: boolean;
  blockReasons: string[];
}

// ─── Extração de valor do contexto para uma condição ──────────────────────
function resolveFieldValue(input: CalculationInput, field: string): string | number | boolean | undefined {
  switch (field) {
    case "margem": return input.margem;
    case "desconto": return input.desconto;
    case "valor": return input.valorBase;
    case "volume": return input.volume;
    case "meta_atingimento": return input.metaAtingimento;
    case "categoria_produto": return input.categoriaProduto;
    case "produto": return input.produtoId;
    case "cliente": return input.clienteId;
    case "regiao": return input.regiao;
    case "segmento": return input.segmento;
    case "campanha": return input.campanha;
    default: return undefined;
  }
}

function coerce(value: string | number | boolean | (string | number)[]): number | string | boolean {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value;
}

// ─── Avaliação de uma condição única ──────────────────────────────────────
export function evaluateCondition(cond: RuleCondition, input: CalculationInput): boolean {
  const actual = resolveFieldValue(input, cond.field);
  if (actual === undefined || actual === null) return false;

  const expected = coerce(cond.value);

  switch (cond.operator) {
    case "eq":
      return String(actual) === String(expected);
    case "neq":
      return String(actual) !== String(expected);
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "contains":
      return String(actual).toLowerCase().includes(String(expected).toLowerCase());
    case "in": {
      const list = Array.isArray(cond.value) ? cond.value.map(String) : String(expected).split(",");
      return list.includes(String(actual));
    }
    case "not_in": {
      const list = Array.isArray(cond.value) ? cond.value.map(String) : String(expected).split(",");
      return !list.includes(String(actual));
    }
    default:
      return false;
  }
}

// ─── Avaliação de expressão (suporta combinações AND/OR e grupos) ─────────
export function evaluateExpression(
  expr: RuleExpression,
  input: CalculationInput,
  trace: RuleTraceEntry[],
  rule: Pick<CommercialRule, "id" | "name" | "version">
): boolean {
  const results: boolean[] = [];

  for (const cond of expr.conditions) {
    const matched = evaluateCondition(cond, input);
    trace.push({
      ruleId: rule.id,
      ruleName: rule.name,
      version: rule.version,
      condition: `${cond.field} ${cond.operator} ${JSON.stringify(cond.value)}`,
      matched,
      evaluatedValue: resolveFieldValue(input, cond.field),
    });
    results.push(matched);
  }

  for (const group of expr.groups ?? []) {
    results.push(evaluateExpression(group, input, trace, rule));
  }

  if (results.length === 0) return true;

  return expr.combinator === "and"
    ? results.every((r) => r)
    : results.some((r) => r);
}

// ─── Seleção de regras aplicáveis (ordenadas por prioridade) ─────────────
export function selectApplicableRules(
  rules: CommercialRule[],
  input: CalculationInput
): { rule: CommercialRule; trace: RuleTraceEntry[] }[] {
  const active = rules
    .filter((r) => r.status === "ativa" || r.status === "publicada")
    .sort((a, b) => b.priority - a.priority);

  const applicable: { rule: CommercialRule; trace: RuleTraceEntry[] }[] = [];
  for (const rule of active) {
    const trace: RuleTraceEntry[] = [];
    if (evaluateExpression(rule.expression, input, trace, rule)) {
      applicable.push({ rule, trace });
    }
  }
  return applicable;
}

// ─── Cálculo oficial (determinístico) ─────────────────────────────────────
export function calculateCommission(
  policy: CommissionPolicy,
  rules: CommercialRule[],
  input: CalculationInput
): CalculationResult {
  let bonusPercentual = 0;
  let blocked = false;
  let requireApproval = false;
  const blockReasons: string[] = [];
  const appliedRules: { ruleId: string; version: number; name: string }[] = [];
  const trace: RuleTraceEntry[] = [];

  const applicable = selectApplicableRules(rules, input);

  for (const { rule, trace: ruleTrace } of applicable) {
    trace.push(...ruleTrace);
    appliedRules.push({ ruleId: rule.id, version: rule.version, name: rule.name });

    for (const action of rule.actions) {
      switch (action.type) {
        case "bonus":
          bonusPercentual += action.percentual;
          break;
        case "comissao":
          // Regra pode sobrepor a comissão base (política v3), soma discreta
          bonusPercentual += action.percentual;
          break;
        case "bloquear":
          blocked = true;
          blockReasons.push(rule.name);
          break;
        case "exigir_aprovacao":
          requireApproval = true;
          break;
        default:
          break;
      }
    }
  }

  const comissaoBasePercentual = policy.comissaoBase;
  const comissaoFinalPercentual = comissaoBasePercentual + bonusPercentual;
  const comissaoValor = blocked
    ? 0
    : (input.valorBase * comissaoFinalPercentual) / 100;

  return {
    comissaoBasePercentual,
    bonusPercentual,
    comissaoFinalPercentual,
    comissaoValor: round2(comissaoValor),
    appliedRules,
    trace,
    blocked,
    requireApproval,
    blockReasons,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Versionamento de Regras / Políticas ──────────────────────────────────
// Nunca sobrescrever silenciosamente uma regra já usada em cálculos.
// Cálculos históricos permanecem vinculados à versão usada no momento.
export const RULE_LIFECYCLE: RuleStatus[] = [
  "rascunho",
  "publicada",
  "ativa",
  "substituida",
  "arquivada",
];

export function promoteRule<T extends { status: RuleStatus; version: number }>(
  current: T,
  target: "publicada" | "ativa" | "arquivada"
): T {
  const idx = RULE_LIFECYCLE.indexOf(current.status);
  const tgtIdx = RULE_LIFECYCLE.indexOf(target);
  if (tgtIdx < idx) {
    throw new Error(
      `Transição de status inválida: ${current.status} → ${target}`
    );
  }
  return { ...current, status: target };
}

export function nextRuleVersion(version: number): number {
  return version + 1;
}

// ─── Status da comissão (ciclo de vida) ──────────────────────────────────
export const COMMISSION_LIFECYCLE: readonly string[] = [
  "rascunho",
  "prevista",
  "em_validacao",
  "aprovada",
  "liberada",
  "a_pagar",
  "paga",
] as const;

export function canTransitionCommission(
  from: string,
  to: string
): boolean {
  const fi = COMMISSION_LIFECYCLE.indexOf(from as never);
  const ti = COMMISSION_LIFECYCLE.indexOf(to as never);
  return ti >= fi && ti > fi;
}