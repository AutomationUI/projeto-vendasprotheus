import React from "react";
import { getVariableTheme, getVariableCategory, VARIABLE_CATEGORIES_CONFIG } from "@/lib/document-variables";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createVariableDragGhost } from "@/lib/drag-variable-utils";

export interface VariableHighlightBadgeProps {
  tag: string;
  value: React.ReactNode;
  blockId?: string;
  fieldName?: string;
  fieldLabel?: string;
  highlightVariables?: boolean;
  selectedVariableTag?: string | null;
  activeCategoryFilter?: string | null;
  onSelectFieldOrVariable?: (info: { blockId?: string; fieldName?: string; variableTag?: string }) => void;
  className?: string;
  inline?: boolean;
}

export function VariableHighlightBadge({
  tag,
  value,
  blockId,
  fieldName,
  fieldLabel,
  highlightVariables = false,
  selectedVariableTag,
  activeCategoryFilter,
  onSelectFieldOrVariable,
  className = "",
  inline = true,
}: VariableHighlightBadgeProps) {
  if (!highlightVariables) {
    return <>{value}</>;
  }

  const category = getVariableCategory(tag);
  const theme = getVariableTheme(tag);

  const isCategoryFiltered = activeCategoryFilter && activeCategoryFilter !== "all" && activeCategoryFilter !== category;
  const isSelected = selectedVariableTag === tag;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectFieldOrVariable) {
      onSelectFieldOrVariable({
        blockId,
        fieldName,
        variableTag: tag,
      });
    }
  };

  const badgeContent = (
    <span
      draggable
      onDragStart={(e) => createVariableDragGhost(e, tag)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      title={`Variável: ${tag} (${theme.label}) - Arraste para reposicionar ou clique para selecionar`}
      className={`relative group/var inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-all cursor-grab active:cursor-grabbing select-none font-medium border max-w-full overflow-hidden ${
        theme.badgeBg
      } ${theme.badgeText} ${theme.badgeBorder} ${
        isSelected ? "ring-2 ring-offset-1 ring-indigo-600 scale-[1.02] shadow-sm font-bold" : "hover:shadow-xs hover:scale-[1.01]"
      } ${isCategoryFiltered ? "opacity-30 grayscale-[40%]" : "opacity-100"} ${className}`}
    >
      {/* Ponto / Chip de Identificação da Categoria */}
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor} shrink-0 animate-pulse`} />

      {/* Rótulo da Tag em modo destaque */}
      <span className="text-[9px] font-mono opacity-75 font-semibold bg-white/70 dark:bg-black/30 px-1 py-0.2 rounded border border-black/5 truncate max-w-[85px] shrink-0">
        {tag.replace(/^\{\{|\}\}$/g, "")}
      </span>

      {/* Valor Resolvido */}
      <span className="tracking-normal truncate min-w-0 max-w-[140px]">{value}</span>
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs p-2.5 z-50 max-w-xs shadow-xl bg-slate-900 text-white border-slate-700">
        <span className="block space-y-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-indigo-300 font-bold">{tag}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${theme.chipBg}`}>
              {theme.label}
            </span>
          </span>
          {fieldLabel && (
            <span className="block text-[10px] text-slate-300">
              Campo: <strong>{fieldLabel}</strong>
            </span>
          )}
          <span className="block text-[10px] text-emerald-400 font-medium pt-0.5">
            💡 Clique para abrir e editar este campo no inspetor
          </span>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Função utilitária para renderizar textos livres substituindo tags {{...}} por VariableHighlightBadge
 */
export function renderRichTextWithVariables({
  template = "",
  variablesMap,
  blockId,
  fieldName = "content",
  highlightVariables = false,
  selectedVariableTag,
  activeCategoryFilter,
  onSelectFieldOrVariable,
}: {
  template: string;
  variablesMap: Record<string, string>;
  blockId?: string;
  fieldName?: string;
  highlightVariables?: boolean;
  selectedVariableTag?: string | null;
  activeCategoryFilter?: string | null;
  onSelectFieldOrVariable?: (info: { blockId?: string; fieldName?: string; variableTag?: string }) => void;
}): React.ReactNode {
  if (!template) return "";

  if (!highlightVariables) {
    let result = template;
    for (const [key, val] of Object.entries(variablesMap)) {
      result = result.split(key).join(val);
    }
    return result;
  }

  // Dividir a string mantendo as tags {{...}} como delimitadores
  const parts = template.split(/(\{\{[a-zA-Z0-9_.]+\}\})/g);

  return (
    <>
      {parts.map((part, index) => {
        if (/^\{\{[a-zA-Z0-9_.]+\}\}$/.test(part)) {
          const resolvedValue = variablesMap[part] || part;
          return (
            <VariableHighlightBadge
              key={index}
              tag={part}
              value={resolvedValue}
              blockId={blockId}
              fieldName={fieldName}
              highlightVariables={true}
              selectedVariableTag={selectedVariableTag}
              activeCategoryFilter={activeCategoryFilter}
              onSelectFieldOrVariable={onSelectFieldOrVariable}
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
