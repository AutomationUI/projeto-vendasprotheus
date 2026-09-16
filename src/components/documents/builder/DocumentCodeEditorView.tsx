import React, { useState, useEffect } from "react";
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Play, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FileJson,
  Undo2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import { DocumentBlock, DocumentTemplatePreset, QuoteDocumentData } from "@/types/document-template";
import { AppSettings } from "@/lib/settings-store";
import { generateFullDocumentHtml } from "@/lib/document-html-generator";

interface DocumentCodeEditorViewProps {
  preset: DocumentTemplatePreset;
  blocks: DocumentBlock[];
  settings: AppSettings;
  previewData: QuoteDocumentData;
  onUpdateBlocks: (blocks: DocumentBlock[]) => void;
  onUpdatePreset: (updatedPreset: Partial<DocumentTemplatePreset>) => void;
  activeFormat?: "json" | "html";
  onChangeFormat?: (format: "json" | "html") => void;
  isSplitView?: boolean;
}

export function DocumentCodeEditorView({
  preset,
  blocks,
  settings,
  previewData,
  onUpdateBlocks,
  onUpdatePreset,
  activeFormat = "json",
  onChangeFormat,
  isSplitView: _isSplitView = false,
}: DocumentCodeEditorViewProps) {
  const { toast } = useToast();
  const [currentFormat, setCurrentFormat] = useState<"json" | "html">(activeFormat);
  
  // JSON State
  const [jsonCode, setJsonCode] = useState<string>("");
  const [syncedJsonCode, setSyncedJsonCode] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonAutoSync, setJsonAutoSync] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // HTML State
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [syncedHtmlCode, setSyncedHtmlCode] = useState<string>("");
  const [htmlRawVariables, setHtmlRawVariables] = useState<boolean>(false);

  // Sincronizar o formato externo
  useEffect(() => {
    if (activeFormat) {
      setCurrentFormat(activeFormat);
    }
  }, [activeFormat]);

  // Atualizar JSON quando preset ou blocks mudarem externamente
  useEffect(() => {
    const dataToSerialize = {
      preset: {
        id: preset.id,
        name: preset.name,
        description: preset.description,
        archetype: preset.archetype,
        fontFamily: preset.fontFamily,
        radius: preset.radius,
        colors: preset.colors,
        sections: preset.sections,
      },
      blocks: blocks,
      meta: {
        totalBlocks: blocks.length,
        lastGenerated: new Date().toISOString(),
        version: "2.5.0",
      }
    };
    const formattedJson = JSON.stringify(dataToSerialize, null, 2);
    setSyncedJsonCode(formattedJson);
    
    // Se o código atual for igual ao anterior sincronizado ou estiver vazio, atualiza
    if (!jsonCode || jsonCode === syncedJsonCode) {
      setJsonCode(formattedJson);
    }
    setJsonError(null);
  }, [preset, blocks]);

  // Atualizar HTML quando blocks, preset ou opções mudarem
  useEffect(() => {
    const fullHtml = generateFullDocumentHtml(
      preset,
      blocks,
      previewData,
      settings,
      { rawVariables: htmlRawVariables, title: `Orcamento_${previewData.numero}` }
    );
    setSyncedHtmlCode(fullHtml);

    // Se o código atual estiver sincronizado ou vazio, atualiza
    if (!htmlCode || htmlCode === syncedHtmlCode) {
      setHtmlCode(fullHtml);
    }
  }, [preset, blocks, previewData, settings, htmlRawVariables]);

  // Verificar se existem alterações pendentes no JSON e HTML
  const isJsonDirty = jsonCode.trim() !== syncedJsonCode.trim();
  const isHtmlDirty = htmlCode.trim() !== syncedHtmlCode.trim();

  // ─── Ações de JSON ─────────────────────────────────────
  const handleJsonChange = (val: string) => {
    setJsonCode(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError(null);

      if (jsonAutoSync) {
        applyParsedJson(parsed, false);
      }
    } catch (err: any) {
      setJsonError(err.message || "Sintaxe JSON inválida");
    }
  };

  const applyParsedJson = (parsed: any, showToast: boolean = true) => {
    try {
      const newBlocks: DocumentBlock[] = Array.isArray(parsed.blocks) 
        ? parsed.blocks 
        : Array.isArray(parsed) 
        ? parsed 
        : parsed.preset?.blocks || [];

      if (!Array.isArray(newBlocks)) {
        throw new Error("O JSON precisa conter uma lista de blocos (array 'blocks').");
      }

      // Validar cada bloco básico
      const validatedBlocks = newBlocks.map((b: any, idx: number) => ({
        id: b.id || `block-${Date.now()}-${idx}`,
        type: b.type || "text",
        title: b.title,
        content: b.content,
        config: b.config || {},
        style: b.style || {},
        hidden: Boolean(b.hidden),
      }));

      onUpdateBlocks(validatedBlocks);

      if (parsed.preset && typeof parsed.preset === "object") {
        onUpdatePreset({
          name: parsed.preset.name || preset.name,
          archetype: parsed.preset.archetype || preset.archetype,
          fontFamily: parsed.preset.fontFamily || preset.fontFamily,
          radius: parsed.preset.radius || preset.radius,
          colors: parsed.preset.colors || preset.colors,
          sections: parsed.preset.sections || preset.sections,
        });
      }

      // Marcar o estado atual como sincronizado
      setSyncedJsonCode(val || jsonCode);

      if (showToast) {
        toast({
          title: "JSON Aplicado ao Layout!",
          description: `${validatedBlocks.length} blocos sincronizados com o editor visual.`,
        });
      }
    } catch (err: any) {
      setJsonError(err.message);
      if (showToast) {
        toast({
          title: "Erro ao aplicar JSON",
          description: err.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleResetJson = () => {
    setJsonCode(syncedJsonCode);
    setJsonError(null);
    toast({
      title: "Alterações no JSON Desfeitas",
      description: "O código voltou ao estado sincronizado com o layout.",
    });
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonCode(formatted);
      setJsonError(null);
      toast({ title: "JSON Formatado com Sucesso!" });
    } catch (err: any) {
      setJsonError(err.message);
    }
  };

  // ─── Ações de HTML ─────────────────────────────────────
  const handleApplyHtmlToLayout = () => {
    // Quando o usuário edita o HTML manualmente, podemos transformar o HTML em um bloco custom_html principal ou aplicar
    try {
      const updatedBlock: DocumentBlock = {
        id: `block-html-${Date.now()}`,
        type: "custom_html",
        title: "Layout HTML Customizado",
        content: htmlCode,
        style: {
          paddingTop: 8,
          paddingBottom: 8,
        }
      };

      // Adicionar ou atualizar como bloco custom_html
      onUpdateBlocks([updatedBlock]);
      setSyncedHtmlCode(htmlCode);

      toast({
        title: "HTML Aplicado ao Layout!",
        description: "O layout visual foi atualizado com o código HTML editado.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao aplicar HTML",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleResetHtml = () => {
    setHtmlCode(syncedHtmlCode);
    toast({
      title: "Alterações no HTML Desfeitas",
      description: "O código voltou ao estado original gerado pelo layout.",
    });
  };

  const handleCopyCode = (format: "json" | "html") => {
    const textToCopy = format === "json" ? jsonCode : htmlCode;
    copyToClipboard(textToCopy);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
    toast({
      title: `Código .${format.toUpperCase()} Copiado!`,
      description: "Conteúdo copiado para a área de transferência.",
    });
  };

  const handleDownloadFile = (format: "json" | "html") => {
    const content = format === "json" ? jsonCode : htmlCode;
    const type = format === "json" ? "application/json" : "text/html";
    const filename = `layout-orcamento-${preset.name.toLowerCase().replace(/\s+/g, "-")}.${format}`;

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: `Arquivo .${format.toUpperCase()} Baixado!`,
      description: `Arquivo salvo como ${filename}`,
    });
  };

  return (
    <div className="flex flex-col h-full space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-4">
      
      {/* ── CABEÇALHO DO EDITOR DE CÓDIGO ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        
        {/* Seletor de Formato: JSON vs HTML */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setCurrentFormat("json");
                if (onChangeFormat) onChangeFormat("json");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentFormat === "json"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>Estrutura .JSON</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentFormat("html");
                if (onChangeFormat) onChangeFormat("html");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentFormat === "html"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Código .HTML</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline-block">
            {currentFormat === "json" ? "Edite o JSON para alterar propriedades e blocos ao vivo" : "Visualize e edite a marcação HTML com tags dinâmicas"}
          </span>
        </div>

        {/* Botões de Ação do Editor */}
        <div className="flex flex-wrap items-center gap-2">
          {currentFormat === "json" ? (
            <>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Switch
                  id="json-autosync"
                  checked={jsonAutoSync}
                  onCheckedChange={setJsonAutoSync}
                  className="scale-75 data-[state=checked]:bg-emerald-600"
                />
                <Label htmlFor="json-autosync" className="text-[11px] font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                  Auto-Sincronizar
                </Label>
              </div>

              {isJsonDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold gap-1"
                  onClick={handleResetJson}
                  title="Desfazer alterações no JSON"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Desfazer</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleFormatJson}
                title="Formatar indentação do JSON"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Formatar</span>
              </Button>

              <Button
                size="sm"
                variant={isJsonDirty ? "default" : "outline"}
                className={`h-8 text-xs gap-1.5 transition-all ${
                  isJsonDirty
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400 animate-pulse"
                    : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shadow-none font-medium hover:bg-slate-100/80"
                }`}
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonCode);
                    applyParsedJson(parsed, true);
                  } catch (err: any) {
                    toast({ title: "JSON Inválido", description: err.message, variant: "destructive" });
                  }
                }}
                title={isJsonDirty ? "Clique para aplicar as alterações do JSON ao layout visual" : "Sem alterações pendentes no JSON"}
              >
                {isJsonDirty ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Aplicar ao Layout</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Aplicar ao Layout</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <Switch
                  id="html-variables-toggle"
                  checked={htmlRawVariables}
                  onCheckedChange={setHtmlRawVariables}
                  className="scale-75 data-[state=checked]:bg-indigo-600"
                />
                <Label htmlFor="html-variables-toggle" className="text-[11px] font-semibold cursor-pointer text-slate-700 dark:text-slate-300">
                  {htmlRawVariables ? "Tags Brutas {{...}}" : "Dados Preenchidos"}
                </Label>
              </div>

              {isHtmlDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold gap-1"
                  onClick={handleResetHtml}
                  title="Desfazer alterações no HTML"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Desfazer</span>
                </Button>
              )}

              <Button
                size="sm"
                variant={isHtmlDirty ? "default" : "outline"}
                className={`h-8 text-xs gap-1.5 transition-all ${
                  isHtmlDirty
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400 animate-pulse"
                    : "text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shadow-none font-medium hover:bg-slate-100/80"
                }`}
                onClick={handleApplyHtmlToLayout}
                title={isHtmlDirty ? "Clique para aplicar as alterações do HTML ao layout visual" : "Sem alterações pendentes no HTML"}
              >
                {isHtmlDirty ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Aplicar ao Layout</span>
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Aplicar ao Layout</span>
                  </>
                )}
              </Button>
            </>
          )}

          {/* Copiar e Baixar */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => handleCopyCode(currentFormat)}
            title={`Copiar código .${currentFormat}`}
          >
            {copiedFormat === currentFormat ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Copiar</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => handleDownloadFile(currentFormat)}
            title={`Baixar arquivo .${currentFormat}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">.{currentFormat}</span>
          </Button>
        </div>
      </div>

      {/* ── CORPO PRINCIPAL DO EDITOR ── */}
      <div className="flex-1 flex flex-col min-h-[calc(100vh-220px)]">
        
        {/* Status de Validação e Modificação do JSON */}
        {currentFormat === "json" && (
          <div className="mb-2 space-y-2">
            {isJsonDirty && (
              <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
                  <span className="font-bold text-amber-900 dark:text-amber-100">Estrutura .JSON Modificada</span>
                  <span className="text-amber-800/80 dark:text-amber-300 hidden sm:inline">
                    — Clique no botão destacado <strong>"Aplicar ao Layout"</strong> para sincronizar.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold"
                  onClick={handleResetJson}
                >
                  Desfazer
                </Button>
              </div>
            )}
            {jsonError ? (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-mono text-[11px] truncate flex-1">{jsonError}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] font-medium">
                    Sintaxe JSON válida • {blocks.length} blocos ativos vinculados ao orçamento
                  </span>
                </div>
                {!isJsonDirty && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ Em Sincronia
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Status de Informações e Modificação do HTML */}
        {currentFormat === "html" && (
          <div className="mb-2 space-y-2">
            {isHtmlDirty && (
              <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
                  <span className="font-bold text-amber-900 dark:text-amber-100">Código .HTML Modificado</span>
                  <span className="text-amber-800/80 dark:text-amber-300 hidden sm:inline">
                    — Clique no botão destacado <strong>"Aplicar ao Layout"</strong> para atualizar o documento.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold"
                  onClick={handleResetHtml}
                >
                  Desfazer
                </Button>
              </div>
            )}
            <div className="flex items-center justify-between px-2.5 py-1 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-lg text-xs text-indigo-700 dark:text-indigo-300">
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium">
                  Documento HTML A4 autônomo com estilos CSS embutidos e tags dinâmicas
                </span>
              </div>
              <span className="font-mono text-[10px] bg-indigo-100 dark:bg-indigo-900 px-2 py-0.5 rounded text-indigo-800 dark:text-indigo-200 font-bold">
                {htmlRawVariables ? "Modo Template" : "Modo Renderizado"}
              </span>
            </div>
          </div>
        )}

        {/* Área de Texto do Código (Monospace) */}
        <div className="relative flex-1 flex flex-col">
          <Textarea
            value={currentFormat === "json" ? jsonCode : htmlCode}
            onChange={(e) => {
              if (currentFormat === "json") {
                handleJsonChange(e.target.value);
              } else {
                setHtmlCode(e.target.value);
              }
            }}
            placeholder={currentFormat === "json" ? "Cole ou edite a estrutura JSON aqui..." : "Edite a marcação HTML aqui..."}
            className="w-full flex-1 min-h-[calc(100vh-250px)] p-4 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 dark:bg-slate-950 dark:text-emerald-300 border border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-inner resize-none select-text"
            spellCheck={false}
          />
        </div>

        {/* Rodapé Informativo */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>Formato: <strong className="uppercase font-mono text-indigo-600 dark:text-indigo-400">.{currentFormat}</strong></span>
            <span>Modelo: <strong>{preset.name}</strong></span>
          </div>
          <div className="text-[10px] text-slate-400">
            Qualquer alteração efetuada atualiza o layout visual do orçamento
          </div>
        </div>
      </div>
    </div>
  );
}
