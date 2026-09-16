// ─── Tipos e Interfaces para Gerenciamento de Imagens com Supabase ───
// Suporte ao ciclo de dois estágios: Upload Temporário e Persistência Definitiva

export type ProductUploadSessionStatus = "ACTIVE" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

export type ProductTempImageStatus = "UPLOADING" | "UPLOADED" | "REMOVED" | "PROMOTING" | "FAILED";

export type ProductImageSource =
  | "MANUAL"
  | "CAMERA"
  | "ERP"
  | "ECOMMERCE"
  | "MARKETPLACE"
  | "API"
  | "INTERNAL";

/**
 * Sessão de Upload Temporário (product_upload_sessions)
 */
export interface ProductUploadSession {
  id: string;
  userId: string;
  status: ProductUploadSessionStatus;
  createdAt: string;
  expiresAt: string;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
}

/**
 * Imagem no Estágio 1 - Temporária (product_temp_images)
 */
export interface ProductTempImage {
  id: string;
  uploadSessionId: string;
  userId: string;
  bucketId: string; // Ex: 'product-images-temp'
  storagePath: string; // Ex: 'user-id/upload-session-id/image-001.webp'
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  status: ProductTempImageStatus;
  source: ProductImageSource;
  createdAt: string;
  updatedAt: string;
  // Campos auxiliares de frontend
  previewUrl?: string;
  uploadProgress?: number;
  error?: string;
}

/**
 * Imagem no Estágio 2 - Definitiva (product_images)
 */
export interface ProductImage {
  id: string;
  productId: string;
  bucketId: string; // Ex: 'product-images'
  storagePath: string; // Ex: 'product-id/image-id.webp'
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  source: ProductImageSource;
  createdAt: string;
  updatedAt: string;
  // Dynamic resolved URL for rendering
  url?: string;
}

/**
 * Item de interface unificado para o editor de imagens de produto
 */
export interface ProductImageEditorItem {
  id: string;
  isPersisted: boolean; // true = Já gravada no product_images; false = Imagem temporária
  tempId?: string;
  persistedId?: string;
  bucketId: string;
  storagePath: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width?: number | null;
  height?: number | null;
  sortOrder: number;
  isPrimary: boolean;
  source: ProductImageSource;
  status: ProductTempImageStatus;
  previewUrl: string;
  uploadProgress?: number;
  error?: string;
  markedForDeletion?: boolean; // Se for imagem persistida marcada para exclusão ao salvar
  file?: File | Blob;
}

export interface PromoteSessionImagesParams {
  sessionId: string;
  productId: string;
  userId: string;
  tempImages: {
    tempImageId: string;
    sortOrder: number;
    isPrimary: boolean;
    source: ProductImageSource;
  }[];
  primaryImageId?: string; // ID da imagem (temp ou persisted) que deve ser a principal
  deletedPersistedImageIds?: string[]; // IDs de product_images marcadas para exclusão definitiva
  persistedImageOrders?: { id: string; sortOrder: number; isPrimary: boolean }[];
}

export interface PromoteSessionImagesResult {
  success: boolean;
  promotedCount: number;
  deletedCount: number;
  images: ProductImage[];
  error?: string;
}
