import { HubCustomerProvider } from "./customer.js";
import { HubProductProvider } from "./product.js";
import { HubOrderProvider } from "./order.js";
import { HubQuoteProvider } from "./quote.js";
import { HubCrmProvider } from "./crm.js";
import { HubProductionProvider } from "./production.js";
import {
  type CustomerProvider,
  type ProductProvider,
  type OrderProvider,
  type QuoteProvider,
  type CrmProvider,
  type ProductionProvider,
  type ProviderContext,
  ProviderMode,
  type ProviderConfig,
} from "./types.js";

export {
  type CustomerProvider,
  type ProductProvider,
  type OrderProvider,
  type QuoteProvider,
  type CrmProvider,
  type ProductionProvider,
  type ProviderContext,
  ProviderMode,
  type ProviderConfig,
};

// Factory: cria os providers instanciados para uma determinada organização e modo
export function createProviderContext(
  organizationId: string,
  mode: ProviderMode = ProviderMode.Supabase
): ProviderContext {
  if (mode === ProviderMode.Protheus) {
    throw new Error(
      "Provider mode 'protheus' selected, but Protheus adapter providers " +
        "não foram implementados nesta fase. Use 'supabase' mode ou configure " +
        "custom providers."
    );
  }

  const customer = new HubCustomerProvider(organizationId);
  const product = new HubProductProvider(organizationId);
  const order = new HubOrderProvider(organizationId);
  const quote = new HubQuoteProvider(organizationId);
  const crm = new HubCrmProvider(organizationId);
  const production = new HubProductionProvider(organizationId);

  return { customer, product, order, quote, crm, production };
}

// ─── Modo "auto" helpers ────────────────────────────────────────────────────
// Tenta operações Supabase primeiro; se falhar por organização/schema,
// pode-se cair para o modo Protheus (não implementado plenamente aqui).

export async function trySupabaseOperation<T>(
  operation: () => Promise<T>,
  organizationId: string
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (err: any) {
    // Se o erro mencionar organization_id ou RLS, é problema de configuração
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

// ─── Tipos auxiliares para integração futura ───────────────────────────────
// Estes tipos permitem que o front-end chame os providers via API routes
// sem saber a implementação interna (Supabase vs Protheus).

export interface ProviderApiRoutes {
  customer: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
    findByCnpj: (cnpj: string, orgId: string) => Promise<any>;
  };
  product: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    search: (query: string, orgId: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
    adjustStock: (id: string, delta: number, orgId: string) => Promise<any>;
  };
  order: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
    fromQuote: (quoteId: string, orgId: string) => Promise<any>;
  };
  quote: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
    approve: (id: string, approverId: string, orgId: string) => Promise<any>;
  };
  crm: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
  };
  production: {
    list: (filters?: any) => Promise<any>;
    get: (id: string) => Promise<any>;
    create: (data: any, orgId: string) => Promise<any>;
    update: (id: string, data: any, orgId: string) => Promise<any>;
    delete: (id: string, orgId: string) => Promise<any>;
  };
}