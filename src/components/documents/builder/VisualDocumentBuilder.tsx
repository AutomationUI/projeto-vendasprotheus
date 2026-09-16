import React, { useState, useEffect, useRef, useMemo } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  Palette, 
  Plus, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff,
  Printer, 
  Save, 
  Download, 
  Upload, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  FileCode, 
  Check, 
  Sparkles, 
  Layers, 
  Undo2, 
  CheckCircle2, 
  Sliders, 
  RefreshCw,
  FolderOpen,
  Variable,
  GripVertical,
  HelpCircle,
  Info,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import { printElement } from "@/lib/print-utils";
import { AppSettings, getSettings, updateSettings } from "@/lib/settings-store";
import { DocumentBlock, DocumentBlockType, DocumentTemplatePreset, QuoteDocumentData } from "@/types/document-template";
import { DOCUMENT_PRESETS, MOCK_QUOTE_PREVIEW_DATA } from "@/lib/document-presets";
import { createDefaultBlocksFromPreset, createNewBlock, mapVariableUsagesInBlocks } from "@/lib/document-variables";
import { getActiveDraggedVariableTag } from "@/lib/drag-variable-utils";
import { PAPER_SIZES_CONFIG, PaperSizeFormat, PaperOrientation, getPaperStyleDimensions } from "@/lib/paper-sizes";
import { localDB } from "@/lib/local-db";
import { BlockComponentList } from "./BlockComponentList";
import { BlockPropertyInspector } from "./BlockPropertyInspector";
import { BlockRenderer } from "./BlockRenderer";
import { DocumentVariablesPanel } from "./DocumentVariablesPanel";
import { DocumentCodeEditorView } from "./DocumentCodeEditorView";
import { VariableColorLegendBar } from "./VariableColorLegendBar";

import { TooltipProvider } from "@/components/ui/tooltip";

interface VisualDocumentBuilderProps {
  initialPresetId?: string;
  onSaveSuccess?: () => void;
}

