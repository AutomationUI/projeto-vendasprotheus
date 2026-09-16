import React, { useState } from "react";
import { Image as ImageIcon, Eye, ChevronLeft, ChevronRight, Package, Layers } from "lucide-react";
import { ProductImageWithSkeleton } from "@/components/products/ProductImageWithSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type Order, type Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface OrderProductsGalleryProps {
  order: Order;
  products: Product[];
  showImages: boolean;
  onToggleShowImages: (show: boolean) => void;
  className?: string;
}

interface GalleryItem {
  itemIndex: number;
  codigo: string;
  produto: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  productMatch?: Product;
  imageUrl?: string;
  allImages: string[];
}

export const OrderProductsGallery: React.FC<OrderProductsGalleryProps> = ({
  order,
  products,
  showImages,
  onToggleShowImages,
  className,
}) => {
  const [selectedZoomItem, setSelectedZoomItem] = useState<GalleryItem | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Mapeia os itens do pedido com as fotos dos produtos do sistema
  const galleryItems: GalleryItem[] = (order.itens || []).map((item, idx) => {
    const matchedProd = products.find(
      (p) => p.codigo.toLowerCase() === item.codigo.toLowerCase() || p.nome.toLowerCase() === item.produto.toLowerCase()
    );

    let imageUrl = matchedProd?.primaryImageUrl;
    let allImages: string[] = [];

    if (matchedProd?.images && matchedProd.images.length > 0) {
      allImages = matchedProd.images.map((img) => img.url).filter(Boolean);
      if (!imageUrl && allImages.length > 0) {
        imageUrl = allImages[0];
      }
    }

    if (imageUrl && !allImages.includes(imageUrl)) {
      allImages.unshift(imageUrl);
    }

    return {
      itemIndex: idx,
      codigo: item.codigo,
      produto: item.produto,
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
      total: item.total,
      productMatch: matchedProd,
      imageUrl,
      allImages,
    };
  });

  const itemsWithImageCount = galleryItems.filter((i) => Boolean(i.imageUrl)).length;

  const handleOpenZoom = (galleryItem: GalleryItem) => {
    setSelectedZoomItem(galleryItem);
    setActiveImageIndex(0);
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className={cn("rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 transition-all", className)}>
      {/* Header com Controle de Exibição */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Galeria de Produtos do Pedido
              </h4>
              <Badge variant="secondary" className="text-[10px] h-5 font-mono px-1.5">
                {itemsWithImageCount}/{galleryItems.length} com fotos
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Visualize as miniaturas centralizadas das mercadorias deste pedido
            </p>
          </div>
        </div>

        {/* Toggle de Visualização no Painel */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
            {showImages ? "Fotos Ativas" : "Fotos Ocultas"}
          </span>
          <Switch
            checked={showImages}
            onCheckedChange={onToggleShowImages}
            aria-label="Alternar exibição de fotos no painel de pedidos"
          />
        </div>
      </div>

      {/* Conteúdo: Galeria de Miniaturas x Banner de Estado Oculto */}
      {showImages ? (
        <div className="pt-3">
          {galleryItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {galleryItems.map((item) => (
                <div
                  key={item.itemIndex}
                  onClick={() => handleOpenZoom(item)}
                  className="group relative flex flex-col rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer"
                >
                  {/* Container da Imagem com Skeleton Integrado */}
                  <div className="relative aspect-square w-full bg-slate-950/90 overflow-hidden">
                    <ProductImageWithSkeleton
                      src={item.imageUrl}
                      alt={item.produto}
                      aspectRatio="square"
                      className="group-hover:scale-105 transition-transform duration-300"
                      imagesCount={item.allImages.length}
                      fallbackIcon={
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <Package className="w-5 h-5 opacity-60" />
                          <span className="text-[9px] font-mono">Sem foto</span>
                        </div>
                      }
                    />

                    {/* Quantity Badge */}
                    <Badge className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold px-1.5 py-0.5 border-none">
                      Qtd: {item.quantidade}
                    </Badge>

                    {/* Hover Zoom Indicator */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <div className="flex items-center gap-1 bg-blue-600/90 backdrop-blur-xs px-2 py-1 rounded text-[11px] font-semibold shadow-lg">
                        <Eye className="w-3.5 h-3.5" />
                        Ampliar
                      </div>
                    </div>
                  </div>

                  {/* Informações do Item */}
                  <div className="p-2 flex flex-col justify-between flex-1 bg-white dark:bg-slate-900">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {item.codigo}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1 mt-0.5" title={item.produto}>
                        {item.produto}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{fmt(item.precoUnitario)}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{fmt(item.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Este pedido não possui produtos cadastrados.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>As fotos dos produtos estão oculta no painel de pedidos.</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleShowImages(true)}
            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 h-7"
          >
            Mostrar Fotos
          </Button>
        </div>
      )}

      {/* Lightbox / Zoom Modal do Produto selecionado */}
      <Dialog open={!!selectedZoomItem} onOpenChange={(open) => !open && setSelectedZoomItem(null)}>
        <DialogContent className="max-w-xl bg-slate-950 text-white border-slate-800 p-0 overflow-hidden">
          {selectedZoomItem && (
            <div className="flex flex-col">
              <DialogHeader className="p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-blue-400 font-bold">
                      {selectedZoomItem.codigo}
                    </span>
                    <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">
                      Qtd: {selectedZoomItem.quantidade} un.
                    </Badge>
                  </div>
                  <DialogTitle className="text-base font-bold text-white mt-1">
                    {selectedZoomItem.produto}
                  </DialogTitle>
                </div>
              </DialogHeader>

              {/* Visualizador Principal com Navegação de Múltiplas Fotos */}
              <div className="relative aspect-square w-full bg-black flex items-center justify-center overflow-hidden">
                <ProductImageWithSkeleton
                  src={
                    selectedZoomItem.allImages.length > 0
                      ? selectedZoomItem.allImages[activeImageIndex]
                      : selectedZoomItem.imageUrl
                  }
                  alt={selectedZoomItem.produto}
                  aspectRatio="square"
                  containerClassName="w-full h-full bg-black"
                  className="object-contain max-h-[70vh]"
                  fallbackIcon={
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <Package className="w-12 h-12" />
                      <span className="text-xs">Nenhuma foto cadastrada para este produto</span>
                    </div>
                  }
                />

                {/* Se existirem múltiplas imagens, exibe setas de navegação */}
                {selectedZoomItem.allImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) =>
                          prev === 0 ? selectedZoomItem.allImages.length - 1 : prev - 1
                        );
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-20"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) =>
                          prev === selectedZoomItem.allImages.length - 1 ? 0 : prev + 1
                        );
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors z-20"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 px-2.5 py-1 rounded-full text-xs font-mono text-zinc-300 z-20">
                      {activeImageIndex + 1} / {selectedZoomItem.allImages.length}
                    </div>
                  </>
                )}
              </div>

              {/* Carrossel de Miniaturas do Produto no Modal */}
              {selectedZoomItem.allImages.length > 1 && (
                <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2 overflow-x-auto">
                  {selectedZoomItem.allImages.map((imgUrl, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={cn(
                        "relative w-12 h-12 rounded overflow-hidden border-2 transition-all shrink-0",
                        activeImageIndex === i
                          ? "border-blue-500 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <img src={imgUrl} alt={`Miniatura ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Rodapé do Modal com Resumo de Valores */}
              <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400">Preço Unitário: </span>
                  <span className="font-semibold text-zinc-200">{fmt(selectedZoomItem.precoUnitario)}</span>
                </div>
                <div>
                  <span className="text-zinc-400">Total do Item: </span>
                  <span className="font-bold text-emerald-400 text-sm">{fmt(selectedZoomItem.total)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
