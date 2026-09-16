import { getSettings } from "@/lib/settings-store";
import { FLOW_TEMPLATES } from "@/data/all-flows-templates";
import { 
  DEFAULT_GOVERNANCE_RULES, 
  evaluateProposalWithGovernanceRules,
  getPrazoEmDias
} from "@/lib/governance-flow-bridge";
import type { RuleTraceEntry } from "@/types/governance";

export interface ProposalItemEvaluation {
  produto?: string;
  codigo?: string;
  quantidade: number;
  precoUnitario: number;
  desconto?: number; // %
  precoFinal?: number;
  custo?: number;
  estoque?: number;
}

export interface CommercialProposalInput {
  total: number;
  subtotal?: number;
  descontoPercentual?: number;
  descontoValor?: number;
  margemPercentual?: number;
  cliente?: string;
  vendedor?: string;
  condicaoPagamento?: string;
  itens?: ProposalItemEvaluation[];
}

export interface CommercialEvaluationResult {
  aprovadoAutomatico: boolean;
  exigeAprovacao: boolean;
  bloqueadoPorEstoque: boolean;
  bloqueadoPorMargem: boolean;
  nivelAprovacao: "Auto-Aprovado" | "Gerência Comercial" | "Diretoria Comercial" | "Comitê de Crédito & Diretoria";
  motivoPrincipal: string;
  alertas: string[];
  regrasVioladas: string[];
  governanceTrace?: RuleTraceEntry[];
  flowExecutado: {
    flowId: string;
    flowName: string;
    versao: string;
    caminhoExecutado: string[];
    noDecisaoId: string;
  };
  metricasCalculadas: {
    totalBruto: number;
    totalDesconto: number;
    totalLiquido: number;
    descontoMedioPct: number;
    margemMediaPct: number;
    itensSemEstoqueCount: number;
  };
  sugestaoAjuste?: string;
}

export const COMMERCIAL_FLOWS = [
  {
    id: "discount-approval",
    name: "Aprovação de Descontos & Alçadas Comerciais",
    version: "v3.1",
    category: "Governança Comercial",
    description: "Esteira de auditoria de margem líquida e escalonamento hierárquico (Vendedor até 8%, Gerência até 15%, Diretoria acima de 15%)."
  },
  {
    id: "lead-routing",
    name: "Qualificação & Roteamento de Leads",
    version: "v2.4",
    category: "Comercial & CRM",
    description: "Valida regras de atribuição de carteira de grandes contas e priorização de atendimento."
  },
  {
    id: "commission-engine",
    name: "Motor de Apuração de Comissões Protheus",
    version: "v4.0",
    category: "Remuneração & Metas",
    description: "Calcula comissões e aceleradores com base no cumprimento de cotas e retenção por inadimplência."
  },
  {
    id: "credit-analysis",
    name: "Esteira Inteligente de Crédito & Limite",
    version: "v2.1",
    category: "Risco & Financeiro",
    description: "Audita saldo devedor no Protheus SE1 e score Serasa antes de aprovar pedidos a prazo."
  }
];

/**
 * Calcula métricas agregadas de itens e proposta
 */
export function calculateProposalMetrics(itens: ProposalItemEvaluation[] = []): {
  totalBruto: number;
  totalDesconto: number;
  totalLiquido: number;
  descontoMedioPct: number;
  margemMediaPct: number;
  itensSemEstoqueCount: number;
} {
  let totalBruto = 0;
  let totalDesconto = 0;
  let totalCusto = 0;
  let itensSemEstoqueCount = 0;

  itens.forEach((item) => {
    const qtd = Number(item.quantidade) || 1;
    const preco = Number(item.precoUnitario) || 0;
    const descPct = Number(item.desconto) || 0;
    const custo = Number(item.custo) || preco * 0.65; // Margem padrão estimada se não informada
    const estoque = item.estoque !== undefined ? Number(item.estoque) : 999;

    const itemBruto = qtd * preco;
    const itemDesconto = itemBruto * (descPct / 100);
    const itemLiquido = itemBruto - itemDesconto;
    const itemCustoTotal = qtd * custo;

    totalBruto += itemBruto;
    totalDesconto += itemDesconto;
    totalCusto += itemCustoTotal;

    if (estoque < qtd) {
      itensSemEstoqueCount++;
    }
  });

  const totalLiquido = totalBruto - totalDesconto;
  const descontoMedioPct = totalBruto > 0 ? (totalDesconto / totalBruto) * 100 : 0;
  const margemMediaPct = totalLiquido > 0 ? ((totalLiquido - totalCusto) / totalLiquido) * 100 : 35;

  return {
    totalBruto,
    totalDesconto,
    totalLiquido,
    descontoMedioPct: Number(descontoMedioPct.toFixed(2)),
    margemMediaPct: Number(margemMediaPct.toFixed(2)),
    itensSemEstoqueCount
  };
}

