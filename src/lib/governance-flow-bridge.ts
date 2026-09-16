// ─── Governance Studio & Flow Studio Native Integration Bridge ─────────────
// Este módulo conecta nativamente as Regras de Negócio criadas no Governance Studio
// (Descontos, Margens Mínimas, Prazos de Pagamento, Alçadas, Acesso a Produtos e Comissões)
// aos fluxos de automação e esteiras de decisão do Flow Studio.
//
// Princípio de Governança & Execução:
// As automações do Flow Studio consomem parâmetros parametrizáveis e dinâmicos do
// Governance Studio com rastreabilidade auditável de versão e cláusula.

import {
  CommercialRule,
  CommissionPolicy,
  RepresentativeProductAccess,
  RepresentativeEnvironment,
  RuleTraceEntry,
  RuleStatus
} from "@/types/governance";
import { governanceService } from "@/lib/api/governance-service";
import { ALL_FLOW_TEMPLATES } from "@/data/all-flows-templates";

export interface GovernanceFlowSyncStatus {
  totalActiveRules: number;
  totalFlowsConnected: number;
  lastSyncTimestamp: string;
  activePoliciesCount: number;
  discountRulesCount: number;
  marginRulesCount: number;
  paymentTermRulesCount: number;
}

export interface GovernanceProposalInput {
  cliente?: string;
  clienteId?: string;
  vendedor?: string;
  representanteId?: string;
  condicaoPagamento?: string;
  prazoDias?: number;
  total: number;
  descontoMedioPct?: number;
  margemMediaPct?: number;
  segmento?: string;
  regiao?: string;
  itens?: Array<{
    produto?: string;
    codigo?: string;
    quantidade: number;
    precoUnitario: number;
    desconto?: number;
    precoFinal?: number;
    custo?: number;
    margem?: number;
    estoque?: number;
  }>;
}

export interface GovernanceRuleExecutionResult {
  ruleId: string;
  ruleName: string;
  version: number;
  matched: boolean;
  impacto: "bloqueio" | "alçada_gerencia" | "alçada_diretoria" | "liberado" | "bonus" | "comissao" | "informativo";
  mensagem: string;
  detalhes?: string;
  flowNodeTarget?: string;
}

export interface GovernanceEvaluationOutcome {
  aprovadoAutomatico: boolean;
  exigeAprovacao: boolean;
  bloqueado: boolean;
  nivelAprovacao: "Auto-Aprovado" | "Gerência Comercial" | "Diretoria Comercial" | "Comitê de Crédito & Diretoria";
  motivoPrincipal: string;
  alertas: string[];
  regrasVioladas: string[];
  regrasAplicadas: GovernanceRuleExecutionResult[];
  trace: RuleTraceEntry[];
  flowExecutado: {
    flowId: string;
    flowName: string;
    versao: string;
    nosAcionados: string[];
  };
  metricasGovernança: {
    descontoSolicitado: number;
    descontoTetoPermitido: number;
    margemCalculada: number;
    margemPisoEstatutario: number;
    prazoMaximoPermitido: string;
    prazoSolicitado: string;
    impactoComissaoPct: number;
  };
  sugestaoConformidade?: string;
}

// ─── Tabela de Prazos em Dias ────────────────────────────────────────────────
const PRAZOS_DIAS_MAP: Record<string, number> = {
  "À vista": 0,
  "A vista": 0,
  "15 dias": 15,
  "28 dias": 28,
  "30 dias": 30,
  "30/60": 60,
  "30/60/90": 90,
  "30/60/90/120": 120,
  "45 dias": 45,
  "60 dias": 60,
  "90 dias": 90,
  "120 dias": 120,
};

/**
 * Converte condição de pagamento em prazo médio/máximo ponderado
 */
export function getPrazoEmDias(condicao?: string): number {
  if (!condicao) return 30;
  if (PRAZOS_DIAS_MAP[condicao] !== undefined) {
    return PRAZOS_DIAS_MAP[condicao];
  }
  const match = condicao.match(/\d+/g);
  if (match && match.length > 0) {
    return Math.max(...match.map(Number));
  }
  return 30;
}