export function VisualDocumentBuilder({
  initialPresetId,
  onSaveSuccess,
}: VisualDocumentBuilderProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialPresetId || settings.templateConfig.activePresetId || "preset-executivo"
  );
  
  // Modo de visualização: Visual (Canvas A4) | Código (.JSON/.HTML) | Dividido (Split View)
  const [viewMode, setViewMode] = useState<"visual" | "code" | "split">("visual");
  const [codeFormat, setCodeFormat] = useState<"json" | "html">("json");

  // Lista de blocos ativos
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Visualização, Zoom e Formatação do Papel para Impressão/Preview
  const [zoomLevel, setZoomLevel] = useState<number>(85);
  const [paperSize, setPaperSize] = useState<PaperSizeFormat>("a4");
  const [paperOrientation, setPaperOrientation] = useState<PaperOrientation>("portrait");
  const [pageMargin, setPageMargin] = useState<number>(18);
  const [marketGuideOpen, setMarketGuideOpen] = useState<boolean>(false);

  // Forçar atualização do estilo baseada na orientação
  const paperStyle = useMemo(() => {
    const style = getPaperStyleDimensions(paperSize, paperOrientation);
    console.log("DEBUG: Orientação:", paperOrientation, "Style:", style);
    return style;
  }, [paperSize, paperOrientation]);

  const [activeTabPanel, setActiveTabPanel] = useState<"blocks" | "properties">("blocks");
  const [sidebarTab, setSidebarTab] = useState<"blocks" | "variables">("blocks");

  // Destaque de Variáveis por Cores e Seleção de Campos
  const [highlightVariables, setHighlightVariables] = useState<boolean>(true);
  const [selectedVariableTag, setSelectedVariableTag] = useState<string | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [showPanels, setShowPanels] = useState<boolean>(true);
  
  // Orçamentos Reais para Preview
  const [availableQuotes, setAvailableQuotes] = useState<any[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("mock-default");
  const [previewData, setPreviewData] = useState<QuoteDocumentData>(MOCK_QUOTE_PREVIEW_DATA);

  // Modais de JSON / Novo Modelo
  const [jsonExportOpen, setJsonExportOpen] = useState(false);
  const [jsonImportOpen, setJsonImportOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState("");
  const [newPresetDialogOpen, setNewPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDesc, setNewPresetDesc] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const lastFocusedInputRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; start: number; end: number } | null>(null);

  // Estados para redimensionamento por arraste
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeInitialWidth, setResizeInitialWidth] = useState<string>("full");
  
  const widths = ["1/5", "1/4", "1/3", "2/5", "1/2", "3/5", "2/3", "3/4", "4/5", "full"];

  // Efeito para gerenciar eventos de mouse globais durante redimensionamento
  useEffect(() => {
    if (!resizingBlockId) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeStartX;
        const threshold = 50; // pixels para mudar de passo de largura
        
        if (Math.abs(deltaX) > threshold) {
          const direction = deltaX > 0 ? "grow" : "shrink";
          handleUpdateBlockWidth(resizingBlockId, direction);
          setResizeStartX(e.clientX);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setResizingBlockId(null);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingBlockId, resizeStartX]);

  // Monitorar o último campo de input/textarea com foco para inserção precisa de variáveis
  useEffect(() => {
    const handleFocusOrSelection = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        // Não registrar o campo de busca de variáveis para evitar auto-inserção na busca
        if (inputEl.getAttribute("placeholder")?.includes("Buscar tag")) return;
        
        lastFocusedInputRef.current = {
          element: inputEl,
          start: inputEl.selectionStart ?? inputEl.value.length,
          end: inputEl.selectionEnd ?? inputEl.value.length,
        };
      }
    };

    document.addEventListener("focusin", handleFocusOrSelection, true);
    document.addEventListener("keyup", handleFocusOrSelection, true);
    document.addEventListener("click", handleFocusOrSelection, true);

    return () => {
      document.removeEventListener("focusin", handleFocusOrSelection, true);
      document.removeEventListener("keyup", handleFocusOrSelection, true);
      document.removeEventListener("click", handleFocusOrSelection, true);
    };
  }, []);

  // Carregar dados de orçamentos reais do localDB
  useEffect(() => {
    try {
      const realQuotes = localDB.getQuotes();
      setAvailableQuotes(realQuotes || []);
    } catch {
      setAvailableQuotes([]);
    }
  }, []);

  // Obter o preset ativo atual
  const currentPreset = (settings.savedPresets || DOCUMENT_PRESETS).find(p => p.id === selectedPresetId) || DOCUMENT_PRESETS[0];

  // Snapshot inicial do layout para rastrear modificações pendentes
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");

  // Carregar blocos do preset selecionado e registrar o snapshot base
  useEffect(() => {
    let initialBlocks = currentPreset.blocks;
    if (!initialBlocks || initialBlocks.length === 0) {
      initialBlocks = createDefaultBlocksFromPreset(currentPreset);
    }
    setBlocks(initialBlocks);
    setSelectedBlockId(null);

    const snap = JSON.stringify({
      blocks: initialBlocks,
      paperSize,
      paperOrientation,
      pageMargin,
      colors: currentPreset.colors,
      archetype: currentPreset.archetype,
      fontFamily: currentPreset.fontFamily,
      radius: currentPreset.radius,
    });
    setInitialSnapshot(snap);
  }, [selectedPresetId]);

  // Snapshot atual do layout
  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      blocks,
      paperSize,
      paperOrientation,
      pageMargin,
      colors: currentPreset.colors,
      archetype: currentPreset.archetype,
      fontFamily: currentPreset.fontFamily,
      radius: currentPreset.radius,
    });
  }, [blocks, paperSize, paperOrientation, pageMargin, currentPreset]);

  // Status de modificação pendente no layout do orçamento
  const isLayoutDirty = initialSnapshot !== "" && currentSnapshot !== initialSnapshot;

  // Restaurar layout para o snapshot salvo
  const handleResetLayoutToSaved = () => {
    if (!initialSnapshot) return;
    try {
      const parsed = JSON.parse(initialSnapshot);
      if (parsed.blocks) setBlocks(parsed.blocks);
      if (parsed.paperSize) setPaperSize(parsed.paperSize);
      if (parsed.paperOrientation) setPaperOrientation(parsed.paperOrientation);
      if (parsed.pageMargin) setPageMargin(parsed.pageMargin);
      toast({
        title: "Layout Restaurado",
        description: "As alterações não salvas no layout foram desfeitas com sucesso.",
      });
    } catch (err: any) {
      toast({ title: "Erro ao restaurar", description: err.message, variant: "destructive" });
    }
  };

  // Atualizar dados de preview quando o seletor de orçamento mudar
  useEffect(() => {
    if (selectedQuoteId === "mock-default") {
      setPreviewData(MOCK_QUOTE_PREVIEW_DATA);
    } else if (selectedQuoteId === "mock-services") {
      setPreviewData({
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
      });
    } else {
      // Buscar orçamento real selecionado
      const found = availableQuotes.find(q => String(q.id) === selectedQuoteId || String(q.number) === selectedQuoteId);
      if (found) {
        setPreviewData({
          numero: found.number || found.id || "ORC-REAL",
          tipo: found.status === "approved" ? "pedido" : "orcamento",
          dataEmissao: found.date || new Date().toISOString(),
          dataValidade: found.validUntil || new Date(Date.now() + 15 * 86400000).toISOString(),
          status: found.status || "Pendente",
          cliente: {
            nome: found.customerName || "Cliente Protheus",
            cnpjCpf: found.customerCpfCnpj || "00.000.000/0001-00",
            endereco: found.customerAddress || "Endereço Cadastrado no ERP",
            cidade: found.customerCity || "São Paulo",
            estado: found.customerState || "SP",
            telefone: found.customerPhone || "(11) 9999-9999",
            email: found.customerEmail || "contato@cliente.com.br",
          },
          vendedor: {
            nome: found.sellerName || "Consultor Protheus",
            email: "comercial@vendasprotheus.com.br",
            telefone: "(11) 3456-8000",
            departamento: "Vendas Corporativas",
          },
          condicoes: {
            pagamento: found.paymentTerm || "30 dias no boleto",
            prazoEntrega: "7 a 10 dias úteis",
            tipoFrete: "CIF",
          },
          itens: Array.isArray(found.items) && found.items.length > 0 ? found.items.map((it: any, idx: number) => ({
            codigo: it.productCode || `PROD-${idx + 1}`,
            descricao: it.productDescription || it.productName || "Item de Orçamento",
            quantidade: it.quantity || 1,
            unidade: it.unit || "UN",
            precoUnitario: it.unitPrice || 100,
            descontoPercentual: it.discount || 0,
            subtotal: it.totalPrice || (it.quantity || 1) * (it.unitPrice || 100),
            ncm: "8471.30.12",
            aliquotaImposto: 12,
            prazoItem: "Pronta Entrega",
          })) : MOCK_QUOTE_PREVIEW_DATA.itens,
          totais: {
            subtotalProdutos: found.subtotal || found.totalValue || 1000,
            descontoTotal: found.discount || 0,
            valorFrete: 0,
            valorImpostos: ((found.totalValue || 1000) * 0.12),
            valorTotal: found.totalValue || 1000,
            margemLucroPercentual: 35.0,
          },
          observacoes: found.notes || "Proposta gerada através do sistema integrado Protheus.",
        });
      }
    }
  }, [selectedQuoteId, availableQuotes]);

  // Adicionar novo bloco
  const handleAddBlock = (type: DocumentBlockType, targetIndex?: number) => {
    const newB = createNewBlock(type, currentPreset.archetype, currentPreset.colors.primary);
    setBlocks(prev => {
      if (targetIndex !== undefined && targetIndex >= 0) {
        const copy = [...prev];
        copy.splice(targetIndex, 0, newB);
        return copy;
      }
      return [...prev, newB];
    });
    setSelectedBlockId(newB.id);
    setActiveTabPanel("properties");
    toast({
      title: `Bloco "${newB.title}" adicionado`,
      description: "Você pode personalizá-lo no painel de propriedades à direita.",
    });
  };

  // Atualizar bloco
  const handleUpdateBlockWidth = (blockId: string, direction: "grow" | "shrink") => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    const currentWidth = block.style?.width || "full";
    const currentIndex = widths.indexOf(currentWidth);
    
    let nextIndex = currentIndex;
    if (direction === "grow" && currentIndex < widths.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === "shrink" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }
    
    if (nextIndex !== currentIndex) {
      const updatedBlock = {
        ...block,
        style: {
          ...block.style,
          width: widths[nextIndex]
        }
      };
      handleUpdateBlock(updatedBlock);
    }
  };

  const handleUpdateBlock = (updated: DocumentBlock) => {
    setBlocks(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  // Excluir bloco
  const handleDeleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    toast({
      title: "Bloco removido",
      description: "O bloco foi excluído do documento.",
    });
  };

  // Duplicar bloco
  const handleDuplicateBlock = (id: string) => {
    const target = blocks.find(b => b.id === id);
    if (!target) return;
    const duplicated: DocumentBlock = {
      ...target,
      id: `block-${target.type}-${Date.now().toString(36)}`,
      title: `${target.title || target.type} (Cópia)`,
    };
    const index = blocks.findIndex(b => b.id === id);
    setBlocks(prev => {
      const copy = [...prev];
      copy.splice(index + 1, 0, duplicated);
      return copy;
    });
    setSelectedBlockId(duplicated.id);
    toast({
      title: "Bloco duplicado",
      description: "Uma cópia exata do bloco foi inserida abaixo.",
    });
  };

  // Mover bloco para cima ou para baixo
  const handleMoveBlock = (id: string, direction: "up" | "down") => {
    const index = blocks.findIndex(b => b.id === id);
    if (index < 0) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setBlocks(prev => {
      const copy = [...prev];
      const item = copy.splice(index, 1)[0];
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  };

  // Injetar variável no campo de texto ativo, bloco selecionado ou copiar para o clipboard
  const handleInjectVariable = (tag: string) => {
    let injectedInField = false;

    // 1. Se houver um input / textarea recentemente focado
    if (lastFocusedInputRef.current && document.body.contains(lastFocusedInputRef.current.element)) {
      const el = lastFocusedInputRef.current.element;
      const start = lastFocusedInputRef.current.start ?? el.value.length;
      const end = lastFocusedInputRef.current.end ?? el.value.length;
      const currentVal = el.value || "";
      const newVal = currentVal.substring(0, start) + tag + currentVal.substring(end);

      // Resetar o tracker interno do React 18 para garantir que o evento onChange seja disparado
      const tracker = (el as any)._valueTracker;
      if (tracker) {
        tracker.setValue(currentVal);
      }

      const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (valueSetter) {
        valueSetter.call(el, newVal);
      } else {
        el.value = newVal;
      }

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      
      const newCursorPos = start + tag.length;
      try {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      } catch {
        // Ignorar se não for possível focar
      }

      lastFocusedInputRef.current = {
        element: el,
        start: newCursorPos,
        end: newCursorPos
      };

      injectedInField = true;
    }

    // 2. Se há um bloco selecionado no editor, atualizar também o estado do bloco para total sincronização
    if (selectedBlockId) {
      const target = blocks.find(b => b.id === selectedBlockId);
      if (target) {
        const updatedBlock: DocumentBlock = { ...target };
        let blockModified = false;

        if (
          target.type === "text" ||
          target.type === "heading" ||
          target.type === "card" ||
          target.type === "button" ||
          target.type === "custom_html" ||
          target.type === "notes" ||
          target.type === "bank_details" ||
          target.type === "footer"
        ) {
          const current = target.content || "";
          // Se não foi inserido via campo específico, adiciona ao content
          if (!injectedInField) {
            updatedBlock.content = current ? `${current} ${tag}` : tag;
            blockModified = true;
          }
        } else if (target.type === "variables_grid" || target.type === "variables_inline") {
          if (!injectedInField) {
            const currentItems = target.config?.items || [];
            const label = tag.replace("{{", "").replace("}}", "").split('.').pop();
            const newItem = {
              id: `item-${Date.now().toString(36)}`,
              label: label ? label.charAt(0).toUpperCase() + label.slice(1) : "Novo Campo",
              value: tag,
            };
            updatedBlock.config = {
              ...(target.config || {}),
              items: [...currentItems, newItem],
            };
            blockModified = true;
          }
        } else if (target.type === "commercial_terms") {
          if (!injectedInField) {
            const current = target.config?.commercialText || "";
            updatedBlock.config = {
              ...(target.config || {}),
              commercialText: current ? `${current} ${tag}` : tag,
            };
            blockModified = true;
          }
        } else if (target.type === "signatures") {
          if (!injectedInField) {
            const current = target.config?.termsText || "";
            updatedBlock.config = {
              ...(target.config || {}),
              termsText: current ? `${current} ${tag}` : tag,
            };
            blockModified = true;
          }
        } else if (target.type === "pix_payment") {
          if (!injectedInField) {
            updatedBlock.config = {
              ...(target.config || {}),
              pixKey: tag,
            };
            blockModified = true;
          }
        }

        if (blockModified) {
          setBlocks(prev => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
          toast({
            title: "Tag inserida no Bloco!",
            description: `${tag} adicionada ao bloco "${target.title || target.type}".`,
          });
          return;
        }
      }
    }

    if (injectedInField) {
      toast({
        title: "Tag Injetada no Campo!",
        description: `Variável ${tag} inserida com sucesso no formulário.`,
      });
      return;
    }

    // 3. Fallback: Copiar para a área de transferência
    copyToClipboard(tag);
    toast({
      title: "Tag Copiada!",
      description: `Código ${tag} copiado para a área de transferência. Clique em um campo de texto para colar ou selecione um bloco.`,
    });
  };

  // Mapear usos de variáveis em todos os blocos ativos
  const variableUsages = useMemo(() => {
    return mapVariableUsagesInBlocks(blocks);
  }, [blocks]);

  // Handler de seleção interativa de variável / campo correspondente a partir do Layout
  const handleSelectFieldOrVariable = (blockId: string, fieldName: string, tag: string) => {
    setSelectedBlockId(blockId);
    setHighlightedField(fieldName);
    setSelectedVariableTag(tag);
    setActiveTabPanel("properties");
    
    // Feedback amigável para o usuário
    toast({
      title: `Campo Selecionado: ${fieldName}`,
      description: `Variável ${tag} localizada no bloco. O campo correspondente está destacado à direita.`,
    });
  };

  // Limpar seleção de variável
  const handleClearVariableSelection = () => {
    setSelectedVariableTag(null);
    setHighlightedField(null);
    setActiveCategoryFilter(null);
  };

  // Drag & Drop Handlers no Canvas
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    // Se for um bloco novo arrastado da barra lateral
    const newBlockType = e.dataTransfer.getData("application/document-block-type") as DocumentBlockType;
    if (newBlockType) {
      handleAddBlock(newBlockType, targetIndex);
      return;
    }

    // Se for uma variável arrastada do painel de variáveis para o Canvas
    const draggedVariableTag = e.dataTransfer.getData("application/document-variable-tag") || e.dataTransfer.getData("text/plain");
    if (draggedVariableTag && draggedVariableTag.startsWith("{{") && draggedVariableTag.endsWith("}}")) {
      const newBlock: DocumentBlock = {
        id: `block-var-${Date.now()}`,
        type: "text",
        title: "Texto com Variável",
        content: draggedVariableTag,
        style: {
          paddingTop: 6,
          paddingBottom: 6,
        }
      };
      setBlocks(prev => {
        const copy = [...prev];
        copy.splice(targetIndex, 0, newBlock);
        return copy;
      });
      setSelectedBlockId(newBlock.id);
      setActiveTabPanel("properties");
      toast({
        title: "Variável Inserida no Formulário!",
        description: `Bloco criado com a tag ${draggedVariableTag}. Arquivos .JSON e .HTML sincronizados automaticamente.`,
      });
      return;
    }

    // Se for um bloco existente sendo reordenado
    const existingBlockId = e.dataTransfer.getData("application/document-block-id");
    if (existingBlockId) {
      const currentIndex = blocks.findIndex(b => b.id === existingBlockId);
      if (currentIndex >= 0 && currentIndex !== targetIndex) {
        setBlocks(prev => {
          const copy = [...prev];
          const [moved] = copy.splice(currentIndex, 1);
          copy.splice(targetIndex, 0, moved);
          return copy;
        });
      }
    }
  };

  // Salvar Modelo Atual
  const handleSavePreset = () => {
    const updatedPreset: DocumentTemplatePreset = {
      ...currentPreset,
      blocks: blocks,
      updatedAt: new Date().toISOString(),
    };

    const allSaved = settings.savedPresets || DOCUMENT_PRESETS;
    const existingIndex = allSaved.findIndex(p => p.id === updatedPreset.id);
    let newSavedList: DocumentTemplatePreset[];

    if (existingIndex >= 0) {
      newSavedList = allSaved.map(p => p.id === updatedPreset.id ? updatedPreset : p);
    } else {
      newSavedList = [...allSaved, updatedPreset];
    }

    updateSettings({
      savedPresets: newSavedList,
      templateConfig: {
        ...settings.templateConfig,
        activePresetId: updatedPreset.id,
        layout: updatedPreset.archetype,
        primaryColor: updatedPreset.colors.primary,
        accentColor: updatedPreset.colors.accent,
        headerBgColor: updatedPreset.colors.headerBg,
      }
    });

    setSettings(getSettings());

    // Atualizar snapshot inicial com a versão recém-salva
    const newSnap = JSON.stringify({
      blocks,
      paperSize,
      paperOrientation,
      pageMargin,
      colors: updatedPreset.colors,
      archetype: updatedPreset.archetype,
      fontFamily: updatedPreset.fontFamily,
      radius: updatedPreset.radius,
    });
    setInitialSnapshot(newSnap);

    toast({
      title: "Modelo de Orçamento Salvo!",
      description: `O layout "${updatedPreset.name}" foi salvo e aplicado com sucesso.`,
    });
    if (onSaveSuccess) onSaveSuccess();
  };

  // Criar Novo Modelo
  const handleCreateNewPreset = () => {
    if (!newPresetName.trim()) return;

    const newId = `preset-${Date.now()}`;
    const newPreset: DocumentTemplatePreset = {
      id: newId,
      name: newPresetName,
      description: newPresetDesc || "Modelo customizado via Construtor Visual",
      archetype: currentPreset.archetype,
      fontFamily: currentPreset.fontFamily,
      radius: currentPreset.radius,
      colors: { ...currentPreset.colors },
      sections: { ...currentPreset.sections },
      blocks: [...blocks],
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...(settings.savedPresets || DOCUMENT_PRESETS), newPreset];
    updateSettings({
      savedPresets: updatedPresets,
      templateConfig: {
        ...settings.templateConfig,
        activePresetId: newId,
      }
    });

    setSelectedPresetId(newId);
    setSettings(getSettings());
    setNewPresetDialogOpen(false);
    setNewPresetName("");
    setNewPresetDesc("");

    toast({
      title: `Novo modelo "${newPreset.name}" criado!`,
      description: "Agora você pode editá-lo e customizá-lo livremente.",
    });
  };

  // Duplicar Modelo Atual
  const handleDuplicateCurrentPreset = () => {
    const newId = `preset-${Date.now()}`;
    const duplicated: DocumentTemplatePreset = {
      ...currentPreset,
      id: newId,
      name: `${currentPreset.name} (Cópia)`,
      isDefault: false,
      blocks: [...blocks],
      createdAt: new Date().toISOString(),
    };

    const updatedPresets = [...(settings.savedPresets || DOCUMENT_PRESETS), duplicated];
    updateSettings({
      savedPresets: updatedPresets,
      templateConfig: {
        ...settings.templateConfig,
        activePresetId: newId,
      }
    });

    setSelectedPresetId(newId);
    setSettings(getSettings());
    toast({
      title: `Modelo duplicado com sucesso!`,
      description: `Criada a cópia "${duplicated.name}".`,
    });
  };

  // Exportar JSON
  const handleOpenExportJson = () => {
    const exportData = {
      preset: {
        ...currentPreset,
        blocks: blocks,
      },
      exportedAt: new Date().toISOString(),
      version: "2.0.0",
    };
    setJsonContent(JSON.stringify(exportData, null, 2));
    setJsonExportOpen(true);
  };

  // Importar JSON
  const handleApplyImportJson = () => {
    try {
      const parsed = JSON.parse(jsonContent);
      const importedPreset: DocumentTemplatePreset = parsed.preset || parsed;

      if (!importedPreset.name || !Array.isArray(importedPreset.blocks)) {
        throw new Error("Formato JSON inválido. Certifique-se de que o objeto contém 'name' e 'blocks'.");
      }

      const newId = `preset-imported-${Date.now()}`;
      const finalPreset: DocumentTemplatePreset = {
        ...importedPreset,
        id: newId,
        name: `${importedPreset.name} (Importado)`,
      };

      const updatedPresets = [...(settings.savedPresets || DOCUMENT_PRESETS), finalPreset];
      updateSettings({
        savedPresets: updatedPresets,
        templateConfig: {
          ...settings.templateConfig,
          activePresetId: newId,
        }
      });

      setSelectedPresetId(newId);
      setBlocks(finalPreset.blocks || []);
      setSettings(getSettings());
      setJsonImportOpen(false);
      setJsonContent("");

      toast({
        title: "Modelo importado com sucesso!",
        description: `O layout "${finalPreset.name}" foi carregado no construtor.`,
      });
    } catch (err: any) {
      toast({
        title: "Erro na importação JSON",
        description: err.message || "Não foi possível validar a estrutura do arquivo.",
        variant: "destructive",
      });
    }
  };

  // Gerar PDF de alta fidelidade
  const handleGeneratePDF = async () => {
    const element = document.getElementById("printable-builder-document");
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      
      const pdf = new jsPDF({
        orientation: paperOrientation,
        unit: "mm",
        format: paperSize,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orçamento_${currentPreset?.name || "Modelo"}_${paperSize.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      toast({ title: "Erro ao gerar PDF", description: "Não foi possível converter o layout.", variant: "destructive" });
    }
  };

  // Imprimir / Salvar PDF com Formatação de Papel Ativa
  const handlePrint = () => {
    printElement(canvasRef.current || "printable-builder-document", {
      title: `Orçamento_${currentPreset?.name || "Modelo"}_${paperSize.toUpperCase()}`,
      paperSize: paperSize,
      orientation: paperOrientation,
      marginMm: pageMargin,
    });
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId) || null;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* ── BARRA DE CONTROLE SUPERIOR DO CONSTRUTOR ── */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Seletor de Modelo Ativo e Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Modelo:
            </span>
          </div>

          <Select value={selectedPresetId} onValueChange={(val) => setSelectedPresetId(val)}>
            <SelectTrigger className="w-[220px] h-9 font-medium text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(settings.savedPresets || DOCUMENT_PRESETS).map(preset => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                      style={{ backgroundColor: preset.colors.primary }}
                    />
                    <span className="font-medium truncate">{preset.name}</span>
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
            title="Salvar layout atual como novo modelo"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-600" /> Novo Modelo
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs h-9 gap-1.5"
            onClick={handleDuplicateCurrentPreset}
            title="Duplicar modelo selecionado"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" /> Duplicar
          </Button>
        </div>

        {/* Seletor de Modo de Visualização: Visual, Código, Dividido */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode("visual")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === "visual"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Visual</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("code");
              setCodeFormat("json");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === "code"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Código (.JSON / .HTML)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              viewMode === "split"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Modo Dividido</span>
          </button>
        </div>

        {/* Controles de Preview, Zoom, JSON e Impressão */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Orçamento Real */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Prévia:</span>
            <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
              <SelectTrigger className="h-7 w-[160px] text-xs border-0 bg-transparent shadow-none p-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock-default" className="text-xs">Exemplo: Produtos & Fotos</SelectItem>
                <SelectItem value="mock-services" className="text-xs">Exemplo: Serviços & Licenças</SelectItem>
                {availableQuotes.map((q, idx) => (
                  <SelectItem key={idx} value={String(q.id || q.number)} className="text-xs">
                    Real: #{q.number || q.id} - {q.customerName || "Cliente"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zoom */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 dark:text-slate-300"
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 10))}
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700 dark:text-slate-300 min-w-[40px] text-center">
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

          {/* Formatação do Papel para Impressão & Visualização */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <Select value={paperSize} onValueChange={(val: PaperSizeFormat) => setPaperSize(val)}>
              <SelectTrigger className="h-7 min-w-[140px] max-w-[190px] text-xs border-0 bg-transparent shadow-none p-0 font-bold focus:ring-0 truncate">
                <SelectValue placeholder="Tamanho do Papel">
                  <span className="truncate">
                    {PAPER_SIZES_CONFIG[paperSize]?.name || paperSize.toUpperCase()}
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="w-[300px]">
                {Object.values(PAPER_SIZES_CONFIG).map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs py-1.5">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{p.name}</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">{p.marketShare}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Alternar Orientação */}
            <div className="flex items-center border-l border-slate-200 dark:border-slate-700 pl-1.5 gap-0.5">
                <button
                type="button"
                onClick={() => {
                  console.log("Mudando para Retrato");
                  setPaperOrientation("portrait");
                }}
                className={`h-6 px-1.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${
                  paperOrientation === "portrait"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Orientação Retrato (Vertical)"
              >
                📄 Retrato
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log("Mudando para Paisagem");
                  setPaperOrientation("landscape");
                }}
                className={`h-6 px-1.5 rounded text-[10px] font-bold transition-colors whitespace-nowrap ${
                  paperOrientation === "landscape"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
                title="Orientação Paisagem (Horizontal)"
              >
                📜 Paisagem
              </button>
            </div>

            {/* Seletor de Margem */}
            <div className="flex items-center border-l border-slate-200 dark:border-slate-700 pl-1.5 gap-1">
              <span className="text-[10px] text-slate-400 font-medium hidden xl:inline">Margem:</span>
              <Select value={String(pageMargin)} onValueChange={(val) => setPageMargin(Number(val))}>
                <SelectTrigger className="h-6 w-[60px] text-[10px] font-bold border-0 bg-transparent shadow-none p-0 focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10" className="text-xs">10mm (Compacta)</SelectItem>
                  <SelectItem value="18" className="text-xs">18mm (Normal - Padrão)</SelectItem>
                  <SelectItem value="25" className="text-xs">25mm (Ampla)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Guia de Tamanho de Papel no Mercado */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 font-bold gap-1 ml-0.5 border border-amber-200 dark:border-amber-800/60"
              onClick={() => setMarketGuideOpen(true)}
              title="Entenda qual tamanho é mais adequado no mercado"
            >
              <HelpCircle className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Guia Mercado</span>
            </Button>
          </div>

          {/* Acesso Direto a .JSON / .HTML */}
          <Button
            variant={viewMode === "code" && codeFormat === "json" ? "default" : "outline"}
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => {
              setCodeFormat("json");
              setViewMode(viewMode === "split" ? "split" : "code");
            }}
            title="Ver e editar estrutura JSON do orçamento"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> .JSON
          </Button>

          <Button
            variant={viewMode === "code" && codeFormat === "html" ? "default" : "outline"}
            size="sm"
            className="text-xs h-9 gap-1.5"
            onClick={() => {
              setCodeFormat("html");
              setViewMode(viewMode === "split" ? "split" : "code");
            }}
            title="Ver e editar marcação HTML do orçamento"
          >
            <FileCode className="w-3.5 h-3.5 text-slate-600" /> .HTML
          </Button>

          {/* Testar Impressão / PDF */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-slate-300"
            onClick={handlePrint}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" /> Imprimir / PDF
          </Button>

          {/* Toggle Modo de Visualização (Tags / Resultado) */}
          <Button
            variant={!highlightVariables ? "default" : "outline"}
            size="sm"
            className={`text-xs h-9 gap-1.5 ${!highlightVariables ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-400"}`}
            onClick={() => setHighlightVariables(!highlightVariables)}
          >
            <Eye className="w-3.5 h-3.5" /> {!highlightVariables ? "Ver Tags" : "Ver Resultados"}
          </Button>

          {/* Toggle Esconder/Mostrar Painéis */}
          <Button
            variant={!showPanels ? "default" : "outline"}
            size="sm"
            className={`text-xs h-9 gap-1.5 ${!showPanels ? "bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
            onClick={() => setShowPanels(!showPanels)}
            title="Esconder painéis laterais"
          >
            {showPanels ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPanels ? "Esconder Painéis" : "Mostrar Painéis"}
          </Button>

          {/* Gerar PDF de alta fidelidade */}
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-9 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
            onClick={handleGeneratePDF}
          >
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </Button>

          {/* Salvar Layout com Destaque Dinâmico */}
          <Button
            size="sm"
            variant={isLayoutDirty ? "default" : "outline"}
            className={`text-xs h-9 gap-1.5 transition-all ${
              isLayoutDirty
                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400 animate-pulse"
                : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 shadow-none font-medium hover:bg-slate-100/80"
            }`}
            onClick={handleSavePreset}
            title={isLayoutDirty ? "Clique para salvar as alterações do layout ao modelo ativo" : "Layout em sincronia com o modelo salvo"}
          >
            {isLayoutDirty ? (
              <>
                <Save className="w-3.5 h-3.5 fill-current" />
                <span>Salvar Layout</span>
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Salvar Layout</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── BANNER ALERTA DE ALTERAÇÕES PENDENTES NO LAYOUT DE ORÇAMENTO ── */}
      {isLayoutDirty && viewMode !== "code" && (
        <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 font-medium shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <div>
              <span className="font-bold text-amber-950 dark:text-amber-100">Layout de Orçamento Modificado</span>
              <span className="text-amber-800/90 dark:text-amber-300 hidden sm:inline ml-1">
                — Você alterou a estrutura visual do documento. Clique no botão destacado <strong>"Salvar Layout"</strong> para persistir.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900 font-bold gap-1"
              onClick={handleResetLayoutToSaved}
            >
              <Undo2 className="w-3 h-3" />
              <span>Desfazer</span>
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
              onClick={handleSavePreset}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Layout</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── MODO 1: EDITOR DE CÓDIGO (.JSON / .HTML EM TELA CHEIA) ── */}
      {viewMode === "code" && (
        <div className="w-full">
          <DocumentCodeEditorView
            preset={currentPreset}
            blocks={blocks}
            settings={settings}
            previewData={previewData}
            activeFormat={codeFormat}
            onChangeFormat={setCodeFormat}
            onUpdateBlocks={(newBlocks) => {
              setBlocks(newBlocks);
            }}
            onUpdatePreset={(updated) => {
              const newPreset = { ...currentPreset, ...updated };
              const all = (settings.savedPresets || DOCUMENT_PRESETS).map(p => p.id === newPreset.id ? newPreset : p);
              updateSettings({ savedPresets: all });
              setSettings(getSettings());
            }}
          />
        </div>
      )}

      {/* ── MODO 2: MODO DIVIDIDO (SPLIT VIEW: CÓDIGO NA ESQUERDA + CANVAS A4 AO VIVO NA DIREITA) ── */}
      {viewMode === "split" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Coluna Esquerda: Editor de Código .JSON / .HTML */}
          <div className="lg:col-span-6">
            <DocumentCodeEditorView
              preset={currentPreset}
              blocks={blocks}
              settings={settings}
              previewData={previewData}
              activeFormat={codeFormat}
              onChangeFormat={setCodeFormat}
              isSplitView={true}
              onUpdateBlocks={(newBlocks) => {
                setBlocks(newBlocks);
              }}
              onUpdatePreset={(updated) => {
                const newPreset = { ...currentPreset, ...updated };
                const all = (settings.savedPresets || DOCUMENT_PRESETS).map(p => p.id === newPreset.id ? newPreset : p);
                updateSettings({ savedPresets: all });
                setSettings(getSettings());
              }}
            />
          </div>

          {/* Coluna Direita: Canvas A4 Renderizado em Tempo Real */}
          <div className="lg:col-span-6 flex flex-col items-center bg-slate-200/70 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto min-h-[840px]">
            <div className="w-full mb-3 transition-all duration-200">
              <VariableColorLegendBar
                usages={variableUsages}
                activeCategoryFilter={activeCategoryFilter}
                onSelectCategoryFilter={setActiveCategoryFilter}
                highlightVariables={highlightVariables}
                onToggleHighlightVariables={setHighlightVariables}
              />
            </div>
            <div className="w-full max-w-[210mm] flex items-center justify-between mb-3 px-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                  Prévia em Tempo Real (A4)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  Sincronizado ao Vivo
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Edições no código refletem instantaneamente
              </div>
            </div>

            <div 
              className="w-full flex justify-center origin-top transition-transform duration-150"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
                marginBottom: `${(zoomLevel - 100) * 8}px`,
              }}
            >
              <div 
                className="bg-white text-slate-900 shadow-2xl p-[18mm] rounded-sm relative border border-slate-300 select-none print:shadow-none print:m-0 print:border-none"
                style={{
                  width: paperStyle.width,
                  height: paperStyle.minHeight,
                  fontFamily: currentPreset.fontFamily === "serif" ? "Georgia, serif" : currentPreset.fontFamily === "mono" ? "Courier New, monospace" : "Inter, system-ui, sans-serif"
                }}
              >
                <div className="flex flex-wrap items-start relative -mx-1 gap-y-2">
                  {blocks.map((block) => {
                    const blockWidth = block.style?.width === "1/2" ? "50%" :
                                       block.style?.width === "1/3" ? "33.333%" :
                                       block.style?.width === "2/3" ? "66.666%" :
                                       block.style?.width === "1/4" ? "25%" :
                                       block.style?.width === "3/4" ? "75%" : 
                                       block.style?.width === "1/5" ? "20%" :
                                       block.style?.width === "2/5" ? "40%" :
                                       block.style?.width === "3/5" ? "60%" :
                                       block.style?.width === "4/5" ? "80%" : "100%";

                    return (
                      <div key={block.id} style={{ width: blockWidth }} className="px-1 shrink-0">
                        <BlockRenderer
                          block={block}
                          data={previewData}
                          settings={settings}
                          archetype={currentPreset.archetype}
                          isCanvas={true}
                          highlightVariables={highlightVariables}
                          selectedVariableTag={selectedVariableTag}
                          activeCategoryFilter={activeCategoryFilter}
                          onSelectFieldOrVariable={handleSelectFieldOrVariable}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODO 3: WORKSPACE VISUAL EM 3 COLUNAS (BIBLIOTECA | CANVAS A4 | INSPETOR) ── */}
      {viewMode === "visual" && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ── COLUNA ESQUERDA: BIBLIOTECA DE COMPONENTES & VARIÁVEIS ── */}
        {showPanels && (
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sticky top-4 max-h-[calc(100vh-100px)] flex flex-col overflow-y-auto">
            {/* Seletor de Abas da Barra Lateral: Blocos vs Variáveis */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarTab("blocks")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  sidebarTab === "blocks"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Blocos</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  sidebarTab === "blocks" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}>
                  {blocks.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSidebarTab("variables")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  sidebarTab === "variables"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Variable className="w-3.5 h-3.5" />
                <span>Variáveis</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  sidebarTab === "variables" ? "bg-indigo-50 text-indigo-700" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}>
                  Tags
                </span>
              </button>
            </div>

            {sidebarTab === "blocks" ? (
              <BlockComponentList onAddBlock={(type) => handleAddBlock(type)} />
            ) : (
              <DocumentVariablesPanel
                selectedBlock={selectedBlock}
                onInjectVariable={handleInjectVariable}
                previewData={previewData}
                selectedVariableTag={selectedVariableTag}
                onSelectVariableTag={(tag) => setSelectedVariableTag(tag === selectedVariableTag ? null : tag)}
              />
            )}
          </div>
        </div>
        )}

        {/* ── COLUNA CENTRAL: CANVAS A4 INTERATIVO COM DRAG & DROP (6 colunas) ── */}
        <div className={`${showPanels ? "lg:col-span-6" : "lg:col-span-12"} flex flex-col items-center bg-slate-200/70 dark:bg-slate-950 p-4 md:p-6 rounded-xl border border-slate-300 dark:border-slate-800 overflow-x-auto min-h-[840px] transition-all duration-300`}>
          
          {/* Barra Superior de Mapeamento e Legenda de Cores de Variáveis */}
          <div className="w-full mb-3 transition-all duration-200" style={{ maxWidth: paperStyle.width }}>
            <VariableColorLegendBar
              usages={variableUsages}
              activeCategoryFilter={activeCategoryFilter}
              onSelectCategoryFilter={setActiveCategoryFilter}
              selectedVariableTag={selectedVariableTag}
              onClearSelection={handleClearVariableSelection}
              highlightVariables={highlightVariables}
              onToggleHighlightVariables={setHighlightVariables}
            />
          </div>

          {/* Header do Documento com Régua e Informações do Papel */}
          <div className="w-full flex flex-wrap items-center justify-between mb-3 px-2 text-xs text-slate-500 transition-all duration-200" style={{ maxWidth: paperStyle.width }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 text-[11px] flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>{paperStyle.config.name}</span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono ml-1">
                  ({paperOrientation === "portrait" ? "Retrato 📄" : "Paisagem 📜"})
                </span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                Margem {pageMargin}mm
              </span>
              {highlightVariables && (
                <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                  {variableUsages.length} variáveis em cores
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 hidden sm:block">
              Clique em um bloco para editar ou arraste para reposicionar
            </div>
          </div>

          {/* Canvas A4 / Papel Dinâmico */}
          <div 
            ref={canvasRef}
            className="w-full flex justify-center origin-top transition-transform duration-150"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: "top center",
              marginBottom: `${(zoomLevel - 100) * 8}px`,
            }}
          >
            <div 
              id="printable-builder-document"
              className="printable-area bg-white text-slate-900 shadow-2xl rounded-sm relative border border-slate-300 select-none print:shadow-none print:m-0 print:border-none transition-all duration-200"
              style={{
                width: paperStyle.width,
                height: paperStyle.minHeight,
                aspectRatio: `${parseFloat(paperStyle.width)} / ${parseFloat(paperStyle.minHeight)}`,
                padding: `${pageMargin}mm`,
                fontFamily: currentPreset.fontFamily === "serif" ? "Georgia, serif" : currentPreset.fontFamily === "mono" ? "Courier New, monospace" : "Inter, system-ui, sans-serif"
              }}
            >
              {/* Lista de Blocos Renderizados com Drag & Drop */}
              {blocks.length === 0 ? (
                <div 
                  onDragOver={(e) => handleDragOver(e, 0)}
                  onDrop={(e) => handleDrop(e, 0)}
                  className={`h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 text-center transition-colors ${
                    dragOverIndex === 0
                      ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700"
                      : "border-slate-300 text-slate-400"
                  }`}
                >
                  <Layers className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-bold text-sm text-slate-600">Seu documento está vazio</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Arraste componentes da biblioteca à esquerda ou clique em "+" para adicionar o cabeçalho e produtos.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-4 text-xs"
                    onClick={() => setBlocks(createDefaultBlocksFromPreset(currentPreset))}
                  >
                    Restaurar Layout Padrão
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-start relative -mx-1 gap-y-2">
                  {blocks.map((block, index) => {
                    const isSelected = selectedBlockId === block.id;
                    const isDropTarget = dragOverIndex === index;
                    const blockWidth = block.style?.width === "1/2" ? "50%" :
                                       block.style?.width === "1/3" ? "33.333%" :
                                       block.style?.width === "2/3" ? "66.666%" :
                                       block.style?.width === "1/4" ? "25%" :
                                       block.style?.width === "3/4" ? "75%" : 
                                       block.style?.width === "1/5" ? "20%" :
                                       block.style?.width === "2/5" ? "40%" :
                                       block.style?.width === "3/5" ? "60%" :
                                       block.style?.width === "4/5" ? "80%" : "100%";

                    return (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/document-block-id", block.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBlockId(block.id);
                        }}
                        style={{ width: blockWidth }}
                        className={`px-1 shrink-0 relative group transition-all duration-150 rounded-md cursor-pointer ${
                          isSelected 
                            ? "ring-2 ring-indigo-600 ring-offset-2 shadow-md bg-indigo-50/20 z-10" 
                            : "hover:ring-1 hover:ring-indigo-400/60"
                        } ${isDropTarget ? "border-t-4 border-indigo-600 pt-2" : ""}`}
                      >
                        {/* Indicador de Inserção Superior / Ghost Element de Encaixe */}
                        {isDropTarget && (
                          <div className="absolute -top-4 left-0 right-0 h-7 bg-indigo-600 border-2 border-indigo-400 text-white rounded-lg shadow-xl shadow-indigo-500/40 z-40 flex items-center justify-center gap-2 font-mono text-xs font-bold animate-in fade-in zoom-in-95 duration-150">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />
                            <span>
                              Encaixar <span className="text-yellow-300 underline font-black">{getActiveDraggedVariableTag() || "Item"}</span> na Posição {index + 1}
                            </span>
                          </div>
                        )}

                        {/* Barra de Controles Rápidos Flutuante ao Hover ou Selecionado */}
                        <div className={`absolute -top-3.5 right-2 z-30 flex items-center gap-1 bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-md text-[10px] transition-opacity ${
                          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}>
                          <div className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-white mr-1" title="Arraste para reposicionar">
                            <GripVertical className="w-3 h-3" />
                          </div>
                          <span className="font-mono text-slate-300 mr-1">{block.type}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUpdateBlockWidth(block.id, "shrink"); }}
                            disabled={block.style?.width === "1/5"}
                            className="hover:text-indigo-400 disabled:opacity-30 p-0.5 border-l border-slate-700 ml-1 pl-1.5"
                            title="Diminuir Largura"
                          >
                            <Minimize2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUpdateBlockWidth(block.id, "grow"); }}
                            disabled={!block.style?.width || block.style?.width === "full"}
                            className="hover:text-indigo-400 disabled:opacity-30 p-0.5 pr-1.5"
                            title="Aumentar Largura"
                          >
                            <Maximize2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, "up"); }}
                            disabled={index === 0}
                            className="hover:text-indigo-400 disabled:opacity-30 p-0.5"
                            title="Subir"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveBlock(block.id, "down"); }}
                            disabled={index === blocks.length - 1}
                            className="hover:text-indigo-400 disabled:opacity-30 p-0.5"
                            title="Descer"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateBlock(block.id); }}
                            className="hover:text-indigo-400 p-0.5"
                            title="Duplicar"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                            className="hover:text-red-400 p-0.5"
                            title="Excluir"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Renderização do Bloco Visual com Destaque Colorido de Variáveis */}
                        <div className="p-1 relative group">
                          <BlockRenderer
                            block={block}
                            data={previewData}
                            settings={settings}
                            archetype={currentPreset.archetype}
                            isCanvas={true}
                            highlightVariables={highlightVariables}
                            selectedVariableTag={selectedVariableTag}
                            activeCategoryFilter={activeCategoryFilter}
                            onSelectFieldOrVariable={handleSelectFieldOrVariable}
                          />
                          
                          {/* Handles de Redimensionamento Visual por Arraste */}
                          {isSelected && (
                            <>
                              {/* Handle Direita */}
                              <div 
                                className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize z-50 transition-colors rounded-r-md flex items-center justify-center ${
                                  resizingBlockId === block.id ? "bg-indigo-600/40" : "hover:bg-indigo-500/20"
                                }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setResizingBlockId(block.id);
                                  setResizeStartX(e.clientX);
                                }}
                                title="Arraste para aumentar a largura"
                              >
                                <div className="w-0.5 h-8 bg-indigo-400/60 rounded-full" />
                              </div>

                              {/* Handle Esquerda */}
                              <div 
                                className={`absolute top-0 left-0 bottom-0 w-2.5 cursor-col-resize z-50 transition-colors rounded-l-md flex items-center justify-center ${
                                  resizingBlockId === block.id ? "bg-indigo-600/40" : "hover:bg-indigo-500/20"
                                }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setResizingBlockId(block.id);
                                  setResizeStartX(e.clientX);
                                }}
                                title="Arraste para diminuir a largura"
                              >
                                <div className="w-0.5 h-8 bg-indigo-400/60 rounded-full" />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Zona de Drop no Final da Página */}
                  <div
                    onDragOver={(e) => handleDragOver(e, blocks.length)}
                    onDrop={(e) => handleDrop(e, blocks.length)}
                    className={`mt-3 py-3 border-2 border-dashed rounded-lg text-center transition-all ${
                      dragOverIndex === blocks.length
                        ? "border-indigo-600 bg-indigo-50/80 text-indigo-700 font-semibold text-xs scale-[1.01]"
                        : "border-transparent hover:border-slate-300 text-slate-400 text-[11px] opacity-0 group-hover:opacity-100 hover:opacity-100"
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Plus className="w-3.5 h-3.5" /> Arraste e solte novos componentes aqui para inserir no fim do documento
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA: INSPETOR DE PROPRIEDADES (3 colunas) ── */}
        {showPanels && (
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs sticky top-4 max-h-[calc(100vh-140px)] overflow-y-auto">
            <BlockPropertyInspector
              selectedBlock={selectedBlock}
              onUpdateBlock={handleUpdateBlock}
              onDeleteBlock={handleDeleteBlock}
              onDuplicateBlock={handleDuplicateBlock}
              onMoveBlock={handleMoveBlock}
              onDeselect={() => {
                setSelectedBlockId(null);
                setHighlightedField(null);
              }}
              preset={currentPreset}
              onUpdatePreset={(updated) => {
                const newPreset = { ...currentPreset, ...updated };
                const all = (settings.savedPresets || DOCUMENT_PRESETS).map(p => p.id === newPreset.id ? newPreset : p);
                updateSettings({ savedPresets: all });
                setSettings(getSettings());
              }}
              settings={settings}
              highlightedField={highlightedField}
              selectedVariableTag={selectedVariableTag}
            />
          </div>
        </div>
        )}
      </div>
      )}

      {/* ── MODAL: EXPORTAR JSON ── */}
      <Dialog open={jsonExportOpen} onOpenChange={setJsonExportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Exportar Estrutura do Layout (JSON)
            </DialogTitle>
            <DialogDescription>
              Copie o código JSON do modelo para backup ou compartilhamento entre instâncias.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              value={jsonContent}
              readOnly
              className="font-mono text-xs h-64 bg-slate-50 dark:bg-slate-950 resize-none"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(jsonContent);
                toast({ title: "Copiado para a Área de Transferência!" });
              }}
              className="gap-1.5"
            >
              <Copy className="w-4 h-4" /> Copiar JSON
            </Button>
            <Button
              onClick={() => {
                const blob = new Blob([jsonContent], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `layout-${currentPreset.name.toLowerCase().replace(/\s+/g, "-")}.json`;
                a.click();
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Download className="w-4 h-4" /> Baixar Arquivo .json
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: IMPORTAR JSON ── */}
      <Dialog open={jsonImportOpen} onOpenChange={setJsonImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Importar Modelo de Orçamento (JSON)
            </DialogTitle>
            <DialogDescription>
              Cole abaixo o JSON do modelo exportado para carregá-lo no editor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Cole aqui o JSON do modelo..."
              value={jsonContent}
              onChange={(e) => setJsonContent(e.target.value)}
              className="font-mono text-xs h-64 resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setJsonImportOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleApplyImportJson}
              disabled={!jsonContent.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <Check className="w-4 h-4" /> Importar e Abrir no Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CRIAR NOVO MODELO ── */}
      <Dialog open={newPresetDialogOpen} onOpenChange={setNewPresetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" />
              Criar Novo Modelo de Layout
            </DialogTitle>
            <DialogDescription>
              Salve a composição de blocos atual como um novo modelo customizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nome do Modelo</Label>
              <Input
                placeholder="Ex: Proposta Técnica Grandes Contas"
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

      {/* ── MODAL: GUIA DE TAMANHOS DE PAPEL NO MERCADO ── */}
      <Dialog open={marketGuideOpen} onOpenChange={setMarketGuideOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
              Guia de Tamanho de Papel no Mercado (Impressão & PDF)
            </DialogTitle>
            <DialogDescription>
              Entenda qual formato utilizar de acordo com o padrão geográfico, tipo de proposta e dispositivo de impressão do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Resumo do Mercado */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-sm mb-1">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                Qual o tamanho padrão aplicado no mercado?
              </p>
              <p>
                No **Brasil, América Latina e Europa**, o formato **A4 (210 × 297 mm)** é o **padrão absoluto (ISO 216)**, representando mais de **95% dos orçamentos comerciais, contratos B2B e relatórios corporativos**.
              </p>
            </div>

            {/* Grid de Formatos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(PAPER_SIZES_CONFIG).map((size) => (
                <div
                  key={size.id}
                  onClick={() => {
                    setPaperSize(size.id);
                    setMarketGuideOpen(false);
                    toast({
                      title: `Formato ${size.name} Aplicado`,
                      description: "Dimensões da folha e visualização atualizadas.",
                    });
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                    paperSize === size.id
                      ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-2 ring-indigo-500/30"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                        {size.name}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                        {size.marketShare}
                      </span>
                    </div>
                    {paperSize === size.id && (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        Ativo
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-slate-600 dark:text-slate-400 leading-normal text-[11px]">
                    {size.description}
                  </p>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{size.dimensionsMm}</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold group-hover:underline">
                      Clique para aplicar →
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recomendações de Orientação e Margem */}
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                💡 Recomendações Práticas de Apresentação Comercial:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300">
                <li>**Orientação Retrato (Vertical)**: Ideal para orçamentos padrão, faturas e propostas com tabelas de até 5 colunas.</li>
                <li>**Orientação Paisagem (Horizontal)**: Recomendada quando a proposta possui tabelas técnicas extensas com muitas colunas (Ex: código, descrição, NCM, prazo, impostos, unidades e preços).</li>
                <li>**Margem Normal (18mm)**: Garante área segura para cabeçalhos e rodapés timbrados sem cortar ao imprimir em impressoras térmicas ou a laser de mesa.</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button className="bg-indigo-600 text-white" onClick={() => setMarketGuideOpen(false)}>
              Entendi e Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
