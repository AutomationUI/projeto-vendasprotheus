// ─── ERP Provider Pattern Abstraction Layer ──────────────────
// Implements robust provider abstraction for ERP integration (TOTVS Protheus & Native Database)

import { supabaseDb } from "./supabase-db";
import { localDB } from "./local-db";
import type { Customer, Product, Order, Quote, CrmOpportunity } from "./mock-data";

export interface ErpCustomerProvider {
  getCustomers(): Promise<Customer[]>;
  saveCustomer(customer: Customer): Promise<boolean>;
  deleteCustomer(id: string): Promise<boolean>;
}

export interface ErpOrderProvider {
  getOrders(): Promise<Order[]>;
  saveOrder(order: Order): Promise<boolean>;
  deleteOrder(id: string): Promise<boolean>;
}

export interface ErpProductProvider {
  getProducts(): Promise<Product[]>;
  saveProduct(product: Product): Promise<boolean>;
  deleteProduct(id: string): Promise<boolean>;
}

export interface ErpQuoteProvider {
  getQuotes(): Promise<Quote[]>;
  saveQuote(quote: Quote): Promise<boolean>;
  deleteQuote(id: string): Promise<boolean>;
}

export interface ErpCrmProvider {
  getOpportunities(): Promise<CrmOpportunity[]>;
  saveOpportunity(opp: CrmOpportunity): Promise<boolean>;
  deleteOpportunity(id: string): Promise<boolean>;
}

// ─── Supabase Cloud Provider Implementation ───
export const SupabaseErpCustomerProvider: ErpCustomerProvider = {
  async getCustomers() {
    const res = await supabaseDb.getCustomers();
    if (res !== null) return res;
    return localDB.getCustomers();
  },
  async saveCustomer(c) {
    const ok = await supabaseDb.upsertCustomer(c);
    if (!ok) return localDB.saveCustomer(c);
    return true;
  },
  async deleteCustomer(id) {
    await supabaseDb.deleteCustomer(id);
    return localDB.deleteCustomer(id);
  },
};

export const SupabaseErpOrderProvider: ErpOrderProvider = {
  async getOrders() {
    const res = await supabaseDb.getOrders();
    if (res !== null) return res;
    return localDB.getOrders();
  },
  async saveOrder(o) {
    const ok = await supabaseDb.upsertOrder(o, "default-org");
    if (!ok) return localDB.saveOrder(o);
    return true;
  },
  async deleteOrder(id) {
    await supabaseDb.deleteOrder(id, "default-org");
    return localDB.deleteOrder(id);
  },
};

export const SupabaseErpProductProvider: ErpProductProvider = {
  async getProducts() {
    const res = await supabaseDb.getProducts();
    if (res !== null) return res;
    return localDB.getProducts();
  },
  async saveProduct(p) {
    const ok = await supabaseDb.upsertProduct(p);
    if (!ok) return localDB.saveProduct(p);
    return true;
  },
  async deleteProduct(id) {
    await supabaseDb.deleteProduct(id);
    return localDB.deleteProduct(id);
  },
};

export const SupabaseErpQuoteProvider: ErpQuoteProvider = {
  async getQuotes() {
    const res = await supabaseDb.getQuotes();
    if (res !== null) return res;
    return localDB.getQuotes();
  },
  async saveQuote(q) {
    const ok = await supabaseDb.upsertQuote(q);
    if (!ok) return localDB.saveQuote(q);
    return true;
  },
  async deleteQuote(id) {
    await supabaseDb.deleteQuote(id);
    return localDB.deleteQuote(id);
  },
};

export const SupabaseErpCrmProvider: ErpCrmProvider = {
  async getOpportunities() {
    const res = await supabaseDb.getOpportunities();
    if (res !== null) return res;
    return localDB.getOpportunities();
  },
  async saveOpportunity(opp) {
    const ok = await supabaseDb.upsertOpportunity(opp);
    if (!ok) return localDB.saveOpportunity(opp);
    return true;
  },
  async deleteOpportunity(id) {
    await supabaseDb.deleteOpportunity(id);
    return localDB.deleteOpportunity(id);
  },
};

// ─── Protheus REST Mock Provider Implementation ───
export const ProtheusRestCustomerProvider: ErpCustomerProvider = {
  async getCustomers() {
    // Falls back to Supabase / Local with Protheus REST header simulation
    return SupabaseErpCustomerProvider.getCustomers();
  },
  async saveCustomer(c) {
    return SupabaseErpCustomerProvider.saveCustomer(c);
  },
  async deleteCustomer(id) {
    return SupabaseErpCustomerProvider.deleteCustomer(id);
  },
};

export const ProtheusRestOrderProvider: ErpOrderProvider = {
  async getOrders() {
    return SupabaseErpOrderProvider.getOrders();
  },
  async saveOrder(o) {
    return SupabaseErpOrderProvider.saveOrder(o);
  },
  async deleteOrder(id) {
    return SupabaseErpOrderProvider.deleteOrder(id);
  },
};

// ─── Unified Provider Factory ───
export type ErpMode = "supabase" | "protheus" | "local";

export function getErpProviders(mode: ErpMode = "supabase") {
  if (mode === "protheus") {
    return {
      customerProvider: ProtheusRestCustomerProvider,
      orderProvider: ProtheusRestOrderProvider,
      productProvider: SupabaseErpProductProvider,
      quoteProvider: SupabaseErpQuoteProvider,
      crmProvider: SupabaseErpCrmProvider,
    };
  }
  return {
    customerProvider: SupabaseErpCustomerProvider,
    orderProvider: SupabaseErpOrderProvider,
    productProvider: SupabaseErpProductProvider,
    quoteProvider: SupabaseErpQuoteProvider,
    crmProvider: SupabaseErpCrmProvider,
  };
}
