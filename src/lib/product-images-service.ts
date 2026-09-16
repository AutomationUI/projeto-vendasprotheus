// ─── Product Images Service (Supabase Storage & Two-Stage Pipeline) ───
// Estágio 1: Upload Temporário (product-images-temp + product_upload_sessions + product_temp_images)
// Estágio 2: Persistência Definitiva (product-images + product_images + product_upload_sessions CONFIRMED)

import { supabase, isSupabaseConfigured } from "./supabase";
import {
  type ProductImage,
  type ProductTempImage,
  type ProductUploadSession,
  type ProductImageSource,
  type PromoteSessionImagesParams,
  type PromoteSessionImagesResult,
} from "@/types/product-images";

export const BUCKET_TEMP = "product-images-temp";
export const BUCKET_PERMANENT = "product-images";

const LOCAL_STORAGE_TEMP_SESSIONS = "vendasprotheus_img_temp_sessions";
const LOCAL_STORAGE_TEMP_IMAGES = "vendasprotheus_img_temp_images";
const LOCAL_STORAGE_PRODUCT_IMAGES = "vendasprotheus_img_product_images";

// ─── Auxiliares de Local Storage (Fallback offline / mock) ───────

function getLocalData<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[ProductImagesService] Falha ao salvar no localStorage (${key}):`, err);
  }
}

// Helper para converter File/Blob em Data URL (Base64) com Content-Type
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    } catch {
      resolve("");
    }
  });
}

// ─── Resolução Dinâmica de URL ──────────────────────────────────

export function resolveImageUrl(bucketId: string, storagePath: string, fallbackUrl?: string): string {
  if (!storagePath) return fallbackUrl || "";
  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://") ||
    storagePath.startsWith("data:") ||
    storagePath.startsWith("blob:") ||
    storagePath.startsWith("/api/")
  ) {
    return storagePath;
  }
  if (!isSupabaseConfigured()) {
    return fallbackUrl || "";
  }
  try {
    const { data } = supabase.storage.from(bucketId).getPublicUrl(storagePath);
    return data?.publicUrl || fallbackUrl || "";
  } catch {
    return fallbackUrl || "";
  }
}

// Helper para obter dimensões de imagem no navegador
export function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        URL.revokeObjectURL(url);
        resolve({ width: w, height: h });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    } catch {
      resolve({ width: 0, height: 0 });
    }
  });
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-");
}

// ─── ESTÁGIO 1: Sessão de Upload Temporário ──────────────────────

export async function createUploadSession(userId: string, ttlHours = 24): Promise<ProductUploadSession> {
  const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString();

  const session: ProductUploadSession = {
    id: sessionId,
    userId: userId || "anonymous",
    status: "ACTIVE",
    createdAt: now.toISOString(),
    expiresAt,
    confirmedAt: null,
    cancelledAt: null,
  };

  // Salvar localmente
  const localSessions = getLocalData<ProductUploadSession>(LOCAL_STORAGE_TEMP_SESSIONS);
  setLocalData(LOCAL_STORAGE_TEMP_SESSIONS, [session, ...localSessions]);

  // Salvar no Supabase se configurado
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("product_upload_sessions").insert({
        id: session.id,
        user_id: session.userId,
        status: session.status,
        created_at: session.createdAt,
        expires_at: session.expiresAt,
      });
    } catch (err) {
      console.warn("[ProductImagesService] Aviso ao criar sessão no Supabase:", err);
    }
  }

  return session;
}

export async function cancelUploadSession(sessionId: string): Promise<boolean> {
  const localSessions = getLocalData<ProductUploadSession>(LOCAL_STORAGE_TEMP_SESSIONS);
  const idx = localSessions.findIndex((s) => s.id === sessionId);
  if (idx !== -1) {
    localSessions[idx].status = "CANCELLED";
    localSessions[idx].cancelledAt = new Date().toISOString();
    setLocalData(LOCAL_STORAGE_TEMP_SESSIONS, localSessions);
  }

  // Obter imagens temporárias da sessão para remover arquivos do bucket temp
  const tempImages = getLocalData<ProductTempImage>(LOCAL_STORAGE_TEMP_IMAGES).filter(
    (img) => img.uploadSessionId === sessionId
  );

  if (isSupabaseConfigured()) {
    try {
      // 1. Atualizar status da sessão
      await supabase
        .from("product_upload_sessions")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      // 2. Remover arquivos do Supabase Storage no bucket temporário
      if (tempImages.length > 0) {
        const pathsToDelete = tempImages.map((img) => img.storagePath).filter(Boolean);
        if (pathsToDelete.length > 0) {
          await supabase.storage.from(BUCKET_TEMP).remove(pathsToDelete);
        }
      }

      // 3. Atualizar status das imagens temp
      await supabase
        .from("product_temp_images")
        .update({ status: "REMOVED", updated_at: new Date().toISOString() })
        .eq("upload_session_id", sessionId);
    } catch (err) {
      console.warn("[ProductImagesService] Aviso ao cancelar sessão no Supabase:", err);
    }
  }

  return true;
}

// ─── ESTÁGIO 1: Upload de Imagem Temporária ──────────────────────

export interface UploadTempImageInput {
  file: File | Blob;
  filename?: string;
  uploadSessionId: string;
  userId: string;
  source?: ProductImageSource;
  sortOrder?: number;
  isPrimary?: boolean;
  onProgress?: (percent: number) => void;
}

export async function uploadTempImage(input: UploadTempImageInput): Promise<ProductTempImage> {
  const {
    file,
    uploadSessionId,
    userId = "anonymous",
    source = "MANUAL",
    sortOrder = 0,
    isPrimary = false,
    onProgress,
  } = input;

  const rawFilename = input.filename || (file instanceof File ? file.name : `capture_${Date.now()}.webp`);
  const safeFilename = sanitizeFilename(rawFilename);
  const tempId = `tmp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const storagePath = `${userId}/${uploadSessionId}/${Date.now()}_${safeFilename}`;
  const mimeType = file.type || "image/jpeg";
  const fileSize = file.size || 0;

  // Obter dimensões
  const { width, height } = await getImageDimensions(file);

  // Criar Data URL (Base64) permanente com Content-Type
  let previewUrl = "";
  try {
    previewUrl = await fileToDataUrl(file);
    if (!previewUrl) {
      previewUrl = URL.createObjectURL(file);
    }
  } catch {
    try {
      previewUrl = URL.createObjectURL(file);
    } catch {
      previewUrl = "";
    }
  }

  const tempImage: ProductTempImage = {
    id: tempId,
    uploadSessionId,
    userId,
    bucketId: BUCKET_TEMP,
    storagePath,
    filename: rawFilename,
    mimeType,
    fileSize,
    width,
    height,
    sortOrder,
    isPrimary,
    status: "UPLOADING",
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    previewUrl,
    uploadProgress: 10,
  };

  onProgress?.(25);

  // Tentar upload no Supabase Storage se configurado
  if (isSupabaseConfigured()) {
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET_TEMP).upload(storagePath, file, {
        contentType: mimeType,
        upsert: true,
      });

      if (uploadError) {
        console.warn("[ProductImagesService] Falha no upload para o Supabase Storage (bucket temp):", uploadError);
        // Mesmo com erro no storage remoto, manter em memória local para visualização
      } else {
        tempImage.status = "UPLOADED";
        tempImage.uploadProgress = 100;
        // Keep local previewUrl (blob or data url) for robust guaranteed rendering without depending on bucket public access policies

        // Registrar na tabela product_temp_images
        await supabase.from("product_temp_images").insert({
          id: tempImage.id,
          upload_session_id: tempImage.uploadSessionId,
          user_id: tempImage.userId,
          bucket_id: tempImage.bucketId,
          storage_path: tempImage.storagePath,
          filename: tempImage.filename,
          mime_type: tempImage.mimeType,
          file_size: tempImage.fileSize,
          width: tempImage.width,
          height: tempImage.height,
          sort_order: tempImage.sortOrder,
          is_primary: tempImage.isPrimary,
          source: tempImage.source,
          status: "UPLOADED",
          created_at: tempImage.createdAt,
          updated_at: tempImage.updatedAt,
        });
      }
    } catch (err: any) {
      console.warn("[ProductImagesService] Exceção ao gravar imagem temporária no Supabase:", err);
      tempImage.status = "UPLOADED"; // fallback offline
      tempImage.uploadProgress = 100;
    }
  } else {
    // Offline / Mock mode
    tempImage.status = "UPLOADED";
    tempImage.uploadProgress = 100;
  }

  onProgress?.(100);

  // Salvar no localStorage
  const localTempImages = getLocalData<ProductTempImage>(LOCAL_STORAGE_TEMP_IMAGES);
  setLocalData(LOCAL_STORAGE_TEMP_IMAGES, [...localTempImages, tempImage]);

  return tempImage;
}

