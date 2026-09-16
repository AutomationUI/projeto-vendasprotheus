import React, { useState, useRef } from "react";
import {
  Upload,
  Camera,
  Star,
  Trash2,
  Undo2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CameraCaptureModal } from "./CameraCaptureModal";
import {
  type ProductImageEditorItem,
  type ProductUploadSession,
  type ProductImageSource,
} from "@/types/product-images";
import {
  uploadTempImage,
  removeTempImage,
  BUCKET_TEMP,
} from "@/lib/product-images-service";
import { ProductImageWithSkeleton } from "./ProductImageWithSkeleton";

interface ProductImagesManagerProps {
  uploadSession: ProductUploadSession | null;
  userId: string;
  items: ProductImageEditorItem[];
  onItemsChange: (items: ProductImageEditorItem[]) => void;
  disabled?: boolean;
}

export const ProductImagesManager: React.FC<ProductImagesManagerProps> = ({
  uploadSession,
  userId,
  items,
  onItemsChange,
  disabled = false,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewZoomItem, setPreviewZoomItem] = useState<ProductImageEditorItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper para lidar com arquivos recebidos
  const handleFilesAdded = async (files: FileList | File[], source: ProductImageSource = "MANUAL") => {
    if (!uploadSession || files.length === 0 || disabled) return;

    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArray.length === 0) return;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const localPreview = URL.createObjectURL(file);
      const isFirstItem = items.length === 0 && i === 0;

      // Adicionar item temporário imediato para feedback de UI
      const tempEditorItem: ProductImageEditorItem = {
        id: `local_${Date.now()}_${i}`,
        isPersisted: false,
        bucketId: BUCKET_TEMP,
        storagePath: "",
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        sortOrder: items.length + i,
        isPrimary: isFirstItem,
        source,
        status: "UPLOADING",
        previewUrl: localPreview,
        uploadProgress: 15,
        file,
      };

      const updatedList = [...items, tempEditorItem];
      onItemsChange(updatedList);

      try {
        // Enviar imagem para o bucket temporário
        const tempImage = await uploadTempImage({
          file,
          filename: file.name,
          uploadSessionId: uploadSession.id,
          userId,
          source,
          sortOrder: tempEditorItem.sortOrder,
          isPrimary: tempEditorItem.isPrimary,
          onProgress: (p) => {
            tempEditorItem.uploadProgress = p;
            onItemsChange([...updatedList]);
          },
        });

        // Atualizar com metadados retornados
        tempEditorItem.id = tempImage.id;
        tempEditorItem.tempId = tempImage.id;
        tempEditorItem.storagePath = tempImage.storagePath;
        tempEditorItem.status = "UPLOADED";
        tempEditorItem.width = tempImage.width;
        tempEditorItem.height = tempImage.height;
        if (tempImage.previewUrl) {
          tempEditorItem.previewUrl = tempImage.previewUrl;
        }

        onItemsChange([...updatedList]);
      } catch (err: any) {
        console.warn("[ProductImagesManager] Falha no upload temporário:", err);
        tempEditorItem.status = "FAILED";
        tempEditorItem.error = err.message || "Erro no upload";
        onItemsChange([...updatedList]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files) {
      handleFilesAdded(e.dataTransfer.files, "MANUAL");
    }
  };

  const handleCameraCapture = (capturedFile: File) => {
    handleFilesAdded([capturedFile], "CAMERA");
  };

  // Ações sobre imagens
  const handleSetPrimary = (id: string) => {
    if (disabled) return;
    const updated = items.map((item) => ({
      ...item,
      isPrimary: item.id === id,
    }));
    onItemsChange(updated);
  };

  const handleMoveOrder = (index: number, direction: "left" | "right") => {
    if (disabled) return;
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Recalcular sortOrder
    const reordered = newItems.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
    onItemsChange(reordered);
  };

  const handleDeleteItem = async (item: ProductImageEditorItem) => {
    if (disabled) return;

    if (item.isPersisted) {
      // Toggle marcar para exclusão ao salvar
      const updated = items.map((it) => {
        if (it.id === item.id) {
          return { ...it, markedForDeletion: !it.markedForDeletion };
        }
        return it;
      });

      // Se a imagem marcada for a principal, passar a principal para outra não marcada
      const stillActive = updated.filter((it) => !it.markedForDeletion);
      if (item.isPrimary && stillActive.length > 0) {
        stillActive[0].isPrimary = true;
      }

      onItemsChange(updated);
    } else {
      // Imagem temporária: remover imediatamente
      if (item.tempId) {
        removeTempImage(item.tempId).catch(() => {});
      }
      const updated = items.filter((it) => it.id !== item.id);
      if (item.isPrimary && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      onItemsChange(updated);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeItemsCount = items.filter((i) => !i.markedForDeletion).length;

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFilesAdded(e.target.files, "MANUAL");
            e.target.value = "";
          }
        }}
        disabled={disabled}
      />

      {/* Header com Ações e Informações de Sessão */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-900/60 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-zinc-100">Galeria e Imagens do Produto</h4>
              <Badge variant="outline" className="text-xs bg-zinc-800/80 text-zinc-300 border-zinc-700">
                {activeItemsCount} {activeItemsCount === 1 ? "foto" : "fotos"}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Ciclo de 2 Estágios: Upload temporário imediato + Persistência definitiva ao salvar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCameraOpen(true)}
            disabled={disabled}
            className="gap-1.5 border-emerald-600/40 text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Tirar Foto</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Adicionar Imagens
          </Button>
        </div>
      </div>

      {/* Zona de Drop & Upload */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/10 scale-[1.01]"
            : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/30"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="p-3 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
            <Upload className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="text-sm font-medium text-zinc-200">
            Arraste imagens ou <span className="text-emerald-400 underline">clique para selecionar</span>
          </div>
          <p className="text-xs text-zinc-500">
            Formatos suportados: JPG, PNG, WEBP, GIF (Até 10MB por imagem). Múltiplos arquivos permitidos.
          </p>
        </div>
      </div>

      {/* Grid de Imagens */}
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1">
          {items.map((item, index) => {
            const isPrimary = item.isPrimary;
            const isMarkedForDeletion = item.markedForDeletion;
            const isUploading = item.status === "UPLOADING";
            const isFailed = item.status === "FAILED";

            return (
              <div
                key={item.id}
                className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all ${
                  isMarkedForDeletion
                    ? "border-rose-900/60 bg-rose-950/20 opacity-60"
                    : isPrimary
                    ? "border-amber-500/80 bg-zinc-900 shadow-md ring-1 ring-amber-500/30"
                    : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700"
                }`}
              >
                {/* Imagem Thumbnail */}
                <div className="relative aspect-square w-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                  <ProductImageWithSkeleton
                    src={item.previewUrl}
                    alt={item.filename}
                    aspectRatio="square"
                    className={isMarkedForDeletion ? "grayscale" : "group-hover:scale-105"}
                  />

                  {/* Overlays de Status / Exclusão */}
                  {isMarkedForDeletion && (
                    <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center text-rose-300">
                      <Trash2 className="w-6 h-6 mb-1" />
                      <span className="text-xs font-semibold">Marcada p/ Excluir</span>
                    </div>
                  )}

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-2 text-zinc-200">
                      <Clock className="w-5 h-5 animate-spin text-emerald-400 mb-1" />
                      <span className="text-[11px] font-medium">Enviando ({item.uploadProgress || 20}%)...</span>
                    </div>
                  )}

                  {isFailed && (
                    <div className="absolute inset-0 bg-rose-950/90 flex flex-col items-center justify-center p-2 text-rose-300">
                      <AlertTriangle className="w-5 h-5 mb-1" />
                      <span className="text-[11px] font-medium">Erro no envio</span>
                    </div>
                  )}

                  {/* Badges de Topo */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {isPrimary && !isMarkedForDeletion && (
                      <Badge className="bg-amber-500 text-zinc-950 text-[10px] font-bold px-1.5 py-0.5 shadow flex items-center gap-1 border-none">
                        <Star className="w-3 h-3 fill-current" /> Principal
                      </Badge>
                    )}

                    <Badge
                      variant="secondary"
                      className="bg-zinc-950/80 backdrop-blur-xs text-zinc-300 text-[10px] px-1.5 py-0.5 border border-zinc-800"
                    >
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Botão de Zoom / Detalhes */}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomItem(item)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100"
                    title="Visualizar em tamanho grande"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card Footer / Metadados e Controles */}
                <div className="p-2.5 flex flex-col justify-between flex-1 gap-2 bg-zinc-900 border-t border-zinc-800/80 text-xs">
                  <div>
                    <div className="font-medium text-zinc-200 truncate" title={item.filename}>
                      {item.filename}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-0.5">
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span className="capitalize">
                        {item.source === "CAMERA" ? "📷 Câmera" : item.isPersisted ? "💾 Salva" : "⚡ Temp"}
                      </span>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                    {/* Reordenação */}
                    <div className="flex items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                        disabled={disabled || index === 0 || isMarkedForDeletion}
                        onClick={() => handleMoveOrder(index, "left")}
                        title="Mover para a esquerda"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                        disabled={disabled || index === items.length - 1 || isMarkedForDeletion}
                        onClick={() => handleMoveOrder(index, "right")}
                        title="Mover para a direita"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Tornar Principal e Excluir */}
                    <div className="flex items-center gap-1">
                      {!isMarkedForDeletion && !isPrimary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10"
                          disabled={disabled}
                          onClick={() => handleSetPrimary(item.id)}
                          title="Definir como foto principal"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {isMarkedForDeletion ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2 text-rose-300 border-rose-800 hover:bg-rose-950/40 gap-1"
                          onClick={() => handleDeleteItem(item)}
                          title="Desfazer exclusão"
                        >
                          <Undo2 className="w-3 h-3" /> Desfazer
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
                          disabled={disabled}
                          onClick={() => handleDeleteItem(item)}
                          title={item.isPersisted ? "Marcar para exclusão" : "Remover foto"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center rounded-xl bg-zinc-950/30 border border-zinc-800/60 text-zinc-500 text-xs">
          Nenhuma imagem adicionada para este produto ainda.
        </div>
      )}

      {/* Modal de Câmera */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Modal de Zoom / Visualizador */}
      {previewZoomItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200 text-sm">{previewZoomItem.filename}</span>
                {previewZoomItem.isPrimary && (
                  <Badge className="bg-amber-500 text-zinc-950 text-xs font-bold gap-1">
                    <Star className="w-3 h-3 fill-current" /> Principal
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewZoomItem(null)}
                className="text-zinc-400 hover:text-zinc-100"
              >
                Fechar
              </Button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center min-h-[360px] max-h-[70vh] overflow-hidden">
              <ProductImageWithSkeleton
                src={previewZoomItem.previewUrl}
                alt={previewZoomItem.filename}
                aspectRatio="custom"
                containerClassName="w-full h-full min-h-[300px] bg-black"
                className="max-h-[60vh] w-auto object-contain rounded"
              />
            </div>

            <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <div>
                Tamanho: <span className="text-zinc-200">{formatFileSize(previewZoomItem.fileSize)}</span> | Tipo:{" "}
                <span className="text-zinc-200">{previewZoomItem.mimeType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Bucket: <code className="text-emerald-400">{previewZoomItem.bucketId}</code></span>
                <span>Origem: <strong className="text-zinc-200">{previewZoomItem.source}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
