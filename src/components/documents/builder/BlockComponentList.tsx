import React, { useState, useMemo, useEffect } from "react";
import {
  Type,
  Heading,
  Image as ImageIcon,
  MousePointerClick,
  CreditCard,
  Building2,
  QrCode,
  ShieldCheck,
  FileText,
  Table,
  Calculator,
  Minus,
  MoveVertical,
  Code,
  Footprints,
  Plus,
  GripVertical,
  LayoutTemplate,
  Users,
  Search,
  Bookmark,
  Layers,
  Sparkles,
  Copy,
  Edit2,
  Trash2,
  PackagePlus,
  Box,
  Pencil,
  Check,
  X,
  Undo2,
  Redo2,
  RotateCcw,
} from "lucide-react";
import {
  DocumentBlockType,
  ReusableBlockTemplate,
} from "@/types/document-template";
import {
  getReusableBlocksLibrary,
  deleteReusableBlockTemplate,
  duplicateReusableBlockTemplate,
  updateBlockNameInLibrary,
  canUndoLibraryAction,
  canRedoLibraryAction,
  undoLibraryAction,
  redoLibraryAction,
} from "./block-library-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ComponentDefinition {
  type: DocumentBlockType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "conteudo" | "comercial" | "financeiro" | "layout";
}

const AVAILABLE_COMPONENTS: ComponentDefinition[] = [
  // Conteúdo & Tipografia
  {
    type: "heading",
    name: "Título / Cabeçalho",
    description: "Título com suporte a tags {{...}}",
    icon: Heading,
    category: "conteudo",
  },
  {
    type: "text",
    name: "Parágrafo / Texto",
    description: "Texto livre com formatação",
    icon: Type,
    category: "conteudo",
  },
  {
    type: "variables_grid",
    name: "Variáveis Lado a Lado (Grid)",
    description:
      "Múltiplos campos com variáveis dispostos em 2, 3 ou 4 colunas",
    icon: LayoutTemplate,
    category: "conteudo",
  },
  {
    type: "variables_inline",
    name: "Variáveis na Mesma Linha",
    description: "Sequência horizontal de variáveis sem molduras",
    icon: Type,
    category: "conteudo",
  },
  {
    type: "card",
    name: "Card em Destaque",
    description: "Caixa de destaque com fundo e bordas",
    icon: LayoutTemplate,
    category: "conteudo",
  },
  {
    type: "image",
    name: "Imagem / Banner",
    description: "Banner visual ou foto promocional",
    icon: ImageIcon,
    category: "conteudo",
  },
  {
    type: "button",
    name: "Botão Call-to-Action",
    description: "Botão com link de aprovação",
    icon: MousePointerClick,
    category: "conteudo",
  },
  {
    type: "custom_html",
    name: "Código HTML",
    description: "Bloco HTML personalizado",
    icon: Code,
    category: "conteudo",
  },

  // Comercial & Cliente
  {
    type: "header",
    name: "Cabeçalho Principal",
    description: "Logo, empresa e número da proposta",
    icon: Building2,
    category: "comercial",
  },
  {
    type: "client_info",
    name: "Dados do Cliente",
    description: "CNPJ, endereço e consultor",
    icon: Users,
    category: "comercial",
  },
  {
    type: "products_table",
    name: "Tabela de Produtos",
    description: "Itens, quantidades, fotos e totais",
    icon: Table,
    category: "comercial",
  },
  {
    type: "products_grid",
    name: "Grade de Produtos (Vitrine)",
    description: "Vitrine visual de produtos com cards",
    icon: LayoutTemplate,
    category: "comercial",
  },
  {
    type: "commercial_terms",
    name: "Garantia & Prazos",
    description: "Termos de garantia e entrega",
    icon: ShieldCheck,
    category: "comercial",
  },
  {
    type: "notes",
    name: "Observações da Proposta",
    description: "Instruções e anotações gerais",
    icon: FileText,
    category: "comercial",
  },

  // Financeiro & Fechamento
  {
    type: "totals_summary",
    name: "Resumo & Totais",
    description: "Subtotal, descontos, frete e total",
    icon: Calculator,
    category: "financeiro",
  },
  {
    type: "pix_payment",
    name: "QR Code PIX",
    description: "Pagamento instantâneo com QR code",
    icon: QrCode,
    category: "financeiro",
  },
  {
    type: "bank_details",
    name: "Dados Bancários",
    description: "Conta corrente para TED/Depósito",
    icon: CreditCard,
    category: "financeiro",
  },
  {
    type: "signatures",
    name: "Assinaturas & Aceite",
    description: "Linhas de assinatura e termo",
    icon: FileText,
    category: "financeiro",
  },
  {
    type: "digital_stamp",
    name: "Selo Digital SHA-256",
    description: "Autenticação e integridade",
    icon: ShieldCheck,
    category: "financeiro",
  },

  // Estrutura & Layout
  {
    type: "divider",
    name: "Linha Divisória",
    description: "Separador horizontal sólido ou tracejado",
    icon: Minus,
    category: "layout",
  },
  {
    type: "spacer",
    name: "Espaçador",
    description: "Espaço em branco regulável",
    icon: MoveVertical,
    category: "layout",
  },
  {
    type: "footer",
    name: "Rodapé Institucional",
    description: "Numeração e contatos da empresa",
    icon: Footprints,
    category: "layout",
  },
];

