import { cn } from "@/lib/utils";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  hasActions?: boolean;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  hasActions = true,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "skeleton h-3 rounded",
              i === 0 ? "w-24" : i === cols - 1 && hasActions ? "w-16 ml-auto" : "flex-1"
            )}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 p-4 border-b border-border/50"
          style={{ animationDelay: `${rowIdx * 80}ms` }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={cn(
                "skeleton rounded",
                colIdx === 0
                  ? "h-3 w-24"
                  : colIdx === cols - 1 && hasActions
                  ? "h-6 w-16 ml-auto rounded-full"
                  : "h-3 flex-1"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 space-y-3", className)}>
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-7 w-36 rounded" />
        </div>
        <div className="skeleton h-11 w-11 rounded-xl" />
      </div>
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}
