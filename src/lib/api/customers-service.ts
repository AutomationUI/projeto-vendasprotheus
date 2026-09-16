// ─── Customers Service ───────────────────────────────────
// Abstracts customer operations. Mock implementation uses in-memory data.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type { Customer } from "@/lib/mock-data";
import type { PaginatedResponse } from "./orders-service";
import { localDB } from "@/lib/local-db";

export interface CustomerFilters {
  search?: string;
  uf?: string;
  page?: number;
  limit?: number;
}

// ─── Mock implementation backed by localDB ─────────────────────────

async function mockGetCustomers(filters?: CustomerFilters): Promise<PaginatedResponse<Customer>> {
  await new Promise(r => setTimeout(r, 60));

  let result = localDB.getCustomers();

  if (filters?.uf) result = result.filter(c => c.uf === filters.uf);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(c =>
      c.razaoSocial.toLowerCase().includes(s) ||
      c.cnpj.includes(s) ||
      c.email.toLowerCase().includes(s) ||
      c.cidade.toLowerCase().includes(s)
    );
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const start = (page - 1) * limit;

  return {
    data: result.slice(start, start + limit),
    total: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit),
  };
}

async function mockGetCustomer(id: string): Promise<Customer | null> {
  await new Promise(r => setTimeout(r, 30));
  return localDB.getCustomerById(id);
}

async function mockCreateCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.saveCustomer(customer);
}

async function mockUpdateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.updateCustomer(id, updates);
}

async function mockDeleteCustomer(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 60));
  localDB.deleteCustomer(id);
}

// ─── Real API implementation ─────────────────────────────

async function apiGetCustomers(filters?: CustomerFilters): Promise<PaginatedResponse<Customer>> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.uf) params.set("uf", filters.uf);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  return http.get(`/customers?${params}`);
}

async function apiGetCustomer(id: string): Promise<Customer | null> {
  return http.get(`/customers/${encodeURIComponent(id)}`);
}

async function apiCreateCustomer(customer: Omit<Customer, "id">): Promise<Customer> {
  return http.post("/customers", customer);
}

async function apiUpdateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  return http.patch(`/customers/${encodeURIComponent(id)}`, updates);
}

async function apiDeleteCustomer(id: string): Promise<void> {
  return http.delete(`/customers/${encodeURIComponent(id)}`);
}

// ─── Exported service ────────────────────────────────────

export const customersService = {
  getAll: API_CONFIG.useMock ? mockGetCustomers : apiGetCustomers,
  getById: API_CONFIG.useMock ? mockGetCustomer : apiGetCustomer,
  create: API_CONFIG.useMock ? mockCreateCustomer : apiCreateCustomer,
  update: API_CONFIG.useMock ? mockUpdateCustomer : apiUpdateCustomer,
  remove: API_CONFIG.useMock ? mockDeleteCustomer : apiDeleteCustomer,
};
