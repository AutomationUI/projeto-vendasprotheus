import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  X, 
  Layers, 
  Plus, 
  Move, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  Bookmark, 
  Type, 
  Heading as HeadingIcon, 
  Tag, 
  Square, 
  Minus, 
  Image as ImageIcon, 
  MousePointer, 
  FolderPlus,
  Sliders,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  QrCode,
  MessageCircle,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  ExternalLink,
  Undo2,
  Redo2,
  RotateCcw
} from "lucide-react";
import { 
  DocumentBlock, 
  BlockInternalElement, 
  BlockInternalElementType,
  QuoteDocumentData,
  ReusableBlockTemplate
} from "@/types/document-template";
import { DOCUMENT_VARIABLES } from "@/lib/document-variables";
import { saveBlockToLibrary, groupElementsIntoBlock, updateBlockNameInLibrary, getUniqueBlockName } from "./block-library-store";
import { useToast } from "@/hooks/use-toast";
import { ButtonActionInspector } from "./ButtonActionInspector";

// Função utilitária de clonagem profunda para preservação estrita de integridade e coordenadas
function deepCloneBlock(b: DocumentBlock): DocumentBlock {
  return {
    ...b,
    isComposed: true,
    style: b.style ? { ...b.style } : { width: "full", minHeight: 160 },
    config: b.config ? { ...b.config } : {},
    buttonConfig: b.buttonConfig ? { ...b.buttonConfig } : undefined,
    elements: (b.elements || []).map(el => ({
      ...el,
      x: typeof el.x === "number" && !isNaN(el.x) ? Math.round(el.x) : 20,
      y: typeof el.y === "number" && !isNaN(el.y) ? Math.round(el.y) : 20,
      width: typeof el.width === "number" && !isNaN(el.width) ? Math.max(20, Math.round(el.width)) : 200,
      height: typeof el.height === "number" && !isNaN(el.height) ? Math.max(16, Math.round(el.height)) : 40,
      zIndex: typeof el.zIndex === "number" && !isNaN(el.zIndex) ? Math.round(el.zIndex) : 1,
      style: el.style ? { ...el.style } : {},
      config: el.config ? { ...el.config } : {},
      buttonConfig: el.buttonConfig ? { ...el.buttonConfig } : undefined,
    })),
  };
}

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

interface BlockInternalEditorModalProps {
  isOpen: boolean;
  block: DocumentBlock | null;
  quoteData: QuoteDocumentData;
  onClose: () => void;
  onSaveBlock: (updatedBlock: DocumentBlock) => void;
  onSaveToLibrary?: (template: ReusableBlockTemplate) => void;
}

