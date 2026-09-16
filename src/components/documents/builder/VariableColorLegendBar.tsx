import React from "react";
import { 
  Variable, 
  Users, 
  FileText, 
  Calculator, 
  UserCheck, 
  Building2, 
  Calendar,
  Layers,
  Sparkles,
  MousePointerClick
} from "lucide-react";
import { VARIABLE_CATEGORIES_CONFIG, VariableUsageLocation } from "@/lib/document-variables";

interface VariableColorLegendBarProps {
  usages: VariableUsageLocation[];
  activeCategoryFilter: string | null;
  onSelectCategoryFilter: (category: string | null) => void;
  selectedVariableTag?: string | null;
  onClearSelection?: () => void;
  highlightVariables: boolean;
  onToggleHighlightVariables: (enabled: boolean) => void;
}

export function VariableColorLegendBar({
  usages,
  activeCategoryFilter,
  onSelectCategoryFilter,
  selectedVariableTag,
  onClearSelection,
  highlightVariables,
  onToggleHighlightVariables,
}: VariableColorLegendBarProps) {
  const categoryIcons: Record<string, any> = {
    cliente: Users,
    orcamento: FileText,
    totais: Calculator,
    vendedor: UserCheck,
    empresa: Building2,
    sistema: Calendar,
  };

  // Calcular contagens de usos por categoria
  const countsByCategory: Record<string, number> = {
    cliente: 0,
    orcamento: 0,
    totais: 0,
    vendedor: 0,
    empresa: 0,
    sistema: 0,
  };

  usages.forEach((u) => {
    if (u.tag.includes("cliente.")) countsByCategory.cliente++;
    else if (u.tag.includes("totais.") || u.tag.includes(".total") || u.tag.includes(".subtotal") || u.tag.includes(".desconto") || u.tag.includes(".frete") || u.tag.includes(".impostos") || u.tag.includes(".margem")) countsByCategory.totais++;
    else if (u.tag.includes("vendedor.")) countsByCategory.vendedor++;
    else if (u.tag.includes("empresa.")) countsByCategory.empresa++;
    else if (u.tag.includes("data.") || u.tag.includes("sistema.")) countsByCategory.sistema++;
    else countsByCategory.orcamento++;
  });

  const categories = Object.keys(VARIABLE_CATEGORIES_CONFIG) as Array<keyof typeof VARIABLE_CATEGORIES_CONFIG>;

  if (!highlightVariables) {
    return (
      <div className="w-full max-w-[210mm] bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between text-xs mb-3">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Variable className="w-4 h-4 text-indigo-600" />
          <span>Mapeamento de Variáveis Dinâmicas</span>
          <span className="text-[11px] text-slate-400">({usages.length} pontos mapeados)</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleHighlightVariables(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 transition-colors border border-indigo-200 dark:border-indigo-800 shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Destacar Variáveis no Layout</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[210mm] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-3 rounded-xl border-2 border-indigo-300 dark:border-indigo-700 shadow-md mb-3 space-y-2.5 animate-in fade-in duration-150">
      {/* Barra de Cabeçalho com Status e Instrução de Seleção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping inline-block" />
          <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>Legenda de Cores das Variáveis</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-200 font-semibold">
              {usages.length} tags ativas
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
            <MousePointerClick className="w-3.5 h-3.5" />
            Clique em qualquer campo colorido para selecioná-lo no inspetor
          </span>
          <button
            type="button"
            onClick={() => onToggleHighlightVariables(false)}
            className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Ocultar Destaque
          </button>
        </div>
      </div>

      {/* Chips Clicáveis por Categoria de Cores */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectCategoryFilter(null)}
          className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all border ${
            !activeCategoryFilter
              ? "bg-slate-900 text-white border-slate-900 shadow-2xs dark:bg-white dark:text-slate-900"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
          }`}
        >
          Todas ({usages.length})
        </button>

        {categories.map((catKey) => {
          const cfg = VARIABLE_CATEGORIES_CONFIG[catKey];
          const Icon = categoryIcons[catKey] || Layers;
          const isFilterActive = activeCategoryFilter === catKey;
          const count = countsByCategory[catKey] || 0;

          return (
            <button
              key={catKey}
              type="button"
              onClick={() => onSelectCategoryFilter(isFilterActive ? null : catKey)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                cfg.badgeBg
              } ${cfg.badgeText} ${cfg.badgeBorder} ${
                isFilterActive ? `ring-2 ring-indigo-600 font-bold scale-[1.03] shadow-xs` : cfg.hoverBg
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
              <Icon className="w-3 h-3" />
              <span>{cfg.label}</span>
              <span className="text-[10px] px-1.5 rounded-full bg-white/70 dark:bg-black/30 font-mono">
                {count}
              </span>
            </button>
          );
        })}

        {selectedVariableTag && (
          <div className="ml-auto flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-500">Selecionada:</span>
            <code className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-200">
              {selectedVariableTag}
            </code>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
