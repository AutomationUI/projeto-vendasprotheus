// ─── Supabase Database Synchronization Service ────────────────────────
// Provides full CRUD operations, live subscriptions, and two-way sync
// between the Supabase PostgreSQL database and the front-end application.

import { supabase } from "./supabase";
import type { Customer, Product, Order, Quote, CrmOpportunity } from "./mock-data";
import type { ProductionBatch } from "./mock-production";
import type { AppUser } from "./types-roles";
import type {
  RepresentativeEnvironment,
  RepresentativePortfolio,
  RepresentativeProductAccess,
  CommercialRule,
  CommissionPolicy,
  CommissionCalculation,
  GovernanceDocument,
  Goal,
  CommercialCampaign,
  DecisionFlow,
} from "../types/governance";

// Map Database Row (snake_case) to Customer (camelCase)
export function mapCustomerFromDB(row: Record<string, any> & { organization_id?: string }): Customer {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      razaoSocial: "",
      cnpj: "",
      email: "",
      telefone: "",
      cidade: "",
      uf: "",
      endereco: "",
      condicaoPagamento: "30 dias",
      totalCompras: 0,
      ultimaCompra: "",
    };
  }
  return {
    id: row.id || "",
    organization_id: row.organization_id,
    razaoSocial: row.razao_social || "",
    cnpj: row.cnpj || "",
    email: row.email || "",
    telefone: row.telefone || "",
    cidade: row.cidade || "",
    uf: row.uf || "",
    endereco: row.endereco || "",
    condicaoPagamento: row.condicao_pagamento || "30 dias",
    totalCompras: Number(row.total_compras || 0),
    ultimaCompra: row.ultima_compra || "",
  };
}

export function mapCustomerToDB(c: Customer, organizationId?: string): Record<string, any> {
  return {
    id: c.id,
    organization_id: organizationId || c.organization_id,
    razao_social: c.razaoSocial,
    cnpj: c.cnpj,
    email: c.email,
    telefone: c.telefone,
    cidade: c.cidade,
    uf: c.uf,
    endereco: c.endereco,
    condicao_pagamento: c.condicaoPagamento,
    total_compras: c.totalCompras,
    ultima_compra: c.ultimaCompra,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to Product
export function mapProductFromDB(row: Record<string, any> & { organization_id?: string }): Product {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      codigo: "",
      nome: "",
      categoria: "Geral",
      preco: 0,
      custo: 0,
      estoque: 0,
      estoqueMinimo: 0,
      unidade: "UN",
      sugestoes: [],
      tags: [],
      mediaVendaMensal: 0,
    };
  }
  return {
    id: row.id || "",
    organization_id: row.organization_id,
    codigo: row.codigo || "",
    nome: row.nome || "",
    categoria: row.categoria || "Geral",
    preco: Number(row.preco || 0),
    custo: Number(row.custo || 0),
    estoque: Number(row.estoque || 0),
    estoqueMinimo: Number(row.estoque_minimo || 0),
    unidade: row.unidade || "UN",
    sugestoes: Array.isArray(row.sugestoes) ? row.sugestoes : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    mediaVendaMensal: Number(row.media_venda_mensal || 0),
  };
}

export function mapProductToDB(p: Product, organizationId?: string): Record<string, any> {
  return {
    id: p.id,
    organization_id: organizationId || p.organization_id,
    codigo: p.codigo,
    nome: p.nome,
    categoria: p.categoria,
    preco: p.preco,
    custo: p.custo ?? 0,
    estoque: p.estoque ?? 0,
    estoque_minimo: p.estoqueMinimo ?? 0,
    unidade: p.unidade ?? "UN",
    sugestoes: p.sugestoes ?? [],
    tags: p.tags ?? [],
    media_venda_mensal: p.mediaVendaMensal ?? 0,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to Order
export function mapOrderFromDB(row: Record<string, any> & { organization_id?: string }): Order {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      numero: "",
      cliente: "",
      vendedor: "",
      data: "",
      valor: 0,
      status: "Pendente",
      condicaoPagamento: "30 dias",
      observacoes: "",
      itens: [],
    };
  }
  return {
    id: row.id || "",
    organization_id: row.organization_id,
    numero: row.numero || "",
    cliente: row.cliente || "",
    vendedor: row.vendedor || "",
    data: row.data || "",
    valor: Number(row.valor || 0),
    status: row.status || "Pendente",
    condicaoPagamento: row.condicao_pagamento || "30 dias",
    observacoes: row.observacoes || "",
    itens: Array.isArray(row.itens) ? row.itens : [],
  };
}

