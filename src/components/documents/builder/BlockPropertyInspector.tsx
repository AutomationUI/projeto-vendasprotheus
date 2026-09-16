import React, { useState, useRef, useEffect } from "react";
import { 
  Sliders, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Variable,
  Palette,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Layers,
  ChevronDown,
  Check,
  Search,
  FileText,
  CreditCard,
  ShieldCheck,
  Building2,
  PanelRightClose,
  AlertTriangle,
  CheckCircle2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DocumentBlock, DocumentTemplatePreset, ButtonActionConfig } from "@/types/document-template";
import { DOCUMENT_VARIABLES } from "@/lib/document-variables";
import { getActiveDraggedVariableTag } from "@/lib/drag-variable-utils";
import { AppSettings } from "@/lib/settings-store";
import { ButtonActionInspector } from "./ButtonActionInspector";
import { updateBlockNameInLibrary } from "./block-library-store";

interface BlockPropertyInspectorProps {
  selectedBlock: DocumentBlock | null;
  onUpdateBlock: (updated: DocumentBlock) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: "up" | "down") => void;
  onDeselect: () => void;
  preset: DocumentTemplatePreset;
  onUpdatePreset: (updated: Partial<DocumentTemplatePreset>) => void;
  settings: AppSettings;
  highlightedField?: string | null;
  selectedVariableTag?: string | null;
  onOpenInternalEditor?: (block: DocumentBlock) => void;
  onSaveToLibrary?: (block: DocumentBlock) => void;
  onClosePanel?: () => void;
  isOverflowing?: boolean;
  onFixBlockOverflow?: (id: string) => void;
}

