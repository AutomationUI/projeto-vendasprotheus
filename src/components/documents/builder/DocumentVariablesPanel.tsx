import React, { useState } from "react";
import { 
  Variable, 
  Search, 
  Copy, 
  Check, 
  Plus, 
  Info, 
  Sparkles, 
  Users, 
  FileText, 
  Calculator, 
  UserCheck, 
  Building2, 
  Calendar,
  Eye
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import { DOCUMENT_VARIABLES, getVariableTheme, interpolateDocumentVariables } from "@/lib/document-variables";
import { createVariableDragGhost } from "@/lib/drag-variable-utils";
import { DocumentBlock, QuoteDocumentData } from "@/types/document-template";

interface DocumentVariablesPanelProps {
  selectedBlock: DocumentBlock | null;
  onInjectVariable: (tag: string) => void;
  previewData?: QuoteDocumentData;
  selectedVariableTag?: string | null;
  onSelectVariableTag?: (tag: string) => void;
}

export function DocumentVariablesPanel({
  selectedBlock,
  onInjectVariable,
  previewData,
  selectedVariableTag,
  onSelectVariableTag,
}: DocumentVariablesPanelProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  const categories = [
    { id: "all", label: "Todas", icon: Variable, count: DOCUMENT_VARIABLES.length },
    { id: "cliente", label: "Cliente", icon: Users, count: DOCUMENT_VARIABLES.filter(v => v.category === "cliente").length },
    { id: "orcamento", label: "Orçamento", icon: FileText, count: DOCUMENT_VARIABLES.filter(v => v.category === "orcamento").length },
    { id: "totais", label: "Totais", icon: Calculator, count: DOCUMENT_VARIABLES.filter(v => v.category === "totais").length },
    { id: "vendedor", label: "Vendedor", icon: UserCheck, count: DOCUMENT_VARIABLES.filter(v => v.category === "vendedor").length },
    { id: "empresa", label: "Empresa", icon: Building2, count: DOCUMENT_VARIABLES.filter(v => v.category === "empresa").length },
    { id: "sistema", label: "Sistema", icon: Calendar, count: DOCUMENT_VARIABLES.filter(v => v.category === "sistema").length },
  ];

  const filteredVariables = DOCUMENT_VARIABLES.filter(v => {
    const matchesCategory = selectedCategory === "all" || v.category === selectedCategory;
    const matchesSearch = 
      v.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.example.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyTag = (tag: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    copyToClipboard(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
    toast({
      title: "Tag Copiada!",
      description: `Código ${tag} copiado para a área de transferência.`,
    });
  };

  const handleItemClick = (tag: string) => {
    onInjectVariable(tag);
    if (onSelectVariableTag) {
      onSelectVariableTag(tag);
    }
  };

  return (
    <div className="flex flex-col space-y-3 flex-1 h-full min-h-[450px]">
      {/* ── STATUS DO BLOCO SELECIONADO / INSTRUÇÕES ── */}
      <div className="shrink-0 space-y-3">
        {selectedBlock ? (
          <div className="p-2.5 bg-indigo-50/90 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs shadow-2xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>Bloco Selecionado</span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                {selectedBlock.type}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 font-medium truncate mb-1">
              "{selectedBlock.title || selectedBlock.type}"
            </p>
            <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Clique na tag para injetar ou arraste para o campo.</span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 shadow-2xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200 mb-1">
              <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Como usar as Variáveis:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Selecione um bloco e <strong>clique em uma tag</strong> para inserção rápida ou arraste a tag para qualquer campo de texto.
            </p>
          </div>
        )}

        {/* ── CAMPO DE BUSCA ── */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar tag (ex: nome, total, cnpj)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 pr-3 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-medium"
            >
              Limpar
            </button>
          )}
        </div>

        {/* ── ABAS DE CATEGORIAS ── */}
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{cat.label}</span>
                <span className={`text-[9px] px-1 rounded-full ${isSelected ? "bg-indigo-700 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── LISTA DE VARIÁVEIS COM ROLAGEM DEDICADA ── */}
      <div className="flex-1 min-h-[220px] overflow-y-auto space-y-1.5 pr-1">
        {filteredVariables.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            <Variable className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold">Nenhuma tag encontrada</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Tente outro termo de busca.</p>
          </div>
        ) : (
          filteredVariables.map((v) => {
            const isCopied = copiedTag === v.tag;
            const theme = getVariableTheme(v.tag);
            const isTagSelected = selectedVariableTag === v.tag;

            return (
              <div
                key={v.tag}
                draggable
                onDragStart={(e) => {
                  createVariableDragGhost(e, v.tag, v.label);
                  e.dataTransfer.setData("application/json", JSON.stringify(v));
                }}
                onClick={() => handleItemClick(v.tag)}
                className={`p-2 rounded-lg border transition-all group shadow-2xs select-none cursor-grab active:cursor-grabbing ${
                  isTagSelected
                    ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-offset-1"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
                title="Clique para injetar no campo focado ou destacar no layout"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${theme.bgColor} ${theme.textColor} ${theme.borderColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                        {v.tag}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 truncate">
                      {v.label}
                    </div>

                    <div className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                      <span className="text-slate-400 font-medium">Valor:</span>
                      <span className="italic text-slate-600 dark:text-slate-300 font-medium truncate max-w-[170px]">
                        {previewData ? interpolateDocumentVariables(v.tag, previewData) || v.example : v.example}
                      </span>
                    </div>
                  </div>

                  {/* Ações Rápidas: Injetar e Copiar */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-6 w-6 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-950"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyTag(v.tag, e);
                      }}
                      title="Copiar código da tag"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="default"
                      onMouseDown={(e) => e.preventDefault()}
                      className="h-6 w-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded shadow-2xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleItemClick(v.tag);
                      }}
                      title="Inserir tag no campo ou bloco"
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── RODAPÉ FIXO DE STATUS ── */}
      <div className="shrink-0 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span className="font-medium">{filteredVariables.length} tags categorizadas</span>
        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">clique para injetar</span>
      </div>
    </div>
  );
}