/**
 * Avalia proposta comercial / orçamento / pedido contra o motor do Flow Studio e regras globais
 */
export function evaluateCommercialRules(
  input: CommercialProposalInput,
  overrideRules?: Partial<ReturnType<typeof getSettings>["regrasVenda"]>
): CommercialEvaluationResult {
  const currentSettings = getSettings();
  const rules = {
    ...currentSettings.regrasVenda,
    ...overrideRules
  };

  const metrics = input.itens && input.itens.length > 0
    ? calculateProposalMetrics(input.itens)
    : {
        totalBruto: input.subtotal || input.total || 0,
        totalDesconto: input.descontoValor || 0,
        totalLiquido: input.total || 0,
        descontoMedioPct: input.descontoPercentual || 0,
        margemMediaPct: input.margemPercentual || 30,
        itensSemEstoqueCount: 0
      };

  const descMaxVendedor = Number(rules.descontoMaximoSemAprovacao) || 8;
  const descMaxGerencia = Number(rules.alçadaGerenciaDesconto) || 15;
  const margemMinima = Number(rules.margemMinimaContribuicao) || 25;
  const valorMaximoSemAprovacao = Number(rules.valorAprovacaoObrigatoria) || 50000;
  const bloquearSemEstoque = rules.bloquearVendaSemEstoque ?? true;

  const alertas: string[] = [];
  const regrasVioladas: string[] = [];
  const caminhoExecutado: string[] = ["trigger-entrada-orcamento"];
  let nivelAprovacao: CommercialEvaluationResult["nivelAprovacao"] = "Auto-Aprovado";
  let noDecisaoId = "disc-auto-app";
  let motivoPrincipal = "Proposta em conformidade com as regras globais e aprovada automaticamente.";
  let bloqueadoPorEstoque = false;
  let bloqueadoPorMargem = false;

  // 1. Checagem de Estoque
  if (bloquearSemEstoque && metrics.itensSemEstoqueCount > 0) {
    bloqueadoPorEstoque = true;
    caminhoExecutado.push("stock-check-blocked");
    regrasVioladas.push(`Existe(m) ${metrics.itensSemEstoqueCount} item(ns) com saldo em estoque insuficiente.`);
    alertas.push("Bloqueio de política de estoque ativo nas configurações.");
  }

  // 2. Checagem de Margem de Contribuição Líquida
  if (metrics.margemMediaPct < margemMinima) {
    bloqueadoPorMargem = true;
    regrasVioladas.push(`Margem de contribuição (${metrics.margemMediaPct.toFixed(1)}%) abaixo do piso estatutário (${margemMinima}%).`);
    caminhoExecutado.push("disc-3-dir", "disc-5-block-margin");
    noDecisaoId = "disc-5-block-margin";
    nivelAprovacao = "Diretoria Comercial";
    motivoPrincipal = `Margem crítica de ${metrics.margemMediaPct.toFixed(1)}% exige parecer e exceção da Diretoria Comercial.`;
    alertas.push("Violação de margem de governança.");
  }

  // 3. Checagem de Alçada de Desconto
  if (metrics.descontoMedioPct > descMaxGerencia) {
    // Desconto > 15% -> Diretoria
    caminhoExecutado.push("disc-2-cond-gt-15", "disc-4-esc-dir");
    noDecisaoId = "disc-4-esc-dir";
    nivelAprovacao = "Diretoria Comercial";
    motivoPrincipal = `Desconto de ${metrics.descontoMedioPct.toFixed(1)}% ultrapassa alçada gerencial (${descMaxGerencia}%) e requer validação da Diretoria.`;
    regrasVioladas.push(`Desconto acima de ${descMaxGerencia}%`);
    alertas.push("Escalonado para Diretoria Comercial");
  } else if (metrics.descontoMedioPct > descMaxVendedor) {
    // Desconto > 8% e <= 15% -> Gerência Regional
    caminhoExecutado.push("disc-2-cond-mid", "disc-3-ger");
    noDecisaoId = "disc-3-ger";
    nivelAprovacao = "Gerência Comercial";
    motivoPrincipal = `Desconto de ${metrics.descontoMedioPct.toFixed(1)}% acima da alçada livre do vendedor (${descMaxVendedor}%). Pendente de Gerente Regional.`;
    regrasVioladas.push(`Desconto entre ${descMaxVendedor}% e ${descMaxGerencia}%`);
  }

  // 4. Checagem de Valor Total Alto
  if (metrics.totalLiquido >= valorMaximoSemAprovacao && nivelAprovacao === "Auto-Aprovado") {
    caminhoExecutado.push("high-value-check", "disc-3-ger");
    noDecisaoId = "high-value-check";
    nivelAprovacao = "Gerência Comercial";
    motivoPrincipal = `Pedido de alto volume (R$ ${metrics.totalLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) exige chancela gerencial.`;
    regrasVioladas.push(`Valor total acima de R$ ${valorMaximoSemAprovacao.toLocaleString("pt-BR")}`);
  }

  // 5. Checagem de Prazo de Pagamento (Governance Studio)
  const prazoDias = getPrazoEmDias(input.condicaoPagamento);
  if (prazoDias > 60 && nivelAprovacao !== "Diretoria Comercial") {
    caminhoExecutado.push("node-val-credito-prazo");
    nivelAprovacao = "Comitê de Crédito & Diretoria";
    motivoPrincipal = `Condição de pagamento (${input.condicaoPagamento || prazoDias + " dias"}) ultrapassa diretriz máxima de 60 dias.`;
    regrasVioladas.push(`Prazo de pagamento acima de 60 dias (${prazoDias}d)`);
    alertas.push("Auditoria de risco financeiro Protheus SE1 requerida.");
  }

  const exigeAprovacao = nivelAprovacao !== "Auto-Aprovado" || bloqueadoPorEstoque;
  const aprovadoAutomatico = !exigeAprovacao;

  // Sugestão Inteligente de Ajuste
  let sugestaoAjuste: string | undefined;
  if (nivelAprovacao === "Gerência Comercial") {
    sugestaoAjuste = `Para auto-aprovação imediata, reduza o desconto médio para até ${descMaxVendedor}% (máximo permitido sem alçada).`;
  } else if (nivelAprovacao === "Diretoria Comercial") {
    sugestaoAjuste = `Para evitar escalonamento à Diretoria, mantenha o desconto em até ${descMaxGerencia}% e garanta margem mínima de ${margemMinima}%.`;
  } else if (nivelAprovacao === "Comitê de Crédito & Diretoria") {
    sugestaoAjuste = `Ajuste a condição de pagamento para até 60 dias (ex: 30/60) para dispensar aprovação do Comitê de Crédito.`;
  }

  // Obter trace auditável de governança
  const govBridgeOutcome = evaluateProposalWithGovernanceRules({
    total: metrics.totalLiquido,
    descontoMedioPct: metrics.descontoMedioPct,
    margemMediaPct: metrics.margemMediaPct,
    condicaoPagamento: input.condicaoPagamento,
    itens: input.itens?.map(i => ({
      quantidade: i.quantidade,
      precoUnitario: i.precoUnitario,
      desconto: i.desconto,
      custo: i.custo,
      estoque: i.estoque
    }))
  });

  const flowId = rules.flowId || "discount-approval";
  const flowMeta = COMMERCIAL_FLOWS.find((f) => f.id === flowId) || COMMERCIAL_FLOWS[0];

  return {
    aprovadoAutomatico,
    exigeAprovacao,
    bloqueadoPorEstoque,
    bloqueadoPorMargem,
    nivelAprovacao,
    motivoPrincipal,
    alertas,
    regrasVioladas,
    governanceTrace: govBridgeOutcome.trace,
    flowExecutado: {
      flowId: flowMeta.id,
      flowName: flowMeta.name,
      versao: flowMeta.version,
      caminhoExecutado,
      noDecisaoId
    },
    metricasCalculadas: metrics,
    sugestaoAjuste
  };
}
