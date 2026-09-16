import React, { useState, useEffect, useRef } from "react";
import { 
  Palette, 
  LayoutList, 
  Building2, 
  CreditCard, 
  Eye, 
  Printer, 
  Save, 
  Copy, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  FileText, 
  QrCode, 
  ShieldCheck, 
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Columns,
  Layers,
  Wand2,
  Settings2,
  Undo2,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { printElement } from "@/lib/print-utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AppSettings, getSettings, updateSettings } from "@/lib/settings-store";
import { DocumentTemplatePreset, DocumentLayoutArchetype, DocumentFontFamily, DocumentRadius, DocumentDensity } from "@/types/document-template";
import { DOCUMENT_PRESETS, MOCK_QUOTE_PREVIEW_DATA } from "@/lib/document-presets";
import { DynamicQuoteRenderer } from "./DynamicQuoteRenderer";
import { VisualDocumentBuilder } from "./builder/VisualDocumentBuilder";

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

const COLOR_PALETTES = [
  { name: "Navy & Platinum (Executivo)", primary: "#0f172a", secondary: "#334155", accent: "#0284c7", headerBg: "#0f172a" },
  { name: "Tech Indigo & Emerald", primary: "#4f46e5", secondary: "#065f46", accent: "#10b981", headerBg: "#4f46e5" },
  { name: "Graphite & Industrial Orange", primary: "#1e293b", secondary: "#c2410c", accent: "#ea580c", headerBg: "#1e293b" },
  { name: "Royal Blue & Sky", primary: "#1d4ed8", secondary: "#1e40af", accent: "#38bdf8", headerBg: "#1d4ed8" },
  { name: "Obsidian & Emerald Clean", primary: "#18181b", secondary: "#27272a", accent: "#059669", headerBg: "#18181b" },
  { name: "Crimson & Slate Luxury", primary: "#881337", secondary: "#4c0519", accent: "#e11d48", headerBg: "#881337" },
  { name: "Teak & Bronze Heritage", primary: "#451a03", secondary: "#78350f", accent: "#d97706", headerBg: "#451a03" },
  { name: "Clean Minimalist (Monochrome)", primary: "#09090b", secondary: "#71717a", accent: "#27272a", headerBg: "#ffffff" },
];

export function DocumentStudioTab() {
  const { toast } = useToast();
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [studioMode, setStudioMode] = useState<"visual" | "quick">("visual");
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    settings.templateConfig.activePresetId || "preset-executivo"
  );
  const [activeStudioTab, setActiveStudioTab] = useState<string>("estilo");
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [viewMode, setViewMode] = useState<"split" | "previewOnly">("split");
  const [useRealData, setUseRealData] = useState<boolean>(false);
  const [newPresetDialogOpen, setNewPresetDialogOpen] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [newPresetDesc, setNewPresetDesc] = useState<string>("");

  // Auto-salvamento debounced para as configurações da aba marca
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "pending">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with store
  useEffect(() => {
    setSettings(getSettings());
  }, []);

  const validateDimensions = (width: number, height: number, margin: number): { isValid: boolean; message: string } => {
    if (width < 100 || width > 400) {
      return { isValid: false, message: `Largura do documento (${width}mm) excede os limites permitidos (100mm a 400mm).` };
    }
    if (height < 100 || height > 500) {
      return { isValid: false, message: `Altura do documento (${height}mm) excede os limites permitidos (100mm a 500mm).` };
    }
    if (margin < 5 || margin > 50) {
      return { isValid: false, message: `Margem do documento (${margin}mm) excede os limites permitidos (5mm a 50mm).` };
    }
    return { isValid: true, message: "" };
  };

  const triggerDebouncedSettingsUpdate = (patch: Parameters<typeof updateSettings>[0]) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        ...patch,
        templateConfig: patch.templateConfig ? { ...prev.templateConfig, ...patch.templateConfig } : prev.templateConfig,
        documentConfig: patch.documentConfig ? { ...prev.documentConfig, ...patch.documentConfig } : prev.documentConfig,
      };
      return updated as AppSettings;
    });

    setAutoSaveStatus("pending");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const currentBase = getSettings();
      const nextTemplateConfig = { ...currentBase.templateConfig, ...patch.templateConfig };

      const w = nextTemplateConfig.documentWidthMm ?? 210;
      const h = nextTemplateConfig.documentHeightMm ?? 297;
      const m = nextTemplateConfig.documentMarginMm ?? 18;

      const validation = validateDimensions(w, h, m);
      if (!validation.isValid) {
        toast({
          variant: "destructive",
          title: "Dimensões Inválidas!",
          description: validation.message,
        });
        setAutoSaveStatus("pending");
        return;
      }

      setAutoSaveStatus("saving");
      updateSettings(patch);

      const timeFormatted = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(timeFormatted);
      setAutoSaveStatus("saved");
    }, 750);
  };

  // Se o modo for o Construtor Visual Dinâmico (Drag & Drop)
  if (studioMode === "visual") {
    return (
      <div className="space-y-4">
        {/* Alternador de Modo do Estúdio */}
        <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 px-4 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-indigo-950 dark:text-indigo-200">
              Construtor Visual de Layouts de Orçamento
            </span>
            <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
              Drag & Drop Ativo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStudioMode("quick")}
              className="text-xs h-8 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 gap-1.5 font-medium"
            >
              <Settings2 className="w-3.5 h-3.5" /> Alternar para Configuração Rápida
            </Button>
          </div>
        </div>

        <VisualDocumentBuilder
          initialPresetId={selectedPresetId}
          onSaveSuccess={() => {
            setSettings(getSettings());
          }}
        />
      </div>
    );
  }

  const currentPreset = settings.savedPresets?.find(p => p.id === selectedPresetId) || DOCUMENT_PRESETS[0];


  // Handler to apply preset
  const handleSelectPreset = (presetId: string) => {
    const targetPreset = (settings.savedPresets || DOCUMENT_PRESETS).find(p => p.id === presetId);
    if (!targetPreset) return;

    setSelectedPresetId(presetId);
    
    // Update active settings
    updateSettings({
      templateConfig: {
        ...settings.templateConfig,
        activePresetId: presetId,
        layout: targetPreset.archetype,
        fontFamily: targetPreset.fontFamily,
        radius: targetPreset.radius,
        density: targetPreset.sections.tableDensity,
        primaryColor: targetPreset.colors.primary,
        secondaryColor: targetPreset.colors.secondary,
        accentColor: targetPreset.colors.accent,
        headerBgColor: targetPreset.colors.headerBg,
        headerTextColor: targetPreset.colors.headerText,
      },
      documentConfig: {
        ...settings.documentConfig,
        sections: {
          ...(settings.documentConfig.sections || targetPreset.sections),
          ...targetPreset.sections,
        }
      }
    });

    setSettings(getSettings());
    toast({
      title: `Modelo "${targetPreset.name}" ativado`,
      description: "As diretrizes visuais foram carregadas no estúdio.",
    });
  };

  // Quick Palette change
  const handleApplyPalette = (palette: typeof COLOR_PALETTES[0]) => {
    updateSettings({
      templateConfig: {
        primaryColor: palette.primary,
        secondaryColor: palette.secondary,
        accentColor: palette.accent,
        headerBgColor: palette.headerBg,
      }
    });
    setSettings(getSettings());
  };

  // Archetype change
  const handleArchetypeChange = (archetype: DocumentLayoutArchetype) => {
    updateSettings({
      templateConfig: {
        layout: archetype
      }
    });
    setSettings(getSettings());
  };

  // Section visibility toggle
  const handleToggleSection = (key: keyof typeof currentPreset.sections, value: any) => {
    const currentSections = settings.documentConfig.sections || currentPreset.sections;
    triggerDebouncedSettingsUpdate({
      documentConfig: {
        sections: {
          ...currentSections,
          [key]: value
        }
      }
    });
  };

  // Save changes
  const handleSaveAll = () => {
    const w = settings.templateConfig.documentWidthMm ?? 210;
    const h = settings.templateConfig.documentHeightMm ?? 297;
    const m = settings.templateConfig.documentMarginMm ?? 18;

    const validation = validateDimensions(w, h, m);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Layout!",
        description: validation.message,
      });
      return;
    }

    updateSettings(settings);
    toast({
      title: "Configurações de Layout Salvas!",
      description: "Os novos padrões serão aplicados a todos os orçamentos e pedidos gerados.",
    });
  };

  // Create new preset
  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) return;

    const newId = `preset-${Date.now()}`;
    const newPreset: DocumentTemplatePreset = {
      id: newId,
      name: newPresetName,
      description: newPresetDesc || "Modelo customizado pelo usuário",
      archetype: settings.templateConfig.layout,
      fontFamily: settings.templateConfig.fontFamily || "sans",
      radius: settings.templateConfig.radius || "md",
      colors: {
        primary: settings.templateConfig.primaryColor,
        secondary: settings.templateConfig.secondaryColor || "#334155",
        accent: settings.templateConfig.accentColor || "#0284c7",
        headerBg: settings.templateConfig.headerBgColor || settings.templateConfig.primaryColor,
        headerText: settings.templateConfig.headerTextColor || "#ffffff",
        highlightBg: "#f8fafc",
      },
      sections: {
        ...(settings.documentConfig.sections || currentPreset.sections)
      }
    };

    const updatedPresets = [...(settings.savedPresets || DOCUMENT_PRESETS), newPreset];
    updateSettings({
      savedPresets: updatedPresets,
      templateConfig: {
        activePresetId: newId
      }
    });

    setSelectedPresetId(newId);
    setSettings(getSettings());
    setNewPresetDialogOpen(false);
    setNewPresetName("");
    setNewPresetDesc("");

    toast({
      title: `Modelo "${newPreset.name}" criado com sucesso!`,
      description: "Agora você pode selecioná-lo e personalizá-lo a qualquer momento.",
    });
  };

  // Delete custom preset
  const handleDeletePreset = (id: string) => {
    const updated = (settings.savedPresets || []).filter(p => p.id !== id);
    updateSettings({ savedPresets: updated });
    if (selectedPresetId === id) {
      setSelectedPresetId(updated[0]?.id || "preset-executivo");
    }
    setSettings(getSettings());
    toast({
      title: "Modelo removido",
      description: "O modelo customizado foi excluído da sua biblioteca.",
    });
  };

  // Print function
  const handlePrint = () => {
    printElement(previewContainerRef.current || "printable-studio-document", `Orçamento_${currentPreset?.name || "Modelo"}`);
  };

  return (
    <div className="space-y-4">
      {/* ── BARRA SUPERIOR DO ESTÚDIO DE DOCUMENTOS ── */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Seletor de Modelo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Modelo Ativo:</span>
          </div>

          <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
            <SelectTrigger className="w-[240px] font-medium text-xs">
              <SelectValue placeholder="Selecione um modelo..." />
            </SelectTrigger>
            <SelectContent>
              {(settings.savedPresets || DOCUMENT_PRESETS).map(preset => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <span className="font-medium">{preset.name}</span>
                    {preset.isDefault && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded ml-auto">Padrão</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-9 gap-1.5"
            onClick={() => setNewPresetDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Salvar como Novo Modelo
          </Button>
        </div>

        {/* Controles de Visualização e Ações Rápidas */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 dark:text-slate-300"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs font-mono font-bold px-2 text-slate-700 dark:text-slate-300 min-w-[45px] text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 dark:text-slate-300"
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Toggle Split / Fullscreen Preview */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => setViewMode(viewMode === "split" ? "previewOnly" : "split")}
          >
            {viewMode === "split" ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Expandir Preview
              </>
            ) : (
              <>
                <Columns className="w-3.5 h-3.5" /> Modo Dividido
              </>
            )}
          </Button>

          {/* Imprimir / PDF */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" /> Testar Impressão / PDF
          </Button>

          {/* Pill Indicador de Auto-salvamento (Debounce) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border shadow-2xs bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800">
            {autoSaveStatus === "pending" && (
              <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Salvar em 0,7s...</span>
              </span>
            )}
            {autoSaveStatus === "saving" && (
              <span className="text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Auto-salvando...</span>
              </span>
            )}
            {autoSaveStatus === "saved" && (
              <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{lastSavedTime ? `Salvo às ${lastSavedTime}` : "Salvo automaticamente"}</span>
              </span>
            )}
          </div>

          {/* Salvar Global */}
          <Button
            size="sm"
            className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            onClick={handleSaveAll}
          >
            <Save className="w-3.5 h-3.5" /> Salvar Layout
          </Button>
        </div>
      </div>

      {/* ── WORKSPACE DO ESTÚDIO (SPLIT VIEW) ── */}
      <div className={`grid gap-6 ${viewMode === "split" ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"}`}>
        
        {/* ── PAINEL DE CONTROLES E CONFIGURAÇÃO (5 colunas) ── */}
        {viewMode === "split" && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <Tabs value={activeStudioTab} onValueChange={setActiveStudioTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-none border-b border-slate-200 dark:border-slate-700">
                  <TabsTrigger value="estilo" className="text-xs font-semibold py-2">
                    <Palette className="w-3.5 h-3.5 mr-1.5" /> Estilo
                  </TabsTrigger>
                  <TabsTrigger value="secoes" className="text-xs font-semibold py-2">
                    <Sliders className="w-3.5 h-3.5 mr-1.5" /> Seções
                  </TabsTrigger>
                  <TabsTrigger value="empresa" className="text-xs font-semibold py-2">
                    <Building2 className="w-3.5 h-3.5 mr-1.5" /> Empresa
                  </TabsTrigger>
                  <TabsTrigger value="pagamento" className="text-xs font-semibold py-2">
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> PIX & Termos
                  </TabsTrigger>
                </TabsList>

                {/* ── ABA 1: ESTILO & ARQUÉTIPOS ── */}
                <TabsContent value="estilo" className="p-5 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto">
                  {/* Arquétipo Visual */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Arquétipo de Design
                      </Label>
                      <span className="text-[11px] text-indigo-600 font-medium">Layout do Orçamento</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: "executivo", label: "Executivo Premium", desc: "Faixa nobre, tipografia clássica e selo", icon: Sparkles },
                        { id: "moderno", label: "Modern Tech Clean", desc: "Cards arredondados e badges", icon: Layers },
                        { id: "tecnico", label: "Industrial & Engenharia", desc: "Grade técnica, NCM e IPI/ICMS", icon: FileText },
                        { id: "minimalista", label: "Minimalista Editorial", desc: "Clareza suíça e sem excessos", icon: LayoutList },
                        { id: "classico", label: "Clássico Corporativo", desc: "Padrão ERP tradicional", icon: Building2 },
                      ].map(arch => (
                        <div
                          key={arch.id}
                          onClick={() => handleArchetypeChange(arch.id as DocumentLayoutArchetype)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            settings.templateConfig.layout === arch.id
                              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600 text-indigo-950 dark:text-indigo-200"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">{arch.label}</span>
                            {settings.templateConfig.layout === arch.id && (
                              <Check className="w-3.5 h-3.5 text-indigo-600" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-tight">{arch.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logomarca */}
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Logomarca da Empresa
                    </Label>
                    <div className="flex gap-3 items-center">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              updateSettings({
                                templateConfig: {
                                  logoImage: event.target?.result as string
                                }
                              });
                              setSettings(getSettings());
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="text-xs cursor-pointer flex-1"
                      />
                      {settings.templateConfig.logoImage && (
                        <div className="relative group">
                          <div className="h-10 w-16 border rounded-md overflow-hidden flex items-center justify-center bg-slate-50 p-1">
                            <img src={settings.templateConfig.logoImage} className="max-h-full object-contain" alt="Logo" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              updateSettings({ templateConfig: { logoImage: "" } });
                              setSettings(getSettings());
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-xs hover:bg-red-600"
                            title="Remover logo"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paletas de Cor Rápidas */}
                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Paletas de Cores Corporativas (1-Clique)
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {COLOR_PALETTES.map((pal, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPalette(pal)}
                          className="p-2 border rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
                        >
                          <span className="w-4 h-4 rounded-full shrink-0 border" style={{ backgroundColor: pal.primary }} />
                          <span className="text-[11px] font-medium truncate text-slate-700 dark:text-slate-300">{pal.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cores Customizadas */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cor Primária / Marca</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          value={toValidHex(settings.templateConfig.primaryColor, "#0f172a")}
                          onChange={(e) => {
                            updateSettings({ templateConfig: { primaryColor: e.target.value } });
                            setSettings(getSettings());
                          }}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <Input
                          value={toValidHex(settings.templateConfig.primaryColor, "#0f172a")}
                          onChange={(e) => {
                            updateSettings({ templateConfig: { primaryColor: e.target.value } });
                            setSettings(getSettings());
                          }}
                          className="font-mono text-xs uppercase h-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Cor de Acento / Badges</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          type="color"
                          value={toValidHex(settings.templateConfig.accentColor, "#0284c7")}
                          onChange={(e) => {
                            updateSettings({ templateConfig: { accentColor: e.target.value } });
                            setSettings(getSettings());
                          }}
                          className="w-10 h-8 p-1 cursor-pointer"
                        />
                        <Input
                          value={toValidHex(settings.templateConfig.accentColor, "#0284c7")}
                          onChange={(e) => {
                            updateSettings({ templateConfig: { accentColor: e.target.value } });
                            setSettings(getSettings());
                          }}
                          className="font-mono text-xs uppercase h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tipografia e Densidade */}
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipografia</Label>
                      <Select
                        value={settings.templateConfig.fontFamily || "sans"}
                        onValueChange={(val: DocumentFontFamily) => {
                          updateSettings({ templateConfig: { fontFamily: val } });
                          setSettings(getSettings());
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sans" className="text-xs">Sans-Serif (Moderna)</SelectItem>
                          <SelectItem value="serif" className="text-xs">Serif (Editorial)</SelectItem>
                          <SelectItem value="mono" className="text-xs">Monospace (Técnica)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Cantos (Radius)</Label>
                      <Select
                        value={settings.templateConfig.radius || "md"}
                        onValueChange={(val: DocumentRadius) => {
                          updateSettings({ templateConfig: { radius: val } });
                          setSettings(getSettings());
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-xs">Reto (0px)</SelectItem>
                          <SelectItem value="sm" className="text-xs">Suave (4px)</SelectItem>
                          <SelectItem value="md" className="text-xs">Médio (8px)</SelectItem>
                          <SelectItem value="lg" className="text-xs">Arredondado (14px)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Espaçamento</Label>
                      <Select
                        value={settings.documentConfig.sections?.tableDensity || "comfortable"}
                        onValueChange={(val: DocumentDensity) => {
                          handleToggleSection("tableDensity", val);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact" className="text-xs">Compacto</SelectItem>
                          <SelectItem value="comfortable" className="text-xs">Confortável</SelectItem>
                          <SelectItem value="spacious" className="text-xs">Espaçoso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ── ABA 2: SEÇÕES & BLOCOS DINÂMICOS ── */}
                <TabsContent value="secoes" className="p-5 space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto">
                  {/* Cabeçalho */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cabeçalho & Identidade</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Exibir Logomarca</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showLogo ?? true}
                          onCheckedChange={(v) => handleToggleSection("showLogo", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Exibir Contatos e Redes no Header</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showCompanySocial ?? true}
                          onCheckedChange={(v) => handleToggleSection("showCompanySocial", v)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dados do Cliente */}
                  <div className="space-y-3 pt-3 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Dados do Cliente</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Bloco de Dados do Cliente</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showClientDetails ?? true}
                          onCheckedChange={(v) => handleToggleSection("showClientDetails", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Endereço Completo de Faturamento</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showClientAddress ?? true}
                          onCheckedChange={(v) => handleToggleSection("showClientAddress", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>CNPJ / CPF e Inscrição Estadual</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showClientTaxId ?? true}
                          onCheckedChange={(v) => handleToggleSection("showClientTaxId", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Nome e Contato do Consultor</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showSellerContact ?? true}
                          onCheckedChange={(v) => handleToggleSection("showSellerContact", v)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Produtos */}
                  <div className="space-y-3 pt-3 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tabela de Produtos & Serviços</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-medium text-indigo-700 dark:text-indigo-400">Miniaturas / Fotos dos Produtos</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showProductPhotos ?? true}
                          onCheckedChange={(v) => handleToggleSection("showProductPhotos", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Código SKU / ERP Protheus</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showProductSku ?? true}
                          onCheckedChange={(v) => handleToggleSection("showProductSku", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Coluna de NCM / Classificação Fiscal</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showProductNcm ?? true}
                          onCheckedChange={(v) => handleToggleSection("showProductNcm", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Coluna de Desconto nos Itens</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showItemDiscount ?? true}
                          onCheckedChange={(v) => handleToggleSection("showItemDiscount", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Alíquota de Impostos por Item</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showItemTaxes ?? false}
                          onCheckedChange={(v) => handleToggleSection("showItemTaxes", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Prazo de Entrega por Item</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showItemDeliveryTime ?? true}
                          onCheckedChange={(v) => handleToggleSection("showItemDeliveryTime", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Tabela com Linhas Zebradas (Alternadas)</span>
                        <Switch
                          checked={settings.documentConfig.sections?.zebraTable ?? true}
                          onCheckedChange={(v) => handleToggleSection("zebraTable", v)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Totais, Condições & Assinaturas */}
                  <div className="space-y-3 pt-3 border-t">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Totais, Condições & Assinatura</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Destacar Frete (CIF / FOB)</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showFreight ?? true}
                          onCheckedChange={(v) => handleToggleSection("showFreight", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Discriminação de Impostos (IPI/ICMS)</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showTaxesBreakdown ?? true}
                          onCheckedChange={(v) => handleToggleSection("showTaxesBreakdown", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">QR Code e Chave PIX</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showPixQrCode ?? true}
                          onCheckedChange={(v) => handleToggleSection("showPixQrCode", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Dados Bancários p/ Depósito/TED</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showBankDetails ?? true}
                          onCheckedChange={(v) => handleToggleSection("showBankDetails", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Linhas de Assinatura (Cliente & Consultor)</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showSignatures ?? true}
                          onCheckedChange={(v) => handleToggleSection("showSignatures", v)}
                        />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <span>Selo de Autenticação Digital SHA-256</span>
                        <Switch
                          checked={settings.documentConfig.sections?.showDigitalStamp ?? true}
                          onCheckedChange={(v) => handleToggleSection("showDigitalStamp", v)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── ABA 3: DADOS DA EMPRESA ── */}
                <TabsContent value="empresa" className="p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Identificação Comercial
                    </Label>

                    <div className="space-y-2">
                      <Label className="text-xs">Nome Fantasia (Cabeçalho)</Label>
                      <Input
                        value={settings.templateConfig.logoText}
                        onChange={(e) => {
                          triggerDebouncedSettingsUpdate({ templateConfig: { logoText: e.target.value } });
                        }}
                        placeholder="Ex: VendasProtheus ERP"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Razão Social Completa</Label>
                      <Input
                        value={settings.templateConfig.empresaRazaoSocial || ""}
                        onChange={(e) => {
                          triggerDebouncedSettingsUpdate({ templateConfig: { empresaRazaoSocial: e.target.value } });
                        }}
                        placeholder="Ex: VendasProtheus Automação Comercial S/A"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">CNPJ</Label>
                        <Input
                          value={settings.templateConfig.empresaCnpj}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaCnpj: e.target.value } });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Inscrição Estadual (IE)</Label>
                        <Input
                          value={settings.templateConfig.empresaInscricaoEstadual || ""}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaInscricaoEstadual: e.target.value } });
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Telefone de Contato</Label>
                        <Input
                          value={settings.templateConfig.empresaTelefone}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaTelefone: e.target.value } });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">E-mail Comercial</Label>
                        <Input
                          value={settings.templateConfig.empresaEmail}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaEmail: e.target.value } });
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Endereço da Empresa</Label>
                      <Input
                        value={settings.templateConfig.empresaEndereco}
                        onChange={(e) => {
                          triggerDebouncedSettingsUpdate({ templateConfig: { empresaEndereco: e.target.value } });
                        }}
                        placeholder="Logradouro, número, complemento"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Cidade / Estado / CEP</Label>
                        <Input
                          value={settings.templateConfig.empresaCidadeEstado || ""}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaCidadeEstado: e.target.value } });
                          }}
                          placeholder="São Paulo - SP | CEP: 01310-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Website</Label>
                        <Input
                          value={settings.templateConfig.empresaSite || ""}
                          onChange={(e) => {
                            triggerDebouncedSettingsUpdate({ templateConfig: { empresaSite: e.target.value } });
                          }}
                          placeholder="www.suaempresa.com.br"
                        />
                      </div>
                    </div>

                    {/* Dimensões e Margens do Documento */}
                    <div className="space-y-3 pt-3 border-t">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                        Dimensões e Margens do Documento (mm)
                      </Label>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Largura (mm)</Label>
                          <Input
                            type="number"
                            min="100"
                            max="400"
                            value={settings.templateConfig.documentWidthMm ?? 210}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              triggerDebouncedSettingsUpdate({ templateConfig: { documentWidthMm: val } });
                            }}
                            className="h-9 text-xs"
                          />
                          <span className="text-[10px] text-slate-400">Min 100 | Max 400</span>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Altura (mm)</Label>
                          <Input
                            type="number"
                            min="100"
                            max="500"
                            value={settings.templateConfig.documentHeightMm ?? 297}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              triggerDebouncedSettingsUpdate({ templateConfig: { documentHeightMm: val } });
                            }}
                            className="h-9 text-xs"
                          />
                          <span className="text-[10px] text-slate-400">Min 100 | Max 500</span>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">Margem (mm)</Label>
                          <Input
                            type="number"
                            min="5"
                            max="50"
                            value={settings.templateConfig.documentMarginMm ?? 18}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              triggerDebouncedSettingsUpdate({ templateConfig: { documentMarginMm: val } });
                            }}
                            className="h-9 text-xs"
                          />
                          <span className="text-[10px] text-slate-400">Min 5 | Max 50</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ── ABA 4: PIX, CONDIÇÕES & TERMOS ── */}
                <TabsContent value="pagamento" className="p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Configuração de PIX
                    </Label>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1 space-y-1.5">
                        <Label className="text-xs">Tipo da Chave</Label>
                        <Select
                          value={settings.documentConfig.sections?.pixKeyType || "cnpj"}
                          onValueChange={(val: any) => handleToggleSection("pixKeyType", val)}
                        >
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cnpj" className="text-xs">CNPJ</SelectItem>
                            <SelectItem value="email" className="text-xs">E-mail</SelectItem>
                            <SelectItem value="telefone" className="text-xs">Telefone</SelectItem>
                            <SelectItem value="aleatoria" className="text-xs">Chave Aleatória</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Chave PIX</Label>
                        <Input
                          value={settings.documentConfig.sections?.pixKey ?? settings.templateConfig.empresaCnpj}
                          onChange={(e) => handleToggleSection("pixKey", e.target.value)}
                          placeholder="Ex: 12.345.678/0001-90"
                          className="h-9 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Favorecido no PIX</Label>
                      <Input
                        value={settings.documentConfig.sections?.pixBeneficiaryName ?? settings.templateConfig.empresaRazaoSocial}
                        onChange={(e) => handleToggleSection("pixBeneficiaryName", e.target.value)}
                        placeholder="Ex: VendasProtheus ERP S/A"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Dados Bancários para Transferência / TED / DOC
                    </Label>
                    <Textarea
                      value={settings.documentConfig.sections?.bankDetailsText ?? settings.documentConfig.dadosBancarios}
                      onChange={(e) => {
                        handleToggleSection("bankDetailsText", e.target.value);
                        triggerDebouncedSettingsUpdate({ documentConfig: { dadosBancarios: e.target.value } });
                      }}
                      className="h-20 resize-none text-xs font-mono"
                      placeholder="Banco, Agência, Conta Corrente..."
                    />
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Garantia & Condições Comerciais
                    </Label>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Texto de Garantia Padrão</Label>
                      <Input
                        value={settings.documentConfig.sections?.warrantyText ?? "12 meses de garantia balcão contra defeitos de fabricação."}
                        onChange={(e) => handleToggleSection("warrantyText", e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Condições Gerais de Faturamento</Label>
                      <Textarea
                        value={settings.documentConfig.sections?.commercialConditionsText ?? "Faturamento sujeito à aprovação de crédito. Preços válidos durante o período da proposta."}
                        onChange={(e) => handleToggleSection("commercialConditionsText", e.target.value)}
                        className="h-16 resize-none text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Termo de Aceite do Documento
                    </Label>
                    <Textarea
                      value={settings.documentConfig.sections?.termsOfAcceptance ?? "Ao aprovar esta proposta comercial, o comprador concorda com os termos, prazos e condições financeiras descritas neste instrumento."}
                      onChange={(e) => handleToggleSection("termsOfAcceptance", e.target.value)}
                      className="h-16 resize-none text-xs"
                    />
                  </div>

                  <div className="space-y-3 pt-3 border-t">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Texto de Rodapé do Documento
                    </Label>
                    <Textarea
                      value={settings.documentConfig.sections?.footerText ?? settings.templateConfig.textoRodape}
                      onChange={(e) => {
                        handleToggleSection("footerText", e.target.value);
                        triggerDebouncedSettingsUpdate({ templateConfig: { textoRodape: e.target.value } });
                      }}
                      className="h-16 resize-none text-xs"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* ── PAINEL DE VISUALIZAÇÃO AO VIVO EM TEMPO REAL (7 colunas ou 12 colunas) ── */}
        <div className={`${viewMode === "split" ? "lg:col-span-7" : "col-span-1"} flex flex-col items-center bg-slate-100 dark:bg-slate-950 p-4 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto min-h-[calc(100vh-160px)]`}>
          
          {/* Header da Preview com Régua e Alternador de Dados */}
          <div className="w-full max-w-[210mm] flex items-center justify-between mb-4 px-2 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Folha A4 (210 × 297 mm)
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                Ao Vivo
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">Dados da Prévia:</span>
              <button
                type="button"
                onClick={() => setUseRealData(false)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!useRealData ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-slate-500"}`}
              >
                Com Fotos & PIX
              </button>
              <button
                type="button"
                onClick={() => setUseRealData(true)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${useRealData ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-slate-500"}`}
              >
                Serviços & Peças
              </button>
            </div>
          </div>

          {/* Canvas A4 com Escala de Zoom Dinâmica */}
          <div 
            ref={previewContainerRef}
            className="w-full flex justify-center origin-top transition-transform duration-150"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              marginBottom: `${(zoomLevel - 100) * 8}px`,
            }}
          >
            <DynamicQuoteRenderer
              data={useRealData ? {
                ...MOCK_QUOTE_PREVIEW_DATA,
                numero: "ORC-2026-9901",
                tipo: "orcamento",
                itens: [
                  {
                    codigo: "SRV-MANUT-01",
                    descricao: "Contrato Trimestral de Suporte e Manutenção Protheus ERP 24x7",
                    quantidade: 3,
                    unidade: "MES",
                    precoUnitario: 3500.00,
                    descontoPercentual: 0,
                    subtotal: 10500.00,
                    ncm: "0000.00.00",
                    aliquotaImposto: 5,
                    prazoItem: "Imediato",
                    especificacao: "SLA de 2 horas para incidentes críticos com monitoramento contínuo",
                  },
                  {
                    codigo: "LIC-ADV-USR",
                    descricao: "Pacote de 10 Licenças de Acesso Concorrente Módulo Financeiro",
                    quantidade: 1,
                    unidade: "PC",
                    precoUnitario: 18900.00,
                    descontoPercentual: 8,
                    subtotal: 17388.00,
                    ncm: "8523.49.90",
                    aliquotaImposto: 12,
                    prazoItem: "24 horas",
                    especificacao: "Chave de ativação digital homologada",
                  }
                ],
                totais: {
                  subtotalProdutos: 29400.00,
                  descontoTotal: 1512.00,
                  valorFrete: 0,
                  valorImpostos: 2611.56,
                  valorTotal: 27888.00,
                  margemLucroPercentual: 42.0,
                }
              } : MOCK_QUOTE_PREVIEW_DATA}
              settings={settings}
            />
          </div>
        </div>
      </div>

      {/* ── DIALOG DE CRIAÇÃO DE NOVO MODELO ── */}
      <Dialog open={newPresetDialogOpen} onOpenChange={setNewPresetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Criar Novo Modelo de Orçamento
            </DialogTitle>
            <DialogDescription>
              Salve as configurações visuais atuais como um novo modelo reutilizável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nome do Modelo</Label>
              <Input
                placeholder="Ex: Proposta Especial Grandes Contas"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Descrição / Aplicação</Label>
              <Input
                placeholder="Ex: Utilizado para clientes corporativos com foco em serviços"
                value={newPresetDesc}
                onChange={(e) => setNewPresetDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewPresetDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreateNewPreset} 
              disabled={!newPresetName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Criar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
