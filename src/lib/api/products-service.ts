// ─── Products Service ────────────────────────────────────
// Abstracts product operations. Mock implementation uses in-memory data.

import { API_CONFIG } from "./config";
import { http } from "./http-client";
import type { Product } from "@/lib/mock-data";
import type { PaginatedResponse } from "./orders-service";
import { localDB } from "@/lib/local-db";
import { isERPProductSyncActive } from "@/lib/settings-store";

export interface ProductFilters {
  search?: string;
  categoria?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

// ─── Mock implementation backed by localDB ─────────────────────────

async function mockGetProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
  await new Promise(r => setTimeout(r, 60));

  let result = localDB.getProducts();

  if (filters?.categoria) result = result.filter(p => p.categoria === filters.categoria);
  if (filters?.lowStock) result = result.filter(p => p.estoque <= p.estoqueMinimo);
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(p =>
      p.nome.toLowerCase().includes(s) ||
      p.codigo.toLowerCase().includes(s) ||
      p.categoria.toLowerCase().includes(s)
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

async function mockGetProduct(id: string): Promise<Product | null> {
  await new Promise(r => setTimeout(r, 30));
  return localDB.getProductById(id);
}

async function mockCreateProduct(product: Omit<Product, "id">): Promise<Product> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.saveProduct(product);
}

async function mockUpdateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  await new Promise(r => setTimeout(r, 100));
  return localDB.updateProduct(id, updates);
}

async function mockDeleteProduct(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 60));
  localDB.deleteProduct(id);
}

// ─── Real API implementation ─────────────────────────────

async function apiGetProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.categoria) params.set("categoria", filters.categoria);
  if (filters?.lowStock) params.set("lowStock", "true");
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  return http.get(`/products?${params}`);
}

async function apiGetProduct(id: string): Promise<Product | null> {
  return http.get(`/products/${encodeURIComponent(id)}`);
}

async function apiCreateProduct(product: Omit<Product, "id">): Promise<Product> {
  return http.post("/products", product);
}

async function apiUpdateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  return http.patch(`/products/${encodeURIComponent(id)}`, updates);
}

async function apiDeleteProduct(id: string): Promise<void> {
  return http.delete(`/products/${encodeURIComponent(id)}`);
}

function assertManualProductManagementAllowed() {
  if (isERPProductSyncActive()) {
    throw new Error(
      "Operação bloqueada: O cadastro e edição de produtos só fica ativo quando NÃO houver consumo de dados por API do Protheus ou de outro ERP. Com o ERP ativo, o Protheus é a fonte mestre dos dados."
    );
  }
}

// ─── Exported service ────────────────────────────────────

export const productsService = {
  getAll: API_CONFIG.useMock ? mockGetProducts : apiGetProducts,
  getById: API_CONFIG.useMock ? mockGetProduct : apiGetProduct,
  create: async (product: Omit<Product, "id">): Promise<Product> => {
    assertManualProductManagementAllowed();
    return API_CONFIG.useMock ? mockCreateProduct(product) : apiCreateProduct(product);
  },
  update: async (id: string, updates: Partial<Product>): Promise<Product> => {
    assertManualProductManagementAllowed();
    return API_CONFIG.useMock ? mockUpdateProduct(id, updates) : apiUpdateProduct(id, updates);
  },
  remove: async (id: string): Promise<void> => {
    assertManualProductManagementAllowed();
    return API_CONFIG.useMock ? mockDeleteProduct(id) : apiDeleteProduct(id);
  },
};

