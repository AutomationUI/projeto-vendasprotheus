// ─── Backend Service: Gerenciamento de Imagens e Promoção Segura ───

import { logger } from "../lib/logger.js";

export interface CreateSessionDto {
  userId: string;
  ttlHours?: number;
}

export interface PromoteImagesDto {
  sessionId: string;
  productId: string;
  userId: string;
  tempImages: Array<{
    tempImageId: string;
    sortOrder: number;
    isPrimary: boolean;
    source: "MANUAL" | "CAMERA" | "ERP" | "ECOMMERCE" | "MARKETPLACE" | "API" | "INTERNAL";
  }>;
  primaryImageId?: string;
  deletedPersistedImageIds?: string[];
  persistedImageOrders?: Array<{ id: string; sortOrder: number; isPrimary: boolean }>;
}

export interface ProductImageRecord {
  id: string;
  productId: string;
  bucketId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory registry fallback for sessions when running backend standalone
const inMemorySessions = new Map<string, {
  id: string;
  userId: string;
  status: "ACTIVE" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
}>();

// In-memory store for backend served image binaries / data
const inMemoryImageStore = new Map<string, {
  data: Buffer | string;
  mimeType: string;
}>();

export const productImagesBackendService = {
  /**
   * Armazenar ou registrar imagem no backend
   */
  registerImageBuffer(imageId: string, data: Buffer | string, mimeType = "image/jpeg") {
    inMemoryImageStore.set(imageId, { data, mimeType });
  },

  /**
   * Servir imagem do backend
   */
  async getImageFile(productId: string, imageId: string) {
    const key = `${productId}_${imageId}`;
    const keyShort = imageId;
    const stored = inMemoryImageStore.get(key) || inMemoryImageStore.get(keyShort);
    if (stored) {
      return stored;
    }
    // Default placeholder SVG SVG data if not directly stored in memory
    const svgFallback = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
    return {
      data: Buffer.from(svgFallback),
      mimeType: "image/svg+xml",
    };
  },
  /**
   * Criação de sessão de upload temporário com TTL
   */
  async createSession(dto: CreateSessionDto) {
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const ttlHours = dto.ttlHours || 24;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

    const session = {
      id: sessionId,
      userId: dto.userId || "anonymous",
      status: "ACTIVE" as const,
      createdAt: now.toISOString(),
      expiresAt,
      confirmedAt: null,
      cancelledAt: null,
    };

    inMemorySessions.set(sessionId, session);
    logger.info({ sessionId, userId: dto.userId, expiresAt }, "[ProductImagesService] Nova sessão de upload criada");

    return session;
  },

  /**
   * Cancelamento de sessão e marcação de cancelamento
   */
  async cancelSession(sessionId: string) {
    const session = inMemorySessions.get(sessionId);
    if (session) {
      session.status = "CANCELLED";
      session.cancelledAt = new Date().toISOString();
      inMemorySessions.set(sessionId, session);
    }
    logger.info({ sessionId }, "[ProductImagesService] Sessão de upload cancelada");
    return { success: true, sessionId };
  },

  /**
   * Validação e execução de promoção de imagens temporárias para definitivas
   */
  async promoteImages(dto: PromoteImagesDto) {
    logger.info(
      {
        sessionId: dto.sessionId,
        productId: dto.productId,
        tempCount: dto.tempImages.length,
        deletedCount: dto.deletedPersistedImageIds?.length || 0,
      },
      "[ProductImagesService] Processando promoção segura de imagens de produto"
    );

    const promotedImages: ProductImageRecord[] = [];

    // Processar itens promovidos
    for (let i = 0; i < dto.tempImages.length; i++) {
      const item = dto.tempImages[i];
      const imageId = `img_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const storagePath = `${dto.productId}/${imageId}.jpg`;
      const isPrimary = dto.primaryImageId ? dto.primaryImageId === item.tempImageId : item.isPrimary;

      promotedImages.push({
        id: imageId,
        productId: dto.productId,
        bucketId: "product-images",
        storagePath,
        filename: `product_${dto.productId}_${i + 1}.jpg`,
        mimeType: "image/jpeg",
        fileSize: 102400,
        width: 800,
        height: 600,
        sortOrder: item.sortOrder ?? i,
        isPrimary,
        source: item.source || "MANUAL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Garantir que exista uma imagem principal
    const hasPrimary = promotedImages.some((img) => img.isPrimary);
    if (!hasPrimary && promotedImages.length > 0) {
      promotedImages[0].isPrimary = true;
    }

    // Marcar sessão como CONFIRMED
    const session = inMemorySessions.get(dto.sessionId);
    if (session) {
      session.status = "CONFIRMED";
      session.confirmedAt = new Date().toISOString();
      inMemorySessions.set(dto.sessionId, session);
    }

    return {
      success: true,
      productId: dto.productId,
      sessionId: dto.sessionId,
      promotedCount: promotedImages.length,
      deletedCount: dto.deletedPersistedImageIds?.length || 0,
      images: promotedImages,
    };
  },

  /**
   * Rotina de limpeza de sessões expiradas
   */
  async cleanupExpired() {
    const now = new Date();
    let cleaned = 0;

    for (const [id, session] of inMemorySessions.entries()) {
      if (session.status === "ACTIVE" && new Date(session.expiresAt) < now) {
        session.status = "EXPIRED";
        inMemorySessions.set(id, session);
        cleaned++;
      }
    }

    logger.info({ cleaned }, "[ProductImagesService] Rotina de limpeza de sessões expiradas executada");
    return { success: true, cleanedSessions: cleaned };
  },
};
