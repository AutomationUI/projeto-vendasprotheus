import React from "react";
import { Magnet, Columns, Check, ArrowRightLeft, AlignVerticalJustifyCenter } from "lucide-react";

export interface SnapGuide {
  id: string;
  type: "vertical" | "horizontal";
  positionPercent?: number; // 0 a 100%
  positionPx?: number; // pixels a partir do topo
  label: string;
  sublabel?: string;
  isCenter?: boolean;
  color?: "indigo" | "emerald" | "cyan" | "amber";
  sourceBlockTitle?: string;
}

export interface SnappingGuidesOverlayProps {
  snappingEnabled: boolean;
  isResizing: boolean;
  isDragging: boolean;
  activeSnapGuides: SnapGuide[];
  dragOverIndex: number | null;
  totalBlocks: number;
  pageMarginMm: number;
  gridColumns?: number[]; // [20, 25, 33.333, 50, 66.666, 75, 80]
  canvasHeightPx?: number;
}

export const SnappingGuidesOverlay: React.FC<SnappingGuidesOverlayProps> = ({
  snappingEnabled,
  isResizing,
  isDragging,
  activeSnapGuides,
  dragOverIndex,
  totalBlocks,
  pageMarginMm,
  gridColumns = [25, 33.333, 50, 66.666, 75],
}) => {
  if (!snappingEnabled) return null;
  if (!isResizing && !isDragging && activeSnapGuides.length === 0) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-30 overflow-visible"
      style={{
        padding: `${pageMarginMm}mm`,
      }}
    >
      <div className="relative w-full h-full">
        {/* Grade de Alinhamento Sutil (Exibida durante arraste ou redimensionamento) */}
        {(isResizing || isDragging) && (
          <div className="absolute inset-0 flex justify-between pointer-events-none opacity-40">
            {gridColumns.map((colPercent) => {
              const isCenter = Math.abs(colPercent - 50) < 0.5;
              const hasActiveGuide = activeSnapGuides.some(
                g => g.type === "vertical" && g.positionPercent !== undefined && Math.abs(g.positionPercent - colPercent) < 0.6
              );

              // Não sobrepor se já houver uma guia ativa nessa posição
              if (hasActiveGuide) return null;

              return (
                <div
                  key={`grid-line-${colPercent}`}
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${colPercent}%` }}
                >
                  <div 
                    className={`h-full border-r ${
                      isCenter 
                        ? "border-indigo-400/50 border-dashed" 
                        : "border-slate-300 dark:border-slate-700/60 border-dotted"
                    }`} 
                  />
                  {/* Marcador superior da coluna da grade */}
                  <div className="absolute -top-3 -translate-x-1/2 text-[8px] font-mono text-slate-400 select-none bg-white/90 dark:bg-slate-900/90 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-800 shadow-2xs">
                    {Math.round(colPercent)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Linhas de Encaixe Ativas (Snapping Guides Verticais e Horizontais) */}
        {activeSnapGuides.map((guide) => {
          if (guide.type === "vertical" && guide.positionPercent !== undefined) {
            const isCenter = guide.isCenter || Math.abs(guide.positionPercent - 50) < 0.5;
            
            return (
              <div
                key={guide.id}
                className="absolute top-0 bottom-0 pointer-events-none z-40 transition-all duration-75"
                style={{ left: `${guide.positionPercent}%` }}
              >
                {/* Linha Vertical com Efeito Magnético Luminoso */}
                <div 
                  className={`h-full border-r-2 ${
                    isCenter 
                      ? "border-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.7)]" 
                      : "border-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.7)]"
                  }`} 
                />

                {/* Badge Superior Fixo da Guia Magnética */}
                <div className="absolute -top-6 -translate-x-1/2 flex flex-col items-center">
                  <div 
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-xl whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 ${
                      isCenter ? "bg-cyan-600 ring-2 ring-cyan-300" : "bg-indigo-600 ring-2 ring-indigo-300"
                    }`}
                  >
                    <Magnet className="w-2.5 h-2.5 animate-pulse" />
                    <span>{guide.label}</span>
                    {guide.sublabel && (
                      <span className="opacity-80 text-[9px] font-normal hidden sm:inline">
                        • {guide.sublabel}
                      </span>
                    )}
                  </div>
                  {/* Seta / Âncora apontando para a linha */}
                  <div 
                    className={`w-0 h-0 border-x-4 border-x-transparent border-t-4 ${
                      isCenter ? "border-t-cyan-600" : "border-t-indigo-600"
                    }`} 
                  />
                </div>

                {/* Marcador Inferior de Fixação */}
                <div className="absolute -bottom-2 -translate-x-1/2 w-2 h-2 rounded-full bg-indigo-600 shadow-md ring-2 ring-white" />
              </div>
            );
          }

          if (guide.type === "horizontal" && guide.positionPx !== undefined) {
            return (
              <div
                key={guide.id}
                className="absolute left-0 right-0 pointer-events-none z-40 transition-all duration-75"
                style={{ top: `${guide.positionPx}px` }}
              >
                {/* Linha Horizontal com Efeito Magnético Luminoso */}
                <div className="w-full border-b-2 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />

                {/* Badge Lateral da Guia Horizontal */}
                <div className="absolute -left-2 -translate-y-1/2 flex items-center">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-600 shadow-xl whitespace-nowrap ring-2 ring-emerald-300 animate-in fade-in duration-100">
                    <AlignVerticalJustifyCenter className="w-2.5 h-2.5" />
                    <span>{guide.label}</span>
                    {guide.sublabel && (
                      <span className="opacity-85 text-[9px] font-normal">
                        ({guide.sublabel})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