export function BlockInternalEditorModal({
  isOpen,
  block,
  quoteData,
  onClose,
  onSaveBlock,
  onSaveToLibrary,
}: BlockInternalEditorModalProps) {
  const { toast } = useToast();

  // Estado local do bloco em edição
  const [currentBlock, setCurrentBlock] = useState<DocumentBlock | null>(null);

  // Histórico de alterações (Undo / Redo) para preservação contínua de estado
  const [history, setHistory] = useState<DocumentBlock[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Snapshot original imutável do bloco quando o editor é aberto
  const initialSnapshotRef = useRef<DocumentBlock | null>(null);
  const prevIsOpenRef = useRef<boolean>(false);
  const prevBlockIdRef = useRef<string | null>(null);
  const currentBlockRef = useRef<DocumentBlock | null>(null);

  // Sincronizar ref atual
  useEffect(() => {
    currentBlockRef.current = currentBlock;
  }, [currentBlock]);

  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"elements" | "variables" | "styles">("elements");

  // Estado de zoom e viewport interno
  const [editorZoom, setEditorZoom] = useState<number>(100);

  // Modal para salvar na biblioteca
  const [saveLibraryOpen, setSaveLibraryOpen] = useState(false);
  const [libraryBlockName, setLibraryBlockName] = useState("");
  const [libraryBlockDesc, setLibraryBlockDesc] = useState("");
  const [libraryCategory, setLibraryCategory] = useState<"comercial" | "financeiro" | "conteudo" | "layout" | "personalizado">("personalizado");

  // Seletor rápido de variáveis
  const [variablePickerOpen, setVariablePickerOpen] = useState(false);
  const [variableSearch, setVariableSearch] = useState("");

  // Refs para cálculo de drag & drop e redimensionamento
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedOrResizedRef = useRef<boolean>(false);

  // Estado de redimensionamento de elemento interno
  const [resizingState, setResizingState] = useState<{
    elementId: string;
    handle: "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l";
    startX: number;
    startY: number;
    startElX: number;
    startElY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  // Inicializar estado quando o modal abre (com guarda contra re-render do pai)
  useEffect(() => {
    if (isOpen && block) {
      const justOpened = !prevIsOpenRef.current;
      const blockIdChanged = prevBlockIdRef.current !== block.id;

      if (justOpened || blockIdChanged) {
        const cloned = deepCloneBlock(block);
        initialSnapshotRef.current = deepCloneBlock(block);
        setCurrentBlock(cloned);
        setHistory([cloned]);
        setHistoryIndex(0);
        setSelectedElementIds(cloned.elements && cloned.elements.length > 0 ? [cloned.elements[0].id] : []);
        setLibraryBlockName(cloned.title || "Novo Bloco Composto");
        prevBlockIdRef.current = block.id;
      }
    }

    prevIsOpenRef.current = isOpen;
    if (!isOpen) {
      prevBlockIdRef.current = null;
    }
  }, [block, isOpen]);

  // Função auxiliar para registrar novos passos no histórico de undo/redo
  const updateBlockWithHistory = (
    updater: (prev: DocumentBlock) => DocumentBlock,
    recordHistory: boolean = true
  ) => {
    setCurrentBlock(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      if (recordHistory) {
        setHistory(h => {
          const upToCurrent = h.slice(0, historyIndex + 1);
          return [...upToCurrent, deepCloneBlock(next)].slice(-50);
        });
        setHistoryIndex(idx => idx + 1);
      }
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      const prevStep = history[targetIdx];
      setHistoryIndex(targetIdx);
      setCurrentBlock(deepCloneBlock(prevStep));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      const nextStep = history[targetIdx];
      setHistoryIndex(targetIdx);
      setCurrentBlock(deepCloneBlock(nextStep));
    }
  };

  const handleRestoreOriginal = () => {
    if (initialSnapshotRef.current) {
      const restored = deepCloneBlock(initialSnapshotRef.current);
      updateBlockWithHistory(() => restored, true);
      setSelectedElementIds(restored.elements && restored.elements.length > 0 ? [restored.elements[0].id] : []);
      toast({
        title: "Estado Original Restaurado",
        description: "Todos os elementos, posições relativas e variáveis do bloco foram recuperados.",
      });
    }
  };

  const elements = currentBlock?.elements || [];
  const selectedElement = elements.find(el => el.id === selectedElementIds[0]);

  // Mapa de interpolação rápida de variáveis
  const fmtBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const variablesMap: Record<string, string> = {
    "{{cliente.nome}}": quoteData?.cliente?.nome || "Empresa Cliente Ltda",
    "{{cliente.razaoSocial}}": quoteData?.cliente?.razaoSocial || quoteData?.cliente?.nome || "Empresa Cliente Ltda",
    "{{cliente.cnpjCpf}}": quoteData?.cliente?.cnpjCpf || "12.345.678/0001-90",
    "{{cliente.endereco}}": quoteData?.cliente?.endereco || "Av. Paulista, 1000",
    "{{cliente.cidade}}": quoteData?.cliente?.cidade || "São Paulo",
    "{{cliente.estado}}": quoteData?.cliente?.estado || "SP",
    "{{orcamento.numero}}": String(quoteData?.numero || "ORC-2026-001"),
    "{{orcamento.dataEmissao}}": new Date().toLocaleDateString("pt-BR"),
    "{{orcamento.dataValidade}}": new Date(Date.now() + 15 * 86400000).toLocaleDateString("pt-BR"),
    "{{orcamento.status}}": quoteData?.status || "Em Aberto",
    "{{orcamento.condicoes.pagamento}}": quoteData?.condicoes?.pagamento || "30 dias no boleto",
    "{{orcamento.condicoes.prazoEntrega}}": quoteData?.condicoes?.prazoEntrega || "7 a 10 dias úteis",
    "{{orcamento.totais.subtotal}}": fmtBRL(quoteData?.totais?.subtotalProdutos || 15000),
    "{{orcamento.totais.desconto}}": fmtBRL(quoteData?.totais?.descontoTotal || 500),
    "{{orcamento.totais.total}}": fmtBRL(quoteData?.totais?.valorTotal || 14500),
    "{{vendedor.nome}}": quoteData?.vendedor?.nome || "Consultor Comercial",
    "{{vendedor.email}}": quoteData?.vendedor?.email || "vendas@empresa.com.br",
    "{{vendedor.telefone}}": quoteData?.vendedor?.telefone || "(11) 98765-4321",
    "{{empresa.nome}}": "VendasProtheus ERP S/A",
    "{{empresa.cnpj}}": "00.123.456/0001-78",
  };

  const interpolate = (text?: string): string => {
    if (!text) return "";
    let res = text;
    for (const [key, val] of Object.entries(variablesMap)) {
      res = res.split(key).join(val);
    }
    return res;
  };

  // Handlers de Elementos Internos com Preservação de Histórico
  const handleSelectElement = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (e?.shiftKey || isMultiSelectMode) {
      setSelectedElementIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      );
    } else {
      setSelectedElementIds([id]);
    }
  };

  const handleUpdateElement = (updated: BlockInternalElement, recordHistory: boolean = true) => {
    updateBlockWithHistory(prev => ({
      ...prev,
      elements: (prev.elements || []).map(el => el.id === updated.id ? updated : el)
    }), recordHistory);
  };

  const handleDeleteSelectedElements = () => {
    if (selectedElementIds.length === 0) return;
    updateBlockWithHistory(prev => ({
      ...prev,
      elements: (prev.elements || []).filter(el => !selectedElementIds.includes(el.id))
    }), true);
    setSelectedElementIds([]);
    toast({
      title: "Elemento(s) removido(s)",
      description: "Os elementos foram excluídos do bloco.",
    });
  };

  const handleDuplicateSelected = () => {
    if (selectedElementIds.length === 0) return;
    const toDuplicate = elements.filter(el => selectedElementIds.includes(el.id));
    const newElements: BlockInternalElement[] = toDuplicate.map((el, idx) => ({
      ...el,
      id: `el-${Date.now().toString(36)}-${idx}`,
      name: `${el.name || el.type} (Cópia)`,
      x: el.x + 20,
      y: el.y + 20,
      zIndex: (el.zIndex || 1) + 1,
      style: el.style ? { ...el.style } : {},
      config: el.config ? { ...el.config } : {},
    }));

    updateBlockWithHistory(prev => ({
      ...prev,
      elements: [...(prev.elements || []), ...newElements]
    }), true);
    setSelectedElementIds(newElements.map(el => el.id));
    toast({
      title: "Elemento(s) duplicado(s)",
      description: "Cópias adicionadas com deslocamento.",
    });
  };

  // Ajustar Camada (Z-Index)
  const handleBringForward = () => {
    if (!selectedElement) return;
    const maxZ = Math.max(...elements.map(e => e.zIndex || 1), 1);
    handleUpdateElement({
      ...selectedElement,
      zIndex: maxZ + 1
    }, true);
  };

  const handleSendBackward = () => {
    if (!selectedElement) return;
    const currentZ = selectedElement.zIndex || 1;
    handleUpdateElement({
      ...selectedElement,
      zIndex: Math.max(1, currentZ - 1)
    }, true);
  };

  // Inserir Novo Elemento Interno
  const handleAddInternalElement = (
    type: BlockInternalElementType,
    customDefaults?: Partial<BlockInternalElement>
  ) => {
    const nextZ = Math.max(...elements.map(e => e.zIndex || 1), 0) + 1;
    const count = elements.length + 1;

    let defaultEl: BlockInternalElement;

    switch (type) {
      case "heading":
        defaultEl = {
          id: `el-head-${Date.now().toString(36)}`,
          type: "heading",
          name: `Título ${count}`,
          x: 20,
          y: 20 + elements.length * 15,
          width: 300,
          height: 36,
          zIndex: nextZ,
          content: "Título do Bloco",
          style: {
            fontSize: 18,
            fontWeight: "bold",
            textColor: "#0f172a",
          }
        };
        break;
      case "text":
        defaultEl = {
          id: `el-text-${Date.now().toString(36)}`,
          type: "text",
          name: `Texto ${count}`,
          x: 20,
          y: 60 + elements.length * 15,
          width: 280,
          height: 48,
          zIndex: nextZ,
          content: "Texto informativo ou descrição das condições.",
          style: {
            fontSize: 12,
            textColor: "#475569",
          }
        };
        break;
      case "variable":
        defaultEl = {
          id: `el-var-${Date.now().toString(36)}`,
          type: "variable",
          name: `Variável ${count}`,
          x: 20,
          y: 40 + elements.length * 15,
          width: 240,
          height: 32,
          zIndex: nextZ,
          content: "{{cliente.razaoSocial}}",
          variableTag: "{{cliente.razaoSocial}}",
          style: {
            fontSize: 13,
            fontWeight: "semibold",
            textColor: "#2563eb",
          }
        };
        break;
      case "badge":
        defaultEl = {
          id: `el-badge-${Date.now().toString(36)}`,
          type: "badge",
          name: `Badge ${count}`,
          x: 20,
          y: 20 + elements.length * 15,
          width: 140,
          height: 28,
          zIndex: nextZ,
          content: "EM ABERTO",
          style: {
            backgroundColor: "#e0f2fe",
            textColor: "#0284c7",
            borderColor: "#bae6fd",
            borderWidth: 1,
            borderRadius: 9999,
            fontSize: 11,
            fontWeight: "bold",
            textAlign: "center",
            padding: 4,
          }
        };
        break;
      case "button":
        defaultEl = {
          id: `el-btn-${Date.now().toString(36)}`,
          type: "button",
          name: `Botão ${count}`,
          x: 20,
          y: 80 + elements.length * 15,
          width: 180,
          height: 38,
          zIndex: nextZ,
          content: "Aprovar Orçamento",
          style: {
            backgroundColor: "#0f172a",
            textColor: "#ffffff",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: "bold",
            textAlign: "center",
            padding: 8,
          }
        };
        break;
      case "shape":
        defaultEl = {
          id: `el-shape-${Date.now().toString(36)}`,
          type: "shape",
          name: `Forma / Card ${count}`,
          x: 10,
          y: 10,
          width: 320,
          height: 100,
          zIndex: 1, // fica atrás por padrão
          style: {
            backgroundColor: "#f8fafc",
            borderColor: "#e2e8f0",
            borderWidth: 1,
            borderRadius: 8,
          }
        };
        break;
      case "divider":
        defaultEl = {
          id: `el-div-${Date.now().toString(36)}`,
          type: "divider",
          name: `Divisor ${count}`,
          x: 20,
          y: 70 + elements.length * 15,
          width: 300,
          height: 2,
          zIndex: nextZ,
          style: {
            borderColor: "#cbd5e1",
            borderWidth: 1,
          }
        };
        break;
      case "image":
        defaultEl = {
          id: `el-img-${Date.now().toString(36)}`,
          type: "image",
          name: `Imagem ${count}`,
          x: 20,
          y: 20,
          width: 120,
          height: 60,
          zIndex: nextZ,
          config: {
            url: ""
          },
          style: {
            borderRadius: 4,
          }
        };
        break;
      default:
        defaultEl = {
          id: `el-gen-${Date.now().toString(36)}`,
          type,
          name: `Elemento ${count}`,
          x: 20,
          y: 20,
          width: 200,
          height: 40,
          zIndex: nextZ,
          content: "Elemento",
        };
    }

    if (customDefaults) {
      defaultEl = { ...defaultEl, ...customDefaults };
    }

    updateBlockWithHistory(prev => ({
      ...prev,
      elements: [...(prev.elements || []), defaultEl]
    }), true);
    setSelectedElementIds([defaultEl.id]);
    toast({
      title: `Elemento adicionado`,
      description: `Arraste ou redimensione livremente no canvas do bloco.`,
    });
  };

  // Agrupar elementos selecionados
  const handleGroupSelected = () => {
    if (selectedElementIds.length < 2) {
      toast({
        title: "Selecione múltiplos elementos",
        description: "Use Shift+Clique para selecionar pelo menos 2 elementos para agrupar.",
      });
      return;
    }

    const selectedElementsList = elements.filter(el => selectedElementIds.includes(el.id));
    const groupedBlock = groupElementsIntoBlock(selectedElementsList, `${currentBlock.title} (Grupo)`);
    
    // Garantir nome exclusivo para o grupo composto automaticamente
    const uniqueGroupName = getUniqueBlockName(`${currentBlock.title} - Grupo Composto`);

    // Salvar na biblioteca automaticamente
    const savedTemplate = saveBlockToLibrary(groupedBlock, {
      name: uniqueGroupName,
      description: `Criado a partir de ${selectedElementsList.length} elementos agrupados`,
      category: "personalizado",
    });

    if (onSaveToLibrary) {
      onSaveToLibrary(savedTemplate);
    }

    toast({
      title: "Bloco Criado e Salvo!",
      description: `Grupo de ${selectedElementsList.length} elementos salvo na Biblioteca de Blocos Reutilizáveis.`,
    });
  };

  // Salvar o bloco todo na biblioteca de blocos reutilizáveis
  const handleConfirmSaveToLibrary = () => {
    if (!currentBlock) return;
    const cleanName = libraryBlockName.trim() || currentBlock.title || "Bloco Composto";
    try {
      const savedTemplate = saveBlockToLibrary({
        ...currentBlock,
        title: cleanName,
      }, {
        name: cleanName,
        description: libraryBlockDesc.trim() || "Bloco composto personalizado",
        category: libraryCategory,
      });

      // Sincronizar o bloco local no editor com a biblioteca de componentes
      setCurrentBlock(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          title: cleanName,
          isReusable: true,
          libraryBlockId: savedTemplate.id,
        };
      });

      if (onSaveToLibrary) {
        onSaveToLibrary(savedTemplate);
      }

      setSaveLibraryOpen(false);
      toast({
        title: "Salvo na Biblioteca!",
        description: `O bloco "${savedTemplate.name}" agora está disponível na biblioteca reutilizável.`,
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Salvar na Biblioteca",
        description: err.message || "Não foi possível salvar o bloco.",
      });
    }
  };

  // Concluir edição e aplicar ao documento
  const handleApplyToDocument = () => {
    if (!currentBlock) return;
    const finalBlock: DocumentBlock = {
      ...currentBlock,
      isComposed: true,
    };
    if (finalBlock.libraryBlockId || finalBlock.isReusable) {
      try {
        updateBlockNameInLibrary(finalBlock.libraryBlockId || finalBlock.id, finalBlock.title || "Bloco Composto");
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro de Sincronização",
          description: err.message || "Não foi possível sincronizar o nome com a biblioteca.",
        });
        return; // Bloqueia salvamento/fechamento se houver erro (por exemplo, nome repetido)
      }
    }
    onSaveBlock(finalBlock);
    onClose();
    toast({
      title: "Alterações Aplicadas ao Layout",
      description: `O bloco "${currentBlock.title}" foi atualizado com ${elements.length} elementos internos.`,
    });
  };

  // Mouse Handlers para Arrastar Elemento no Canvas
  const handleElementMouseDown = (el: BlockInternalElement, e: React.MouseEvent) => {
    if (resizingState) return;
    e.stopPropagation();
    handleSelectElement(el.id, e);

    setDraggingElementId(el.id);
    const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    // Calcular offset do clique em relação ao elemento
    const zoomScale = editorZoom / 100;
    const mouseXInCanvas = (e.clientX - canvasRect.left) / zoomScale;
    const mouseYInCanvas = (e.clientY - canvasRect.top) / zoomScale;

    setDragOffset({
      x: mouseXInCanvas - el.x,
      y: mouseYInCanvas - el.y,
    });
  };

  // Mouse Handlers para Redimensionar Elemento
  const handleResizeHandleMouseDown = (
    handle: "tl" | "t" | "tr" | "r" | "br" | "b" | "bl" | "l",
    el: BlockInternalElement,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingState({
      elementId: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startElX: el.x,
      startElY: el.y,
      startWidth: el.width,
      startHeight: el.height,
    });
  };

  // Efeito global de mousemove e mouseup para arrastar e redimensionar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const zoomScale = editorZoom / 100;

      // 1. Processar Redimensionamento
      if (resizingState) {
        const deltaX = (e.clientX - resizingState.startX) / zoomScale;
        const deltaY = (e.clientY - resizingState.startY) / zoomScale;

        let newX = resizingState.startElX;
        let newY = resizingState.startElY;
        let newW = resizingState.startWidth;
        let newH = resizingState.startHeight;

        // Eixo horizontal
        if (resizingState.handle.includes("r")) {
          newW = Math.max(20, Math.round(resizingState.startWidth + deltaX));
        } else if (resizingState.handle.includes("l")) {
          const proposedW = Math.round(resizingState.startWidth - deltaX);
          if (proposedW >= 20) {
            newW = proposedW;
            newX = Math.round(resizingState.startElX + deltaX);
          }
        }

        // Eixo vertical
        if (resizingState.handle.includes("b")) {
          newH = Math.max(16, Math.round(resizingState.startHeight + deltaY));
        } else if (resizingState.handle.includes("t")) {
          const proposedH = Math.round(resizingState.startHeight - deltaY);
          if (proposedH >= 16) {
            newH = proposedH;
            newY = Math.round(resizingState.startElY + deltaY);
          }
        }

        hasDraggedOrResizedRef.current = true;
        setCurrentBlock(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            elements: (prev.elements || []).map(item => 
              item.id === resizingState.elementId 
                ? { ...item, x: newX, y: newY, width: newW, height: newH }
                : item
            )
          };
        });
        return;
      }

      // 2. Processar Arraste Livre
      if (draggingElementId && canvasContainerRef.current) {
        const canvasRect = canvasContainerRef.current.getBoundingClientRect();
        const mouseXInCanvas = (e.clientX - canvasRect.left) / zoomScale;
        const mouseYInCanvas = (e.clientY - canvasRect.top) / zoomScale;

        const rawX = Math.round(mouseXInCanvas - dragOffset.x);
        const rawY = Math.round(mouseYInCanvas - dragOffset.y);

        // Snap sutil em grid de 4px
        const newX = Math.max(0, Math.round(rawX / 4) * 4);
        const newY = Math.max(0, Math.round(rawY / 4) * 4);

        hasDraggedOrResizedRef.current = true;
        setCurrentBlock(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            elements: (prev.elements || []).map(item => 
              item.id === draggingElementId 
                ? { ...item, x: newX, y: newY }
                : item
            )
          };
        });
      }
    };

    const handleMouseUp = () => {
      if (hasDraggedOrResizedRef.current && currentBlockRef.current) {
        const latest = deepCloneBlock(currentBlockRef.current);
        setHistory(h => {
          const upToCurrent = h.slice(0, historyIndex + 1);
          return [...upToCurrent, latest].slice(-50);
        });
        setHistoryIndex(idx => idx + 1);
        hasDraggedOrResizedRef.current = false;
      }
      if (draggingElementId) setDraggingElementId(null);
      if (resizingState) setResizingState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingElementId, dragOffset, resizingState, editorZoom, historyIndex]);

  // Atalhos de teclado globais para o Modal (Ctrl+Z / Ctrl+Y / Del / Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar se estiver digitando em input ou textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElementIds.length > 0) {
          e.preventDefault();
          handleDeleteSelectedElements();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, historyIndex, history, selectedElementIds]);

  // Drop de variáveis arrastadas no Canvas do Bloco
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const tag = e.dataTransfer.getData("application/document-variable-tag") || e.dataTransfer.getData("text/plain");
    if (!tag || !tag.startsWith("{{") || !tag.endsWith("}}")) return;

    const canvasRect = canvasContainerRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const zoomScale = editorZoom / 100;
    const dropX = Math.max(10, Math.round(((e.clientX - canvasRect.left) / zoomScale) / 4) * 4);
    const dropY = Math.max(10, Math.round(((e.clientY - canvasRect.top) / zoomScale) / 4) * 4);

    handleAddInternalElement("variable", {
      x: dropX,
      y: dropY,
      width: 220,
      height: 30,
      content: tag,
      variableTag: tag,
      name: `Var: ${tag.replace("{{", "").replace("}}", "")}`,
    });
  };

  const filteredVariables = useMemo(() => {
    if (!variableSearch.trim()) return DOCUMENT_VARIABLES.slice(0, 30);
    const term = variableSearch.toLowerCase();
    return DOCUMENT_VARIABLES.filter(v => 
      v.tag.toLowerCase().includes(term) ||
      v.label.toLowerCase().includes(term) ||
      v.example?.toLowerCase().includes(term)
    );
  }, [variableSearch]);

  if (!isOpen || !currentBlock) return null;

  const blockHeight = currentBlock.style?.minHeight || 200;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Edição Interna: {currentBlock.title || "Bloco Composto"}
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {elements.length} {elements.length === 1 ? "Elemento" : "Elementos"}
                </span>
                {currentBlock.isReusable && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Biblioteca
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Posicione, redimensione e sobreponha elementos livremente com coordenadas relativas ao bloco.
              </p>
            </div>
          </div>

          {/* Quick Actions & Header Buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 mr-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Refazer (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-slate-700 mx-1" />
              <button
                type="button"
                onClick={handleRestoreOriginal}
                className="px-2 py-1 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-700 transition-colors inline-flex items-center gap-1"
                title="Restaurar estado inicial do bloco"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Restaurar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSaveLibraryOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Salvar este bloco na biblioteca para reutilizar em outros layouts"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              Salvar na Biblioteca
            </button>

            <button
              type="button"
              onClick={handleApplyToDocument}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              Concluir & Aplicar
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Insert Components & Tools */}
        <div className="flex items-center justify-between px-5 py-2 border-b border-slate-800 bg-slate-900/90 text-xs shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-[11px] font-medium text-slate-400 mr-2 uppercase tracking-wider">
              Inserir:
            </span>

            <button
              type="button"
              onClick={() => handleAddInternalElement("heading")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <HeadingIcon className="w-3.5 h-3.5 text-indigo-400" />
              Título
            </button>

            <button
              type="button"
              onClick={() => handleAddInternalElement("text")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Type className="w-3.5 h-3.5 text-sky-400" />
              Texto
            </button>

            <button
              type="button"
              onClick={() => setVariablePickerOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Variável Protheus...
            </button>

            <button
              type="button"
              onClick={() => handleAddInternalElement("badge")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Badge / Selo
            </button>

            <button
              type="button"
              onClick={() => handleAddInternalElement("button")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <MousePointer className="w-3.5 h-3.5 text-purple-400" />
              Botão
            </button>

            <button
              type="button"
              onClick={() => handleAddInternalElement("shape")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Square className="w-3.5 h-3.5 text-orange-400" />
              Card / Fundo
            </button>

            <button
              type="button"
              onClick={() => handleAddInternalElement("divider")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              <Minus className="w-3.5 h-3.5 text-slate-400" />
              Linha Divisória
            </button>
          </div>

          {/* Grouping & Zoom controls */}
          <div className="flex items-center gap-2">
            {selectedElementIds.length > 1 && (
              <button
                type="button"
                onClick={handleGroupSelected}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs font-medium"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                Agrupar → Criar Bloco ({selectedElementIds.length})
              </button>
            )}

            <div className="flex items-center bg-slate-800 border border-slate-700 rounded px-1">
              <button
                type="button"
                onClick={() => setEditorZoom(z => Math.max(50, z - 10))}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Reduzir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1.5 text-slate-300">{editorZoom}%</span>
              <button
                type="button"
                onClick={() => setEditorZoom(z => Math.min(150, z + 10))}
                className="p-1 text-slate-400 hover:text-slate-200"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Work Area: Left elements list, Center Canvas, Right Properties */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Elements & Layer Stack Panel */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/40 flex flex-col shrink-0">
            <div className="flex border-b border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("elements")}
                className={`flex-1 py-2 font-medium text-center border-b-2 transition-colors ${
                  activeTab === "elements" 
                    ? "border-indigo-500 text-indigo-400 bg-slate-900/50" 
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Camadas ({elements.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("variables")}
                className={`flex-1 py-2 font-medium text-center border-b-2 transition-colors ${
                  activeTab === "variables" 
                    ? "border-indigo-500 text-indigo-400 bg-slate-900/50" 
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Variáveis
              </button>
            </div>

            {/* Elements List */}
            {activeTab === "elements" ? (
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {elements.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Nenhum elemento neste bloco. Use os botões acima para adicionar.
                  </div>
                ) : (
                  [...elements]
                    .sort((a, b) => (b.zIndex || 1) - (a.zIndex || 1))
                    .map((el) => {
                      const isSelected = selectedElementIds.includes(el.id);
                      return (
                        <div
                          key={el.id}
                          onClick={(e) => handleSelectElement(el.id, e)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer border transition-all ${
                            isSelected
                              ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-200"
                              : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-4 h-4 rounded flex items-center justify-center bg-slate-800 text-[10px] font-mono text-slate-400 shrink-0">
                              {el.zIndex || 1}
                            </span>
                            <span className="truncate font-medium">
                              {el.name || el.content || el.type}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                            {el.width}×{el.height}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            ) : (
              /* Quick Drag Variables List */
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <p className="text-[11px] text-slate-400 p-1">
                  Arraste qualquer variável diretamente para o canvas do bloco:
                </p>
                {DOCUMENT_VARIABLES.slice(0, 25).map((v) => (
                  <div
                    key={v.tag}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/document-variable-tag", v.tag);
                      e.dataTransfer.setData("text/plain", v.tag);
                    }}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800 text-xs hover:border-indigo-500/40 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className="font-mono text-[11px] text-emerald-400">{v.tag}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{v.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Block Dimensions Footnote */}
            <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/60">
              <div className="flex items-center justify-between mb-1">
                <span>Altura Mínima Bloco:</span>
                <span className="font-mono font-medium text-slate-200">{blockHeight}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="600"
                step="10"
                value={blockHeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCurrentBlock(prev => prev ? {
                    ...prev,
                    style: { ...prev.style, minHeight: val }
                  } : prev);
                }}
                className="w-full h-1 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Center Stage: The Block Canvas with Coordinates */}
          <div className="flex-1 bg-slate-950 overflow-auto p-8 flex flex-col items-center justify-start relative">
            <div className="text-[11px] text-slate-500 mb-2 font-mono flex items-center gap-4">
              <span>Área Útil do Bloco: 100% largura (responsivo) × {blockHeight}px altura</span>
              <span>• Coordenadas X e Y relativas</span>
            </div>

            {/* Block Relative Canvas Container */}
            <div
              ref={canvasContainerRef}
              onDragOver={handleCanvasDragOver}
              onDrop={handleCanvasDrop}
              onClick={() => setSelectedElementIds([])}
              style={{
                width: "780px",
                minHeight: `${blockHeight}px`,
                transform: `scale(${editorZoom / 100})`,
                transformOrigin: "top center",
                backgroundColor: currentBlock.style?.backgroundColor || "#ffffff",
                borderColor: currentBlock.style?.borderColor || "#cbd5e1",
                borderWidth: `${currentBlock.style?.borderWidth ?? 1}px`,
                borderRadius: `${currentBlock.style?.borderRadius ?? 8}px`,
                borderStyle: "solid",
              }}
              className="relative shadow-2xl transition-all select-none overflow-visible"
            >
              {/* Subtle background grid pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: "radial-gradient(#475569 1px, transparent 1px)",
                  backgroundSize: "16px 16px"
                }}
              />

              {/* Elements rendering */}
              {elements.map((el) => {
                const isSelected = selectedElementIds.includes(el.id);
                const isDragging = draggingElementId === el.id;

                const rawContent = el.content || (el.variableTag ? el.variableTag : "");
                const interpolatedContent = interpolate(rawContent);

                const elStyle: React.CSSProperties = {
                  position: "absolute",
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: el.height ? `${el.height}px` : "auto",
                  zIndex: el.zIndex || 1,
                  backgroundColor: el.style?.backgroundColor,
                  color: el.style?.textColor || "#0f172a",
                  borderColor: el.style?.borderColor,
                  borderWidth: el.style?.borderWidth ? `${el.style.borderWidth}px` : undefined,
                  borderStyle: el.style?.borderWidth ? "solid" : undefined,
                  borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
                  fontSize: el.style?.fontSize ? `${el.style.fontSize}px` : undefined,
                  fontWeight: el.style?.fontWeight,
                  textAlign: el.style?.textAlign,
                  opacity: el.style?.opacity ?? 1,
                  boxShadow: el.style?.boxShadow,
                  padding: el.style?.padding ? `${el.style.padding}px` : undefined,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: el.type === "badge" || el.type === "button" ? "center" : "flex-start",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  cursor: isDragging ? "grabbing" : "grab",
                };

                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementMouseDown(el, e)}
                    style={elStyle}
                    className={`group transition-shadow ${
                      isSelected
                        ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white"
                        : "hover:ring-1 hover:ring-indigo-300"
                    }`}
                  >
                    {/* Element visual type */}
                    {el.type === "divider" ? (
                      <div
                        style={{
                          width: "100%",
                          borderTopWidth: `${el.style?.borderWidth || 1}px`,
                          borderTopColor: el.style?.borderColor || "#94a3b8",
                          borderTopStyle: "solid",
                        }}
                      />
                    ) : el.type === "shape" ? (
                      <div className="w-full h-full" />
                    ) : el.type === "qr_code" ? (
                      <div className="w-full h-full bg-white border border-slate-200 rounded p-1 flex flex-col items-center justify-center text-slate-800 shadow-sm">
                        <QrCode className="w-full h-full text-slate-900" />
                      </div>
                    ) : el.type === "image" ? (
                      el.config?.url ? (
                        <img src={el.config.url} alt={el.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 text-xs">
                          <ImageIcon className="w-4 h-4 mr-1" /> Imagem
                        </div>
                      )
                    ) : el.type === "button" ? (
                      <div className="w-full h-full flex items-center justify-center font-bold text-center gap-1.5 px-2">
                        {el.buttonConfig?.actionType === "whatsapp" ? (
                          <MessageCircle className="w-4 h-4 shrink-0" />
                        ) : el.buttonConfig?.actionType === "copy_pix" ? (
                          <QrCode className="w-4 h-4 shrink-0" />
                        ) : el.buttonConfig?.actionType === "download_pdf" ? (
                          <Download className="w-4 h-4 shrink-0" />
                        ) : el.buttonConfig?.actionType === "print" ? (
                          <Printer className="w-4 h-4 shrink-0" />
                        ) : el.buttonConfig?.actionType === "approve_quote" ? (
                          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-300" />
                        ) : el.buttonConfig?.actionType === "reject_quote" ? (
                          <XCircle className="w-4 h-4 shrink-0 text-red-300" />
                        ) : (
                          <ExternalLink className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate">{interpolatedContent || el.name || "Botão"}</span>
                      </div>
                    ) : el.type === "badge" ? (
                      <div className="w-full h-full flex items-center justify-center font-bold text-center px-2">
                        <span className="truncate">{interpolatedContent || el.name || el.type}</span>
                      </div>
                    ) : (
                      <span>{interpolatedContent || el.name || el.type}</span>
                    )}

                    {/* Resize Handles (Only shown when selected) */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("tl", el, e)}
                          className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("t", el, e)}
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("tr", el, e)}
                          className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("r", el, e)}
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("br", el, e)}
                          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("b", el, e)}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("bl", el, e)}
                          className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-50 shadow-sm"
                        />
                        <div
                          onMouseDown={(e) => handleResizeHandleMouseDown("l", el, e)}
                          className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-50 shadow-sm"
                        />

                        {/* Coordinate & Dimensions Tag badge */}
                        <div className="absolute -bottom-6 left-0 bg-slate-900 text-white font-mono text-[10px] px-1.5 py-0.5 rounded shadow whitespace-nowrap z-50 pointer-events-none">
                          X:{el.x} Y:{el.y} • {el.width}×{el.height}px • Z:{el.zIndex || 1}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-8 pointer-events-none">
                  <Layers className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Bloco sem elementos internos</p>
                  <p className="text-slate-400 mt-1">Use a barra superior para inserir títulos, textos, formas ou arraste variáveis para cá.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Inspector: Selected Element Properties */}
          <div className="w-72 border-l border-slate-800 bg-slate-950/50 flex flex-col shrink-0 text-xs">
            <div className="px-4 py-3 border-b border-slate-800 font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Propriedades do Elemento
              </span>
              {selectedElement && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleDuplicateSelected}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    title="Duplicar elemento"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedElements}
                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40"
                    title="Excluir elemento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {selectedElement ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Nome e Tipo */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Nome Identificador
                  </label>
                  <input
                    type="text"
                    value={selectedElement.name || ""}
                    onChange={(e) => handleUpdateElement({ ...selectedElement, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Coordenadas X, Y e Dimensões Largura, Altura */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Posição X (px)</label>
                    <input
                      type="number"
                      value={selectedElement.x}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, x: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Posição Y (px)</label>
                    <input
                      type="number"
                      value={selectedElement.y}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, y: parseInt(e.target.value) || 0 })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Largura (px)</label>
                    <input
                      type="number"
                      value={selectedElement.width}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, width: Math.max(20, parseInt(e.target.value) || 20) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Altura (px)</label>
                    <input
                      type="number"
                      value={selectedElement.height}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, height: Math.max(10, parseInt(e.target.value) || 10) })}
                      className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Camada / Z-Index */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Ordem da Camada (Z-Index / Sobreposição)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSendBackward}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
                      title="Enviar para trás"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      value={selectedElement.zIndex || 1}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, zIndex: parseInt(e.target.value) || 1 })}
                      className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-center text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleBringForward}
                      className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300"
                      title="Trazer para frente"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-500">
                      (Elementos com maior Z ficam por cima)
                    </span>
                  </div>
                </div>

                {/* Conteúdo de Texto ou Tag */}
                {selectedElement.type !== "shape" && selectedElement.type !== "divider" && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Conteúdo / Texto (Suporta Tags {`{{...}}`})
                    </label>
                    <textarea
                      rows={3}
                      value={selectedElement.content || ""}
                      onChange={(e) => handleUpdateElement({ ...selectedElement, content: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Ação Interativa para Botões */}
                {selectedElement.type === "button" && (
                  <ButtonActionInspector
                    buttonConfig={selectedElement.buttonConfig || {
                      actionType: "approve_quote",
                      openInNewTab: true,
                    }}
                    quoteData={quoteData}
                    onChange={(newButtonConfig) => {
                      handleUpdateElement({
                        ...selectedElement,
                        buttonConfig: newButtonConfig,
                      });
                    }}
                  />
                )}

                {/* Estilização: Cores e Tipografia */}
                <div className="border-t border-slate-800 pt-3 space-y-3">
                  <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                    Estilo Visual
                  </div>

                  {/* Cor de Fundo */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cor de Fundo:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={toValidHex(selectedElement.style?.backgroundColor, "#ffffff")}
                        onChange={(e) => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, backgroundColor: e.target.value }
                        })}
                        className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, backgroundColor: undefined }
                        })}
                        className="text-[10px] text-slate-500 hover:text-slate-300"
                      >
                        Transp.
                      </button>
                    </div>
                  </div>

                  {/* Cor do Texto */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Cor do Texto:</span>
                    <input
                      type="color"
                      value={toValidHex(selectedElement.style?.textColor, "#0f172a")}
                      onChange={(e) => handleUpdateElement({
                        ...selectedElement,
                        style: { ...selectedElement.style, textColor: e.target.value }
                      })}
                      className="w-6 h-6 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                  </div>

                  {/* Borda */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block mb-1">Espessura Borda:</span>
                      <select
                        value={selectedElement.style?.borderWidth ?? 0}
                        onChange={(e) => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, borderWidth: parseInt(e.target.value) }
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs"
                      >
                        <option value="0">Sem borda</option>
                        <option value="1">1px</option>
                        <option value="2">2px</option>
                        <option value="4">4px</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Arredondamento:</span>
                      <select
                        value={selectedElement.style?.borderRadius ?? 0}
                        onChange={(e) => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, borderRadius: parseInt(e.target.value) }
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs"
                      >
                        <option value="0">0px (Reto)</option>
                        <option value="4">4px</option>
                        <option value="8">8px</option>
                        <option value="12">12px</option>
                        <option value="9999">Pill (Redondo)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tamanho da Fonte & Peso */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 block mb-1">Tam. Fonte (px):</span>
                      <input
                        type="number"
                        min="9"
                        max="72"
                        value={selectedElement.style?.fontSize || 12}
                        onChange={(e) => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, fontSize: parseInt(e.target.value) || 12 }
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Peso da Fonte:</span>
                      <select
                        value={selectedElement.style?.fontWeight || "normal"}
                        onChange={(e) => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, fontWeight: e.target.value as any }
                        })}
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs"
                      >
                        <option value="normal">Normal</option>
                        <option value="medium">Médio</option>
                        <option value="semibold">Seminegrito</option>
                        <option value="bold">Negrito</option>
                      </select>
                    </div>
                  </div>

                  {/* Alinhamento de Texto */}
                  <div>
                    <span className="text-slate-400 block mb-1">Alinhamento:</span>
                    <div className="flex rounded bg-slate-900 border border-slate-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, textAlign: "left" }
                        })}
                        className={`flex-1 py-1 rounded flex items-center justify-center ${
                          selectedElement.style?.textAlign === "left" || !selectedElement.style?.textAlign ? "bg-slate-800 text-white" : "text-slate-400"
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, textAlign: "center" }
                        })}
                        className={`flex-1 py-1 rounded flex items-center justify-center ${
                          selectedElement.style?.textAlign === "center" ? "bg-slate-800 text-white" : "text-slate-400"
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateElement({
                          ...selectedElement,
                          style: { ...selectedElement.style, textAlign: "right" }
                        })}
                        className={`flex-1 py-1 rounded flex items-center justify-center ${
                          selectedElement.style?.textAlign === "right" ? "bg-slate-800 text-white" : "text-slate-400"
                        }`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <MousePointer className="w-8 h-8 text-slate-600 mb-2" />
                <p className="font-medium text-slate-400">Nenhum elemento selecionado</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Clique em um elemento no canvas para ajustar posição X/Y, dimensões, camada ou estilo visual.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Salvar na Biblioteca Reutilizável */}
        {saveLibraryOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl text-slate-100">
              <h3 className="text-base font-semibold text-slate-100 mb-1 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-400" />
                Salvar Bloco na Biblioteca
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Este bloco e todos os seus {elements.length} elementos internos serão salvos como modelo reutilizável, pronto para ser inserido em outros orçamentos.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nome do Bloco</label>
                  <input
                    type="text"
                    value={libraryBlockName}
                    onChange={(e) => setLibraryBlockName(e.target.value)}
                    placeholder="Ex: Cabeçalho com Selo Digital"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={libraryBlockDesc}
                    onChange={(e) => setLibraryBlockDesc(e.target.value)}
                    placeholder="Ex: Cabeçalho corporativo com logo, CNPJ e data de validade"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Categoria</label>
                  <select
                    value={libraryCategory}
                    onChange={(e) => setLibraryCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="personalizado">Personalizados</option>
                    <option value="comercial">Comercial</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="conteudo">Conteúdo</option>
                    <option value="layout">Layout</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setSaveLibraryOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveToLibrary}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Confirmar & Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Variable Picker Dialog */}
        {variablePickerOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 max-w-lg w-full shadow-2xl text-slate-100 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  Escolha uma Variável Protheus
                </div>
                <button
                  type="button"
                  onClick={() => setVariablePickerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3">
                <input
                  type="text"
                  placeholder="Filtrar variáveis..."
                  value={variableSearch}
                  onChange={(e) => setVariableSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredVariables.map((v) => (
                  <div
                    key={v.tag}
                    onClick={() => {
                      handleAddInternalElement("variable", {
                        content: v.tag,
                        variableTag: v.tag,
                        name: `Var: ${v.label}`,
                        width: 240,
                        height: 32,
                      });
                      setVariablePickerOpen(false);
                    }}
                    className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-xs text-emerald-400 font-semibold">{v.tag}</div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{v.label}</div>
                      {v.description && <div className="text-[10px] text-slate-500">{v.description}</div>}
                    </div>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {v.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
