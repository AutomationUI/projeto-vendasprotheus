// ─── Local & Supabase Database (Durable Hybrid Store) ─────────────────
// Persists products, customers, orders, quotes, and CRM opportunities
// with real-time Supabase cloud synchronization and localStorage offline fallback.

import {
  products as defaultProducts,
  customers as defaultCustomers,
  recentOrders as defaultOrders,
  quotes as defaultQuotes,
  initialOpportunities as defaultOpportunities,
  initialApprovals as defaultApprovals,
  type Product,
  type Customer,
  type Order,
  type Quote,
  type CrmOpportunity,
  type ApprovalItem,
  type ApprovalStatus,
  type OrderStatus,
} from "./mock-data";
import { supabaseDb } from "./supabase-db";
import { getEffectivePermissionsForUser } from "./permissions-store";
import { safeString } from "./utils";

// Currency formatter for BRL
export const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getCurrentUserForSecurity() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem("protheus_user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function userCanApprove(user: any): boolean {
  if (!user) return false;
  if (safeString(user.role) === "admin") return true;
  const perms = getEffectivePermissionsForUser(user);
  if (!Array.isArray(perms)) return false;
  return perms.some(p => p && (p.module === "pedidos" || p.module === "aprovacoes") && p.actions?.includes("approve"));
}

export function userCanCancel(user: any): boolean {
  if (!user) return false;
  if (safeString(user.role) === "admin") return true;
  const perms = getEffectivePermissionsForUser(user);
  if (!Array.isArray(perms)) return false;
  return perms.some(p => p && p.module === "pedidos" && (p.actions?.includes("approve") || p.actions?.includes("edit") || p.actions?.includes("delete")));
}

const KEYS = {
  PRODUCTS: "vendasprotheus_db_products",
  CUSTOMERS: "vendasprotheus_db_customers",
  ORDERS: "vendasprotheus_db_orders",
  QUOTES: "vendasprotheus_db_quotes",
  OPPORTUNITIES: "vendasprotheus_db_opportunities",
  APPROVALS: "vendasprotheus_db_approvals",
};

function safeGet<T>(key: string, fallback: T[]): T[] {
  try {
    if (typeof localStorage === "undefined") return [...fallback];
    const raw = localStorage.getItem(key);
    if (!raw) return [...fallback];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...fallback];
  } catch {
    return [...fallback];
  }
}