// ─── Default Native Rules from Governance Studio ──────────────────────────────
export const DEFAULT_GOVERNANCE_RULES: CommercialRule[] = [
  {
    id: "gov-rule-desc-max-rep",
    organizationId: "org-1",
    name: "Alçada de Desconto Máximo do Representante (≤ 8%)",
    description: "Descontos até 8% são auto-aprovados para representantes autorizados.",
    priority: 10,
    status: "ativa",
    version: 3,
    expression: {
      combinator: "and",
      conditions: [{ field: "desconto", operator: "lte", value: 8 }]
    },
    actions: [{ type: "definir_desconto_maximo", percentual: 8 }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  },
  {
    id: "gov-rule-desc-gerencia",
    organizationId: "org-1",
    name: "Alçada Gerencial para Descontos Intermediários (> 8% e ≤ 15%)",
    description: "Descontos entre 8% e 15% exigem aprovação da Gerência Comercial Regional.",
    priority: 20,
    status: "ativa",
    version: 2,
    expression: {
      combinator: "and",
      conditions: [
        { field: "desconto", operator: "gt", value: 8 },
        { field: "desconto", operator: "lte", value: 15 }
      ]
    },
    actions: [{ type: "exigir_aprovacao" }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  },
  {
    id: "gov-rule-desc-diretoria",
    organizationId: "org-1",
    name: "Trava Estatutária de Desconto (> 15% - Diretoria Comercial)",
    description: "Descontos superiores a 15% exigem aprovação mandatória da Diretoria Comercial.",
    priority: 30,
    status: "ativa",
    version: 2,
    expression: {
      combinator: "and",
      conditions: [{ field: "desconto", operator: "gt", value: 15 }]
    },
    actions: [{ type: "exigir_aprovacao" }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  },
  {
    id: "gov-rule-margem-piso",
    organizationId: "org-1",
    name: "Piso Estatutário de Margem de Contribuição (≥ 25%)",
    description: "Propostas com margem líquida inferior a 25% acionam comitê de governança e margem.",
    priority: 5,
    status: "ativa",
    version: 4,
    expression: {
      combinator: "and",
      conditions: [{ field: "margem", operator: "lt", value: 25 }]
    },
    actions: [{ type: "exigir_aprovacao" }, { type: "definir_margem_minima", percentual: 25 }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  },
  {
    id: "gov-rule-prazo-maximo",
    organizationId: "org-1",
    name: "Alçada de Prazo de Pagamento Estendido (> 60 dias)",
    description: "Prazos de pagamento superiores a 60 dias exigem aprovação de Crédito & Finanças.",
    priority: 15,
    status: "ativa",
    version: 1,
    expression: {
      combinator: "and",
      conditions: [{ field: "valor", operator: "gt", value: 60 }]
    },
    actions: [{ type: "exigir_aprovacao" }],
    createdAt: "2026-02-15T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  },
  {
    id: "gov-rule-volume-grande-conta",
    organizationId: "org-1",
    name: "Alçada por Volume de Pedido (> R$ 50.000)",
    description: "Pedidos acima de R$ 50.000 exigem chancela do Supervisor Comercial.",
    priority: 12,
    status: "ativa",
    version: 2,
    expression: {
      combinator: "and",
      conditions: [{ field: "valor", operator: "gte", value: 50000 }]
    },
    actions: [{ type: "exigir_aprovacao" }],
    createdAt: "2026-01-10T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    publishedAt: "2026-09-01T00:00:00Z"
  }
];

// ─── Obter Regras Ativas do Governance Studio ─────────────────────────────────
export async function getActiveGovernanceRules(): Promise<CommercialRule[]> {
  try {
    const rules = await governanceService.getRules();
    if (rules && rules.length > 0) {
      return rules.filter(r => r.status === "ativa" || r.status === "publicada");
    }
  } catch {
    // fallback
  }
  return DEFAULT_GOVERNANCE_RULES;
}

/**
 * Retorna o mapa de fluxos do Flow Studio que consomem cada regra de negócio do Governance Studio
 */
export function getFlowsConsumingGovernanceRule(ruleId: string): Array<{
  flowId: string;
  flowTitle: string;
  category: string;
  targetNodeId: string;
  nodeTitle: string;
}> {
  const mapping: Record<string, Array<{ flowId: string; flowTitle: string; category: string; targetNodeId: string; nodeTitle: string }>> = {
    "gov-rule-desc-max-rep": [
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-2", nodeTitle: "Verifica % Desconto Comercial" },
      { flowId: "sales-flow-engine", flowTitle: "Motor de Apuração Comercial & Pedidos", category: "Vendas", targetNodeId: "node-val-disc", nodeTitle: "Validador de Desconto" }
    ],
    "gov-rule-desc-gerencia": [
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-3-esc-ger", nodeTitle: "Escalonar p/ Gerência Regional" }
    ],
    "gov-rule-desc-diretoria": [
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-4-esc-dir", nodeTitle: "Escalonar p/ Diretoria Comercial" }
    ],
    "gov-rule-margem-piso": [
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-1", nodeTitle: "Cálculo de Margem de Contribuição" },
      { flowId: "credit-analysis", flowTitle: "Esteira Inteligente de Crédito & Limite", category: "Financeiro", targetNodeId: "node-margem", nodeTitle: "Auditoria de Margem Líquida" }
    ],
    "gov-rule-prazo-maximo": [
      { flowId: "credit-analysis", flowTitle: "Esteira Inteligente de Crédito & Limite", category: "Financeiro", targetNodeId: "node-prazo", nodeTitle: "Validação de Condição de Pagamento" },
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-1", nodeTitle: "Auditoria de Prazo Médio" }
    ],
    "gov-rule-volume-grande-conta": [
      { flowId: "lead-routing", flowTitle: "Qualificação & Roteamento de Leads", category: "CRM", targetNodeId: "node-volume", nodeTitle: "Roteamento de Grande Conta" },
      { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-2", nodeTitle: "Alçada de Volume Total" }
    ]
  };

  return mapping[ruleId] || [
    { flowId: "discount-approval", flowTitle: "Aprovação de Descontos & Alçadas Comerciais", category: "Governança", targetNodeId: "disc-2", nodeTitle: "Motor de Regras Globais" }
  ];
}

/**
 * Avalia proposta de vendas contra as regras ativas do Governance Studio
 */
export function evaluateProposalWithGovernanceRules(
  proposal: GovernanceProposalInput,
  rulesList: CommercialRule[] = DEFAULT_GOVERNANCE_RULES
): GovernanceEvaluationOutcome {
  let totalBruto = 0;
  let totalDesconto = 0;
  let totalCusto = 0;
  let itensSemEstoque = 0;

  if (proposal.itens && proposal.itens.length > 0) {
    proposal.itens.forEach((item) => {
      const q = Number(item.quantidade) || 1;
      const pu = Number(item.precoUnitario) || 0;
      const d = Number(item.desconto) || 0;
      const c = Number(item.custo) || pu * 0.65;
      const est = item.estoque !== undefined ? Number(item.estoque) : 999;

      const vb = q * pu;
      const vd = vb * (d / 100);
      totalBruto += vb;
      totalDesconto += vd;
      totalCusto += q * c;

      if (est < q) {
        itensSemEstoque++;
      }
    });
  } else {
    totalBruto = proposal.total || 0;
    const dPct = proposal.descontoMedioPct || 0;
    totalDesconto = totalBruto * (dPct / 100);
    totalCusto = totalBruto * 0.65;
  }

  const totalLiquido = totalBruto - totalDesconto;
  const descontoMedio = totalBruto > 0 ? (totalDesconto / totalBruto) * 100 : proposal.descontoMedioPct || 0;
  const margemCalculada = totalLiquido > 0 ? ((totalLiquido - totalCusto) / totalLiquido) * 100 : proposal.margemMediaPct || 35;
  const prazoDias = proposal.prazoDias ?? getPrazoEmDias(proposal.condicaoPagamento);

  const appliedRules: GovernanceRuleExecutionResult[] = [];
  const trace: RuleTraceEntry[] = [];
  const alertas: string[] = [];
  const regrasVioladas: string[] = [];
  const nosAcionados: string[] = ["trigger-proposal-received", "node-gov-input"];

  let exigeAprovacao = false;
  const bloqueado = false;
  let nivelAprovacao: "Auto-Aprovado" | "Gerência Comercial" | "Diretoria Comercial" | "Comitê de Crédito & Diretoria" = "Auto-Aprovado";
  let motivoPrincipal = "Proposta em total conformidade com as diretrizes do Governance Studio.";

  const tetoDescontoVendedor = 8;
  const tetoDescontoGerente = 15;
  const pisoMargem = 25;
  const tetoPrazo = 60;
  const tetoVolumeSemAprovacao = 50000;

  // Avaliação de cada regra cadastrada no Governance Studio
  rulesList.forEach((rule) => {
    if (rule.status !== "ativa" && rule.status !== "publicada") return;

    let matched = false;
    let ruleConditionDesc = "";

    // Avaliar condições da regra
    rule.expression.conditions.forEach((c) => {
      const valNum = Number(c.value);
      if (c.field === "desconto") {
        ruleConditionDesc = `Desconto ${c.operator} ${c.value}%`;
        if (c.operator === "lte" && descontoMedio <= valNum) matched = true;
        if (c.operator === "gt" && descontoMedio > valNum) matched = true;
        if (c.operator === "gte" && descontoMedio >= valNum) matched = true;
        if (c.operator === "lt" && descontoMedio < valNum) matched = true;
      } else if (c.field === "margem") {
        ruleConditionDesc = `Margem ${c.operator} ${c.value}%`;
        if (c.operator === "lt" && margemCalculada < valNum) matched = true;
        if (c.operator === "lte" && margemCalculada <= valNum) matched = true;
        if (c.operator === "gte" && margemCalculada >= valNum) matched = true;
        if (c.operator === "gt" && margemCalculada > valNum) matched = true;
      } else if (c.field === "valor") {
        ruleConditionDesc = `Valor/Prazo ${c.operator} ${c.value}`;
        // Checar tanto valor financeiro quanto prazo em dias
        if (valNum <= 120) {
          // Regra de prazo em dias
          if (c.operator === "gt" && prazoDias > valNum) matched = true;
        } else {
          // Regra de valor financeiro
          if (c.operator === "gte" && totalLiquido >= valNum) matched = true;
          if (c.operator === "gt" && totalLiquido > valNum) matched = true;
        }
      }
    });

    // Registrar no trace auditável
    trace.push({
      ruleId: rule.id,
      ruleName: rule.name,
      version: rule.version,
      condition: ruleConditionDesc || rule.name,
      matched
    });

    if (matched) {
      let impacto: GovernanceRuleExecutionResult["impacto"] = "informativo";
      let msg = "";

      if (rule.id === "gov-rule-desc-max-rep") {
        impacto = "liberado";
        msg = `Desconto (${descontoMedio.toFixed(1)}%) dentro da alçada máxima do vendedor (≤ 8%).`;
        nosAcionados.push("node-auto-approve");
      } else if (rule.id === "gov-rule-desc-gerencia") {
        impacto = "alçada_gerencia";
        msg = `Desconto de ${descontoMedio.toFixed(1)}% requer autorização da Gerência Comercial Regional.`;
        exigeAprovacao = true;
        if (nivelAprovacao === "Auto-Aprovado") {
          nivelAprovacao = "Gerência Comercial";
          motivoPrincipal = msg;
        }
        regrasVioladas.push(rule.name);
        nosAcionados.push("disc-3-esc-ger");
      } else if (rule.id === "gov-rule-desc-diretoria") {
        impacto = "alçada_diretoria";
        msg = `Desconto de ${descontoMedio.toFixed(1)}% excede o limite gerencial e exige aprovação da Diretoria Comercial.`;
        exigeAprovacao = true;
        nivelAprovacao = "Diretoria Comercial";
        motivoPrincipal = msg;
        regrasVioladas.push(rule.name);
        nosAcionados.push("disc-4-esc-dir");
      } else if (rule.id === "gov-rule-margem-piso") {
        impacto = "alçada_diretoria";
        msg = `Margem de contribuição (${margemCalculada.toFixed(1)}%) abaixo do piso estatutário de 25%.`;
        exigeAprovacao = true;
        nivelAprovacao = "Diretoria Comercial";
        motivoPrincipal = msg;
        alertas.push("Margem líquida crítica: requer comitê de rentabilidade.");
        regrasVioladas.push(rule.name);
        nosAcionados.push("node-esc-margem-critica");
      } else if (rule.id === "gov-rule-prazo-maximo") {
        impacto = "alçada_gerencia";
        msg = `Prazo de pagamento de ${prazoDias} dias (${proposal.condicaoPagamento || "Especial"}) excede a diretriz de 60 dias.`;
        exigeAprovacao = true;
        if (nivelAprovacao !== "Diretoria Comercial") {
          nivelAprovacao = "Comitê de Crédito & Diretoria";
          motivoPrincipal = msg;
        }
        alertas.push("Condição de pagamento especial: análise de crédito Protheus SE1 requerida.");
        regrasVioladas.push(rule.name);
        nosAcionados.push("node-val-credito-prazo");
      } else if (rule.id === "gov-rule-volume-grande-conta") {
        impacto = "alçada_gerencia";
        msg = `Volume total do pedido (R$ ${totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) superior a R$ 50.000.`;
        exigeAprovacao = true;
        if (nivelAprovacao === "Auto-Aprovado") {
          nivelAprovacao = "Gerência Comercial";
          motivoPrincipal = msg;
        }
        alertas.push("Volume de grande conta: supervisor informado.");
        nosAcionados.push("node-volume-grande-conta");
      }

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        version: rule.version,
        matched: true,
        impacto,
        mensagem: msg,
        flowNodeTarget: nosAcionados[nosAcionados.length - 1]
      });
    }
  });

  // Sugestão de conformidade
  let sugestaoConformidade: string | undefined;
  if (exigeAprovacao) {
    if (descontoMedio > 8 && margemCalculada >= 25) {
      sugestaoConformidade = `Reduza o desconto para no máximo 8% (${((totalBruto * 0.08)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) para obter liberação imediata sem fila de aprovação.`;
    } else if (margemCalculada < 25) {
      sugestaoConformidade = `Aumente os preços ou remova descontos de itens de alto custo para recuperar a margem de contribuição acima de 25%.`;
    } else if (prazoDias > 60) {
      sugestaoConformidade = `Ajuste a condição de pagamento para até 60 dias (ex: 30/60) para dispensar aprovação do Comitê de Crédito.`;
    }
  }

  return {
    aprovadoAutomatico: !exigeAprovacao && !bloqueado,
    exigeAprovacao,
    bloqueado,
    nivelAprovacao,
    motivoPrincipal,
    alertas,
    regrasVioladas,
    regrasAplicadas: appliedRules,
    trace,
    flowExecutado: {
      flowId: "discount-approval",
      flowName: "Aprovação de Descontos & Alçadas Comerciais (Governance Studio)",
      versao: "v3.1",
      nosAcionados
    },
    metricasGovernança: {
      descontoSolicitado: Number(descontoMedio.toFixed(2)),
      descontoTetoPermitido: tetoDescontoVendedor,
      margemCalculada: Number(margemCalculada.toFixed(2)),
      margemPisoEstatutario: pisoMargem,
      prazoMaximoPermitido: `${tetoPrazo} dias`,
      prazoSolicitado: `${prazoDias} dias (${proposal.condicaoPagamento || "Padrão"})`,
      impactoComissaoPct: margemCalculada >= 30 ? 5.5 : 4.5
    },
    sugestaoConformidade
  };
}
