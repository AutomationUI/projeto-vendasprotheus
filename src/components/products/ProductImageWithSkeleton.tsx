import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductImageWithSkeletonProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: "video" | "square" | "thumb" | "custom";
  isLoadingParent?: boolean;
  fallbackIcon?: React.ReactNode;
  imagesCount?: number;
  showOverlayGradient?: boolean;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export const ProductImageWithSkeleton: React.FC<ProductImageWithSkeletonProps> = ({
  src,
  alt,
  className,
  containerClassName,
  aspectRatio = "video",
  isLoadingParent = false,
  fallbackIcon,
  imagesCount = 0,
  showOverlayGradient = false,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset local loading/error states when src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const aspectClass =
    aspectRatio === "video"
      ? "relative aspect-video w-full"
      : aspectRatio === "square"
      ? "relative aspect-square w-full"
      : aspectRatio === "thumb"
      ? "relative w-10 h-10 shrink-0"
      : "relative";

  const fallbackDataSvg =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2' ry='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>";

  // State 1: Parent is still fetching, or image is provided but image file buffer is loading in browser
  const showSkeleton = isLoadingParent || (Boolean(src) && !isLoaded && !hasError);

  return (
    <div
      className={cn(
        aspectClass,
        "bg-zinc-950/80 overflow-hidden flex items-center justify-center select-none",
        containerClassName
      )}
    >
      {/* Skeleton loader overlay */}
      {showSkeleton && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-900/90 p-2">
          <Skeleton className="w-full h-full rounded-none bg-zinc-800/80 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 text-zinc-500 pointer-events-none">
            <ImageIcon className="w-5 h-5 animate-bounce text-zinc-400" />
          </div>
        </div>
      )}

      {/* Actual Image */}
      {src && !hasError ? (
        <>
          <img
            src={src}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={(e) => {
              setHasError(true);
              setIsLoaded(true);
              (e.target as HTMLImageElement).src = fallbackDataSvg;
              if (onError) onError(e);
            }}
            className={cn(
              "w-full h-full object-cover transition-all duration-300",
              !isLoaded ? "opacity-0 scale-95" : "opacity-100 scale-100",
              className
            )}
          />

          {showOverlayGradient && isLoaded && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          )}

          {imagesCount > 1 && isLoaded && (
            <Badge
              variant="secondary"
              className="absolute bottom-2 right-2 text-[10px] bg-black/75 backdrop-blur-xs text-white border-white/20 z-20"
            >
              📷 +{imagesCount - 1} foto{imagesCount > 2 ? "s" : ""}
            </Badge>
          )}
        </>
      ) : (
        /* Fallback placeholder when no image src or error */
        <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 p-2 border border-zinc-800/60">
          {fallbackIcon || (
            <div className="flex flex-col items-center gap-1 text-muted-foreground/60">
              <Package className="w-6 h-6" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
