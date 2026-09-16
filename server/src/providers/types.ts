// ─── Provider Pattern: Contratos Abstratos ────────────────────────────────────
// Isola a camada de aplicação das regras de sistemas externos (ERP, etc.).
// O Hub é 100% autônomo via InternalDatabaseProvider (Supabase).
// Os providers concretos podem backed por Supabase ou Protheus adapter,
// conforme configuração por organização.

import type { Customer, Product, Order, Quote, CrmOpportunity } from "../lib/types-roles";
import type { ProductionBatch } from "../lib/mock-production";
import type { AppUser } from "../lib/types-roles";

// Re-exporta os tipos de entidade para os providers (import { Customer } from "./types")
export type { Customer, Product, Order, Quote, CrmOpportunity, AppUser } from "../lib/types-roles";
export type { ProductionBatch } from "../lib/mock-production";

export interface CustomerProvider {
  // Clientes
  list(filters?: { role?: string; onlyActive?: boolean }): Promise<Customer[]>;
  get(id: string, organizationId: string): Promise<Customer | null>;
  create(data: Partial<Customer>, organizationId: string): Promise<Customer>;
  update(id: string, data: Partial<Customer>, organizationId: string): Promise<Customer>;
  delete(id: string, organizationId: string): Promise<boolean>;
  // Busca por CNPJ dentro da organização
  findByCnpj(cnpj: string, organizationId: string): Promise<Customer | null>;
}

export interface ProductProvider {
  // Produtos
  list(filters?: { category?: string; onlyActive?: boolean; onlyWithStock?: boolean }): Promise<Product[]>;
  get(id: string, organizationId: string): Promise<Product | null>;
  search(query: string, organizationId: string): Promise<Product[]>;
  create(data: Partial<Product>, organizationId: string): Promise<Product>;
  update(id: string, data: Partial<Product>, organizationId: string): Promise<Product>;
  delete(id: string, organizationId: string): Promise<boolean>;
  // Estoque
  adjustStock(id: string, delta: number, organizationId: string): Promise<Product | null>;
}

export interface OrderProvider {
  // Pedidos de Venda
  list(filters?: { status?: string; onlyOpen?: boolean; dateRange?: { from: string; to: string } }): Promise<Order[]>;
  get(id: string, organizationId: string): Promise<Order | null>;
  create(data: Partial<Order>, organizationId: string): Promise<Order>;
  update(id: string, data: Partial<Order>, organizationId: string): Promise<Order>;
  delete(id: string, organizationId: string): Promise<boolean>;
  // Conversão de orçamento → pedido
  fromQuote(quoteId: string, organizationId: string): Promise<Order | null>;
}

export interface QuoteProvider {
  // Orçamentos
  list(filters?: { status?: string; onlyOpen?: boolean }): Promise<Quote[]>;
  get(id: string, organizationId: string): Promise<Quote | null>;
  create(data: Partial<Quote>, organizationId: string): Promise<Quote>;
  update(id: string, data: Partial<Quote>, organizationId: string): Promise<Quote>;
  delete(id: string, organizationId: string): Promise<boolean>;
  // Aprovação
  approve(id: string, approverId: string, organizationId: string): Promise<Quote>;
}

export interface CrmProvider {
  // Oportunidades CRM
  list(filters?: { stage?: string; onlyOpen?: boolean }): Promise<CrmOpportunity[]>;
  get(id: string, organizationId: string): Promise<CrmOpportunity | null>;
  create(data: Partial<CrmOpportunity>, organizationId: string): Promise<CrmOpportunity>;
  update(id: string, data: Partial<CrmOpportunity>, organizationId: string): Promise<CrmOpportunity>;
  delete(id: string, organizationId: string): Promise<boolean>;
}

export interface ProductionProvider {
  // Lotes de Produção
  list(filters?: { status?: string; onlyActive?: boolean }): Promise<ProductionBatch[]>;
  get(id: string, organizationId: string): Promise<ProductionBatch | null>;
  create(data: Partial<ProductionBatch>, organizationId: string): Promise<ProductionBatch>;
  update(id: string, data: Partial<ProductionBatch>, organizationId: string): Promise<ProductionBatch>;
  delete(id: string, organizationId: string): Promise<boolean>;
}

// ─── Context Provider ──────────────────────────────────────────────────────
// Fornece as instâncias de provider injetáveis, decidindo o backend
// (Supabase nativo vs Protheus adapter) conforme organização.

export type ProviderContext = {
  customer: CustomerProvider;
  product: ProductProvider;
  order: OrderProvider;
  quote: QuoteProvider;
  crm: CrmProvider;
  production: ProductionProvider;
};

// ─── Configuração de Provider por Organização ──────────────────────────────
// Define qual provider implementation usar por organização.
// 'supabase' = Hub nativo (Supabase + organization_id RLS)
// 'protheus' = Adapter Protheus (proxy direto)
// 'auto' = tenta Supabase primeiro, fallback para Protheus se falhar
export enum ProviderMode {
  Supabase = "supabase",
  Protheus = "protheus",
  Auto = "auto",
}

export interface ProviderConfig {
  mode: ProviderMode;
  organizationId?: string;
  // Credenciais específicas por modo
  protheus?: {
    baseUrl: string;
    user?: string;
    pass?: string;
    tenantId?: string;
  };
  supabase?: Record<string, unknown>;
}

// ─── Implementação Base (estrutura compartilhada) ─────────────────────────
// Código comum a todos os providers: tipagem, validação de organization_id,
// logging e tratamento de erro padronizado.

export abstract class BaseProvider {
  protected abstract getOrganizationId(): string | null;
  
  protected ensureOrgId(operation: string): void {
    const orgId = this.getOrganizationId();
    if (!orgId) {
      throw new Error(`[BaseProvider] ${operation} requer organizationId. Contexto atual não possui organização ativa.`);
    }
  }
}