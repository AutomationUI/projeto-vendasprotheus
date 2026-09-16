// ─── Orders Service ──────────────────────────────────────
// Abstracts order operations. Mock implementation uses in-memory data.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type { Order, OrderStatus } from "@/lib/mock-data";
import { localDB } from "@/lib/local-db";

export interface OrderFilters {
  status?: OrderStatus;
  search?: string;
  vendedor?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Mock implementation backed by localDB ─────────────────────────

async function mockGetOrders(filters?: OrderFilters): Promise<PaginatedResponse<Order>> {
  await new Promise(r => setTimeout(r, 60));

  let result = localDB.getOrders();

  if (filters?.status) result = result.filter(o => o.status === filters.status);
  if (filters?.vendedor) result = result.filter(o => o.vendedor === filters.vendedor);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(o =>
      o.numero.toLowerCase().includes(q) ||
      o.cliente.toLowerCase().includes(q) ||
      o.vendedor.toLowerCase().includes(q)
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

async function mockGetOrder(id: string): Promise<Order | null> {
  await new Promise(r => setTimeout(r, 30));
  return localDB.getOrderById(id);
}

async function mockCreateOrder(order: Omit<Order, "id" | "numero"> & { numero?: string }): Promise<Order> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.saveOrder(order);
}

async function mockUpdateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.updateOrder(id, updates);
}

async function mockDeleteOrder(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 60));
  localDB.deleteOrder(id);
}

// ─── Real API implementation ─────────────────────────────

async function apiGetOrders(filters?: OrderFilters): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.vendedor) params.set("vendedor", filters.vendedor);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  return http.get(`/orders?${params}`);
}

async function apiGetOrder(id: string): Promise<Order | null> {
  return http.get(`/orders/${encodeURIComponent(id)}`);
}

async function apiCreateOrder(order: Omit<Order, "id" | "numero">): Promise<Order> {
  return http.post("/orders", order);
}

async function apiUpdateOrder(id: string, updates: Partial<Order>): Promise<Order> {
  return http.patch(`/orders/${encodeURIComponent(id)}`, updates);
}

async function apiDeleteOrder(id: string): Promise<void> {
  return http.delete(`/orders/${encodeURIComponent(id)}`);
}

// ─── Exported service ────────────────────────────────────

export const ordersService = {
  getAll: API_CONFIG.useMock ? mockGetOrders : apiGetOrders,
  getById: API_CONFIG.useMock ? mockGetOrder : apiGetOrder,
  create: API_CONFIG.useMock ? mockCreateOrder : apiCreateOrder,
  update: API_CONFIG.useMock ? mockUpdateOrder : apiUpdateOrder,
  remove: API_CONFIG.useMock ? mockDeleteOrder : apiDeleteOrder,
};