export async function removeTempImage(tempImageId: string): Promise<boolean> {
  const localTemp = getLocalData<ProductTempImage>(LOCAL_STORAGE_TEMP_IMAGES);
  const target = localTemp.find((t) => t.id === tempImageId);

  // Remover localmente
  setLocalData(
    LOCAL_STORAGE_TEMP_IMAGES,
    localTemp.filter((t) => t.id !== tempImageId)
  );

  if (target && isSupabaseConfigured()) {
    try {
      if (target.storagePath) {
        await supabase.storage.from(BUCKET_TEMP).remove([target.storagePath]);
      }
      await supabase.from("product_temp_images").delete().eq("id", tempImageId);
    } catch (err) {
      console.warn("[ProductImagesService] Aviso ao remover imagem temporária do Supabase:", err);
    }
  }

  return true;
}

// ─── ESTÁGIO 2: Persistência Definitiva (Salvar Produto) ─────────

export async function promoteSessionImages(
  params: PromoteSessionImagesParams
): Promise<PromoteSessionImagesResult> {
  const {
    sessionId,
    productId,
    userId: _userId,
    tempImages,
    primaryImageId,
    deletedPersistedImageIds = [],
    persistedImageOrders = [],
  } = params;

  const resultImages: ProductImage[] = [];
  let promotedCount = 0;
  let deletedCount = 0;

  // 1. Processar exclusão de imagens persistidas marcadas para remoção
  if (deletedPersistedImageIds.length > 0) {
    const localProductImages = getLocalData<ProductImage>(LOCAL_STORAGE_PRODUCT_IMAGES);
    const toDelete = localProductImages.filter((img) => deletedPersistedImageIds.includes(img.id));
    deletedCount = toDelete.length;

    setLocalData(
      LOCAL_STORAGE_PRODUCT_IMAGES,
      localProductImages.filter((img) => !deletedPersistedImageIds.includes(img.id))
    );

    if (isSupabaseConfigured()) {
      try {
        const pathsToDelete = toDelete.map((img) => img.storagePath).filter(Boolean);
        if (pathsToDelete.length > 0) {
          await supabase.storage.from(BUCKET_PERMANENT).remove(pathsToDelete);
        }
        await supabase.from("product_images").delete().in("id", deletedPersistedImageIds);
      } catch (err) {
        console.warn("[ProductImagesService] Aviso ao deletar imagens persistidas no Supabase:", err);
      }
    }
  }

  // 2. Atualizar ordenação e flag principal das imagens persistidas restantes
  const updatedPersisted: ProductImage[] = [];
  const localProductImages = getLocalData<ProductImage>(LOCAL_STORAGE_PRODUCT_IMAGES);
  const currentProductImgs = localProductImages.filter(
    (img) => img.productId === productId && !deletedPersistedImageIds.includes(img.id)
  );

  for (const pImg of currentProductImgs) {
    const orderInfo = persistedImageOrders.find((o) => o.id === pImg.id);
    const isThisPrimary = primaryImageId ? primaryImageId === pImg.id : pImg.isPrimary;
    const updated: ProductImage = {
      ...pImg,
      sortOrder: orderInfo !== undefined ? orderInfo.sortOrder : pImg.sortOrder,
      isPrimary: isThisPrimary,
      updatedAt: new Date().toISOString(),
    };
    updatedPersisted.push(updated);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("product_images")
          .update({
            sort_order: updated.sortOrder,
            is_primary: updated.isPrimary,
            updated_at: updated.updatedAt,
          })
          .eq("id", updated.id);
      } catch (err) {
        console.warn("[ProductImagesService] Aviso ao atualizar imagem persistida:", err);
      }
    }
  }

  // 3. Promover imagens temporárias para o bucket permanente
  const allLocalTemp = getLocalData<ProductTempImage>(LOCAL_STORAGE_TEMP_IMAGES);

  for (let i = 0; i < tempImages.length; i++) {
    const tConfig = tempImages[i];
    const tempItem = allLocalTemp.find((t) => t.id === tConfig.tempImageId);
    if (!tempItem) continue;

    const definitiveId = `img_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const fileExt = tempItem.filename.split(".").pop() || "jpg";
    const definitiveStoragePath = `${productId}/${definitiveId}.${fileExt}`;
    const isThisPrimary = primaryImageId ? primaryImageId === tempItem.id : tConfig.isPrimary;

    const definitiveImage: ProductImage = {
      id: definitiveId,
      productId,
      bucketId: BUCKET_PERMANENT,
      storagePath: definitiveStoragePath,
      filename: tempItem.filename,
      mimeType: tempItem.mimeType,
      fileSize: tempItem.fileSize,
      width: tempItem.width,
      height: tempItem.height,
      sortOrder: tConfig.sortOrder,
      isPrimary: isThisPrimary,
      source: tConfig.source || tempItem.source || "MANUAL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: resolveImageUrl(BUCKET_PERMANENT, definitiveStoragePath, tempItem.previewUrl),
    };

    // Operação segura no Supabase Storage: Baixar do temp e enviar para permanent
    if (isSupabaseConfigured()) {
      try {
        // Baixar arquivo do bucket temporário
        const { data: blobData, error: downloadError } = await supabase.storage
          .from(BUCKET_TEMP)
          .download(tempItem.storagePath);

        if (!downloadError && blobData) {
          // Gravar no bucket definitivo
          const { error: uploadError } = await supabase.storage
            .from(BUCKET_PERMANENT)
            .upload(definitiveStoragePath, blobData, {
              contentType: tempItem.mimeType,
              upsert: true,
            });

          if (!uploadError) {
            // Remover do bucket temporário
            await supabase.storage.from(BUCKET_TEMP).remove([tempItem.storagePath]);
          }
        }

        // Inserir registro definitivo na tabela product_images
        await supabase.from("product_images").insert({
          id: definitiveImage.id,
          product_id: definitiveImage.productId,
          bucket_id: definitiveImage.bucketId,
          storage_path: definitiveImage.storagePath,
          filename: definitiveImage.filename,
          mime_type: definitiveImage.mimeType,
          file_size: definitiveImage.fileSize,
          width: definitiveImage.width,
          height: definitiveImage.height,
          sort_order: definitiveImage.sortOrder,
          is_primary: definitiveImage.isPrimary,
          source: definitiveImage.source,
          created_at: definitiveImage.createdAt,
          updated_at: definitiveImage.updatedAt,
        });

        // Atualizar status da imagem temporária
        await supabase
          .from("product_temp_images")
          .update({ status: "PROMOTING", updated_at: new Date().toISOString() })
          .eq("id", tempItem.id);
      } catch (err) {
        console.warn("[ProductImagesService] Aviso na promoção para Supabase:", err);
      }
    }

    resultImages.push(definitiveImage);
    promotedCount++;
  }

  // 4. Garantir que apenas uma imagem seja principal
  const combinedImages = [...updatedPersisted, ...resultImages].sort((a, b) => a.sortOrder - b.sortOrder);
  const hasPrimary = combinedImages.some((img) => img.isPrimary);
  if (!hasPrimary && combinedImages.length > 0) {
    combinedImages[0].isPrimary = true;
    if (isSupabaseConfigured()) {
      try {
        await supabase.from("product_images").update({ is_primary: true }).eq("id", combinedImages[0].id);
      } catch {
        // safe fallback
      }
    }
  }

  // Salvar no localStorage
  const otherProductsImages = localProductImages.filter((img) => img.productId !== productId);
  setLocalData(LOCAL_STORAGE_PRODUCT_IMAGES, [...otherProductsImages, ...combinedImages]);

  // 5. Finalizar sessão no Supabase (CONFIRMED)
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from("product_upload_sessions")
        .update({
          status: "CONFIRMED",
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
    } catch (err) {
      console.warn("[ProductImagesService] Aviso ao confirmar sessão no Supabase:", err);
    }
  }

  // Atualizar sessão local
  const localSessions = getLocalData<ProductUploadSession>(LOCAL_STORAGE_TEMP_SESSIONS);
  const sIdx = localSessions.findIndex((s) => s.id === sessionId);
  if (sIdx !== -1) {
    localSessions[sIdx].status = "CONFIRMED";
    localSessions[sIdx].confirmedAt = new Date().toISOString();
    setLocalData(LOCAL_STORAGE_TEMP_SESSIONS, localSessions);
  }

  return {
    success: true,
    promotedCount,
    deletedCount,
    images: combinedImages,
  };
}

// ─── Consulta de Imagens do Produto ─────────────────────────────

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  if (!productId) return [];

  // Tentar Supabase se configurado
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: ProductImage[] = data.map((row: any) => ({
          id: row.id,
          productId: row.product_id,
          bucketId: row.bucket_id || BUCKET_PERMANENT,
          storagePath: row.storage_path,
          filename: row.filename || "image.jpg",
          mimeType: row.mime_type || "image/jpeg",
          fileSize: Number(row.file_size || 0),
          width: row.width ? Number(row.width) : null,
          height: row.height ? Number(row.height) : null,
          sortOrder: Number(row.sort_order || 0),
          isPrimary: Boolean(row.is_primary),
          source: (row.source as ProductImageSource) || "MANUAL",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          url: resolveImageUrl(row.bucket_id || BUCKET_PERMANENT, row.storage_path, row.url),
        }));

        // Atualizar cache local
        const local = getLocalData<ProductImage>(LOCAL_STORAGE_PRODUCT_IMAGES);
        const filtered = local.filter((img) => img.productId !== productId);
        setLocalData(LOCAL_STORAGE_PRODUCT_IMAGES, [...filtered, ...mapped]);

        return mapped;
      }
    } catch (err) {
      console.warn("[ProductImagesService] Falha ao consultar imagens do produto no Supabase:", err);
    }
  }

  // Fallback para localStorage
  const local = getLocalData<ProductImage>(LOCAL_STORAGE_PRODUCT_IMAGES);
  return local
    .filter((img) => img.productId === productId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({
      ...img,
      url: resolveImageUrl(img.bucketId || BUCKET_PERMANENT, img.storagePath, img.url),
    }));
}

// Obter imagem principal de um produto (URL direta)
export function getPrimaryProductImageUrl(productId: string, fallbackUrl?: string): string {
  if (!productId) return fallbackUrl || "";
  const local = getLocalData<ProductImage>(LOCAL_STORAGE_PRODUCT_IMAGES).filter((img) => img.productId === productId);
  if (local.length === 0) return fallbackUrl || "";

  const primary = local.find((img) => img.isPrimary) || local[0];
  return resolveImageUrl(primary.bucketId || BUCKET_PERMANENT, primary.storagePath, primary.url || fallbackUrl);
}

// ─── Rotina de Limpeza de Sessões Expiradas ──────────────────────

export async function cleanupExpiredUploadSessions(): Promise<{ cleanedSessions: number; deletedFiles: number }> {
  let cleanedSessions = 0;
  let deletedFiles = 0;

  const now = new Date();
  const localSessions = getLocalData<ProductUploadSession>(LOCAL_STORAGE_TEMP_SESSIONS);
  const expiredSessions = localSessions.filter(
    (s) => s.status === "ACTIVE" && new Date(s.expiresAt) < now
  );

  for (const session of expiredSessions) {
    session.status = "EXPIRED";
    cleanedSessions++;
  }
  setLocalData(LOCAL_STORAGE_TEMP_SESSIONS, localSessions);

  if (isSupabaseConfigured()) {
    try {
      // Buscar sessões expiradas no Supabase
      const { data: expiredInDb } = await supabase
        .from("product_upload_sessions")
        .select("id")
        .eq("status", "ACTIVE")
        .lt("expires_at", now.toISOString());

      if (expiredInDb && expiredInDb.length > 0) {
        const sessionIds = expiredInDb.map((s) => s.id);

        // Buscar imagens temporárias dessas sessões
        const { data: tempImages } = await supabase
          .from("product_temp_images")
          .select("storage_path")
          .in("upload_session_id", sessionIds);

        if (tempImages && tempImages.length > 0) {
          const paths = tempImages.map((t) => t.storage_path).filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from(BUCKET_TEMP).remove(paths);
            deletedFiles = paths.length;
          }
        }

        // Marcar como EXPIRED
        await supabase
          .from("product_upload_sessions")
          .update({ status: "EXPIRED" })
          .in("id", sessionIds);
      }
    } catch (err) {
      console.warn("[ProductImagesService] Falha na limpeza de sessões expiradas:", err);
    }
  }

  return { cleanedSessions, deletedFiles };
}