function safeSet<T>(key: string, data: T[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[LocalDB] Falha ao gravar ${key}:`, err);
  }
}

function dispatchChange() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("mockDataChanged"));
      window.dispatchEvent(new CustomEvent("local-db-change"));
    } catch {
      // safe fallback
    }
  }
}

// ─── Approval Rules Helper ────────────────────────────────────
function getApprovalRules(): { maxDiscount: number; maxAmount: number; minMargin: number; maxGerencia: number; descontoMaximo: number; valorMaximo: number } {
  let maxDiscount = 8;
  let maxAmount = 50000;
  let minMargin = 25;
  let maxGerencia = 15;

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem("vendasprotheus_settings") || localStorage.getItem("vendasprotheus_app_settings");
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.regrasVenda?.descontoMaximoSemAprovacao !== undefined && s.regrasVenda.descontoMaximoSemAprovacao !== null) {
          maxDiscount = Number(s.regrasVenda.descontoMaximoSemAprovacao);
        }
        if (s?.regrasVenda?.valorAprovacaoObrigatoria !== undefined && s.regrasVenda.valorAprovacaoObrigatoria !== null) {
          maxAmount = Number(s.regrasVenda.valorAprovacaoObrigatoria);
        }
        if (s?.regrasVenda?.margemMinimaContribuicao !== undefined) {
          minMargin = Number(s.regrasVenda.margemMinimaContribuicao);
        }
        if (s?.regrasVenda?.alçadaGerenciaDesconto !== undefined) {
          maxGerencia = Number(s.regrasVenda.alçadaGerenciaDesconto);
        }
      }
    } catch {
      // fallback
    }
  }
  return {
    maxDiscount,
    maxAmount,
    minMargin,
    maxGerencia,
    descontoMaximo: maxDiscount,
    valorMaximo: maxAmount,
  };
}

// ─── In-memory cache synced with localStorage ──────────────────

let cachedProducts: Product[] = safeGet(KEYS.PRODUCTS, defaultProducts);
let cachedCustomers: Customer[] = safeGet(KEYS.CUSTOMERS, defaultCustomers);
let cachedOrders: Order[] = safeGet(KEYS.ORDERS, defaultOrders);
let cachedQuotes: Quote[] = safeGet(KEYS.QUOTES, defaultQuotes);
let cachedOpportunities: CrmOpportunity[] = safeGet(KEYS.OPPORTUNITIES, defaultOpportunities);
let cachedApprovals: ApprovalItem[] = safeGet(KEYS.APPROVALS, defaultApprovals);

// Reconcile initial order statuses with approvals on start
function reconcileApprovalsAndOrders() {
  let ordersChanged = false;
  let approvalsChanged = false;
  const rules = getApprovalRules();

  // 1. Sync approval item state to orders
  cachedApprovals.forEach((app) => {
    if (app.tipo === "Pedido") {
      const ordIdx = cachedOrders.findIndex((o) => o.numero === app.numero || o.id === app.id);
      if (ordIdx !== -1) {
        if (app.status === "Pendente" && cachedOrders[ordIdx].status !== "Aprovar") {
          cachedOrders[ordIdx] = { ...cachedOrders[ordIdx], status: "Aprovar" };
          ordersChanged = true;
        } else if (app.status === "Aprovado" && cachedOrders[ordIdx].status === "Aprovar") {
          cachedOrders[ordIdx] = { ...cachedOrders[ordIdx], status: "Aprovado" };
          ordersChanged = true;
        } else if (app.status === "Rejeitado" && cachedOrders[ordIdx].status !== "Cancelado") {
          cachedOrders[ordIdx] = { ...cachedOrders[ordIdx], status: "Cancelado" };
          ordersChanged = true;
        }
      }
    }
  });

  // 2. Ensure any order with status "Aprovar" has an approval item
  cachedOrders.forEach((ord) => {
    if (ord.status === "Aprovar") {
      const existingApp = cachedApprovals.find((a) => a.tipo === "Pedido" && (a.numero === ord.numero || a.id === ord.id));
      if (!existingApp) {
        const maxDisc = ord.itens?.length ? Math.max(...ord.itens.map((i) => i.desconto || 0)) : 0;
        let motivo = "";
        if (maxDisc > rules.descontoMaximo) {
          motivo = `Desconto de ${maxDisc}% superior ao limite permitido (${rules.descontoMaximo}%)`;
        }
        if (ord.valor >= rules.valorMaximo) {
          motivo = (motivo ? `${motivo} + ` : "") + `Valor total (${fmt(ord.valor)}) superior ao limite de alçada (${fmt(rules.valorMaximo)})`;
        }
        cachedApprovals.push({
          id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          tipo: "Pedido",
          numero: ord.numero,
          cliente: ord.cliente,
          vendedor: ord.vendedor,
          valor: ord.valor,
          motivo: motivo || "Alçada de aprovação de pedido",
          data: ord.data || new Date().toISOString().slice(0, 10),
          status: "Pendente",
          observacaoAprovador: "",
        });
        approvalsChanged = true;
      }
    }
  });

  if (ordersChanged) {
    safeSet(KEYS.ORDERS, cachedOrders);
  }
  if (approvalsChanged) {
    safeSet(KEYS.APPROVALS, cachedApprovals);
  }
}
reconcileApprovalsAndOrders();

// Background cloud sync triggers
let isSyncingWithCloud = false;

export async function pullFromSupabase(): Promise<boolean> {
  if (isSyncingWithCloud) return false;
  isSyncingWithCloud = true;
  try {
    const [c, p, o, q, opp] = await Promise.all([
      supabaseDb.getCustomers(),
      supabaseDb.getProducts(),
      supabaseDb.getOrders(),
      supabaseDb.getQuotes(),
      supabaseDb.getOpportunities(),
    ]);

    let changed = false;
    if (c && c.length > 0) {
      cachedCustomers = c;
      safeSet(KEYS.CUSTOMERS, c);
      changed = true;
    }
    if (p && p.length > 0) {
      cachedProducts = p;
      safeSet(KEYS.PRODUCTS, p);
      changed = true;
    }
    if (o && o.length > 0) {
      cachedOrders = o;
      safeSet(KEYS.ORDERS, o);
      changed = true;
    }
    if (q && q.length > 0) {
      cachedQuotes = q;
      safeSet(KEYS.QUOTES, q);
      changed = true;
    }
    if (opp && opp.length > 0) {
      cachedOpportunities = opp;
      safeSet(KEYS.OPPORTUNITIES, opp);
      changed = true;
    }

    if (changed) {
      dispatchChange();
    }
    return changed;
  } catch (err) {
    console.warn("[LocalDB] Supabase pull notice:", err);
    return false;
  } finally {
    isSyncingWithCloud = false;
  }
}

// Automatically trigger initial background cloud pull
if (typeof window !== "undefined") {
  setTimeout(() => {
    pullFromSupabase().catch(() => {});
  }, 1000);
}

export const localDB = {
  // ── Products ──
  getProducts(): Product[] {
    return [...cachedProducts];
  },
  getProductById(id: string): Product | null {
    return cachedProducts.find((p) => p.id === id) ?? null;
  },
  saveProduct(product: Omit<Product, "id"> & { id?: string }): Product {
    if (product.id) {
      const idx = cachedProducts.findIndex((p) => p.id === product.id);
      if (idx !== -1) {
        cachedProducts[idx] = { ...cachedProducts[idx], ...product } as Product;
        safeSet(KEYS.PRODUCTS, cachedProducts);
        dispatchChange();
        supabaseDb.upsertProduct(cachedProducts[idx]).catch(() => {});
        return cachedProducts[idx];
      }
    }
    const newId = `PRD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newProduct: Product = {
      ...product,
      id: newId,
      codigo: product.codigo || `PRD-${String(cachedProducts.length + 1).padStart(3, "0")}`,
    };
    cachedProducts = [newProduct, ...cachedProducts];
    safeSet(KEYS.PRODUCTS, cachedProducts);
    dispatchChange();
    supabaseDb.upsertProduct(newProduct).catch(() => {});
    return newProduct;
  },
  updateProduct(id: string, updates: Partial<Product>): Product {
    const idx = cachedProducts.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Produto não encontrado");
    cachedProducts[idx] = { ...cachedProducts[idx], ...updates };
    safeSet(KEYS.PRODUCTS, cachedProducts);
    dispatchChange();
    supabaseDb.upsertProduct(cachedProducts[idx]).catch(() => {});
    return cachedProducts[idx];
  },
  deleteProduct(id: string): void {
    cachedProducts = cachedProducts.filter((p) => p.id !== id);
    safeSet(KEYS.PRODUCTS, cachedProducts);
    dispatchChange();
    supabaseDb.deleteProduct(id).catch(() => {});
  },

  // ── Customers ──
  getCustomers(): Customer[] {
    return [...cachedCustomers];
  },
  getCustomerById(id: string): Customer | null {
    return cachedCustomers.find((c) => c.id === id) ?? null;
  },
  saveCustomer(customer: Omit<Customer, "id"> & { id?: string }): Customer {
    if (customer.id) {
      const idx = cachedCustomers.findIndex((c) => c.id === customer.id);
      if (idx !== -1) {
        cachedCustomers[idx] = { ...cachedCustomers[idx], ...customer } as Customer;
        safeSet(KEYS.CUSTOMERS, cachedCustomers);
        dispatchChange();
        supabaseDb.upsertCustomer(cachedCustomers[idx]).catch(() => {});
        return cachedCustomers[idx];
      }
    }
    const newId = `CLI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    const newCustomer: Customer = {
      ...customer,
      id: newId,
    };
    cachedCustomers = [newCustomer, ...cachedCustomers];
    safeSet(KEYS.CUSTOMERS, cachedCustomers);
    dispatchChange();
    supabaseDb.upsertCustomer(newCustomer).catch(() => {});
    return newCustomer;
  },
  updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const idx = cachedCustomers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error("Cliente não encontrado");
    cachedCustomers[idx] = { ...cachedCustomers[idx], ...updates };
    safeSet(KEYS.CUSTOMERS, cachedCustomers);
    dispatchChange();
    supabaseDb.upsertCustomer(cachedCustomers[idx]).catch(() => {});
    return cachedCustomers[idx];
  },
  deleteCustomer(id: string): void {
    cachedCustomers = cachedCustomers.filter((c) => c.id !== id);
    safeSet(KEYS.CUSTOMERS, cachedCustomers);
    dispatchChange();
    supabaseDb.deleteCustomer(id).catch(() => {});
  },

  // ── Orders ──
  getOrders(): Order[] {
    return [...cachedOrders];
  },
  getOrderById(id: string): Order | null {
    return cachedOrders.find((o) => o.id === id) ?? null;
  },
  saveOrder(order: Omit<Order, "id" | "numero"> & { id?: string; numero?: string }): Order {
    const { maxDiscount, maxAmount } = getApprovalRules();
    const hasExcessiveDiscount = (order.itens || []).some((i) => (i.desconto || 0) > maxDiscount);
    const hasExcessiveValue = (order.valor || 0) >= maxAmount;
    const needsApproval = hasExcessiveDiscount || hasExcessiveValue;

    let motivo = "";
    if (hasExcessiveDiscount && hasExcessiveValue) {
      motivo = `Desconto acima de ${maxDiscount}% e Valor acima de R$ ${maxAmount.toLocaleString("pt-BR")}`;
    } else if (hasExcessiveDiscount) {
      motivo = `Desconto acima de ${maxDiscount}%`;
    } else if (hasExcessiveValue) {
      motivo = `Valor acima de R$ ${maxAmount.toLocaleString("pt-BR")}`;
    }

    if (order.id) {
      const idx = cachedOrders.findIndex((o) => o.id === order.id);
      if (idx !== -1) {
        let finalStatus = order.status;
        if (needsApproval && finalStatus !== "Aprovado" && finalStatus !== "Faturado" && finalStatus !== "Cancelado") {
          finalStatus = "Aprovar";
        }
        cachedOrders[idx] = { ...cachedOrders[idx], ...order, status: finalStatus || cachedOrders[idx].status } as Order;
        safeSet(KEYS.ORDERS, cachedOrders);

        // If in Aprovar status, ensure an approval record exists
        if (cachedOrders[idx].status === "Aprovar") {
          const appIdx = cachedApprovals.findIndex((a) => a.tipo === "Pedido" && a.numero === cachedOrders[idx].numero);
          if (appIdx === -1) {
            const newApp: ApprovalItem = {
              id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              tipo: "Pedido",
              numero: cachedOrders[idx].numero,
              cliente: cachedOrders[idx].cliente,
              vendedor: cachedOrders[idx].vendedor,
              valor: cachedOrders[idx].valor,
              motivo: motivo || "Alçada de aprovação necessária",
              data: new Date().toISOString().slice(0, 10),
              status: "Pendente",
              observacaoAprovador: "",
            };
            cachedApprovals = [newApp, ...cachedApprovals];
            safeSet(KEYS.APPROVALS, cachedApprovals);
          }
        }

        dispatchChange();
        supabaseDb.upsertOrder(cachedOrders[idx]).catch(() => {});
        return cachedOrders[idx];
      }
    }

    const nextSeq = cachedOrders.length + 1;
    const orderNum = order.numero || `PV-2026-${String(nextSeq).padStart(3, "0")}`;
    
    let initialStatus: OrderStatus = "Pendente";
    if (order.status === "Aprovado" || order.status === "Faturado" || order.status === "Cancelado") {
      initialStatus = order.status;
    } else if (needsApproval) {
      initialStatus = "Aprovar";
    } else {
      initialStatus = order.status || "Pendente";
    }

    const newOrder: Order = {
      ...order,
      id: `PED-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      numero: orderNum,
      status: initialStatus,
    };
    cachedOrders = [newOrder, ...cachedOrders];
    safeSet(KEYS.ORDERS, cachedOrders);

    if (newOrder.status === "Aprovar") {
      const newApp: ApprovalItem = {
        id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        tipo: "Pedido",
        numero: newOrder.numero,
        cliente: newOrder.cliente,
        vendedor: newOrder.vendedor,
        valor: newOrder.valor,
        motivo: motivo || "Alçada de aprovação necessária",
        data: new Date().toISOString().slice(0, 10),
        status: "Pendente",
        observacaoAprovador: "",
      };
      cachedApprovals = [newApp, ...cachedApprovals];
      safeSet(KEYS.APPROVALS, cachedApprovals);
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orderStatusChanged", { detail: { numero: newOrder.numero, status: newOrder.status } }));
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
    }
    supabaseDb.upsertOrder(newOrder).catch(() => {});
    return newOrder;
  },
  updateOrder(id: string, updates: Partial<Order>): Order {
    const idx = cachedOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Pedido não encontrado");
    
    const user = getCurrentUserForSecurity();
    const currentOrder = cachedOrders[idx];
    if (updates.status === "Aprovado" && currentOrder.status !== "Aprovado") {
      if (!userCanApprove(user)) {
        throw new Error("Acesso negado: Seu perfil ou área não possui permissão para aprovar pedidos.");
      }
    }
    if (updates.status === "Cancelado" && currentOrder.status !== "Cancelado") {
      if (!userCanCancel(user)) {
        throw new Error("Acesso negado: Seu perfil ou área não possui permissão para cancelar pedidos.");
      }
    }
    const rules = getApprovalRules();
    let needsApproval = false;
    let motivo = "";
    if (merged.itens && merged.itens.length > 0) {
      const maxDiscount = Math.max(...merged.itens.map((i) => i.desconto || 0));
      if (maxDiscount > rules.descontoMaximo) {
        needsApproval = true;
        motivo = `Desconto de ${maxDiscount}% superior ao limite permitido (${rules.descontoMaximo}%)`;
      }
    }
    if (merged.valor >= rules.valorMaximo) {
      needsApproval = true;
      motivo = (motivo ? `${motivo} + ` : "") + `Valor total (${fmt(merged.valor)}) superior ao limite de alçada (${fmt(rules.valorMaximo)})`;
    }

    if (!updates.status && needsApproval && merged.status !== "Aprovado" && merged.status !== "Faturado" && merged.status !== "Cancelado") {
      merged.status = "Aprovar";
    }

    cachedOrders[idx] = merged;
    safeSet(KEYS.ORDERS, cachedOrders);

    if (cachedOrders[idx].status === "Aprovar") {
      const existingApp = cachedApprovals.find((a) => a.tipo === "Pedido" && a.numero === cachedOrders[idx].numero);
      if (!existingApp) {
        const newApp: ApprovalItem = {
          id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          tipo: "Pedido",
          numero: cachedOrders[idx].numero,
          cliente: cachedOrders[idx].cliente,
          vendedor: cachedOrders[idx].vendedor,
          valor: cachedOrders[idx].valor,
          motivo: motivo || "Alçada de aprovação necessária",
          data: new Date().toISOString().slice(0, 10),
          status: "Pendente",
          observacaoAprovador: "",
        };
        cachedApprovals = [newApp, ...cachedApprovals];
        safeSet(KEYS.APPROVALS, cachedApprovals);
      }
    }

    // If status changed to Aprovado or Cancelado, sync with approvals
    if (updates.status) {
      const appIdx = cachedApprovals.findIndex((a) => a.tipo === "Pedido" && a.numero === cachedOrders[idx].numero);
      if (appIdx !== -1) {
        if (updates.status === "Aprovado" && cachedApprovals[appIdx].status !== "Aprovado") {
          cachedApprovals[appIdx] = { ...cachedApprovals[appIdx], status: "Aprovado" };
          safeSet(KEYS.APPROVALS, cachedApprovals);
        } else if (updates.status === "Cancelado" && cachedApprovals[appIdx].status !== "Rejeitado") {
          cachedApprovals[appIdx] = { ...cachedApprovals[appIdx], status: "Rejeitado" };
          safeSet(KEYS.APPROVALS, cachedApprovals);
        }
      }
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orderStatusChanged", { detail: { numero: cachedOrders[idx].numero, status: cachedOrders[idx].status } }));
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
    }
    supabaseDb.upsertOrder(cachedOrders[idx]).catch(() => {});
    return cachedOrders[idx];
  },
  deleteOrder(id: string): void {
    cachedOrders = cachedOrders.filter((o) => o.id !== id);
    safeSet(KEYS.ORDERS, cachedOrders);
    dispatchChange();
    supabaseDb.deleteOrder(id).catch(() => {});
  },

  // ── Quotes ──
  getQuotes(): Quote[] {
    return [...cachedQuotes];
  },
  getQuoteById(id: string): Quote | null {
    return cachedQuotes.find((q) => q.id === id) ?? null;
  },
  saveQuote(quote: Omit<Quote, "id" | "numero"> & { id?: string; numero?: string }): Quote {
    const rules = getApprovalRules();
    const hasExcessiveDiscount = (quote.itens || []).some((i) => (i.desconto || 0) > rules.maxDiscount);
    const hasExcessiveValue = (quote.valor || 0) >= rules.maxAmount;
    const needsApproval = hasExcessiveDiscount || hasExcessiveValue;

    let motivo = "";
    if (hasExcessiveDiscount && hasExcessiveValue) {
      motivo = `Desconto acima de ${rules.maxDiscount}% e Valor acima de R$ ${rules.maxAmount.toLocaleString("pt-BR")}`;
    } else if (hasExcessiveDiscount) {
      motivo = `Desconto acima de ${rules.maxDiscount}%`;
    } else if (hasExcessiveValue) {
      motivo = `Valor acima de R$ ${rules.maxAmount.toLocaleString("pt-BR")}`;
    }

    if (quote.id) {
      const idx = cachedQuotes.findIndex((q) => q.id === quote.id);
      if (idx !== -1) {
        cachedQuotes[idx] = { ...cachedQuotes[idx], ...quote } as Quote;
        safeSet(KEYS.QUOTES, cachedQuotes);

        if (needsApproval && cachedQuotes[idx].status !== "Aprovado" && cachedQuotes[idx].status !== "Recusado") {
          const appIdx = cachedApprovals.findIndex((a) => a.tipo === "Orçamento" && a.numero === cachedQuotes[idx].numero);
          if (appIdx === -1) {
            const newApp: ApprovalItem = {
              id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              tipo: "Orçamento",
              numero: cachedQuotes[idx].numero,
              cliente: cachedQuotes[idx].cliente,
              vendedor: cachedQuotes[idx].vendedor,
              valor: cachedQuotes[idx].valor,
              motivo: motivo || "Alçada de aprovação necessária",
              data: cachedQuotes[idx].data || new Date().toISOString().slice(0, 10),
              status: "Pendente",
              observacaoAprovador: "",
            };
            cachedApprovals = [newApp, ...cachedApprovals];
            safeSet(KEYS.APPROVALS, cachedApprovals);
          }
        }

        dispatchChange();
        supabaseDb.upsertQuote(cachedQuotes[idx]).catch(() => {});
        return cachedQuotes[idx];
      }
    }

    const nextSeq = cachedQuotes.length + 1;
    const newQuote: Quote = {
      ...quote,
      id: `ORC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      numero: quote.numero || `ORC-2026-${String(nextSeq).padStart(3, "0")}`,
    };
    cachedQuotes = [newQuote, ...cachedQuotes];
    safeSet(KEYS.QUOTES, cachedQuotes);

    if (needsApproval && newQuote.status !== "Aprovado" && newQuote.status !== "Recusado") {
      const newApp: ApprovalItem = {
        id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        tipo: "Orçamento",
        numero: newQuote.numero,
        cliente: newQuote.cliente,
        vendedor: newQuote.vendedor,
        valor: newQuote.valor,
        motivo: motivo || "Alçada de aprovação necessária",
        data: newQuote.data || new Date().toISOString().slice(0, 10),
        status: "Pendente",
        observacaoAprovador: "",
      };
      cachedApprovals = [newApp, ...cachedApprovals];
      safeSet(KEYS.APPROVALS, cachedApprovals);
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
    }
    supabaseDb.upsertQuote(newQuote).catch(() => {});
    return newQuote;
  },
  updateQuote(id: string, updates: Partial<Quote>): Quote {
    const idx = cachedQuotes.findIndex((q) => q.id === id);
    if (idx === -1) throw new Error("Orçamento não encontrado");
    cachedQuotes[idx] = { ...cachedQuotes[idx], ...updates };
    safeSet(KEYS.QUOTES, cachedQuotes);

    const rules = getApprovalRules();
    const q = cachedQuotes[idx];
    const hasExcessiveDiscount = (q.itens || []).some((i) => (i.desconto || 0) > rules.maxDiscount);
    const hasExcessiveValue = (q.valor || 0) >= rules.maxAmount;
    if ((hasExcessiveDiscount || hasExcessiveValue) && q.status !== "Aprovado" && q.status !== "Recusado") {
      const appIdx = cachedApprovals.findIndex((a) => a.tipo === "Orçamento" && a.numero === q.numero);
      if (appIdx === -1) {
        const motivo = hasExcessiveDiscount && hasExcessiveValue
          ? `Desconto acima de ${rules.maxDiscount}% e Valor acima de R$ ${rules.maxAmount.toLocaleString("pt-BR")}`
          : hasExcessiveDiscount
          ? `Desconto acima de ${rules.maxDiscount}%`
          : `Valor acima de R$ ${rules.maxAmount.toLocaleString("pt-BR")}`;
        const newApp: ApprovalItem = {
          id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          tipo: "Orçamento",
          numero: q.numero,
          cliente: q.cliente,
          vendedor: q.vendedor,
          valor: q.valor,
          motivo,
          data: q.data || new Date().toISOString().slice(0, 10),
          status: "Pendente",
          observacaoAprovador: "",
        };
        cachedApprovals = [newApp, ...cachedApprovals];
        safeSet(KEYS.APPROVALS, cachedApprovals);
      }
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
    }
    supabaseDb.upsertQuote(cachedQuotes[idx]).catch(() => {});
    return cachedQuotes[idx];
  },
  deleteQuote(id: string): void {
    cachedQuotes = cachedQuotes.filter((q) => q.id !== id);
    safeSet(KEYS.QUOTES, cachedQuotes);
    dispatchChange();
    supabaseDb.deleteQuote(id).catch(() => {});
  },

  // ── Approvals (Rotina de Aprovações & Alçadas) ──
  getApprovals(): ApprovalItem[] {
    return [...cachedApprovals];
  },
  getApprovalById(id: string): ApprovalItem | null {
    return cachedApprovals.find((a) => a.id === id) ?? null;
  },
  saveApproval(app: Omit<ApprovalItem, "id"> & { id?: string }): ApprovalItem {
    const id = app.id || `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const newApp: ApprovalItem = { ...app, id };
    cachedApprovals = [newApp, ...cachedApprovals];
    safeSet(KEYS.APPROVALS, cachedApprovals);
    dispatchChange();
    return newApp;
  },
  updateApproval(id: string, updates: Partial<ApprovalItem>): ApprovalItem {
    const idx = cachedApprovals.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Aprovação não encontrada");
    cachedApprovals[idx] = { ...cachedApprovals[idx], ...updates };
    safeSet(KEYS.APPROVALS, cachedApprovals);
    dispatchChange();
    return cachedApprovals[idx];
  },
  deleteApproval(id: string): void {
    cachedApprovals = cachedApprovals.filter((a) => a.id !== id);
    safeSet(KEYS.APPROVALS, cachedApprovals);
    dispatchChange();
  },

  approveItem(approvalId: string, observacao?: string): { approval: ApprovalItem; order?: Order; quote?: Quote } {
    const user = getCurrentUserForSecurity();
    if (!userCanApprove(user)) {
      throw new Error("Acesso negado: Seu perfil ou área não possui permissão para aprovar itens.");
    }

    const approvalIdx = cachedApprovals.findIndex((a) => a.id === approvalId);
    if (approvalIdx === -1) throw new Error("Registro de aprovação não encontrado");

    const approval = {
      ...cachedApprovals[approvalIdx],
      status: "Aprovado" as ApprovalStatus,
      observacaoAprovador: observacao !== undefined ? observacao : cachedApprovals[approvalIdx].observacaoAprovador,
    };
    cachedApprovals[approvalIdx] = approval;
    safeSet(KEYS.APPROVALS, cachedApprovals);

    let affectedOrder: Order | undefined;
    let affectedQuote: Quote | undefined;

    if (approval.tipo === "Pedido") {
      const orderIdx = cachedOrders.findIndex((o) => o.numero === approval.numero);
      if (orderIdx !== -1) {
        cachedOrders[orderIdx] = { ...cachedOrders[orderIdx], status: "Aprovado" };
        affectedOrder = cachedOrders[orderIdx];
        safeSet(KEYS.ORDERS, cachedOrders);
        supabaseDb.upsertOrder(cachedOrders[orderIdx]).catch(() => {});
      }
    } else if (approval.tipo === "Orçamento") {
      const quoteIdx = cachedQuotes.findIndex((q) => q.numero === approval.numero);
      if (quoteIdx !== -1) {
        cachedQuotes[quoteIdx] = { ...cachedQuotes[quoteIdx], status: "Aprovado" };
        affectedQuote = cachedQuotes[quoteIdx];
        safeSet(KEYS.QUOTES, cachedQuotes);
        supabaseDb.upsertQuote(cachedQuotes[quoteIdx]).catch(() => {});

        // CAINDO PARA PEDIDOS: Gera Pedido de Venda com status Aprovado se ainda não existir!
        const existingOrder = cachedOrders.find(
          (o) =>
            (o.observacoes && o.observacoes.includes(affectedQuote!.numero)) ||
            (o.cliente === affectedQuote!.cliente && o.valor === affectedQuote!.valor && Math.abs(new Date(o.data).getTime() - new Date().getTime()) < 86400000)
        );

        if (!existingOrder) {
          const nextSeq = cachedOrders.length + 1;
          const newOrder: Order = {
            id: `PED-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            numero: `PV-2026-${String(nextSeq).padStart(3, "0")}`,
            cliente: affectedQuote.cliente,
            vendedor: affectedQuote.vendedor,
            data: new Date().toISOString().slice(0, 10),
            valor: affectedQuote.valor,
            status: "Aprovado",
            condicaoPagamento: affectedQuote.condicaoPagamento || "30 dias",
            observacoes: `Convertido do Orçamento ${affectedQuote.numero}${affectedQuote.observacoes ? ` | ${affectedQuote.observacoes}` : ""}`,
            itens: affectedQuote.itens?.map((i) => ({ ...i })) || [],
          };
          cachedOrders = [newOrder, ...cachedOrders];
          safeSet(KEYS.ORDERS, cachedOrders);
          supabaseDb.upsertOrder(newOrder).catch(() => {});
          affectedOrder = newOrder;
        } else {
          const ordIdx = cachedOrders.findIndex((o) => o.id === existingOrder.id);
          if (ordIdx !== -1) {
            cachedOrders[ordIdx] = { ...cachedOrders[ordIdx], status: "Aprovado" };
            affectedOrder = cachedOrders[ordIdx];
            safeSet(KEYS.ORDERS, cachedOrders);
            supabaseDb.upsertOrder(cachedOrders[ordIdx]).catch(() => {});
          }
        }
      }
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
      if (affectedOrder) {
        window.dispatchEvent(new CustomEvent("orderStatusChanged", { detail: { numero: affectedOrder.numero, status: affectedOrder.status } }));
      }
    }

    return { approval, order: affectedOrder, quote: affectedQuote };
  },

  rejectItem(approvalId: string, observacao?: string): { approval: ApprovalItem; order?: Order; quote?: Quote } {
    const user = getCurrentUserForSecurity();
    if (!userCanCancel(user)) {
      throw new Error("Acesso negado: Seu perfil ou área não possui permissão para rejeitar ou cancelar itens.");
    }

    const approvalIdx = cachedApprovals.findIndex((a) => a.id === approvalId);
    if (approvalIdx === -1) throw new Error("Registro de aprovação não encontrado");

    const approval = {
      ...cachedApprovals[approvalIdx],
      status: "Rejeitado" as ApprovalStatus,
      observacaoAprovador: observacao !== undefined ? observacao : cachedApprovals[approvalIdx].observacaoAprovador,
    };
    cachedApprovals[approvalIdx] = approval;
    safeSet(KEYS.APPROVALS, cachedApprovals);

    let affectedOrder: Order | undefined;
    let affectedQuote: Quote | undefined;

    if (approval.tipo === "Pedido") {
      const orderIdx = cachedOrders.findIndex((o) => o.numero === approval.numero);
      if (orderIdx !== -1) {
        cachedOrders[orderIdx] = { ...cachedOrders[orderIdx], status: "Cancelado" };
        affectedOrder = cachedOrders[orderIdx];
        safeSet(KEYS.ORDERS, cachedOrders);
        supabaseDb.upsertOrder(cachedOrders[orderIdx]).catch(() => {});
      }
    } else if (approval.tipo === "Orçamento") {
      const quoteIdx = cachedQuotes.findIndex((q) => q.numero === approval.numero);
      if (quoteIdx !== -1) {
        cachedQuotes[quoteIdx] = { ...cachedQuotes[quoteIdx], status: "Recusado" };
        affectedQuote = cachedQuotes[quoteIdx];
        safeSet(KEYS.QUOTES, cachedQuotes);
        supabaseDb.upsertQuote(cachedQuotes[quoteIdx]).catch(() => {});
      }
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
      if (affectedOrder) {
        window.dispatchEvent(new CustomEvent("orderStatusChanged", { detail: { numero: affectedOrder.numero, status: affectedOrder.status } }));
      }
    }

    return { approval, order: affectedOrder, quote: affectedQuote };
  },

  convertQuoteToOrder(quoteId: string): { order: Order; quote: Quote; createdApproval?: ApprovalItem } {
    const quote = cachedQuotes.find((q) => q.id === quoteId);
    if (!quote) throw new Error("Orçamento não encontrado");

    const { maxDiscount, maxAmount } = getApprovalRules();
    const hasExcessiveDiscount = (quote.itens || []).some((i) => (i.desconto || 0) > maxDiscount);
    const hasExcessiveValue = quote.valor >= maxAmount;
    const needsApproval = hasExcessiveDiscount || hasExcessiveValue;

    let motivo = "";
    if (hasExcessiveDiscount && hasExcessiveValue) {
      motivo = `Desconto acima de ${maxDiscount}% e Valor acima de R$ ${maxAmount.toLocaleString("pt-BR")}`;
    } else if (hasExcessiveDiscount) {
      motivo = `Desconto acima de ${maxDiscount}%`;
    } else if (hasExcessiveValue) {
      motivo = `Valor acima de R$ ${maxAmount.toLocaleString("pt-BR")}`;
    }

    const orderStatus: OrderStatus = needsApproval ? "Aprovar" : "Aprovado";
    const nextSeq = cachedOrders.length + 1;
    const orderNum = `PV-2026-${String(nextSeq).padStart(3, "0")}`;

    const newOrder: Order = {
      id: `PED-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      numero: orderNum,
      cliente: quote.cliente,
      vendedor: quote.vendedor,
      data: new Date().toISOString().slice(0, 10),
      valor: quote.valor,
      status: orderStatus,
      condicaoPagamento: quote.condicaoPagamento || "30 dias",
      observacoes: `Convertido do Orçamento ${quote.numero}${quote.observacoes ? ` | ${quote.observacoes}` : ""}`,
      itens: quote.itens.map((i) => ({ ...i })),
    };

    cachedOrders = [newOrder, ...cachedOrders];
    safeSet(KEYS.ORDERS, cachedOrders);
    supabaseDb.upsertOrder(newOrder).catch(() => {});

    // Update quote status
    const quoteIdx = cachedQuotes.findIndex((q) => q.id === quoteId);
    if (quoteIdx !== -1) {
      cachedQuotes[quoteIdx] = { ...cachedQuotes[quoteIdx], status: "Aprovado" };
      safeSet(KEYS.QUOTES, cachedQuotes);
      supabaseDb.upsertQuote(cachedQuotes[quoteIdx]).catch(() => {});
    }

    let createdApproval: ApprovalItem | undefined;
    if (needsApproval) {
      createdApproval = {
        id: `apr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        tipo: "Pedido",
        numero: orderNum,
        cliente: quote.cliente,
        vendedor: quote.vendedor,
        valor: quote.valor,
        motivo,
        data: new Date().toISOString().slice(0, 10),
        status: "Pendente",
        observacaoAprovador: "",
      };
      cachedApprovals = [createdApproval, ...cachedApprovals];
      safeSet(KEYS.APPROVALS, cachedApprovals);
    }

    dispatchChange();
    if (typeof window !== "undefined") {
      if (createdApproval) {
        window.dispatchEvent(new CustomEvent("approvalsChanged", { detail: { approvals: cachedApprovals } }));
      }
      window.dispatchEvent(new CustomEvent("orderStatusChanged", { detail: { numero: newOrder.numero, status: newOrder.status } }));
    }

    return { order: newOrder, quote: cachedQuotes[quoteIdx] || quote, createdApproval };
  },

  // ── CRM Opportunities ──
  getOpportunities(): CrmOpportunity[] {
    return [...cachedOpportunities];
  },
  getOpportunityById(id: string): CrmOpportunity | null {
    return cachedOpportunities.find((o) => o.id === id) ?? null;
  },
  saveOpportunity(opp: Omit<CrmOpportunity, "id" | "dataCriacao"> & { id?: string; dataCriacao?: string }): CrmOpportunity {
    if (opp.id) {
      const idx = cachedOpportunities.findIndex((o) => o.id === opp.id);
      if (idx !== -1) {
        cachedOpportunities[idx] = { ...cachedOpportunities[idx], ...opp } as CrmOpportunity;
        safeSet(KEYS.OPPORTUNITIES, cachedOpportunities);
        dispatchChange();
        supabaseDb.upsertOpportunity(cachedOpportunities[idx]).catch(() => {});
        return cachedOpportunities[idx];
      }
    }
    const newOpp: CrmOpportunity = {
      ...opp,
      id: opp.id || `opp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      dataCriacao: opp.dataCriacao || new Date().toISOString().split("T")[0],
    };
    cachedOpportunities = [newOpp, ...cachedOpportunities];
    safeSet(KEYS.OPPORTUNITIES, cachedOpportunities);
    dispatchChange();
    supabaseDb.upsertOpportunity(newOpp).catch(() => {});
    return newOpp;
  },
  updateOpportunity(id: string, updates: Partial<CrmOpportunity>): CrmOpportunity {
    const idx = cachedOpportunities.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error("Oportunidade não encontrada");
    cachedOpportunities[idx] = { ...cachedOpportunities[idx], ...updates };
    safeSet(KEYS.OPPORTUNITIES, cachedOpportunities);
    dispatchChange();
    supabaseDb.upsertOpportunity(cachedOpportunities[idx]).catch(() => {});
    return cachedOpportunities[idx];
  },
  deleteOpportunity(id: string): void {
    cachedOpportunities = cachedOpportunities.filter((o) => o.id !== id);
    safeSet(KEYS.OPPORTUNITIES, cachedOpportunities);
    dispatchChange();
    supabaseDb.deleteOpportunity(id).catch(() => {});
  },

  // ── Reset to initial seed data ──
  resetToDefaults(): void {
    cachedProducts = [...defaultProducts];
    cachedCustomers = [...defaultCustomers];
    cachedOrders = [...defaultOrders];
    cachedQuotes = [...defaultQuotes];
    cachedOpportunities = [...defaultOpportunities];
    cachedApprovals = [...defaultApprovals];
    safeSet(KEYS.PRODUCTS, cachedProducts);
    safeSet(KEYS.CUSTOMERS, cachedCustomers);
    safeSet(KEYS.ORDERS, cachedOrders);
    safeSet(KEYS.QUOTES, cachedQuotes);
    safeSet(KEYS.OPPORTUNITIES, cachedOpportunities);
    safeSet(KEYS.APPROVALS, cachedApprovals);
    reconcileApprovalsAndOrders();
    dispatchChange();
  },
};
