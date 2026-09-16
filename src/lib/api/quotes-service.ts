// ─── Quotes Service ──────────────────────────────────────
// Abstracts quote (orçamento) operations. Mock implementation uses in-memory data.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type { Quote, QuoteStatus } from "@/lib/mock-data";
import type { PaginatedResponse } from "./orders-service";
import { localDB } from "@/lib/local-db";

export interface QuoteFilters {
  status?: QuoteStatus;
  search?: string;
  vendedor?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Mock implementation backed by localDB ─────────────────────────

async function mockGetQuotes(filters?: QuoteFilters): Promise<PaginatedResponse<Quote>> {
  await new Promise(r => setTimeout(r, 60));

  let result = localDB.getQuotes();

  if (filters?.status) result = result.filter(q => q.status === filters.status);
  if (filters?.vendedor) result = result.filter(q => q.vendedor === filters.vendedor);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(q =>
      q.numero.toLowerCase().includes(s) ||
      q.cliente.toLowerCase().includes(s) ||
      q.vendedor.toLowerCase().includes(s)
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

async function mockGetQuote(id: string): Promise<Quote | null> {
  await new Promise(r => setTimeout(r, 30));
  return localDB.getQuoteById(id);
}

async function mockCreateQuote(quote: Omit<Quote, "id" | "numero"> & { numero?: string }): Promise<Quote> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.saveQuote(quote);
}

async function mockUpdateQuote(id: string, updates: Partial<Quote>): Promise<Quote> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.updateQuote(id, updates);
}

async function mockDeleteQuote(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 60));
  localDB.deleteQuote(id);
}

async function mockConvertQuoteToOrder(quoteId: string) {
  await new Promise(r => setTimeout(r, 60));
  return localDB.convertQuoteToOrder(quoteId);
}

// ─── Real API implementation ─────────────────────────────

async function apiGetQuotes(filters?: QuoteFilters): Promise<PaginatedResponse<Quote>> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.vendedor) params.set("vendedor", filters.vendedor);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  return http.get(`/quotes?${params}`);
}

async function apiGetQuote(id: string): Promise<Quote | null> {
  return http.get(`/quotes/${encodeURIComponent(id)}`);
}

async function apiCreateQuote(quote: Omit<Quote, "id" | "numero">): Promise<Quote> {
  return http.post("/quotes", quote);
}

async function apiUpdateQuote(id: string, updates: Partial<Quote>): Promise<Quote> {
  return http.patch(`/quotes/${encodeURIComponent(id)}`, updates);
}

async function apiDeleteQuote(id: string): Promise<void> {
  return http.delete(`/quotes/${encodeURIComponent(id)}`);
}

// ─── Exported service ────────────────────────────────────

export const quotesService = {
  getAll: API_CONFIG.useMock ? mockGetQuotes : apiGetQuotes,
  getById: API_CONFIG.useMock ? mockGetQuote : apiGetQuote,
  create: API_CONFIG.useMock ? mockCreateQuote : apiCreateQuote,
  update: API_CONFIG.useMock ? mockUpdateQuote : apiUpdateQuote,
  remove: API_CONFIG.useMock ? mockDeleteQuote : apiDeleteQuote,
  convertQuoteToOrder: (quoteId: string) =>
    API_CONFIG.useMock ? mockConvertQuoteToOrder(quoteId) : http.post(`/quotes/${encodeURIComponent(quoteId)}/convert`),
};
