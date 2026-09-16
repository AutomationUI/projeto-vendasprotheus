// ─── Approvals Service ──────────────────────────────────────
// Manages approvals (alçadas) for Pedidos and Orçamentos.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type { ApprovalItem, ApprovalStatus, Order, Quote } from "@/lib/mock-data";
import type { PaginatedResponse } from "./orders-service";
import { localDB } from "@/lib/local-db";

export interface ApprovalFilters {
  status?: ApprovalStatus;
  tipo?: "Pedido" | "Orçamento";
  vendedor?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── Mock implementation backed by localDB ─────────────────────────

async function mockGetApprovals(filters?: ApprovalFilters): Promise<PaginatedResponse<ApprovalItem>> {
  await new Promise((r) => setTimeout(r, 40));
  let result = localDB.getApprovals();

  if (filters?.status) result = result.filter((a) => a.status === filters.status);
  if (filters?.tipo) result = result.filter((a) => a.tipo === filters.tipo);
  if (filters?.vendedor) result = result.filter((a) => a.vendedor === filters.vendedor);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (a) =>
        a.numero.toLowerCase().includes(s) ||
        a.cliente.toLowerCase().includes(s) ||
        a.vendedor.toLowerCase().includes(s) ||
        a.motivo.toLowerCase().includes(s)
    );
  }

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const start = (page - 1) * limit;

  return {
    data: result.slice(start, start + limit),
    total: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit),
  };
}

async function mockGetApproval(id: string): Promise<ApprovalItem | null> {
  await new Promise((r) => setTimeout(r, 20));
  return localDB.getApprovalById(id);
}

async function mockCreateApproval(approval: Omit<ApprovalItem, "id"> & { id?: string }): Promise<ApprovalItem> {
  await new Promise((r) => setTimeout(r, 50));
  return localDB.saveApproval(approval);
}

async function mockUpdateApproval(id: string, updates: Partial<ApprovalItem>): Promise<ApprovalItem> {
  await new Promise((r) => setTimeout(r, 50));
  return localDB.updateApproval(id, updates);
}

async function mockApproveItem(id: string, observacao?: string): Promise<{ approval: ApprovalItem; order?: Order; quote?: Quote }> {
  await new Promise((r) => setTimeout(r, 50));
  return localDB.approveItem(id, observacao);
}

async function mockRejectItem(id: string, observacao?: string): Promise<{ approval: ApprovalItem; order?: Order; quote?: Quote }> {
  await new Promise((r) => setTimeout(r, 50));
  return localDB.rejectItem(id, observacao);
}

async function mockConvertQuoteToOrder(quoteId: string): Promise<{ order: Order; quote: Quote; createdApproval?: ApprovalItem }> {
  await new Promise((r) => setTimeout(r, 50));
  return localDB.convertQuoteToOrder(quoteId);
}

// ─── Real API implementation (Protheus ERP / Microservice) ────────

async function apiGetApprovals(filters?: ApprovalFilters): Promise<PaginatedResponse<ApprovalItem>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.tipo) params.set("tipo", filters.tipo);
  if (filters?.search) params.set("search", filters.search);
  return http.get(`/approvals?${params}`);
}

async function apiApproveItem(id: string, observacao?: string): Promise<{ approval: ApprovalItem; order?: Order; quote?: Quote }> {
  return http.post(`/approvals/${encodeURIComponent(id)}/approve`, { observacao });
}

async function apiRejectItem(id: string, observacao?: string): Promise<{ approval: ApprovalItem; order?: Order; quote?: Quote }> {
  return http.post(`/approvals/${encodeURIComponent(id)}/reject`, { observacao });
}

// ─── Exported Service ──────────────────────────────────────────

export const approvalsService = {
  getAll: (filters?: ApprovalFilters) =>
    API_CONFIG.useMock ? mockGetApprovals(filters) : apiGetApprovals(filters),
  getById: (id: string) =>
    API_CONFIG.useMock ? mockGetApproval(id) : http.get(`/approvals/${encodeURIComponent(id)}`),
  create: (item: Omit<ApprovalItem, "id"> & { id?: string }) =>
    API_CONFIG.useMock ? mockCreateApproval(item) : http.post("/approvals", item),
  update: (id: string, updates: Partial<ApprovalItem>) =>
    API_CONFIG.useMock ? mockUpdateApproval(id, updates) : http.patch(`/approvals/${encodeURIComponent(id)}`, updates),
  approve: (id: string, observacao?: string) =>
    API_CONFIG.useMock ? mockApproveItem(id, observacao) : apiApproveItem(id, observacao),
  reject: (id: string, observacao?: string) =>
    API_CONFIG.useMock ? mockRejectItem(id, observacao) : apiRejectItem(id, observacao),
  convertQuoteToOrder: (quoteId: string) =>
    API_CONFIG.useMock ? mockConvertQuoteToOrder(quoteId) : http.post(`/quotes/${encodeURIComponent(quoteId)}/convert`),
};