interface BlockComponentListProps {
  onAddBlock: (type: DocumentBlockType) => void;
  onAddReusableBlock?: (template: ReusableBlockTemplate) => void;
  onEditReusableBlock?: (template: ReusableBlockTemplate) => void;
  onCreateNewComposedBlock?: () => void;
  libraryVersion?: number;
}

export function BlockComponentList({
  onAddBlock,
  onAddReusableBlock,
  onEditReusableBlock,
  onCreateNewComposedBlock,
  libraryVersion = 0,
}: BlockComponentListProps) {
  const [activeTab, setActiveTab] = useState<"all" | "standard" | "reusable">(
    "all",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [internalVersion, setInternalVersion] = useState(0);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editingNameValue, setEditingNameValue] = useState<string>("");

  // Duplicate modal state
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(
    null,
  );
  const [duplicateNewName, setDuplicateNewName] = useState<string>("");

  const { toast } = useToast();

  // Escutar eventos de atualização da biblioteca
  useEffect(() => {
    const handleUpdate = () => {
      setInternalVersion((v) => v + 1);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("block-library-updated", handleUpdate);
      return () =>
        window.removeEventListener("block-library-updated", handleUpdate);
    }
  }, []);

  // Atalhos Globais de Teclado para Undo / Redo na Biblioteca (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (isTyping) return;

      // Ctrl+Z / Cmd+Z (Desfazer na biblioteca)
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
        if (canUndoLibraryAction()) {
          e.preventDefault();
          const success = undoLibraryAction();
          if (success) {
            setInternalVersion((v) => v + 1);
            toast({
              title: "Ação Desfeita! (Ctrl+Z)",
              description:
                "O estado da biblioteca de blocos foi restaurado com sucesso.",
            });
          }
        }
      }
      // Ctrl+Y / Cmd+Shift+Z / Ctrl+Shift+Z (Refazer na biblioteca)
      else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.shiftKey && e.key.toLowerCase() === "z"))
      ) {
        if (canRedoLibraryAction()) {
          e.preventDefault();
          const success = redoLibraryAction();
          if (success) {
            setInternalVersion((v) => v + 1);
            toast({
              title: "Ação Refeita! (Ctrl+Y)",
              description: "A alteração na biblioteca foi reaplicada.",
            });
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toast]);

  const handleUndo = () => {
    if (canUndoLibraryAction()) {
      const success = undoLibraryAction();
      if (success) {
        setInternalVersion((v) => v + 1);
        toast({
          title: "Ação Desfeita! (Ctrl+Z)",
          description: "O estado anterior da biblioteca foi restaurado.",
        });
      }
    }
  };

  const handleRedo = () => {
    if (canRedoLibraryAction()) {
      const success = redoLibraryAction();
      if (success) {
        setInternalVersion((v) => v + 1);
        toast({
          title: "Ação Refeita! (Ctrl+Y)",
          description: "A alteração na biblioteca foi reaplicada.",
        });
      }
    }
  };

  const handleStartRename = (tpl: ReusableBlockTemplate) => {
    setEditingTemplateId(tpl.id);
    setEditingNameValue(tpl.name);
  };

  const handleSaveRename = (tplId: string) => {
    const cleanName = editingNameValue.trim();
    if (!cleanName) {
      setEditingTemplateId(null);
      return;
    }
    try {
      updateBlockNameInLibrary(tplId, cleanName);
      setInternalVersion((v) => v + 1);
      setEditingTemplateId(null);
      toast({
        title: "Bloco Renomeado!",
        description: "O nome do bloco foi atualizado com sucesso.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Nome de Bloco Repetido",
        description:
          err.message ||
          `O nome "${cleanName}" já existe na biblioteca de blocos. Escolha um nome exclusivo.`,
      });
      // Mantém editingTemplateId ativo para que o usuário possa corrigir o nome
    }
  };

  // Carrega a biblioteca de blocos reutilizáveis
  const reusableTemplates = useMemo(() => {
    return getReusableBlocksLibrary();
  }, [libraryVersion, internalVersion]);

  const categories = [
    { id: "comercial", label: "Comercial & Proposta" },
    { id: "financeiro", label: "Financeiro & Fechamento" },
    { id: "conteudo", label: "Conteúdo & Elementos" },
    { id: "layout", label: "Estrutura & Layout" },
  ];

  // Filtra blocos padrão
  const filteredStandard = useMemo(() => {
    return AVAILABLE_COMPONENTS.filter((comp) => {
      const matchesSearch =
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat =
        selectedCategory === "all" || comp.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchTerm, selectedCategory]);

  // Filtra templates reutilizáveis
  const filteredReusable = useMemo(() => {
    return reusableTemplates.filter((tpl) => {
      const matchesSearch =
        tpl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tpl.description &&
          tpl.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tpl.tags &&
          tpl.tags.some((t) =>
            t.toLowerCase().includes(searchTerm.toLowerCase()),
          ));
      const matchesCat =
        selectedCategory === "all" || tpl.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [reusableTemplates, searchTerm, selectedCategory]);

  const handleDragStartStandard = (
    e: React.DragEvent,
    type: DocumentBlockType,
  ) => {
    e.dataTransfer.setData("application/document-block-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartReusable = (
    e: React.DragEvent,
    template: ReusableBlockTemplate,
  ) => {
    e.dataTransfer.setData("application/reusable-block-id", template.id);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDeleteTemplate = (
    id: string,
    name: string,
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation();
    const deleted = deleteReusableBlockTemplate(id);
    if (deleted) {
      setInternalVersion((v) => v + 1);
      toast({
        title: `Bloco "${name}" excluído`,
        description: "Você pode desfazer a qualquer momento com Ctrl+Z.",
        action: (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleUndo()}
            className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-950 shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Desfazer
          </Button>
        ),
      });
    }
  };

  const handleDuplicateTemplate = (id: string) => {
    const template = getReusableBlocksLibrary().find((b) => b.id === id);
    if (!template) return;

    setDuplicateTargetId(id);
    setDuplicateNewName(`${template.name} (Cópia)`);
    setDuplicateModalOpen(true);
  };

  const handleConfirmDuplicate = () => {
    if (!duplicateTargetId || !duplicateNewName.trim()) return;

    try {
      duplicateReusableBlockTemplate(
        duplicateTargetId,
        duplicateNewName.trim(),
      );
      setInternalVersion((v) => v + 1);
      toast({
        title: "Bloco Duplicado na Biblioteca",
        description: "Desfaça com Ctrl+Z se necessário.",
      });
      setDuplicateModalOpen(false);
      setDuplicateTargetId(null);
      setDuplicateNewName("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao Duplicar",
        description:
          err.message || "Não foi possível duplicar o bloco. Verifique o nome.",
      });
    }
  };

  return (
    <div className="space-y-4 flex-1 flex flex-col">
      {/* Barra de Busca e Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar bloco ou elemento..."
            className="h-8 pl-8 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        {/* Abas: Todos, Padrão, Reutilizáveis */}
        <div className="flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1 rounded-md transition-all text-center ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`flex-1 py-1 rounded-md transition-all text-center ${
              activeTab === "standard"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Padrão
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reusable")}
            className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === "reusable"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>Biblioteca</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {reusableTemplates.length}
            </span>
          </button>
        </div>
      </div>

      {/* Botão de Criação Rápida de Bloco Composto */}
      {onCreateNewComposedBlock && (
        <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                Novo Bloco Composto
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                Composição livre com elementos internos
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onCreateNewComposedBlock}
            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Criar
          </Button>
        </div>
      )}

      {/* SEÇÃO 1: BLOCOS REUTILIZÁVEIS / BIBLIOTECA */}
      {(activeTab === "all" || activeTab === "reusable") && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Biblioteca Reutilizável</span>
            </h4>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canUndoLibraryAction()}
                onClick={handleUndo}
                className="h-6 w-6 text-slate-500 hover:text-indigo-600 disabled:opacity-30"
                title="Desfazer exclusão/alteração (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canRedoLibraryAction()}
                onClick={handleRedo}
                className="h-6 w-6 text-slate-500 hover:text-indigo-600 disabled:opacity-30"
                title="Refazer alteração (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] text-slate-400 font-mono ml-0.5">
                ({filteredReusable.length})
              </span>
            </div>
          </div>

          {filteredReusable.length === 0 ? (
            <div className="p-3 text-center border border-dashed rounded-lg text-slate-400 text-xs">
              Nenhum bloco reutilizável encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredReusable.map((tpl) => (
                <div
                  key={tpl.id}
                  draggable
                  onDragStart={(e) => handleDragStartReusable(e, tpl)}
                  className="p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 hover:border-indigo-400 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-grab active:cursor-grabbing transition-all group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Box className="w-4 h-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          {editingTemplateId === tpl.id ? (
                            <div className="flex items-center gap-1 my-0.5">
                              <Input
                                type="text"
                                value={editingNameValue}
                                onChange={(e) =>
                                  setEditingNameValue(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    handleSaveRename(tpl.id);
                                  if (e.key === "Escape")
                                    setEditingTemplateId(null);
                                }}
                                autoFocus
                                className="h-6 text-xs px-1.5 py-0 bg-white dark:bg-slate-900 border-indigo-400 focus:ring-1 focus:ring-indigo-500 font-bold"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleSaveRename(tpl.id)}
                                className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                                title="Salvar Novo Nome"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingTemplateId(null)}
                                className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <span
                                className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                                onDoubleClick={() => handleStartRename(tpl)}
                                title="Clique duplo para renomear este modelo"
                              >
                                {tpl.name}
                              </span>
                              {!tpl.isBuiltIn && (
                                <button
                                  type="button"
                                  onClick={() => handleStartRename(tpl)}
                                  className="opacity-0 group-hover/name:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 transition-opacity"
                                  title="Renomear bloco na biblioteca"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {tpl.isBuiltIn && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-semibold shrink-0">
                                  Padrão
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {tpl.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {tpl.elements?.length || 0} elementos
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize">
                            • {tpl.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onAddReusableBlock && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onAddReusableBlock(tpl)}
                          className="h-7 w-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                          title="Inserir no Documento"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                      {onEditReusableBlock && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => onEditReusableBlock(tpl)}
                          className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-slate-100"
                          title="Editar Modelo Internamente"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDuplicateTemplate(tpl.id)}
                        className="h-7 w-7 text-slate-400 hover:text-slate-700"
                        title="Duplicar Modelo"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      {!tpl.isBuiltIn && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir da Biblioteca"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: BLOCOS PADRÃO DO SISTEMA */}
      {(activeTab === "all" || activeTab === "standard") && (
        <div className="space-y-4 pt-2">
          {categories.map((cat) => {
            const items = filteredStandard.filter((c) => c.category === cat.id);
            if (items.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {cat.label}
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) =>
                          handleDragStartStandard(e, item.type)
                        }
                        onClick={() => onAddBlock(item.type)}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-grab active:cursor-grabbing transition-all group shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {item.description}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddBlock(item.type);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 shrink-0"
                          title="Inserir bloco"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Duplicate Reusable Block Modal */}
      <Dialog open={duplicateModalOpen} onOpenChange={setDuplicateModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Duplicar Modelo</DialogTitle>
            <DialogDescription>
              Informe um novo nome exclusivo para a cópia deste modelo. Não é
              permitido salvar modelos com o mesmo nome.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label htmlFor="duplicate-name" className="text-sm font-medium">
                Novo Nome do Modelo
              </label>
              <Input
                id="duplicate-name"
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                placeholder="Ex: Cópia de Meu Bloco"
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmDuplicate();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDuplicate}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Duplicar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