// Subcomponente reutilizável para Seleção Rápida de Variáveis
function VariablePickerButton({
  onSelectVariable,
  buttonLabel = "Inserir Variável",
  size = "sm"
}: {
  onSelectVariable: (tag: string) => void;
  buttonLabel?: string;
  size?: "sm" | "xs";
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = DOCUMENT_VARIABLES.filter(v => 
    v.label.toLowerCase().includes(search.toLowerCase()) || 
    v.tag.toLowerCase().includes(search.toLowerCase()) ||
    v.example.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          className={`h-6 text-[11px] gap-1 px-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-2xs font-medium`}
        >
          <Variable className="w-3 h-3" /> {buttonLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 space-y-2.5 z-50 bg-white dark:bg-slate-900 shadow-xl border-slate-200 dark:border-slate-800" align="end">
        <div>
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tags Dinâmicas Disponíveis</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Clique na tag desejada para inseri-la diretamente no campo.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar tag (ex: nome, total, frete)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 pr-2 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400">
              Nenhuma variável encontrada
            </div>
          ) : (
            filtered.map((v) => (
              <button
                key={v.tag}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelectVariable(v.tag);
                  setOpen(false);
                }}
                className="w-full text-left p-1.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 text-xs transition-colors flex items-center justify-between group"
              >
                <div className="overflow-hidden pr-2">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{v.label}</div>
                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 truncate">{v.tag}</div>
                </div>
                <span className="text-[9px] text-slate-400 group-hover:text-indigo-600 font-mono shrink-0">
                  + Inserir
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Campo de Textarea com Inserção Precisa no Cursor e Destaque Visual
function TextareaWithVariablePicker({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  description,
  isHighlighted = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  description?: string;
  isHighlighted?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isHighlighted && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      textareaRef.current?.focus();
    }
  }, [isHighlighted]);

  const handleInsert = (tag: string) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value ? `${value} ${tag}` : tag);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const nextVal = value.substring(0, start) + tag + value.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      const nextPos = start + tag.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const tag = e.dataTransfer.getData("application/document-variable-tag") || e.dataTransfer.getData("text/plain") || getActiveDraggedVariableTag();
    if (tag) {
      handleInsert(tag);
    }
  };

  const activeTag = getActiveDraggedVariableTag();

  return (
    <div 
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`space-y-1.5 p-2 rounded-lg transition-all relative ${
        isDragOver
          ? "bg-indigo-100/95 dark:bg-indigo-950/90 ring-4 ring-indigo-500/40 border-2 border-dashed border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.01]"
          : isHighlighted 
          ? "bg-indigo-50/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-offset-2 border border-indigo-300 dark:border-indigo-700 shadow-md" 
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isHighlighted && (
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping inline-block" />
          )}
          <Label className={`text-xs font-semibold ${isHighlighted || isDragOver ? "text-indigo-900 dark:text-indigo-200 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
            {label}
          </Label>
        </div>
        <VariablePickerButton onSelectVariable={handleInsert} />
      </div>

      {/* ── GHOST ELEMENT / TARGET BANNER DE ENCAIXE ── */}
      {isDragOver && (
        <div className="flex items-center gap-2 p-1.5 rounded bg-indigo-600 text-white font-mono text-[11px] font-bold shadow-lg shadow-indigo-500/40 border border-indigo-400 animate-in fade-in slide-in-from-top-1 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
          <span>Solte para encaixar {activeTag ? <span className="underline decoration-yellow-300 font-black">{activeTag}</span> : "variável"}</span>
        </div>
      )}

      {description && !isDragOver && (
        <p className="text-[10px] text-slate-400">{description}</p>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isDragOver ? `Encaixando ${activeTag || "variável"}...` : placeholder}
        rows={rows}
        className={`text-xs font-mono bg-white dark:bg-slate-900 resize-y transition-colors ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/40 focus-visible:ring-indigo-600 font-bold text-indigo-950 dark:text-indigo-100"
            : isHighlighted ? "border-indigo-400 bg-indigo-50/30 focus-visible:ring-indigo-600 font-bold" : ""
        }`}
      />
    </div>
  );
}

// Campo de Input com Inserção Precisa no Cursor e Destaque Visual
function InputWithVariablePicker({
  label,
  value,
  onChange,
  placeholder,
  description,
  isHighlighted = false,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  description?: string;
  isHighlighted?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (isHighlighted && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus();
    }
  }, [isHighlighted]);

  const handleInsert = (tag: string) => {
    const el = inputRef.current;
    if (!el) {
      onChange(value ? `${value} ${tag}` : tag);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const nextVal = value.substring(0, start) + tag + value.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      const nextPos = start + tag.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const tag = e.dataTransfer.getData("application/document-variable-tag") || e.dataTransfer.getData("text/plain") || getActiveDraggedVariableTag();
    if (tag) {
      handleInsert(tag);
    }
  };

  const activeTag = getActiveDraggedVariableTag();

  return (
    <div 
      ref={containerRef}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`space-y-1.5 p-2 rounded-lg transition-all relative ${
        isDragOver
          ? "bg-indigo-100/95 dark:bg-indigo-950/90 ring-4 ring-indigo-500/40 border-2 border-dashed border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.01]"
          : isHighlighted 
          ? "bg-indigo-50/90 dark:bg-indigo-950/60 ring-2 ring-indigo-500 ring-offset-2 border border-indigo-300 dark:border-indigo-700 shadow-md" 
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isHighlighted && (
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping inline-block" />
          )}
          <Label className={`text-xs font-semibold ${isHighlighted || isDragOver ? "text-indigo-900 dark:text-indigo-200 font-bold" : "text-slate-700 dark:text-slate-300"}`}>
            {label}
          </Label>
        </div>
        <VariablePickerButton onSelectVariable={handleInsert} />
      </div>

      {/* ── GHOST ELEMENT / TARGET BANNER DE ENCAIXE ── */}
      {isDragOver && (
        <div className="flex items-center gap-2 p-1.5 rounded bg-indigo-600 text-white font-mono text-[11px] font-bold shadow-lg shadow-indigo-500/40 border border-indigo-400 animate-in fade-in slide-in-from-top-1 duration-150">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
          <span>Solte para encaixar {activeTag ? <span className="underline decoration-yellow-300 font-black">{activeTag}</span> : "variável"}</span>
        </div>
      )}

      {description && !isDragOver && (
        <p className="text-[10px] text-slate-400">{description}</p>
      )}
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isDragOver ? `Encaixando ${activeTag || "variável"}...` : placeholder}
        className={`h-8 text-xs font-mono bg-white dark:bg-slate-900 transition-colors ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-900/40 focus-visible:ring-indigo-600 font-bold text-indigo-950 dark:text-indigo-100"
            : isHighlighted ? "border-indigo-400 bg-indigo-50/30 focus-visible:ring-indigo-600 font-bold" : ""
        }`}
      />
    </div>
  );
}

export function BlockPropertyInspector({
  selectedBlock,
  onUpdateBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onDeselect,
  preset,
  onUpdatePreset,
  settings: _settings,
  highlightedField,
  selectedVariableTag,
  onOpenInternalEditor,
  onSaveToLibrary,
  onClosePanel,
  isOverflowing = false,
  onFixBlockOverflow,
}: BlockPropertyInspectorProps) {
  const updateStyle = (key: keyof NonNullable<DocumentBlock["style"]>, value: any) => {
    if (!selectedBlock) return;
    onUpdateBlock({
      ...selectedBlock,
      style: {
        ...(selectedBlock.style || {}),
        [key]: value,
      }
    });
  };

  const toValidHex = (colorStr?: string, defaultHex = "#ffffff"): string => {
    if (!colorStr) return defaultHex;
    if (colorStr === "transparent") return "#ffffff";
    if (/^#[0-9a-fA-F]{6}$/.test(colorStr)) return colorStr;
    if (/^[0-9a-fA-F]{6}$/.test(colorStr)) return `#${colorStr}`;
    if (/^#[0-9a-fA-F]{3}$/.test(colorStr)) {
      return "#" + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2] + colorStr[3] + colorStr[3];
    }
    if (/^[0-9a-fA-F]{3}$/.test(colorStr)) {
      return "#" + colorStr[0] + colorStr[0] + colorStr[1] + colorStr[1] + colorStr[2] + colorStr[2];
    }
    return defaultHex;
  };

  const getDefaultColors = (type: string) => {
    const primary = preset?.colors?.primary || "#1e293b";
    const accent = preset?.colors?.accent || "#ea580c";
    
    switch (type) {
      case "header":
        return { bg: primary, text: "#ffffff" };
      case "footer":
        return { bg: "transparent", text: "#94a3b8" };
      case "button":
        return { bg: primary, text: "#ffffff" };
      case "banner":
        return { bg: primary, text: "#ffffff" };
      case "pix_payment":
        return { bg: "#f0fdf4", text: "#15803d" };
      case "commercial_terms":
        return { bg: "#f8fafc", text: "#334155" };
      default:
        return { bg: "#ffffff", text: "#0f172a" };
    }
  };

  const updateConfig = (key: string, value: any) => {
    if (!selectedBlock) return;
    onUpdateBlock({
      ...selectedBlock,
      config: {
        ...(selectedBlock.config || {}),
        [key]: value,
      }
    });
  };

  // Se nenhum bloco estiver selecionado, exibe propriedades gerais do modelo
  if (!selectedBlock) {
    return (
      <div className="space-y-6 p-4 max-h-[calc(100vh-140px)] flex-1 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Propriedades do Modelo
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono">
              Global
            </span>
            {onClosePanel && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                onClick={onClosePanel}
                title="Esconder painel direito"
              >
                <PanelRightClose className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Modelo</Label>
            <Input
              value={preset.name}
              onChange={(e) => onUpdatePreset({ name: e.target.value })}
              placeholder="Nome do layout"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição da Aplicação</Label>
            <Input
              value={preset.description}
              onChange={(e) => onUpdatePreset({ description: e.target.value })}
              placeholder="Ex: Utilizado para clientes corporativos"
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Arquétipo de Design</Label>
            <Select
              value={preset.archetype}
              onValueChange={(val: any) => onUpdatePreset({ archetype: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executivo">Executivo Premium (Faixa Nobre)</SelectItem>
                <SelectItem value="moderno">Modern Tech Clean (Badges)</SelectItem>
                <SelectItem value="tecnico">Industrial & Engenharia (NCM/IPI)</SelectItem>
                <SelectItem value="minimalista">Minimalista Editorial (Limpo)</SelectItem>
                <SelectItem value="classico">Clássico Corporativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipografia</Label>
              <Select
                value={preset.fontFamily || "sans"}
                onValueChange={(val: any) => onUpdatePreset({ fontFamily: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Sans-Serif (Moderna)</SelectItem>
                  <SelectItem value="serif">Serif (Editorial)</SelectItem>
                  <SelectItem value="mono">Monospace (Técnica)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cantos (Radius)</Label>
              <Select
                value={preset.radius || "md"}
                onValueChange={(val: any) => onUpdatePreset({ radius: val })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Reto (0px)</SelectItem>
                  <SelectItem value="sm">Suave (4px)</SelectItem>
                  <SelectItem value="md">Médio (8px)</SelectItem>
                  <SelectItem value="lg">Arredondado (12px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Cores Globais do Modelo</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-1.5 border rounded bg-slate-50 dark:bg-slate-800">
                <input
                  type="color"
                  value={toValidHex(preset.colors.primary, "#1e293b")}
                  onChange={(e) => onUpdatePreset({
                    colors: { ...preset.colors, primary: e.target.value }
                  })}
                  className="w-6 h-6 rounded cursor-pointer p-0 border-0"
                />
                <span className="text-[11px] font-medium">Primária</span>
              </div>

              <div className="flex items-center gap-2 p-1.5 border rounded bg-slate-50 dark:bg-slate-800">
                <input
                  type="color"
                  value={toValidHex(preset.colors.accent, "#ea580c")}
                  onChange={(e) => onUpdatePreset({
                    colors: { ...preset.colors, accent: e.target.value }
                  })}
                  className="w-6 h-6 rounded cursor-pointer p-0 border-0"
                />
                <span className="text-[11px] font-medium">Destaque</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-[11px] leading-relaxed">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            💡 Dica de Edição:
          </p>
          Clique em qualquer elemento do documento no centro da tela para abrir o painel de propriedades detalhadas desse bloco específico.
        </div>
      </div>
    );
  }

  // Bloco Selecionado
  return (
    <div className="space-y-5 p-4 max-h-[calc(100vh-140px)] flex-1 overflow-y-auto">
      {/* CARD DE ALERTA DE TRANSBORDO / TAMANHO FORA DO A4 */}
      {isOverflowing && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse" />
            <span>Alerta de Tamanho do Documento</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
            Este componente excede a largura útil da folha A4. Ele pode ser cortado na geração do PDF ou na impressão.
          </p>
          {onFixBlockOverflow && (
            <Button
              type="button"
              size="sm"
              className="w-full h-7 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
              onClick={() => onFixBlockOverflow(selectedBlock.id)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Ajustar para Largura A4 (100%)
            </Button>
          )}
        </div>
      )}
      {/* Cabeçalho do Bloco com Ações Rápidas */}
      <div className="flex items-center justify-between pb-3 border-b">
        <div className="overflow-hidden">
          <span className="text-[10px] uppercase font-bold text-indigo-600 block tracking-wider">
            Bloco: {selectedBlock.type}
          </span>
          <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
            {selectedBlock.title || selectedBlock.type}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-indigo-600"
            onClick={() => onMoveBlock(selectedBlock.id, "up")}
            title="Mover para Cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-indigo-600"
            onClick={() => onMoveBlock(selectedBlock.id, "down")}
            title="Mover para Baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-indigo-600"
            onClick={() => onDuplicateBlock(selectedBlock.id)}
            title="Duplicar Bloco"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDeleteBlock(selectedBlock.id)}
            title="Excluir Bloco"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          {onClosePanel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-0.5"
              onClick={onClosePanel}
              title="Esconder painel direito"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── IDENTIFICAÇÃO DO BLOCO ── */}
      <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex items-center justify-between">
          <Label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
            Nome / Título do Bloco
          </Label>
          {selectedBlock.isReusable && (
            <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
              Sincronizado na Biblioteca
            </span>
          )}
        </div>
        <Input
          type="text"
          value={selectedBlock.title || ""}
          onChange={(e) => {
            const newTitle = e.target.value;
            onUpdateBlock({ ...selectedBlock, title: newTitle });
            if (selectedBlock.libraryBlockId || selectedBlock.isReusable) {
              updateBlockNameInLibrary(selectedBlock.libraryBlockId || selectedBlock.id, newTitle);
            }
          }}
          placeholder="Ex: Título da Proposta, Condições de Pagamento..."
          className="h-8 text-xs font-semibold bg-white dark:bg-slate-950"
        />
        <p className="text-[10px] text-slate-500">
          Alterações no nome refletem no documento e na biblioteca de componentes.
        </p>
      </div>

      {/* ── PAINEL DE COMPOSIÇÃO E EDIÇÃO INTERNA ── */}
      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-900 dark:text-indigo-200">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Composição & Elementos Internos</span>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
            {selectedBlock.elements?.length || 0} {selectedBlock.elements?.length === 1 ? "Elemento" : "Elementos"}
          </span>
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Personalize elementos internos deste bloco (variáveis, títulos, formas, imagens) com posicionamento livre X/Y e camadas.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenInternalEditor && onOpenInternalEditor(selectedBlock)}
            className="flex-1 text-xs h-8 bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1.5 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            Editar Conteúdo Interno
          </Button>
          {onSaveToLibrary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSaveToLibrary(selectedBlock)}
              className="text-xs h-8 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50"
              title="Salvar este bloco como modelo reutilizável na biblioteca"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Salvar na Biblioteca
            </Button>
          )}
        </div>
      </div>

      {/* ── CONTEÚDO PRINCIPAL (para blocos com texto livre) ── */}
      {(selectedBlock.type === "text" || 
        selectedBlock.type === "heading" || 
        selectedBlock.type === "card" || 
        selectedBlock.type === "button" || 
        selectedBlock.type === "custom_html" ||
        selectedBlock.type === "notes" ||
        selectedBlock.type === "bank_details" ||
        selectedBlock.type === "footer") && (
        <TextareaWithVariablePicker
          label="Conteúdo do Bloco (com suporte a tags)"
          value={selectedBlock.content || ""}
          onChange={(val) => onUpdateBlock({ ...selectedBlock, content: val })}
          placeholder="Digite o texto ou insira tags {{...}}"
          rows={selectedBlock.type === "heading" ? 2 : 4}
          description="Use tags como {{cliente.nome}} ou {{orcamento.total}} para preenchimento dinâmico."
          isHighlighted={
            highlightedField === "content" || 
            (selectedVariableTag ? (selectedBlock.content?.includes(selectedVariableTag) ?? false) : false)
          }
        />
      )}

      {/* ── CONFIGURAÇÕES ESPECÍFICAS POR TIPO DE BLOCO ── */}

      {/* Cabeçalho */}
      {selectedBlock.type === "header" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Opções do Cabeçalho</Label>
          
          <div className="flex items-center justify-between">
            <span>Modo Faixa Colorida (Banner)</span>
            <Switch
              checked={selectedBlock.config?.bannerMode ?? true}
              onCheckedChange={(v) => updateConfig("bannerMode", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Exibir Logomarca</span>
            <Switch
              checked={selectedBlock.config?.showLogo ?? true}
              onCheckedChange={(v) => updateConfig("showLogo", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Exibir Contatos da Empresa</span>
            <Switch
              checked={selectedBlock.config?.showSocial ?? true}
              onCheckedChange={(v) => updateConfig("showSocial", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Selo de Tipo de Documento</span>
            <Switch
              checked={selectedBlock.config?.showBadge ?? true}
              onCheckedChange={(v) => updateConfig("showBadge", v)}
            />
          </div>
        </div>
      )}

      {/* Termos Comerciais & Garantia */}
      {selectedBlock.type === "commercial_terms" && (
        <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Garantia & Condições Comerciais</Label>
          
          <InputWithVariablePicker
            label="Texto de Garantia Técnica"
            value={selectedBlock.config?.warrantyText ?? "12 meses de garantia balcão contra defeitos de fabricação."}
            onChange={(val) => updateConfig("warrantyText", val)}
            placeholder="Ex: 12 meses de garantia..."
            isHighlighted={highlightedField === "warrantyText" || (selectedVariableTag ? selectedBlock.config?.warrantyText?.includes(selectedVariableTag) : false)}
          />

          <TextareaWithVariablePicker
            label="Condições Gerais de Faturamento"
            value={selectedBlock.config?.commercialText ?? "Faturamento mediante aprovação cadastral e disponibilidade em estoque."}
            onChange={(val) => updateConfig("commercialText", val)}
            placeholder="Ex: Faturamento mediante aprovação..."
            rows={3}
            isHighlighted={highlightedField === "commercialText" || (selectedVariableTag ? selectedBlock.config?.commercialText?.includes(selectedVariableTag) : false)}
          />
        </div>
      )}

      {/* Assinaturas & Termo de Aceite */}
      {selectedBlock.type === "signatures" && (
        <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Termos & Assinaturas</Label>

          <TextareaWithVariablePicker
            label="Termo de Aceite e Aprovação"
            value={selectedBlock.config?.termsText ?? "Ao aprovar esta proposta comercial, o comprador concorda integralmente com os valores, condições e prazos informados."}
            onChange={(val) => updateConfig("termsText", val)}
            placeholder="Texto que precede as linhas de assinatura..."
            rows={3}
            isHighlighted={highlightedField === "termsText" || (selectedVariableTag ? selectedBlock.config?.termsText?.includes(selectedVariableTag) : false)}
          />

          <div className="grid grid-cols-2 gap-2">
            <InputWithVariablePicker
              label="Rótulo Cliente"
              value={selectedBlock.config?.clientLabel ?? "Aceite do Cliente / Responsável"}
              onChange={(val) => updateConfig("clientLabel", val)}
              isHighlighted={highlightedField === "clientLabel" || (selectedVariableTag ? selectedBlock.config?.clientLabel?.includes(selectedVariableTag) : false)}
            />
            <InputWithVariablePicker
              label="Rótulo Consultor"
              value={selectedBlock.config?.sellerLabel ?? "Consultor Técnico Comercial"}
              onChange={(val) => updateConfig("sellerLabel", val)}
              isHighlighted={highlightedField === "sellerLabel" || (selectedVariableTag ? selectedBlock.config?.sellerLabel?.includes(selectedVariableTag) : false)}
            />
          </div>
        </div>
      )}

      {/* Grade de Produtos */}
      {selectedBlock.type === "products_grid" && (
        <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Configuração da Grade</span>
            <LayoutGrid className="w-3.5 h-3.5" />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Colunas</Label>
              <Select 
                value={String(selectedBlock.config?.columns || 3)} 
                onValueChange={(val) => updateConfig("columns", parseInt(val))}
              >
                <SelectTrigger className="h-7 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Colunas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Coluna</SelectItem>
                  <SelectItem value="2">2 Colunas</SelectItem>
                  <SelectItem value="3">3 Colunas</SelectItem>
                  <SelectItem value="4">4 Colunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  id="show-images"
                  checked={selectedBlock.config?.showImages !== false}
                  onCheckedChange={(val) => updateConfig("showImages", val)}
                />
                <Label htmlFor="show-images" className="text-xs cursor-pointer">Exibir Imagens</Label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch 
                  id="show-prices"
                  checked={selectedBlock.config?.showPrices !== false}
                  onCheckedChange={(val) => updateConfig("showPrices", val)}
                />
                <Label htmlFor="show-prices" className="text-xs cursor-pointer">Exibir Preços</Label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Produtos */}
      {selectedBlock.type === "products_table" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Opções da Tabela de Produtos</Label>
          <div className="flex items-center justify-between font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 p-2 rounded-md border border-indigo-200 dark:border-indigo-800">
            <span>Auto-Ajuste ao A4 (Evitar Cortes)</span>
            <Switch
              checked={selectedBlock.config?.autoFit ?? true}
              onCheckedChange={(v) => updateConfig("autoFit", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Miniaturas / Fotos dos Produtos</span>
            <Switch
              checked={selectedBlock.config?.showPhotos ?? true}
              onCheckedChange={(v) => updateConfig("showPhotos", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Código SKU / ERP</span>
            <Switch
              checked={selectedBlock.config?.showSku ?? true}
              onCheckedChange={(v) => updateConfig("showSku", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>NCM / Classificação Fiscal</span>
            <Switch
              checked={selectedBlock.config?.showNcm ?? false}
              onCheckedChange={(v) => updateConfig("showNcm", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Coluna de Desconto nos Itens</span>
            <Switch
              checked={selectedBlock.config?.showDiscount ?? true}
              onCheckedChange={(v) => updateConfig("showDiscount", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Alíquota de Impostos</span>
            <Switch
              checked={selectedBlock.config?.showTaxes ?? false}
              onCheckedChange={(v) => updateConfig("showTaxes", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Prazo de Entrega por Item</span>
            <Switch
              checked={selectedBlock.config?.showDelivery ?? true}
              onCheckedChange={(v) => updateConfig("showDelivery", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Linhas Zebradas</span>
            <Switch
              checked={selectedBlock.config?.zebra ?? true}
              onCheckedChange={(v) => updateConfig("zebra", v)}
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            <Label className="text-[11px] font-semibold">Densidade da Tabela</Label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: "compact", label: "Compacta" },
                { id: "comfortable", label: "Normal" },
                { id: "spacious", label: "Espaçada" },
              ].map((d) => (
                <Button
                  key={d.id}
                  type="button"
                  variant={(selectedBlock.config?.density || "comfortable") === d.id ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[11px] px-1"
                  onClick={() => updateConfig("density", d.id)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Totais do Orçamento */}
      {selectedBlock.type === "totals_summary" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Opções de Totais</Label>
          <div className="flex items-center justify-between">
            <span>Destacar Frete</span>
            <Switch
              checked={selectedBlock.config?.showFreight ?? true}
              onCheckedChange={(v) => updateConfig("showFreight", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Discriminar Impostos</span>
            <Switch
              checked={selectedBlock.config?.showTaxes ?? true}
              onCheckedChange={(v) => updateConfig("showTaxes", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Margem de Lucro Comercial</span>
            <Switch
              checked={selectedBlock.config?.showMargin ?? false}
              onCheckedChange={(v) => updateConfig("showMargin", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Caixa de Destaque no Total</span>
            <Switch
              checked={selectedBlock.config?.highlightTotal ?? true}
              onCheckedChange={(v) => updateConfig("highlightTotal", v)}
            />
          </div>
        </div>
      )}

      {/* Dados do Cliente */}
      {selectedBlock.type === "client_info" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Opções do Cliente</Label>
          <div className="flex items-center justify-between">
            <span>Exibir CNPJ / CPF</span>
            <Switch
              checked={selectedBlock.config?.showTaxId ?? true}
              onCheckedChange={(v) => updateConfig("showTaxId", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Exibir Endereço Completo</span>
            <Switch
              checked={selectedBlock.config?.showAddress ?? true}
              onCheckedChange={(v) => updateConfig("showAddress", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Exibir Consultor / Vendedor</span>
            <Switch
              checked={selectedBlock.config?.showSeller ?? true}
              onCheckedChange={(v) => updateConfig("showSeller", v)}
            />
          </div>
        </div>
      )}

      {/* PIX */}
      {selectedBlock.type === "pix_payment" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Configuração PIX</Label>
          <InputWithVariablePicker
            label="Chave PIX (ou tag da chave)"
            value={selectedBlock.config?.pixKey || ""}
            onChange={(val) => updateConfig("pixKey", val)}
            placeholder="Ex: 12.345.678/0001-90 ou {{empresa.cnpj}}"
            isHighlighted={highlightedField === "pixKey" || (selectedVariableTag ? selectedBlock.config?.pixKey?.includes(selectedVariableTag) : false)}
          />
          <InputWithVariablePicker
            label="Favorecido no PIX"
            value={selectedBlock.config?.pixBeneficiaryName || ""}
            onChange={(val) => updateConfig("pixBeneficiaryName", val)}
            placeholder="Nome da empresa ou {{empresa.razaoSocial}}"
            isHighlighted={highlightedField === "pixBeneficiaryName" || (selectedVariableTag ? selectedBlock.config?.pixBeneficiaryName?.includes(selectedVariableTag) : false)}
          />
        </div>
      )}

      {/* Imagem */}
      {selectedBlock.type === "image" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Configuração da Imagem</Label>
          <div className="space-y-1.5">
            <Label className="text-xs">URL da Imagem</Label>
            <Input
              value={selectedBlock.config?.imageUrl || ""}
              onChange={(e) => updateConfig("imageUrl", e.target.value)}
              className="h-8 text-xs font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Altura (px)</Label>
            <Input
              type="number"
              value={selectedBlock.config?.height || 120}
              onChange={(e) => updateConfig("height", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Botão & Ações Interativas */}
      {selectedBlock.type === "button" && (
        <ButtonActionInspector
          buttonConfig={selectedBlock.buttonConfig || {
            actionType: selectedBlock.config?.url ? "link" : "approve_quote",
            url: selectedBlock.config?.url,
            openInNewTab: true,
          }}
          onChange={(newButtonConfig) => {
            onUpdateBlock({
              ...selectedBlock,
              buttonConfig: newButtonConfig,
              config: {
                ...selectedBlock.config,
                url: newButtonConfig.url,
              }
            });
          }}
        />
      )}

      {/* Espaçador */}
      {selectedBlock.type === "spacer" && (
        <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Altura do Espaçador</Label>
          <div className="space-y-1.5">
            <Label className="text-xs">Altura (px)</Label>
            <Input
              type="number"
              value={selectedBlock.config?.height || 24}
              onChange={(e) => updateConfig("height", Number(e.target.value))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Grid de Variáveis Lado a Lado ou Inline */}
      {(selectedBlock.type === "variables_grid" || selectedBlock.type === "variables_inline") && (
        <div className="space-y-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs">
          <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{selectedBlock.type === "variables_grid" ? "Grid de Variáveis (Lado a Lado)" : "Variáveis na Mesma Linha"}</span>
          </Label>

          {selectedBlock.type === "variables_grid" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Número de Colunas</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[2, 3, 4].map((cols) => (
                  <Button
                    key={cols}
                    type="button"
                    variant={selectedBlock.config?.columns === cols || (!selectedBlock.config?.columns && cols === 2) ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => updateConfig("columns", cols)}
                  >
                    {cols} Colunas
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Separador entre Itens</Label>
              <Input
                value={selectedBlock.config?.separator ?? "|"}
                onChange={(e) => updateConfig("separator", e.target.value)}
                placeholder="Ex: |, -, •, /"
                className="h-7 text-xs bg-white dark:bg-slate-900"
              />
            </div>
          )}

          <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Campos / Variáveis ({ (selectedBlock.config?.items || []).length })
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1 px-2 text-indigo-600 border-indigo-200"
                onClick={() => {
                  const currentItems = selectedBlock.config?.items || [];
                  const newItem = {
                    id: `item-${Date.now().toString(36)}`,
                    label: `Campo ${currentItems.length + 1}`,
                    value: "{{cliente.nome}}",
                  };
                  updateConfig("items", [...currentItems, newItem]);
                }}
              >
                <Plus className="w-3 h-3" /> Adicionar Campo
              </Button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(selectedBlock.config?.items || []).map((item: any, idx: number) => (
                <div key={item.id || idx} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2 relative group">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={item.label || ""}
                      onChange={(e) => {
                        const items = [...(selectedBlock.config?.items || [])];
                        items[idx] = { ...items[idx], label: e.target.value };
                        updateConfig("items", items);
                      }}
                      placeholder="Rótulo (ex: Telefone, Vendedor)"
                      className="h-7 text-xs font-semibold bg-slate-50 dark:bg-slate-800"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => {
                        const items = (selectedBlock.config?.items || []).filter((_: any, i: number) => i !== idx);
                        updateConfig("items", items);
                      }}
                      title="Remover campo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] text-slate-500">Valor / Tag</Label>
                      <VariablePickerButton
                        onSelectVariable={(tag) => {
                          const items = [...(selectedBlock.config?.items || [])];
                          const curVal = items[idx]?.value || "";
                          items[idx] = { ...items[idx], value: curVal ? `${curVal} ${tag}` : tag };
                          updateConfig("items", items);
                        }}
                        buttonLabel="Tag"
                      />
                    </div>
                    <InputWithVariablePicker
                      label=""
                      value={item.value || ""}
                      onChange={(val) => {
                        const items = [...(selectedBlock.config?.items || [])];
                        items[idx] = { ...items[idx], value: val };
                        updateConfig("items", items);
                      }}
                      placeholder="Ex: {{cliente.telefone}}"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PAINEL DE ESTILO VISUAL & CORES ── */}
      <div className="space-y-4 pt-3 border-t">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-indigo-600" />
          Aparência e Estilo
        </h4>

        {/* Cores */}
        {(() => {
          const defaults = getDefaultColors(selectedBlock.type);
          return (
            <div className="space-y-2 text-xs">
              {/* Cor de Fundo */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Cor de Fundo</Label>
                  {selectedBlock.style?.backgroundColor && (
                    <button
                      type="button"
                      onClick={() => updateStyle("backgroundColor", undefined)}
                      className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                      title="Remover cor de fundo (deixar transparente/herdar)"
                    >
                      <X className="w-2.5 h-2.5" /> Limpar
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={toValidHex(selectedBlock.style?.backgroundColor || defaults.bg)}
                    onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer p-0 border border-slate-200 dark:border-slate-800"
                  />
                  <Input
                    value={selectedBlock.style?.backgroundColor || ""}
                    onChange={(e) => updateStyle("backgroundColor", e.target.value)}
                    placeholder={defaults.bg === "transparent" ? "Transparente" : `Padrão (${defaults.bg})`}
                    className="h-7 text-[11px] font-mono"
                  />
                </div>
              </div>

              {/* Cor do Texto e Cor da Borda */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Cor do Texto</Label>
                    {selectedBlock.style?.textColor && (
                      <button
                        type="button"
                        onClick={() => updateStyle("textColor", undefined)}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                        title="Remover cor do texto (herdar)"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={toValidHex(selectedBlock.style?.textColor || defaults.text, "#000000")}
                      onChange={(e) => updateStyle("textColor", e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer p-0 border border-slate-200 dark:border-slate-800"
                    />
                    <Input
                      value={selectedBlock.style?.textColor || ""}
                      onChange={(e) => updateStyle("textColor", e.target.value)}
                      placeholder={`Herdar (${defaults.text})`}
                      className="h-7 text-[11px] font-mono p-1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Cor da Borda</Label>
                    {selectedBlock.style?.borderColor && (
                      <button
                        type="button"
                        onClick={() => updateStyle("borderColor", undefined)}
                        className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5"
                        title="Remover cor da borda"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="color"
                      value={toValidHex(selectedBlock.style?.borderColor || "#cbd5e1", "#cbd5e1")}
                      onChange={(e) => updateStyle("borderColor", e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer p-0 border border-slate-200 dark:border-slate-800"
                    />
                    <Input
                      value={selectedBlock.style?.borderColor || ""}
                      onChange={(e) => updateStyle("borderColor", e.target.value)}
                      placeholder="Herdar (#cbd5e1)"
                      className="h-7 text-[11px] font-mono p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bordas e Cantos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Borda (Espessura)</Label>
            <Select
              value={String(selectedBlock.style?.borderWidth ?? 0)}
              onValueChange={(v) => updateStyle("borderWidth", Number(v))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem Borda</SelectItem>
                <SelectItem value="1">1px</SelectItem>
                <SelectItem value="2">2px</SelectItem>
                <SelectItem value="3">3px</SelectItem>
                <SelectItem value="4">4px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Cantos (Arredondamento)</Label>
            <Select
              value={String(selectedBlock.style?.borderRadius ?? 0)}
              onValueChange={(v) => updateStyle("borderRadius", Number(v))}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0px (Reto)</SelectItem>
                <SelectItem value="4">4px (Suave)</SelectItem>
                <SelectItem value="8">8px (Médio)</SelectItem>
                <SelectItem value="12">12px (Arredondado)</SelectItem>
                <SelectItem value="16">16px (Pill)</SelectItem>
                <SelectItem value="24">24px (Super Pill)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Estilo da Borda e Largura */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Estilo da Borda</Label>
            <Select
              value={selectedBlock.style?.borderStyle || "solid"}
              onValueChange={(v) => updateStyle("borderStyle", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Sólido</SelectItem>
                <SelectItem value="dashed">Tracejado (Dashed)</SelectItem>
                <SelectItem value="dotted">Pontilhado (Dotted)</SelectItem>
                <SelectItem value="double">Duplo (Double)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Largura do Bloco</Label>
            <Select
              value={selectedBlock.style?.width || "full"}
              onValueChange={(v) => updateStyle("width", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">100% (Largura Total)</SelectItem>
                <SelectItem value="4/5">80%</SelectItem>
                <SelectItem value="3/4">75%</SelectItem>
                <SelectItem value="2/3">66%</SelectItem>
                <SelectItem value="3/5">60%</SelectItem>
                <SelectItem value="1/2">50% (Meia Folha)</SelectItem>
                <SelectItem value="2/5">40%</SelectItem>
                <SelectItem value="1/3">33%</SelectItem>
                <SelectItem value="1/4">25%</SelectItem>
                <SelectItem value="1/5">20%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tipografia: Tamanho e Peso da Fonte */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Tam. Fonte (px)</Label>
            <Input
              type="number"
              value={selectedBlock.style?.fontSize || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                updateStyle("fontSize", val);
              }}
              placeholder="Herdar"
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-600 dark:text-slate-400">Peso Fonte</Label>
            <Select
              value={selectedBlock.style?.fontWeight || "normal"}
              onValueChange={(v) => updateStyle("fontWeight", v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Médio (Medium)</SelectItem>
                <SelectItem value="semibold">Seminegrito (Semibold)</SelectItem>
                <SelectItem value="bold">Negrito (Bold)</SelectItem>
                <SelectItem value="light">Fino (Light)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Altura Mínima do Bloco */}
        <div className="space-y-1 text-xs">
          <Label className="text-[11px] text-slate-600 dark:text-slate-400">Altura Mínima do Bloco (px)</Label>
          <Input
            type="number"
            value={selectedBlock.style?.minHeight || ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              updateStyle("minHeight", val);
            }}
            placeholder="Auto"
            className="h-7 text-xs"
          />
        </div>

        {/* Camada / Z-Index e Ordem de Sobreposição */}
        <div className="space-y-1.5 text-xs p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Camada (Z-Index / Sobreposição)
            </Label>
            <span className="text-[10px] text-slate-400">
              Maior valor = fica na frente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                const currentZ = selectedBlock.zIndex || 1;
                onUpdateBlock({ ...selectedBlock, zIndex: Math.max(1, currentZ - 1) });
              }}
              title="Diminuir camada"
            >
              <ArrowDown className="w-3.5 h-3.5 mr-1" /> Trás
            </Button>
            <Input
              type="number"
              value={selectedBlock.zIndex || 1}
              onChange={(e) => onUpdateBlock({ ...selectedBlock, zIndex: parseInt(e.target.value) || 1 })}
              className="h-7 w-16 text-center font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2"
              onClick={() => {
                const currentZ = selectedBlock.zIndex || 1;
                onUpdateBlock({ ...selectedBlock, zIndex: currentZ + 1 });
              }}
              title="Aumentar camada"
            >
              <ArrowUp className="w-3.5 h-3.5 mr-1" /> Frente
            </Button>
          </div>
        </div>

        {/* Espaçamento (Padding e Margens Superior / Inferior com suporte a negativo para sobreposição) */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px]">Padding (px)</Label>
            <Input
              type="number"
              value={selectedBlock.style?.paddingTop ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateBlock({
                  ...selectedBlock,
                  style: {
                    ...(selectedBlock.style || {}),
                    paddingTop: val,
                    paddingBottom: val,
                    paddingLeft: val,
                    paddingRight: val,
                  }
                });
              }}
              className="h-7 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Margem Sup. (px)</Label>
            <Input
              type="number"
              placeholder="0"
              value={selectedBlock.style?.marginTop ?? 0}
              onChange={(e) => updateStyle("marginTop", Number(e.target.value))}
              className="h-7 text-xs"
              title="Permite valores negativos para sobrepor o bloco anterior"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Margem Inf. (px)</Label>
            <Input
              type="number"
              value={selectedBlock.style?.marginBottom ?? 16}
              onChange={(e) => updateStyle("marginBottom", Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Alinhamento de Texto */}
        <div className="space-y-1.5 text-xs">
          <Label className="text-[11px]">Alinhamento do Texto</Label>
          <div className="flex gap-1">
            {(["left", "center", "right", "justify"] as const).map((align) => (
              <Button
                key={align}
                type="button"
                variant={selectedBlock.style?.textAlign === align ? "default" : "outline"}
                size="sm"
                className="h-7 flex-1 p-0"
                onClick={() => updateStyle("textAlign", align)}
              >
                {align === "left" && <AlignLeft className="w-3.5 h-3.5" />}
                {align === "center" && <AlignCenter className="w-3.5 h-3.5" />}
                {align === "right" && <AlignRight className="w-3.5 h-3.5" />}
                {align === "justify" && <AlignJustify className="w-3.5 h-3.5" />}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDeselect}
          className="w-full text-xs text-slate-600"
        >
          Desmarcar Bloco (Ver Configurações Globais)
        </Button>
      </div>
    </div>
  );
}