export function mapOrderToDB(o: Order, organizationId: string): Record<string, any> {
  return {
    id: o.id,
    organization_id: organizationId,
    numero: o.numero,
    cliente: o.cliente,
    vendedor: o.vendedor,
    data: o.data,
    valor: o.valor,
    status: o.status,
    condicao_pagamento: o.condicaoPagamento,
    observacoes: o.observacoes || "",
    itens: o.itens || [],
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to Quote
export function mapQuoteFromDB(row: Record<string, any>): Quote {
  return {
    id: row.id,
    numero: row.numero || "",
    cliente: row.cliente || "",
    vendedor: row.vendedor || "",
    data: row.data || "",
    validade: row.validade || "",
    valor: Number(row.valor || 0),
    status: row.status || "Rascunho",
    condicaoPagamento: row.condicao_pagamento || "30 dias",
    observacoes: row.observacoes || "",
    itens: Array.isArray(row.itens) ? row.itens : [],
  };
}

export function mapQuoteToDB(q: Quote): Record<string, any> {
  return {
    id: q.id,
    numero: q.numero,
    cliente: q.cliente,
    vendedor: q.vendedor,
    data: q.data,
    validade: q.validade,
    valor: q.valor,
    status: q.status,
    condicao_pagamento: q.condicaoPagamento,
    observacoes: q.observacoes || "",
    itens: q.itens || [],
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to CRM Opportunity
export function mapOpportunityFromDB(row: Record<string, any>): CrmOpportunity {
  return {
    id: row.id,
    titulo: row.titulo || "",
    cliente: row.cliente || "",
    contato: row.contato || "",
    telefone: row.telefone || "",
    email: row.email || "",
    canal: row.canal || "protheus",
    estagio: row.estagio || "lead",
    valor: Number(row.valor || 0),
    probabilidade: Number(row.probabilidade || 50),
    vendedor: row.vendedor || "",
    dataCriacao: row.data_criacao || "",
    previsaoFechamento: row.previsao_fechamento || "",
    proximoPasso: row.proximo_passo || "",
    origemDescricao: row.origem_descricao || "",
  };
}

export function mapOpportunityToDB(opp: CrmOpportunity): Record<string, any> {
  return {
    id: opp.id,
    titulo: opp.titulo,
    cliente: opp.cliente,
    contato: opp.contato || "",
    telefone: opp.telefone || "",
    email: opp.email || "",
    canal: opp.canal,
    estagio: opp.estagio,
    valor: opp.valor,
    probabilidade: opp.probabilidade,
    vendedor: opp.vendedor,
    data_criacao: opp.dataCriacao,
    previsao_fechamento: opp.previsaoFechamento,
    proximo_passo: opp.proximoPasso,
    origem_descricao: opp.origemDescricao || "",
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to Production Batch
export function mapBatchFromDB(row: Record<string, any>): ProductionBatch {
  return {
    id: row.id,
    lote: row.lote,
    produto: row.produto,
    tipo: row.tipo,
    granulacao: row.granulacao,
    quantidade: Number(row.quantidade || 0),
    unidade: row.unidade || "PÇ",
    status: row.status,
    inicio: row.inicio,
    previsao: row.previsao,
    operador: row.operador,
    prioridade: row.prioridade || "Média",
    observacoes: row.observacoes || "",
  };
}

export function mapBatchToDB(b: ProductionBatch): Record<string, any> {
  return {
    id: b.id,
    lote: b.lote,
    produto: b.produto,
    tipo: b.tipo,
    granulacao: b.granulacao,
    quantidade: b.quantidade,
    unidade: b.unidade,
    status: b.status,
    inicio: b.inicio,
    previsao: b.previsao,
    operador: b.operador,
    prioridade: b.prioridade,
    observacoes: b.observacoes || "",
    updated_at: new Date().toISOString(),
  };
}

// ─── Governance Mapping Functions ──

// Map Database Row to RepresentativeEnvironment
export function mapRepresentativeFromDB(row: Record<string, any>): RepresentativeEnvironment {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    representativeId: row.user_id || row.representative_id || "",
    nome: row.nome || "",
    email: row.email || "",
    telefone: row.telefone || "",
    regiao: row.regiao || "",
    segmentos: Array.isArray(row.segmentos) ? row.segmentos : [],
    metaMensal: Number(row.meta_mensal || 0),
    comissao: Number(row.comissao || 0),
    codigo: row.codigo || "",
    ativo: row.ativo ?? true,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapRepresentativeToDB(r: RepresentativeEnvironment): Record<string, any> {
  return {
    id: r.id,
    organization_id: r.organizationId,
    user_id: r.representativeId,
    codigo: r.codigo,
    nome: r.nome,
    email: r.email,
    telefone: r.telefone,
    regiao: r.regiao,
    segmentos: r.segmentos,
    meta_mensal: r.metaMensal,
    comissao: r.comissao,
    ativo: r.ativo,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to RepresentativePortfolio
export function mapPortfolioFromDB(row: Record<string, any>): RepresentativePortfolio {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    representativeId: row.representative_id || "",
    criteria: Array.isArray(row.criteria) ? row.criteria : [],
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapPortfolioToDB(p: RepresentativePortfolio): Record<string, any> {
  return {
    id: p.id,
    organization_id: p.organizationId,
    representative_id: p.representativeId,
    criteria: p.criteria,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to RepresentativeProductAccess
export function mapProductAccessFromDB(row: Record<string, any>): RepresentativeProductAccess {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    representativeId: row.representative_id || "",
    produtoId: row.produto_id || "",
    liberado: row.liberado ?? true,
    precoTabela: row.preco_tabela ? Number(row.preco_tabela) : undefined,
    descontoMaximo: row.desconto_maximo ? Number(row.desconto_maximo) : undefined,
    margemMinima: row.margem_minima ? Number(row.margem_minima) : undefined,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapProductAccessToDB(a: RepresentativeProductAccess): Record<string, any> {
  return {
    id: a.id,
    organization_id: a.organizationId,
    representative_id: a.representativeId,
    produto_id: a.produtoId,
    liberado: a.liberado,
    preco_tabela: a.precoTabela,
    desconto_maximo: a.descontoMaximo,
    margem_minima: a.margemMinima,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to CommercialRule
export function mapRuleFromDB(row: Record<string, any>): CommercialRule {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    name: row.name || "",
    description: row.description || "",
    expression: row.expression || { combinator: "and", conditions: [] },
    actions: row.actions || [],
    priority: Number(row.priority || 10),
    status: row.status || "rascunho",
    version: Number(row.version || 1),
    supersededBy: row.superseded_by || undefined,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    publishedAt: row.published_at || undefined,
  };
}

export function mapRuleToDB(r: CommercialRule): Record<string, any> {
  return {
    id: r.id,
    organization_id: r.organizationId,
    name: r.name,
    description: r.description,
    expression: r.expression,
    actions: r.actions,
    priority: r.priority,
    status: r.status,
    version: r.version,
    superseded_by: r.supersededBy,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to CommissionPolicy
export function mapPolicyFromDB(row: Record<string, any>): CommissionPolicy {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    name: row.name || "",
    comissaoBase: Number(row.comissao_base || 0),
    releasePolicy: row.release_policy || "faturamento",
    ruleIds: Array.isArray(row.rule_ids) ? row.rule_ids : [],
    version: Number(row.version || 1),
    status: row.status || "rascunho",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    publishedAt: row.published_at || undefined,
  };
}

export function mapPolicyToDB(p: CommissionPolicy): Record<string, any> {
  return {
    id: p.id,
    organization_id: p.organizationId,
    name: p.name,
    comissao_base: p.comissaoBase,
    release_policy: p.releasePolicy,
    rule_ids: p.ruleIds,
    version: p.version,
    status: p.status,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to CommissionCalculation
export function mapCalculationFromDB(row: Record<string, any>): CommissionCalculation {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    representativeId: row.representative_id || "",
    pedidoId: row.pedido_id || undefined,
    orcamentoId: row.orcamento_id || undefined,
    faturaId: row.fatura_id || undefined,
    clienteId: row.cliente_id || "",
    valorBase: Number(row.valor_base || 0),
    margem: row.margem ? Number(row.margem) : undefined,
    metaAtingimento: row.meta_atingimento ? Number(row.meta_atingimento) : undefined,
    policyId: row.policy_id || "",
    policyVersion: Number(row.policy_version || 1),
    appliedRuleIds: Array.isArray(row.applied_rule_ids) ? row.applied_rule_ids : [],
    appliedRuleVersions: row.applied_rule_versions || {},
    trace: Array.isArray(row.trace) ? row.trace : [],
    comissaoBasePercentual: Number(row.comissao_base_percentual || 0),
    bonusPercentual: Number(row.bonus_percentual || 0),
    comissaoFinalPercentual: Number(row.comissao_final_percentual || 0),
    comissaoValor: Number(row.comissao_valor || 0),
    status: row.status || "rascunho",
    events: Array.isArray(row.events) ? row.events : [],
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapCalculationToDB(c: CommissionCalculation): Record<string, any> {
  return {
    id: c.id,
    organization_id: c.organizationId,
    representative_id: c.representativeId,
    pedido_id: c.pedidoId,
    orcamento_id: c.orcamentoId,
    fatura_id: c.faturaId,
    cliente_id: c.clienteId,
    valor_base: c.valorBase,
    margem: c.margem,
    meta_atingimento: c.metaAtingimento,
    policy_id: c.policyId,
    policy_version: c.policyVersion,
    applied_rule_ids: c.appliedRuleIds,
    applied_rule_versions: c.appliedRuleVersions,
    trace: c.trace,
    comissao_base_percentual: c.comissaoBasePercentual,
    bonus_percentual: c.bonusPercentual,
    comissao_final_percentual: c.comissaoFinalPercentual,
    comissao_valor: c.comissaoValor,
    status: c.status,
    events: c.events,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to GovernanceDocument
export function mapDocumentFromDB(row: Record<string, any>): GovernanceDocument {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    ownerId: row.owner_id || "",
    title: row.title || "",
    scope: row.scope || "organizacao",
    scopeRefId: row.scope_ref_id || undefined,
    accessPolicy: row.access_policy || "publico",
    classification: row.classification || "interno",
    version: Number(row.version || 1),
    status: row.status || "rascunho",
    mimeType: row.mime_type || "application/pdf",
    contentRef: row.content_ref || undefined,
    publishedAt: row.published_at || undefined,
    expiresAt: row.expires_at || undefined,
    connectedFlowIds: Array.isArray(row.connected_flow_ids) ? row.connected_flow_ids : [],
    categoryLabel: row.category_label || undefined,
    clausesCount: Number(row.clauses_count || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapDocumentToDB(d: GovernanceDocument): Record<string, any> {
  return {
    id: d.id,
    organization_id: d.organizationId,
    owner_id: d.ownerId,
    title: d.title,
    scope: d.scope,
    scope_ref_id: d.scopeRefId,
    access_policy: d.accessPolicy,
    classification: d.classification,
    version: d.version,
    status: d.status,
    mime_type: d.mimeType,
    content_ref: d.contentRef,
    published_at: d.publishedAt,
    expires_at: d.expiresAt,
    connected_flow_ids: d.connectedFlowIds,
    category_label: d.categoryLabel,
    clauses_count: d.clausesCount,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to Goal
export function mapGoalFromDB(row: Record<string, any>): Goal {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    representativeId: row.representative_id || undefined,
    tipo: row.tipo || "valor_venda",
    objetivo: Number(row.objetivo || 0),
    atingido: Number(row.atingido || 0),
    periodoInicio: row.periodo_inicio || "",
    periodoFim: row.periodo_fim || "",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapGoalToDB(g: Goal): Record<string, any> {
  return {
    id: g.id,
    organization_id: g.organizationId,
    representative_id: g.representativeId,
    tipo: g.tipo,
    objetivo: g.objetivo,
    atingido: g.atingido,
    periodo_inicio: g.periodoInicio,
    periodo_fim: g.periodoFim,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to CommercialCampaign
export function mapCampaignFromDB(row: Record<string, any>): CommercialCampaign {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    name: row.name || "",
    descricao: row.descricao || "",
    produtoIds: Array.isArray(row.produto_ids) ? row.produto_ids : [],
    regrasVinculadas: Array.isArray(row.rule_ids) ? row.rule_ids : [],
    ativo: row.ativo ?? true,
    inicio: row.inicio || "",
    fim: row.fim || undefined,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
  };
}

export function mapCampaignToDB(c: CommercialCampaign): Record<string, any> {
  return {
    id: c.id,
    organization_id: c.organizationId,
    name: c.name,
    descricao: c.descricao,
    produto_ids: c.produtoIds,
    rule_ids: c.regrasVinculadas,
    ativo: c.ativo,
    inicio: c.inicio,
    fim: c.fim,
    updated_at: new Date().toISOString(),
  };
}

// Map Database Row to DecisionFlow
export function mapFlowFromDB(row: Record<string, any>): DecisionFlow {
  return {
    id: row.id || "",
    organizationId: row.organization_id || "",
    name: row.name || "",
    description: row.description || "",
    nodes: Array.isArray(row.nodes) ? row.nodes : [],
    edges: Array.isArray(row.edges) ? row.edges : [],
    version: Number(row.version || 1),
    status: row.status || "rascunho",
    supersededBy: row.superseded_by || undefined,
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || "",
    publishedAt: row.published_at || undefined,
  };
}

export function mapFlowToDB(f: DecisionFlow): Record<string, any> {
  return {
    id: f.id,
    organization_id: f.organizationId,
    name: f.name,
    description: f.description,
    nodes: f.nodes,
    edges: f.edges,
    version: f.version,
    status: f.status,
    superseded_by: f.supersededBy,
    updated_at: new Date().toISOString(),
  };
}

export const supabaseDb = {
  // ── Clientes ──
  async getCustomers(_organizationId?: string): Promise<Customer[] | null> {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("razao_social");
      if (error) throw error;
      return (data || []).filter(Boolean).map((row) => mapCustomerFromDB(row));
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar clientes:", err);
      return null;
    }
  },
  async upsertCustomer(c: Customer, organizationId?: string): Promise<boolean> {
    try {
      const payload = mapCustomerToDB(c, organizationId);
      const { error } = await supabase.from("clientes").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar cliente:", err);
      return false;
    }
  },
  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir cliente:", err);
      return false;
    }
  },

  // ── Produtos ──
  async getProducts(_organizationId?: string): Promise<Product[] | null> {
    try {
      const { data, error } = await supabase.from("produtos").select("*").order("codigo");
      if (error) throw error;
      return (data || []).filter(Boolean).map((row) => mapProductFromDB(row));
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar produtos:", err);
      return null;
    }
  },
  async upsertProduct(p: Product, organizationId?: string): Promise<boolean> {
    try {
      const payload = mapProductToDB(p, organizationId);
      const { error } = await supabase.from("produtos").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar produto:", err);
      return false;
    }
  },
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir produto:", err);
      return false;
    }
  },

  // ── Pedidos ──
  async getOrders(_organizationId?: string): Promise<Order[] | null> {
    try {
      const { data, error } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).filter(Boolean).map((row) => mapOrderFromDB(row));
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar pedidos:", err);
      return null;
    }
  },
  async upsertOrder(o: Order, organizationId?: string): Promise<boolean> {
    try {
      const payload = mapOrderToDB(o, organizationId);
      const { error } = await supabase.from("pedidos").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar pedido:", err);
      return false;
    }
  },
  async deleteOrder(id: string, _organizationId?: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("pedidos").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir pedido:", err);
      return false;
    }
  },

  // ── Orçamentos ──
  async getQuotes(): Promise<Quote[] | null> {
    try {
      const { data, error } = await supabase.from("orcamentos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapQuoteFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar orçamentos:", err);
      return null;
    }
  },
  async upsertQuote(q: Quote): Promise<boolean> {
    try {
      const payload = mapQuoteToDB(q);
      const { error } = await supabase.from("orcamentos").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar orçamento:", err);
      return false;
    }
  },
  async deleteQuote(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("orcamentos").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir orçamento:", err);
      return false;
    }
  },

  // ── CRM Oportunidades ──
  async getOpportunities(): Promise<CrmOpportunity[] | null> {
    try {
      const { data, error } = await supabase.from("oportunidades_crm").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapOpportunityFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar oportunidades CRM:", err);
      return null;
    }
  },
  async upsertOpportunity(opp: CrmOpportunity): Promise<boolean> {
    try {
      const payload = mapOpportunityToDB(opp);
      const { error } = await supabase.from("oportunidades_crm").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar oportunidade CRM:", err);
      return false;
    }
  },
  async deleteOpportunity(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("oportunidades_crm").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir oportunidade CRM:", err);
      return false;
    }
  },

  // ── Produção Lotes ──
  async getBatches(): Promise<ProductionBatch[] | null> {
    try {
      const { data, error } = await supabase.from("producao_lotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapBatchFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar lotes de produção:", err);
      return null;
    }
  },
  async upsertBatch(b: ProductionBatch): Promise<boolean> {
    try {
      const payload = mapBatchToDB(b);
      const { error } = await supabase.from("producao_lotes").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar lote de produção:", err);
      return false;
    }
  },

  // ── Governance: Representatives ──
  async getRepresentatives(organizationId?: string): Promise<RepresentativeEnvironment[] | null> {
    try {
      let query = supabase.from("representatives").select("*").order("codigo");
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRepresentativeFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar representantes:", err);
      return null;
    }
  },
  async upsertRepresentative(r: RepresentativeEnvironment): Promise<boolean> {
    try {
      const payload = mapRepresentativeToDB(r);
      const { error } = await supabase.from("representatives").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar representante:", err);
      return false;
    }
  },
  async deleteRepresentative(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("representatives").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir representante:", err);
      return false;
    }
  },

  // ── Governance: Portfolios ──
  async getPortfolios(organizationId?: string, representativeId?: string): Promise<RepresentativePortfolio[] | null> {
    try {
      let query = supabase.from("representative_portfolios").select("*").order("created_at", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      if (representativeId) query = query.eq("representative_id", representativeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapPortfolioFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar carteiras:", err);
      return null;
    }
  },
  async upsertPortfolio(p: RepresentativePortfolio): Promise<boolean> {
    try {
      const payload = mapPortfolioToDB(p);
      const { error } = await supabase.from("representative_portfolios").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar carteira:", err);
      return false;
    }
  },
  async deletePortfolio(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("representative_portfolios").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir carteira:", err);
      return false;
    }
  },

  // ── Governance: Product Access ──
  async getProductAccess(organizationId?: string, representativeId?: string): Promise<RepresentativeProductAccess[] | null> {
    try {
      let query = supabase.from("representative_product_access").select("*").order("created_at", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      if (representativeId) query = query.eq("representative_id", representativeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapProductAccessFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar acesso a produtos:", err);
      return null;
    }
  },
  async upsertProductAccess(a: RepresentativeProductAccess): Promise<boolean> {
    try {
      const payload = mapProductAccessToDB(a);
      const { error } = await supabase.from("representative_product_access").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar acesso a produto:", err);
      return false;
    }
  },
  async deleteProductAccess(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("representative_product_access").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir acesso a produto:", err);
      return false;
    }
  },

  // ── Governance: Commercial Rules ──
  async getRules(organizationId?: string): Promise<CommercialRule[] | null> {
    try {
      let query = supabase.from("commercial_rules").select("*").order("priority", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapRuleFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar regras comerciais:", err);
      return null;
    }
  },
  async upsertRule(r: CommercialRule): Promise<boolean> {
    try {
      const payload = mapRuleToDB(r);
      const { error } = await supabase.from("commercial_rules").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar regra comercial:", err);
      return false;
    }
  },
  async deleteRule(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("commercial_rules").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir regra comercial:", err);
      return false;
    }
  },

  // ── Governance: Commission Policies ──
  async getPolicies(organizationId?: string): Promise<CommissionPolicy[] | null> {
    try {
      let query = supabase.from("commission_policies").select("*").order("name");
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapPolicyFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar políticas de comissão:", err);
      return null;
    }
  },
  async upsertPolicy(p: CommissionPolicy): Promise<boolean> {
    try {
      const payload = mapPolicyToDB(p);
      const { error } = await supabase.from("commission_policies").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar política de comissão:", err);
      return false;
    }
  },
  async deletePolicy(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("commission_policies").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir política de comissão:", err);
      return false;
    }
  },

  // ── Governance: Commission Calculations ──
  async getCalculations(organizationId?: string, representativeId?: string): Promise<CommissionCalculation[] | null> {
    try {
      let query = supabase.from("commission_calculations").select("*").order("created_at", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      if (representativeId) query = query.eq("representative_id", representativeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapCalculationFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar cálculos de comissão:", err);
      return null;
    }
  },
  async upsertCalculation(c: CommissionCalculation): Promise<boolean> {
    try {
      const payload = mapCalculationToDB(c);
      const { error } = await supabase.from("commission_calculations").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar cálculo de comissão:", err);
      return false;
    }
  },

  // ── Governance: Documents ──
  async getDocuments(organizationId?: string): Promise<GovernanceDocument[] | null> {
    try {
      let query = supabase.from("governance_documents").select("*").order("created_at", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDocumentFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar documentos:", err);
      return null;
    }
  },
  async upsertDocument(d: GovernanceDocument): Promise<boolean> {
    try {
      const payload = mapDocumentToDB(d);
      const { error } = await supabase.from("governance_documents").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar documento:", err);
      return false;
    }
  },
  async deleteDocument(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("governance_documents").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir documento:", err);
      return false;
    }
  },

  // ── Governance: Goals ──
  async getGoals(organizationId?: string, representativeId?: string): Promise<Goal[] | null> {
    try {
      let query = supabase.from("goals").select("*").order("periodo_inicio", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      if (representativeId) query = query.eq("representative_id", representativeId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapGoalFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar metas:", err);
      return null;
    }
  },
  async upsertGoal(g: Goal): Promise<boolean> {
    try {
      const payload = mapGoalToDB(g);
      const { error } = await supabase.from("goals").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar meta:", err);
      return false;
    }
  },
  async deleteGoal(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir meta:", err);
      return false;
    }
  },

  // ── Governance: Campaigns ──
  async getCampaigns(organizationId?: string): Promise<CommercialCampaign[] | null> {
    try {
      let query = supabase.from("commercial_campaigns").select("*").order("inicio", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapCampaignFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar campanhas:", err);
      return null;
    }
  },
  async upsertCampaign(c: CommercialCampaign): Promise<boolean> {
    try {
      const payload = mapCampaignToDB(c);
      const { error } = await supabase.from("commercial_campaigns").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar campanha:", err);
      return false;
    }
  },
  async deleteCampaign(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("commercial_campaigns").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir campanha:", err);
      return false;
    }
  },

  // ── Governance: Decision Flows ──
  async getFlows(organizationId?: string): Promise<DecisionFlow[] | null> {
    try {
      let query = supabase.from("decision_flows").select("*").order("created_at", { ascending: false });
      if (organizationId) query = query.eq("organization_id", organizationId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapFlowFromDB);
    } catch (err) {
      console.warn("[Supabase] Falha ao carregar fluxos de decisão:", err);
      return null;
    }
  },
  async upsertFlow(f: DecisionFlow): Promise<boolean> {
    try {
      const payload = mapFlowToDB(f);
      const { error } = await supabase.from("decision_flows").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao salvar fluxo de decisão:", err);
      return false;
    }
  },
  async deleteFlow(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("decision_flows").delete().eq("id", id);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn("[Supabase] Falha ao excluir fluxo de decisão:", err);
      return false;
    }
  },

  // ── Sincronização em Massa (Seed / Push) ──
  async seedAllInitialData(data: {
    customers: Customer[];
    products: Product[];
    orders: Order[];
    quotes: Quote[];
    opportunities: CrmOpportunity[];
    batches: ProductionBatch[];
    users?: AppUser[];
    representatives?: RepresentativeEnvironment[];
    portfolios?: RepresentativePortfolio[];
    productAccess?: RepresentativeProductAccess[];
    rules?: CommercialRule[];
    policies?: CommissionPolicy[];
    calculations?: CommissionCalculation[];
    documents?: GovernanceDocument[];
    goals?: Goal[];
    campaigns?: CommercialCampaign[];
    flows?: DecisionFlow[];
  }): Promise<{ success: boolean; details: Record<string, { count: number; error?: string }> }> {
    const results: Record<string, { count: number; error?: string }> = {};

    // 1. Clientes
    try {
      const rows = data.customers.map((c) => mapCustomerToDB(c));
      const { error } = await supabase.from("clientes").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.clientes = { count: rows.length };
    } catch (err: any) {
      results.clientes = { count: 0, error: err.message };
    }

    // 2. Produtos
    try {
      const rows = data.products.map((p) => mapProductToDB(p));
      const { error } = await supabase.from("produtos").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.produtos = { count: rows.length };
    } catch (err: any) {
      results.produtos = { count: 0, error: err.message };
    }

    // 3. Pedidos
    try {
      const rows = data.orders.map((o) => mapOrderToDB(o));
      const { error } = await supabase.from("pedidos").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.pedidos = { count: rows.length };
    } catch (err: any) {
      results.pedidos = { count: 0, error: err.message };
    }

    // 4. Orçamentos
    try {
      const rows = data.quotes.map((q) => mapQuoteToDB(q));
      const { error } = await supabase.from("orcamentos").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.orcamentos = { count: rows.length };
    } catch (err: any) {
      results.orcamentos = { count: 0, error: err.message };
    }

    // 5. Oportunidades CRM
    try {
      const rows = data.opportunities.map((opp) => mapOpportunityToDB(opp));
      const { error } = await supabase.from("oportunidades_crm").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.oportunidades_crm = { count: rows.length };
    } catch (err: any) {
      results.oportunidades_crm = { count: 0, error: err.message };
    }

    // 6. Lotes Produção
    try {
      const rows = data.batches.map((b) => mapBatchToDB(b));
      const { error } = await supabase.from("producao_lotes").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      results.producao_lotes = { count: rows.length };
    } catch (err: any) {
      results.producao_lotes = { count: 0, error: err.message };
    }

    // 7. Governance: Representatives
    if (data.representatives?.length) {
      try {
        const rows = data.representatives.map((r) => mapRepresentativeToDB(r));
        const { error } = await supabase.from("representatives").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.representatives = { count: rows.length };
      } catch (err: any) {
        results.representatives = { count: 0, error: err.message };
      }
    }

    // 8. Governance: Portfolios
    if (data.portfolios?.length) {
      try {
        const rows = data.portfolios.map((p) => mapPortfolioToDB(p));
        const { error } = await supabase.from("representative_portfolios").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.portfolios = { count: rows.length };
      } catch (err: any) {
        results.portfolios = { count: 0, error: err.message };
      }
    }

    // 9. Governance: Product Access
    if (data.productAccess?.length) {
      try {
        const rows = data.productAccess.map((a) => mapProductAccessToDB(a));
        const { error } = await supabase.from("representative_product_access").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.product_access = { count: rows.length };
      } catch (err: any) {
        results.product_access = { count: 0, error: err.message };
      }
    }

    // 10. Governance: Rules
    if (data.rules?.length) {
      try {
        const rows = data.rules.map((r) => mapRuleToDB(r));
        const { error } = await supabase.from("commercial_rules").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.commercial_rules = { count: rows.length };
      } catch (err: any) {
        results.commercial_rules = { count: 0, error: err.message };
      }
    }

    // 11. Governance: Policies
    if (data.policies?.length) {
      try {
        const rows = data.policies.map((p) => mapPolicyToDB(p));
        const { error } = await supabase.from("commission_policies").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.commission_policies = { count: rows.length };
      } catch (err: any) {
        results.commission_policies = { count: 0, error: err.message };
      }
    }

    // 12. Governance: Calculations
    if (data.calculations?.length) {
      try {
        const rows = data.calculations.map((c) => mapCalculationToDB(c));
        const { error } = await supabase.from("commission_calculations").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.commission_calculations = { count: rows.length };
      } catch (err: any) {
        results.commission_calculations = { count: 0, error: err.message };
      }
    }

    // 13. Governance: Documents
    if (data.documents?.length) {
      try {
        const rows = data.documents.map((d) => mapDocumentToDB(d));
        const { error } = await supabase.from("governance_documents").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.governance_documents = { count: rows.length };
      } catch (err: any) {
        results.governance_documents = { count: 0, error: err.message };
      }
    }

    // 14. Governance: Goals
    if (data.goals?.length) {
      try {
        const rows = data.goals.map((g) => mapGoalToDB(g));
        const { error } = await supabase.from("goals").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.goals = { count: rows.length };
      } catch (err: any) {
        results.goals = { count: 0, error: err.message };
      }
    }

    // 15. Governance: Campaigns
    if (data.campaigns?.length) {
      try {
        const rows = data.campaigns.map((c) => mapCampaignToDB(c));
        const { error } = await supabase.from("commercial_campaigns").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.commercial_campaigns = { count: rows.length };
      } catch (err: any) {
        results.commercial_campaigns = { count: 0, error: err.message };
      }
    }

    // 16. Governance: Decision Flows
    if (data.flows?.length) {
      try {
        const rows = data.flows.map((f) => mapFlowToDB(f));
        const { error } = await supabase.from("decision_flows").upsert(rows, { onConflict: "id" });
        if (error) throw error;
        results.decision_flows = { count: rows.length };
      } catch (err: any) {
        results.decision_flows = { count: 0, error: err.message };
      }
    }

    const hasAnySuccess = Object.values(results).some((r) => r.count > 0);
    return {
      success: hasAnySuccess,
      details: results,
    };
  },
};