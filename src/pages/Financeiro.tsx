import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Loader2,
  Receipt,
  CreditCard,
  RefreshCw,
  Plus,
  ShieldCheck,
  UserCheck,
  PhoneCall,
  MessageSquare,
  ArrowRightLeft,
  Eye,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Keyboard,
  Edit,
  Trash2,
  Filter,
  XCircle,
  LayoutDashboard,
  Wallet,
  Building2,
  ArrowUpRight,
  FileText,
  Sparkles,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { financialService } from "@/lib/api/financial-service";
import { messagingService } from "@/lib/api/messaging-service";
import { TitleDetailsModal } from "@/components/financial/TitleDetailsModal";
import { FinancialTitleModal } from "@/components/financial/FinancialTitleModal";
import {
  FinancialTitle,
  CashFlowSummary,
  FinancialMetrics,
  CustomerCreditAnalysis,
  CollectionInteraction,
  ReconciliationItem,
} from "@/types/financial";

export const FINANCIAL_TABS = [
  {
    id: "painel-geral",
    label: "Painel Financeiro",
    shortLabel: "Visão Geral",
    icon: LayoutDashboard,
    badge: "Executivo",
    description: "Visão Sintética de Saúde Financeira, Indicadores de Liquidez, Saldo e Ações Rápidas",
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-200",
  },
  {
    id: "fluxo-caixa",
    label: "Fluxo de Caixa Projetado",
    shortLabel: "Fluxo de Caixa",
    icon: TrendingUp,
    badge: "DFC Gerencial",
    description: "Demonstrativo Previsto vs. Realizado de Entradas, Saídas e Projeção de Tesouraria",
    color: "text-blue-600 bg-blue-500/10 border-blue-200",
  },
  {
    id: "contas-receber",
    label: "Contas a Receber",
    shortLabel: "Contas a Receber",
    icon: Receipt,
    badge: "SE1 Comercial",
    description: "Gestão de Títulos a Receber, Duplicatas, Status de Pagamento e Baixas",
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-200",
  },
  {
    id: "contas-pagar",
    label: "Contas a Pagar",
    shortLabel: "Contas a Pagar",
    icon: CreditCard,
    badge: "SE2 Operacional",
    description: "Compromissos Financeiros, Fornecedores, Despesas e Vencimentos",
    color: "text-amber-600 bg-amber-500/10 border-amber-200",
  },
  {
    id: "analise-credito",
    label: "Análise de Crédito",
    shortLabel: "Análise de Crédito",
    icon: UserCheck,
    badge: "Risco & Limites",
    description: "Avaliação Comercial de Risco, Limites Disponíveis e Aging de Recebíveis",
    color: "text-violet-600 bg-violet-500/10 border-violet-200",
  },
  {
    id: "cobranca",
    label: "Cobrança Comercial",
    shortLabel: "Cobrança Comercial",
    icon: PhoneCall,
    badge: "Régua Comercial",
    description: "Régua de Cobrança, Registro de Contatos, WhatsApp e Promessas de Pagamento",
    color: "text-rose-600 bg-rose-500/10 border-rose-200",
  },
  {
    id: "conciliacao",
    label: "Conciliação Bancária",
    shortLabel: "Conciliação",
    icon: ArrowRightLeft,
    badge: "Extrato vs. Títulos",
    description: "Batimento Operacional de Extrato Bancário e Vinculação de Títulos",
    color: "text-teal-600 bg-teal-500/10 border-teal-200",
  },
] as const;

export default function FinanceiroPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [creditAnalyses, setCreditAnalyses] = useState<CustomerCreditAnalysis[]>([]);
  const [collections, setCollections] = useState<CollectionInteraction[]>([]);
  const [reconciliations, setReconciliations] = useState<ReconciliationItem[]>([]);

  // Simulation parameters for Projected Cash Flow
  const [projectionHorizon, setProjectionHorizon] = useState<string>("30");
  const [projectionScenario, setProjectionScenario] = useState<string>("base");
  const [projectionInadimplencia, setProjectionInadimplencia] = useState<number>(3);

  // Navigation & Full Screen State
  const resolveTabFromPath = (path: string) => {
    if (path.includes("/receber")) return "contas-receber";
    if (path.includes("/pagar")) return "contas-pagar";
    if (path.includes("/fluxo-caixa")) return "fluxo-caixa";
    if (path.includes("/analise-credito")) return "analise-credito";
    if (path.includes("/cobranca")) return "cobranca";
    if (path.includes("/conciliacao")) return "conciliacao";
    return null;
  };

  const pathTab = resolveTabFromPath(location.pathname);
  const initialTab = pathTab || searchParams.get("tab") || "painel-geral";
  const initialFullScreen = searchParams.get("fullscreen") === "true";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(initialFullScreen);
  const [tabHistory, setTabHistory] = useState<string[]>([]);

  useEffect(() => {
    const tabFromPath = resolveTabFromPath(location.pathname);
    const tabFromQuery = searchParams.get("tab");
    const target = tabFromPath || tabFromQuery || "painel-geral";
    if (target !== activeTab) {
      setActiveTab(target);
    }
    const fullScreenQuery = searchParams.get("fullscreen") === "true";
    if (fullScreenQuery !== isFullScreen) {
      setIsFullScreen(fullScreenQuery);
    }
  }, [location.pathname, searchParams]);

  const updateUrlParams = useCallback((tab: string, fullScreen: boolean) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "painel-geral") {
          next.delete("tab");
        } else {
          next.set("tab", tab);
        }
        if (fullScreen) {
          next.set("fullscreen", "true");
        } else {
          next.delete("fullscreen");
        }
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const handleSelectTab = useCallback((tabId: string, openFullScreen: boolean = false) => {
    if (tabId !== activeTab) {
      setTabHistory((prev) => [...prev, activeTab]);
    }
    setActiveTab(tabId);
    if (openFullScreen) {
      setIsFullScreen(true);
      updateUrlParams(tabId, true);
    } else {
      setIsFullScreen(false);
      updateUrlParams(tabId, false);
    }
  }, [activeTab, updateUrlParams]);

  const handleGoBack = useCallback(() => {
    if (tabHistory.length > 0) {
      const prev = tabHistory[tabHistory.length - 1];
      setTabHistory((old) => old.slice(0, -1));
      setActiveTab(prev);
      updateUrlParams(prev, isFullScreen);
    } else {
      setIsFullScreen(false);
      updateUrlParams(activeTab, false);
    }
  }, [tabHistory, isFullScreen, activeTab, updateUrlParams]);

  const handleCloseFullScreen = useCallback(() => {
    setIsFullScreen(false);
    updateUrlParams(activeTab, false);
  }, [activeTab, updateUrlParams]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [dataInicioFilter, setDataInicioFilter] = useState<string>("");
  const [dataFimFilter, setDataFimFilter] = useState<string>("");
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  // Dialog State for Settling Title (Baixa)
  const [selectedTitle, setSelectedTitle] = useState<FinancialTitle | null>(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleData, setSettleData] = useState({
    valorPago: 0,
    desconto: 0,
    jurosMulta: 0,
    dataPagamento: new Date().toISOString().split("T")[0],
    formaPagamento: "Boleto" as const,
    observacao: "",
  });
  const [settling, setSettling] = useState(false);

  // Dialog for Creating / Editing Title
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTitleType, setCreateTitleType] = useState<"receber" | "pagar">("receber");
  const [editingTitle, setEditingTitle] = useState<FinancialTitle | null>(null);

  const handleOpenCreateTitle = useCallback((tipo?: "receber" | "pagar") => {
    setEditingTitle(null);
    if (tipo) {
      setCreateTitleType(tipo);
    } else {
      setCreateTitleType(activeTab === "contas-pagar" ? "pagar" : "receber");
    }
    setCreateModalOpen(true);
  }, [activeTab]);

  const handleOpenEditTitle = useCallback((title: FinancialTitle) => {
    setEditingTitle(title);
    setCreateTitleType(title.tipo);
    setCreateModalOpen(true);
  }, []);

  // Dialog State for Deleting Title
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTitle, setDeletingTitle] = useState<FinancialTitle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDeleteConfirm = useCallback((title: FinancialTitle) => {
    setDeletingTitle(title);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteTitle = async () => {
    if (!deletingTitle) return;
    setDeleting(true);
    try {
      await financialService.deleteTitle(deletingTitle.id);
      toast({
        title: "Título Excluído",
        description: `O título ${deletingTitle.prefixo}-${deletingTitle.numero} foi removido com sucesso.`,
      });
      setDeleteConfirmOpen(false);
      setDeletingTitle(null);
      loadData();
    } catch {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover o título financeiro.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Dialog State for Collection Interaction
  const [collectionTitle, setCollectionTitle] = useState<FinancialTitle | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [collectionChannel, setCollectionChannel] = useState<"whatsapp" | "email" | "ligacao">("whatsapp");
  const [interactionNotes, setInteractionNotes] = useState("");
  const [promessaData, setPromessaData] = useState("");
  const [sendingCollection, setSendingCollection] = useState(false);

  // Dialog State for Credit Analysis Edit
  const [selectedCredit, setSelectedCredit] = useState<CustomerCreditAnalysis | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [editLimit, setEditLimit] = useState("");
  const [editStatus, setEditStatus] = useState<"liberado" | "bloqueado" | "em_analise">("liberado");
  const [editMotivo, setEditMotivo] = useState("");

  // Dialog State for Visualizador do Título
  const [viewTitle, setViewTitle] = useState<FinancialTitle | null>(null);
  const [viewTitleDialogOpen, setViewTitleDialogOpen] = useState(false);

  const handleOpenViewTitle = (title: FinancialTitle) => {
    setViewTitle(title);
    setViewTitleDialogOpen(true);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metRes, cfRes, titRes, credRes, colRes, recRes] = await Promise.all([
        financialService.getFinancialMetrics(),
        financialService.getCashFlowProjection(),
        financialService.getTitles(),
        financialService.getCustomerCreditAnalysis(),
        financialService.getCollectionInteractions(),
        financialService.getReconciliationItems(),
      ]);

      setMetrics(metRes);
      setCashFlow(cfRes);
      setTitles(titRes);
      setCreditAnalyses(credRes);
      setCollections(colRes);
      setReconciliations(recRes);
    } catch {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as informações do módulo financeiro.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Trava scroll do body no modo tela cheia e ativa teclas de atalho globais
  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is focused on an input/textarea/select and not pressing Alt or Ctrl, ignore single-key hotkeys
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      // 1. ESC => Fecha tela cheia ou fecha modal de atalhos
      if (e.key === "Escape") {
        if (shortcutsHelpOpen) {
          setShortcutsHelpOpen(false);
          return;
        }
        if (isFullScreen) {
          handleCloseFullScreen();
          return;
        }
      }

      // 2. Alt+N => Novo Título (Contextual da aba atual)
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        handleOpenCreateTitle();
        return;
      }

      // 3. Alt+R => Novo Título a Receber
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        handleOpenCreateTitle("receber");
        return;
      }

      // 4. Alt+P => Novo Título a Pagar
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handleOpenCreateTitle("pagar");
        return;
      }

      // 5. Alt+A => Atualizar Dados
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        loadData();
        return;
      }

      // 6. Alt+F => Alternar Modo Tela Cheia
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        const nextFullScreen = !isFullScreen;
        setIsFullScreen(nextFullScreen);
        updateUrlParams(activeTab, nextFullScreen);
        return;
      }

      // 7. Alt + 1 a 7 => Navegação Rápida entre as Abas
      if (e.altKey && ["1", "2", "3", "4", "5", "6", "7"].includes(e.key)) {
        e.preventDefault();
        const tabMap: Record<string, string> = {
          "1": "painel-geral",
          "2": "fluxo-caixa",
          "3": "contas-receber",
          "4": "contas-pagar",
          "5": "analise-credito",
          "6": "cobranca",
          "7": "conciliacao",
        };
        const targetTab = tabMap[e.key];
        if (targetTab) {
          handleSelectTab(targetTab, isFullScreen);
        }
        return;
      }

      // 8. Alt + ArrowLeft => Voltar Aba
      if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handleGoBack();
        return;
      }

      // 9. "/" ou Ctrl+K => Focar no campo de busca quando não estiver digitando
      if (
        (!isTyping && e.key === "/") ||
        ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K"))
      ) {
        e.preventDefault();
        const searchInput = document.getElementById("search-financeiro-input") as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // 10. Alt+H ou ? => Ajuda de Teclas de Atalho
      if ((!isTyping && e.key === "?") || (e.altKey && (e.key === "h" || e.key === "H"))) {
        e.preventDefault();
        setShortcutsHelpOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isFullScreen,
    shortcutsHelpOpen,
    activeTab,
    handleCloseFullScreen,
    handleOpenCreateTitle,
    loadData,
    handleSelectTab,
    handleGoBack,
    updateUrlParams,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Baixa de Título (Liquidação / Pagamento Parcial)
  const handleOpenSettle = (title: FinancialTitle) => {
    setSelectedTitle(title);
    setSettleData({
      valorPago: title.saldo,
      desconto: 0,
      jurosMulta: 0,
      dataPagamento: new Date().toISOString().split("T")[0],
      formaPagamento: title.formaPagamento || "Boleto",
      observacao: "",
    });
    setSettleDialogOpen(true);
  };

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle) return;

    setSettling(true);
    try {
      await financialService.settleTitle(selectedTitle.id, {
        valorPago: Number(settleData.valorPago),
        dataPagamento: settleData.dataPagamento,
        formaPagamento: settleData.formaPagamento,
        desconto: Number(settleData.desconto),
        jurosMulta: Number(settleData.jurosMulta),
        observacao: settleData.observacao,
      });

      toast({
        title: "Baixa financeira realizada",
        description: `O título ${selectedTitle.prefixo}-${selectedTitle.numero} foi atualizado com sucesso.`,
      });
      setSettleDialogOpen(false);
      loadData();
    } catch {
      toast({
        title: "Erro na baixa",
        description: "Ocorreu um erro ao registrar o pagamento do título.",
        variant: "destructive",
      });
    } finally {
      setSettling(false);
    }
  };

  // Handle Action de Cobrança
  const handleOpenCollection = (title: FinancialTitle) => {
    setCollectionTitle(title);
    setInteractionNotes(`Atendimento de cobrança comercial referente ao título ${title.prefixo}-${title.numero}`);
    setPromessaData("");
    setCollectionDialogOpen(true);
  };

  const handleSendCollection = async () => {
    if (!collectionTitle) return;
    setSendingCollection(true);
    try {
      if (collectionChannel === "email") {
        await messagingService.sendEmail({
          quoteId: collectionTitle.id,
          to: "financeiro@cliente.com.br",
          subject: `Lembrete de Cobrança Comercial - Título ${collectionTitle.prefixo}-${collectionTitle.numero}`,
          customerName: collectionTitle.clienteFornecedorNome,
          quoteNumero: collectionTitle.numero,
          approvalLink: window.location.origin,
          pdfBase64: "",
        });
      } else if (collectionChannel === "whatsapp") {
        await messagingService.sendWhatsApp({
          quoteId: collectionTitle.id,
          to: "5511999998888",
          customerName: collectionTitle.clienteFornecedorNome,
          quoteNumero: collectionTitle.numero,
          approvalLink: window.location.origin,
          pdfBase64: "",
        });
      }

      await financialService.addCollectionInteraction({
        tituloId: collectionTitle.id,
        tituloNumero: collectionTitle.numero,
        clienteId: collectionTitle.clienteFornecedorId,
        clienteNome: collectionTitle.clienteFornecedorNome,
        dataHora: new Date().toISOString().replace("T", " ").substring(0, 16),
        tipo: collectionChannel,
        responsavel: "Financeiro Comercial",
        observacao: interactionNotes,
        promessaData: promessaData || undefined,
        resultado: promessaData ? "promessa_pagamento" : "em_negociacao",
      });

      toast({
        title: "Cobrança registrada",
        description: `Cobrança comercial registrada e notificação enviada por ${collectionChannel.toUpperCase()}.`,
      });
      setCollectionDialogOpen(false);
      loadData();
    } catch {
      toast({
        title: "Erro na cobrança",
        description: "Não foi possível registrar o contato de cobrança.",
        variant: "destructive",
      });
    } finally {
      setSendingCollection(false);
    }
  };

  // Handle Editar Limite / Crédito
  const handleOpenCreditEdit = (credit: CustomerCreditAnalysis) => {
    setSelectedCredit(credit);
    setEditLimit(String(credit.limiteCredito));
    setEditStatus(credit.statusCredito);
    setEditMotivo(credit.motivoBloqueio || "");
    setCreditDialogOpen(true);
  };

  const handleSaveCredit = async () => {
    if (!selectedCredit) return;
    try {
      await financialService.updateCreditStatus(selectedCredit.clienteId, {
        statusCredito: editStatus,
        limiteCredito: Number(editLimit),
        motivoBloqueio: editMotivo,
      });

      toast({
        title: "Análise de crédito atualizada",
        description: `Parâmetros de crédito do cliente ${selectedCredit.clienteNome} salvos.`,
      });
      setCreditDialogOpen(false);
      loadData();
    } catch {
      toast({
        title: "Erro ao atualizar crédito",
        description: "Falha ao modificar parâmetros de crédito do cliente.",
        variant: "destructive",
      });
    }
  };

  // Handle Conciliação em 1 Clique
  const handleReconcile = async (item: ReconciliationItem) => {
    if (!item.sugestaoTituloId) return;
    try {
      await financialService.reconcileItem(item.id, item.sugestaoTituloId);
      toast({
        title: "Conciliação realizada",
        description: "Extrato bancário vinculado ao título correspondente com sucesso.",
      });
      loadData();
    } catch {
      toast({
        title: "Erro na conciliação",
        description: "Não foi possível realizar o batimento financeiro.",
        variant: "destructive",
      });
    }
  };

  // Filter Titles
  const filteredTitles = titles.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.clienteFornecedorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categoriaGerencial && t.categoriaGerencial.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.faturamentoId && t.faturamentoId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.pedidoId && t.pedidoId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === "todos"
        ? true
        : statusFilter === "receber"
        ? t.tipo === "receber"
        : statusFilter === "pagar"
        ? t.tipo === "pagar"
        : t.status === statusFilter;

    const matchesCategoria =
      categoriaFilter === "todas"
        ? true
        : t.categoriaGerencial?.toLowerCase().includes(categoriaFilter.toLowerCase());

    const matchesDataInicio =
      !dataInicioFilter ||
      (t.dataVencimento >= dataInicioFilter || t.dataEmissao >= dataInicioFilter);

    const matchesDataFim =
      !dataFimFilter ||
      (t.dataVencimento <= dataFimFilter || t.dataEmissao <= dataFimFilter);

    return matchesSearch && matchesStatus && matchesCategoria && matchesDataInicio && matchesDataFim;
  });

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const currentTabInfo = FINANCIAL_TABS.find((t) => t.id === activeTab) || FINANCIAL_TABS[0];
  const CurrentTabIcon = currentTabInfo.icon;

  const renderTabContents = () => (
    <>
      {/* TAB 1: PAINEL FINANCEIRO (VISÃO GERAL) */}
      <TabsContent value="painel-geral" className="mt-6 space-y-6">
        {/* Barra de Ações Rápidas do Painel Geral */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-xs">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-emerald-600" />
              Painel Financeiro & Saúde de Caixa
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visão sintética consolidada de recebíveis (SE1), pagamentos (SE2), disponibilidade bancária e liquidez.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleOpenCreateTitle("receber")}
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" /> Título a Receber
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenCreateTitle("pagar")}
              className="text-xs gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
            >
              <Plus className="h-3.5 w-3.5" /> Título a Pagar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectTab("conciliacao", false)}
              className="text-xs gap-1.5"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" /> Conciliar Extrato
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectTab("cobranca", false)}
              className="text-xs gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900"
            >
              <PhoneCall className="h-3.5 w-3.5" /> Régua de Cobrança
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card
            onClick={() => handleSelectTab("fluxo-caixa", false)}
            className="shadow-xs border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-700 transition-colors">
                  Disponibilidade em Caixa
                </span>
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                {formatCurrency((metrics?.saldoPrevisto || 0) * 0.75)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-600" />
                Itaú, Bradesco e BB (Consolidado)
              </p>
            </CardContent>
          </Card>

          <Card
            onClick={() => handleSelectTab("contas-receber", false)}
            className="shadow-xs border-blue-500/20 bg-blue-500/5 hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-700 transition-colors">
                  Carteira a Receber (SE1)
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
                  <Receipt className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-blue-600 mt-2">
                {formatCurrency(metrics?.totalAReceber || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                <span>Recebido: {formatCurrency(metrics?.recebidoMes || 0)}</span>
                <span className="font-semibold text-blue-600">PMR {metrics?.prazoMedioRecebimentoDias || 28}d</span>
              </p>
            </CardContent>
          </Card>

          <Card
            onClick={() => handleSelectTab("contas-pagar", false)}
            className="shadow-xs border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-700 transition-colors">
                  Compromissos a Pagar (SE2)
                </span>
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                {formatCurrency(metrics?.totalAPagar || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                <span>Pago: {formatCurrency(metrics?.pagoMes || 0)}</span>
                <span className="font-semibold text-amber-600">PMP 42d</span>
              </p>
            </CardContent>
          </Card>

          <Card
            onClick={() => handleSelectTab("cobranca", false)}
            className="shadow-xs border-rose-500/20 bg-rose-500/5 hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-rose-700 transition-colors">
                  Inadimplência / Risco
                </span>
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {formatCurrency(metrics?.totalInadimplencia || 0)}
              </div>
              <p className="text-xs text-rose-500 mt-1 flex items-center justify-between font-medium">
                <span>Taxa: {metrics?.taxaInadimplencia || 0}%</span>
                <span>{metrics?.titulosVencidosCount || 0} títulos vencidos</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Main Visual Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Saldo Consolidado Chart + Quick Modules Grid */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      Evolução de Saldo Consolidado e Liquidez de Caixa
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Histórico e projeção de disponibilidade financeira líquida nos últimos meses.
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTab("fluxo-caixa", false)}
                    className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                  >
                    Ver Projeção DFC completa <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cashFlow} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Saldo Consolidado"]} />
                      <Area
                        type="monotone"
                        dataKey="saldoProjetado"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSaldo)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Navegação Direta pelos Módulos Financeiros */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Módulos e Esteiras Financeiras
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FINANCIAL_TABS.filter((t) => t.id !== "painel-geral").map((tab) => {
                  const IconComp = tab.icon;
                  return (
                    <Card
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id, false)}
                      className="shadow-2xs hover:shadow-md transition-all cursor-pointer border hover:border-emerald-500/50 hover:bg-muted/30 group active:scale-[0.99]"
                    >
                      <CardContent className="p-3.5 flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${tab.color} shrink-0 group-hover:scale-105 transition-transform`}>
                          <IconComp className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
                              {tab.label}
                            </h5>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                              {tab.badge}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                            {tab.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (1 Col): Aging Distribution & Alerts */}
          <div className="space-y-6">
            {/* Aging de Recebíveis Donut / Breakdown */}
            <Card className="shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Aging da Carteira (Vencimentos SE1)
                </CardTitle>
                <CardDescription className="text-xs">
                  Distribuição dos recebíveis comerciais por faixa de pontualidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div
                  onClick={() => {
                    setStatusFilter("aberto");
                    handleSelectTab("contas-receber", false);
                  }}
                  className="space-y-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  title="Clique para filtrar títulos a vencer em Contas a Receber"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-emerald-600 group-hover:underline">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Títulos a Vencer
                    </span>
                    <span className="font-bold">{formatCurrency(metrics?.aging.aVencer || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setStatusFilter("vencido");
                    handleSelectTab("contas-receber", false);
                  }}
                  className="space-y-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  title="Clique para filtrar títulos vencidos (1-30 dias)"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-amber-600 group-hover:underline">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Vencidos 1 a 30 dias
                    </span>
                    <span className="font-bold">{formatCurrency(metrics?.aging.vencido1a30 || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: "15%" }} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setStatusFilter("vencido");
                    handleSelectTab("contas-receber", false);
                  }}
                  className="space-y-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  title="Clique para filtrar títulos vencidos (31-60 dias)"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-orange-600 group-hover:underline">
                      <span className="h-2 w-2 rounded-full bg-orange-500" /> Vencidos 31 a 60 dias
                    </span>
                    <span className="font-bold">{formatCurrency(metrics?.aging.vencido31a60 || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: "6%" }} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setStatusFilter("vencido");
                    handleSelectTab("cobranca", false);
                  }}
                  className="space-y-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
                  title="Clique para gerenciar na Régua de Cobrança"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-rose-600 group-hover:underline">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Vencidos +60 dias (Cartório)
                    </span>
                    <span className="font-bold">{formatCurrency(metrics?.aging.vencidoMais90 || 0)}</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: "4%" }} />
                  </div>
                </div>

                <div
                  onClick={() => {
                    setStatusFilter("todos");
                    handleSelectTab("contas-receber", false);
                  }}
                  className="pt-3 border-t flex items-center justify-between text-xs font-semibold cursor-pointer hover:bg-muted/40 p-1.5 rounded-lg transition-colors group"
                  title="Ver todos os títulos em Contas a Receber"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">Total da Carteira SE1</span>
                  <span className="text-primary group-hover:underline">{formatCurrency(metrics?.aging.totalGeral || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pendências & Alertas Operacionais */}
            <Card className="shadow-xs border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Alertas & Ações Recomendadas
                  </span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                    Prioridade
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="p-2.5 bg-amber-500/10 border border-amber-200/50 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <span>Duplicata SE1 em Atraso Crítico</span>
                    <span className="text-[10px] bg-amber-200 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">D+12</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Siderúrgica Mauá - Título NF 45802 no valor de R$ 45.000,00.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      handleSelectTab("cobranca", false);
                      toast({
                        title: "Régua de Cobrança Aberta",
                        description: "Foco automático no título NF 45802 da Siderúrgica Mauá."
                      });
                    }}
                    className="p-0 h-auto text-[11px] text-amber-700 font-semibold hover:underline cursor-pointer"
                  >
                    Acionar Régua de Cobrança →
                  </Button>
                </div>

                <div className="p-2.5 bg-teal-500/10 border border-teal-200/50 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-teal-800 dark:text-teal-300 flex items-center justify-between">
                    <span>Conciliação Bancária Pendente</span>
                    <span className="text-[10px] bg-teal-200 dark:bg-teal-900/50 px-1.5 py-0.5 rounded">3 itens</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Lançamentos de extrato bancário não vinculados aos títulos no SE1.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => {
                      handleSelectTab("conciliacao", false);
                      toast({
                        title: "Módulo de Conciliação Bancária",
                        description: "Pronto para efetuar batimento e cruzamento de lançamentos."
                      });
                    }}
                    className="p-0 h-auto text-[11px] text-teal-700 font-semibold hover:underline cursor-pointer"
                  >
                    Efetuar Batimento em 1 Clique →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* TAB 2: FLUXO DE CAIXA PROJETADO (DFC GERENCIAL) */}
      <TabsContent value="fluxo-caixa" className="mt-6 space-y-6">
        {/* Painel de Controle de Simulação de Projeção */}
        <Card className="shadow-xs border-blue-500/20 bg-gradient-to-r from-blue-500/5 via-transparent to-emerald-500/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Fluxo de Caixa Projetado & Simulador DFC
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Projeção orçamentária de entradas e saídas operacionais com ajuste dinâmico de cenários e inadimplência.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {!isFullScreen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectTab("fluxo-caixa", true)}
                    className="h-8 text-xs gap-1"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t pt-4">
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Horizonte de Projeção
                </Label>
                <Select value={projectionHorizon} onValueChange={setProjectionHorizon}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o horizonte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Próximos 30 Dias</SelectItem>
                    <SelectItem value="60">Próximos 60 Dias</SelectItem>
                    <SelectItem value="90">Próximos 90 Dias (Trimestral)</SelectItem>
                    <SelectItem value="180">Próximos 180 Dias (Semestral)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Cenário Macro-Comercial
                </Label>
                <Select value={projectionScenario} onValueChange={setProjectionScenario}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o cenário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="base">Cenário Base (Orçamento Protheus)</SelectItem>
                    <SelectItem value="otimista">Cenário Otimista (+15% Entradas)</SelectItem>
                    <SelectItem value="pessimista">Cenário Conservador (-15% Entradas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Sensibilidade de Inadimplência Simulada
                </Label>
                <Select
                  value={String(projectionInadimplencia)}
                  onValueChange={(val) => setProjectionInadimplencia(Number(val))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Taxa de Inadimplência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Inadimplência Nula)</SelectItem>
                    <SelectItem value="3">3% (Média Histórica SE1)</SelectItem>
                    <SelectItem value="5">5% (Estresse Moderado)</SelectItem>
                    <SelectItem value="8">8% (Cenário de Crise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Principal DFC */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Demonstrativo DFC: Entradas Previstas vs Realizadas e Saídas Operacionais</span>
              <Badge variant="outline" className="text-xs font-normal">
                Cenário: {projectionScenario.toUpperCase()} | Inadimplência: {projectionInadimplencia}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="entradasPrevistas" name="Entradas Previstas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="entradasRealizadas" name="Entradas Realizadas" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidasPrevistas" name="Saídas Previstas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidasRealizadas" name="Saídas Realizadas" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t pt-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-200 rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Entradas Previstas (Mês Atual)</span>
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(
                    (cashFlow[cashFlow.length - 2]?.entradasPrevistas || 0) *
                      (projectionScenario === "otimista" ? 1.15 : projectionScenario === "pessimista" ? 0.85 : 1)
                  )}
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Saídas Previstas (Mês Atual)</span>
                <div className="text-lg font-bold text-amber-600">
                  {formatCurrency(cashFlow[cashFlow.length - 2]?.saidasPrevistas || 0)}
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-200 rounded-lg">
                <span className="text-xs text-muted-foreground font-medium">Saldo Projetado de Caixa</span>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(
                    (cashFlow[cashFlow.length - 2]?.saldoProjetado || 0) *
                      (1 - projectionInadimplencia / 100)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 2: CONTAS A RECEBER (SE1) */}
      <TabsContent value="contas-receber" className="mt-6 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-financeiro-input"
              placeholder="Buscar cliente, duplicata, pedido... (/ ou Ctrl+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status filters */}
            <Button
              variant={statusFilter === "receber" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("receber")}
              className="text-xs h-9"
            >
              Todos a Receber
            </Button>
            <Button
              variant={statusFilter === "atrasado" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("atrasado")}
              className="text-xs h-9 text-rose-600 border-rose-200"
            >
              Vencidos / Atrasados
            </Button>
            <Button
              variant={statusFilter === "pago" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pago")}
              className="text-xs h-9 text-emerald-600 border-emerald-200"
            >
              Liquidados
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenCreateTitle("receber")}
              className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              id="btn-novo-titulo-receber"
              title="Novo Título a Receber (Alt+R ou Alt+N)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Título</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-black/20 text-white rounded border border-white/20">
                Alt+R
              </kbd>
            </Button>
            {!isFullScreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectTab("contas-receber", true)}
                className="text-xs h-9 gap-1 text-primary border-primary/30"
                title="Abrir em Tela Cheia (Alt+F)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Tela Cheia</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
                  Alt+F
                </kbd>
              </Button>
            )}
          </div>
        </div>

        {/* Filter controls row for date range and cost center / category */}
        <div className="flex flex-wrap items-center gap-2.5 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mr-1">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Filtros Avançados:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Período:</span>
            <Input
              type="date"
              value={dataInicioFilter}
              onChange={(e) => setDataInicioFilter(e.target.value)}
              className="h-8 text-xs w-36 bg-background"
              placeholder="Data Início"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={dataFimFilter}
              onChange={(e) => setDataFimFilter(e.target.value)}
              className="h-8 text-xs w-36 bg-background"
              placeholder="Data Fim"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Centro de Custo / Categoria:</span>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="h-8 text-xs w-56 bg-background">
                <SelectValue placeholder="Todas as Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Categorias</SelectItem>
                <SelectItem value="Venda de Produtos Industriais">Venda de Produtos Industriais</SelectItem>
                <SelectItem value="Matéria-Prima e Suprimentos">Matéria-Prima e Suprimentos</SelectItem>
                <SelectItem value="Energia e Utilidades">Energia e Utilidades</SelectItem>
                <SelectItem value="Fretes e Distribuição">Fretes e Distribuição</SelectItem>
                <SelectItem value="Despesas Administrativas">Despesas Administrativas</SelectItem>
                <SelectItem value="Serviços e Manutenção">Serviços e Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(dataInicioFilter || dataFimFilter || categoriaFilter !== "todas" || searchTerm || statusFilter !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDataInicioFilter("");
                setDataFimFilter("");
                setCategoriaFilter("todas");
                setSearchTerm("");
                setStatusFilter("todos");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 ml-auto"
            >
              <XCircle className="h-3.5 w-3.5" /> Limpar Filtros
            </Button>
          )}
        </div>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>Títulos a Receber (Contas A Receber - SE1)</span>
                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-500/10 border-emerald-300">
                    Receitas Comerciais
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Duplicatas mercantis, faturamentos de vendas industriais e parcelamentos de clientes.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-muted-foreground">
                  {filteredTitles.filter((t) => t.tipo === "receber").length} títulos
                </span>
                {!isFullScreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTab("contas-receber", true)}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    title="Expandir Contas a Receber em Tela Cheia"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Título / Parc.</th>
                    <th className="p-3">Cliente / CNPJ</th>
                    <th className="p-3">Pedido / Nota</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Valor Original</th>
                    <th className="p-3">Saldo Devedor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTitles
                    .filter((t) => t.tipo === "receber")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <span className="font-mono text-primary">
                            {t.prefixo}-{t.numero}
                          </span>
                          <span className="text-muted-foreground ml-1">({t.parcela})</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{t.clienteFornecedorNome}</div>
                          <div className="text-[11px] text-muted-foreground">{t.cnpjCpf}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {t.pedidoId && <Badge variant="outline" className="mr-1">Ped: {t.pedidoId}</Badge>}
                          {t.faturamentoId && <span className="text-muted-foreground">{t.faturamentoId}</span>}
                        </td>
                        <td className="p-3">{t.dataVencimento}</td>
                        <td className="p-3 font-medium">{formatCurrency(t.valorOriginal)}</td>
                        <td className="p-3 font-bold text-foreground">{formatCurrency(t.saldo)}</td>
                        <td className="p-3">
                          {t.status === "pago" && <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">Pago</Badge>}
                          {t.status === "pendente" && <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-200">A Receber</Badge>}
                          {t.status === "parcial" && <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 border-blue-200">Parcial</Badge>}
                          {t.status === "atrasado" && <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/20 border-rose-200">Atrasado</Badge>}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-muted-foreground/30 text-foreground hover:bg-muted"
                            onClick={() => handleOpenViewTitle(t)}
                            title="Visualizar Detalhes do Título"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" /> Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-muted-foreground/30 text-foreground hover:bg-muted"
                            onClick={() => handleOpenEditTitle(t)}
                            title="Editar Título"
                          >
                            <Edit className="h-3.5 w-3.5 text-amber-600" /> Editar
                          </Button>
                          {t.status !== "pago" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleOpenSettle(t)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Baixar
                            </Button>
                          )}
                          {t.status === "atrasado" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                              onClick={() => handleOpenCollection(t)}
                            >
                              <PhoneCall className="h-3.5 w-3.5" /> Cobrar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => handleOpenDeleteConfirm(t)}
                            title="Excluir Título"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 3: CONTAS A PAGAR (SE2) */}
      <TabsContent value="contas-pagar" className="mt-6 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar fornecedor, categoria, documento... (/ ou Ctrl+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status filters */}
            <Button
              variant={statusFilter === "todos" || statusFilter === "pagar" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pagar")}
              className="text-xs h-9"
            >
              Todos a Pagar
            </Button>
            <Button
              variant={statusFilter === "pendente" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pendente")}
              className="text-xs h-9 text-amber-600 border-amber-200"
            >
              Pendentes
            </Button>
            <Button
              variant={statusFilter === "pago" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("pago")}
              className="text-xs h-9 text-emerald-600 border-emerald-200"
            >
              Pagos / Liquidados
            </Button>
            <Button
              size="sm"
              onClick={() => handleOpenCreateTitle("pagar")}
              className="h-9 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
              id="btn-novo-titulo-pagar"
              title="Novo Título a Pagar (Alt+P ou Alt+N)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Novo Título</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-black/20 text-white rounded border border-white/20">
                Alt+P
              </kbd>
            </Button>
            {!isFullScreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectTab("contas-pagar", true)}
                className="text-xs h-9 gap-1 text-primary border-primary/30"
                title="Abrir em Tela Cheia (Alt+F)"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Tela Cheia</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
                  Alt+F
                </kbd>
              </Button>
            )}
          </div>
        </div>

        {/* Filter controls row for date range and cost center / category */}
        <div className="flex flex-wrap items-center gap-2.5 p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium mr-1">
            <Filter className="h-3.5 w-3.5 text-primary" />
            <span>Filtros Avançados:</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Período:</span>
            <Input
              type="date"
              value={dataInicioFilter}
              onChange={(e) => setDataInicioFilter(e.target.value)}
              className="h-8 text-xs w-36 bg-background"
              placeholder="Data Início"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <Input
              type="date"
              value={dataFimFilter}
              onChange={(e) => setDataFimFilter(e.target.value)}
              className="h-8 text-xs w-36 bg-background"
              placeholder="Data Fim"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Centro de Custo / Categoria:</span>
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="h-8 text-xs w-56 bg-background">
                <SelectValue placeholder="Todas as Categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Categorias</SelectItem>
                <SelectItem value="Venda de Produtos Industriais">Venda de Produtos Industriais</SelectItem>
                <SelectItem value="Matéria-Prima e Suprimentos">Matéria-Prima e Suprimentos</SelectItem>
                <SelectItem value="Energia e Utilidades">Energia e Utilidades</SelectItem>
                <SelectItem value="Fretes e Distribuição">Fretes e Distribuição</SelectItem>
                <SelectItem value="Despesas Administrativas">Despesas Administrativas</SelectItem>
                <SelectItem value="Serviços e Manutenção">Serviços e Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(dataInicioFilter || dataFimFilter || categoriaFilter !== "todas" || searchTerm || statusFilter !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDataInicioFilter("");
                setDataFimFilter("");
                setCategoriaFilter("todas");
                setSearchTerm("");
                setStatusFilter("todos");
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 ml-auto"
            >
              <XCircle className="h-3.5 w-3.5" /> Limpar Filtros
            </Button>
          )}
        </div>

        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span>Compromissos a Pagar (Contas A Pagar - SE2)</span>
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-500/10 border-amber-300">
                    Despesas Operacionais
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Despesas operacionais, compras de matéria-prima refratária, insumos industriais e fornecedores.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-normal text-muted-foreground">
                  {filteredTitles.filter((t) => t.tipo === "pagar").length} títulos
                </span>
                {!isFullScreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTab("contas-pagar", true)}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    title="Expandir Contas a Pagar em Tela Cheia"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Doc / Parc.</th>
                    <th className="p-3">Fornecedor / Categoria Gerencial</th>
                    <th className="p-3">Emissão</th>
                    <th className="p-3">Vencimento</th>
                    <th className="p-3">Valor Original</th>
                    <th className="p-3">Saldo A Pagar</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTitles
                    .filter((t) => t.tipo === "pagar")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium font-mono text-primary">
                          {t.prefixo}-{t.numero}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-foreground">{t.clienteFornecedorNome}</div>
                          <div className="text-[11px] text-muted-foreground">{t.categoriaGerencial}</div>
                        </td>
                        <td className="p-3">{t.dataEmissao}</td>
                        <td className="p-3">{t.dataVencimento}</td>
                        <td className="p-3 font-medium">{formatCurrency(t.valorOriginal)}</td>
                        <td className="p-3 font-bold text-amber-600">{formatCurrency(t.saldo)}</td>
                        <td className="p-3">
                          {t.status === "pago" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Pago</Badge>}
                          {t.status === "pendente" && <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">A Pagar</Badge>}
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-muted-foreground/30 text-foreground hover:bg-muted"
                            onClick={() => handleOpenViewTitle(t)}
                            title="Visualizar Detalhes do Título"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" /> Ver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-muted-foreground/30 text-foreground hover:bg-muted"
                            onClick={() => handleOpenEditTitle(t)}
                            title="Editar Título"
                          >
                            <Edit className="h-3.5 w-3.5 text-amber-600" /> Editar
                          </Button>
                          {t.status !== "pago" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                              onClick={() => handleOpenSettle(t)}
                            >
                              Pagamento
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => handleOpenDeleteConfirm(t)}
                            title="Excluir Título"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Excluir
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 4: ANÁLISE DE CRÉDITO COMERCIAL */}
      <TabsContent value="analise-credito" className="mt-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                <span>Análise de Crédito de Clientes</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Avaliação Comercial de Risco
                  </Badge>
                  {!isFullScreen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectTab("analise-credito", true)}
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      title="Expandir Análise de Crédito em Tela Cheia"
                    >
                      <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                    </Button>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Parâmetros de crédito e bloqueio de pedidos para proteção financeira comercial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Limite Crédito</th>
                      <th className="p-3">Utilizado / Disponível</th>
                      <th className="p-3">Classe Risco</th>
                      <th className="p-3">Status Crédito</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {creditAnalyses.map((c) => (
                      <tr key={c.clienteId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="text-foreground font-semibold">{c.clienteNome}</div>
                          <div className="text-[11px] text-muted-foreground">{c.cnpjCpf}</div>
                        </td>
                        <td className="p-3 font-medium">{formatCurrency(c.limiteCredito)}</td>
                        <td className="p-3">
                          <div className="text-foreground">{formatCurrency(c.creditoUtilizado)} /</div>
                          <div className="text-emerald-600 font-semibold">{formatCurrency(c.creditoDisponivel)}</div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" className="text-[11px]">
                            {c.classeRisco}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {c.statusCredito === "liberado" && <Badge className="bg-emerald-500/15 text-emerald-700">Liberado</Badge>}
                          {c.statusCredito === "bloqueado" && <Badge className="bg-rose-500/15 text-rose-700">Bloqueado</Badge>}
                          {c.statusCredito === "em_analise" && <Badge className="bg-amber-500/15 text-amber-700">Em Análise</Badge>}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary"
                            onClick={() => handleOpenCreditEdit(c)}
                          >
                            Ajustar Crédito
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AGING DE CONTAS A RECEBER */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Aging de Contas a Receber
              </CardTitle>
              <CardDescription>
                Distribuição de saldos devedores por faixa de vencimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">A Vencer:</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(metrics?.aging.aVencer || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "70%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vencido 1 a 30 dias:</span>
                  <span className="font-bold text-amber-600">
                    {formatCurrency(metrics?.aging.vencido1a30 || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: "25%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vencido 31 a 60 dias:</span>
                  <span className="font-bold text-rose-500">
                    {formatCurrency(metrics?.aging.vencido31a60 || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-rose-500 h-2 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Vencido Mais de 90 dias:</span>
                  <span className="font-bold text-rose-700">
                    {formatCurrency(metrics?.aging.vencidoMais90 || 0)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-rose-700 h-2 rounded-full" style={{ width: "0%" }} />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-between items-center text-xs font-bold">
                <span>Total Exposição Comercial:</span>
                <span className="text-primary">{formatCurrency(metrics?.aging.totalGeral || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* TAB 5: RÉRUA DE COBRANÇA COMERCIAL */}
      <TabsContent value="cobranca" className="mt-6 space-y-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Histórico & Fila de Ações de Cobrança</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Integração Comercial com Cliente
                </Badge>
                {!isFullScreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTab("cobranca", true)}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    title="Expandir Cobrança em Tela Cheia"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Acompanhamento de interações, ligações e promessas de pagamento registradas comercialmente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collections.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Nenhuma interação de cobrança registrada até o momento.
                </p>
              ) : (
                collections.map((col) => (
                  <div key={col.id} className="p-4 border rounded-xl bg-muted/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{col.clienteNome}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Título: {col.tituloNumero}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{col.dataHora}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{col.observacao}</p>
                      {col.promessaData && (
                        <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                          <Calendar className="h-3.5 w-3.5" /> Promessa de Pagamento: {col.promessaData}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary uppercase text-[10px]">
                        {col.tipo}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {col.resultado.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 6: CONCILIAÇÃO FINANCEIRA OPERACIONAL */}
      <TabsContent value="conciliacao" className="mt-6 space-y-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Conciliação Financeira Operacional (Extrato vs. Títulos)</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Batimento Operacional de Caixa
                </Badge>
                {!isFullScreen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectTab("conciliacao", true)}
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    title="Expandir Conciliação em Tela Cheia"
                  >
                    <Maximize2 className="h-3.5 w-3.5" /> Tela Cheia
                  </Button>
                )}
              </div>
            </CardTitle>
            <CardDescription>
              Sugestão e vinculação direta de extratos financeiros com títulos a receber e a pagar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Data Movimento</th>
                    <th className="p-3">Descrição Extrato</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Sugestão de Título</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reconciliations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{rec.dataMovimento}</td>
                      <td className="p-3 font-mono text-[11px]">{rec.descricao}</td>
                      <td className="p-3">
                        <Badge variant={rec.tipo === "entrada" ? "default" : "secondary"}>
                          {rec.tipo.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 font-bold">{formatCurrency(rec.valor)}</td>
                      <td className="p-3 text-muted-foreground">{rec.sugestaoTituloNumero || "Sem sugestão"}</td>
                      <td className="p-3">
                        {rec.status === "conciliado" ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700">Conciliado</Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-700">Pendente</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {rec.status === "pendente" && rec.sugestaoTituloId && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleReconcile(rec)}
                          >
                            Conciliar em 1-Clique
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Carregando painel financeiro comercial...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-12 max-w-[1600px] mx-auto">
      {/* Scope Disclaimer Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Faturamento & Gestão Financeira Comercial
            </h1>
            <p className="text-xs text-muted-foreground">
              Acompanhamento de faturamento de pedidos, títulos a receber de clientes, análise de crédito comercial e cobrança (Sem escrituração contábil/fiscal).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShortcutsHelpOpen(true)}
            className="h-9 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Guia de Teclas de Atalho (Pressione ? ou Alt+H)"
          >
            <Keyboard className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Atalhos</span>
            <kbd className="px-1 text-[9px] font-mono bg-muted rounded border">?</kbd>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="gap-1.5 text-xs h-9"
            title="Atualizar Dados (Alt+A)"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
            <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
              Alt+A
            </kbd>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => handleSelectTab("contas-receber", false)}
          className="shadow-xs border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
          title="Clique para abrir Contas a Receber"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-700 transition-colors">
              A Receber (SE1 Comercial)
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:scale-105 transition-transform">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(metrics?.totalAReceber || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Recebido no mês: {formatCurrency(metrics?.recebidoMes || 0)}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => handleSelectTab("contas-pagar", false)}
          className="shadow-xs border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
          title="Clique para abrir Contas a Pagar"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-700 transition-colors">
              A Pagar (SE2 Operacional)
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:scale-105 transition-transform">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(metrics?.totalAPagar || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              Pago no mês: {formatCurrency(metrics?.pagoMes || 0)}
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => handleSelectTab("fluxo-caixa", false)}
          className="shadow-xs border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
          title="Clique para abrir Fluxo de Caixa"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-blue-700 transition-colors">
              Saldo Projetado
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:scale-105 transition-transform">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics?.saldoPrevisto || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              PMR Médio: {metrics?.prazoMedioRecebimentoDias || 30} dias
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => handleSelectTab("cobranca", false)}
          className="shadow-xs border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group"
          title="Clique para abrir Régua de Cobrança"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-rose-700 transition-colors">
              Inadimplência Comercial
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 group-hover:scale-105 transition-transform">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(metrics?.totalInadimplencia || 0)}
            </div>
            <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
              Taxa: {metrics?.taxaInadimplencia || 0}% ({metrics?.titulosVencidosCount || 0} títulos vencidos)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Multi-Tab Commercial Structure */}
      <Tabs value={activeTab} onValueChange={(val) => handleSelectTab(val, false)} className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-muted/60 rounded-xl border border-border/60">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto p-0 bg-transparent gap-1 w-full sm:w-auto">
            {FINANCIAL_TABS.map((tab, index) => {
              const TabIcon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-xs py-2 px-3 gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs cursor-pointer"
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <kbd className="hidden xl:inline-block ml-1 px-1 py-0.1 text-[8px] font-mono bg-muted/70 text-muted-foreground rounded border">
                    Alt+{index + 1}
                  </kbd>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="flex items-center justify-end gap-2 px-2 pb-1 sm:pb-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectTab(activeTab, true)}
              className="h-8 gap-1.5 text-xs bg-background/80 hover:bg-background border-border shadow-xs text-foreground font-medium cursor-pointer"
              title="Abrir módulo em Tela Cheia (Alt+F)"
            >
              <Maximize2 className="h-3.5 w-3.5 text-primary" />
              <span>Tela Cheia</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
                Alt+F
              </kbd>
            </Button>
          </div>
        </div>

        {renderTabContents()}
      </Tabs>

      {/* MODAL / OVERLAY DE TELA CHEIA PARA OS SUBMÓDULOS */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden animate-in fade-in-50 duration-150">
          {/* HEADER FIXO SUPERIOR DA TELA CHEIA */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-xs">
            {/* LADO ESQUERDO: BOTÃO VOLTAR E IDENTIFICAÇÃO DO MÓDULO */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoBack}
                className="h-8 gap-1.5 text-xs font-semibold hover:bg-muted border-border/80 text-foreground shrink-0 shadow-xs"
                title="Voltar ao painel geral ou aba anterior (Alt+←)"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-primary" />
                <span>Voltar</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
                  Alt+←
                </kbd>
              </Button>

              <div className="h-4 w-px bg-border/80 hidden sm:block" />

              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-1.5 rounded-lg border shrink-0 ${currentTabInfo.color}`}>
                  <CurrentTabIcon className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground truncate">
                      {currentTabInfo.label}
                    </span>
                    <Badge variant="outline" className="text-[10px] hidden md:inline-flex shrink-0">
                      {currentTabInfo.badge}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate hidden sm:block">
                    {currentTabInfo.description}
                  </span>
                </div>
              </div>
            </div>

            {/* CENTRO: MENU DE NAVEGAÇÃO RÁPIDA ENTRE MÓDULOS EM TELA CHEIA */}
            <div className="hidden xl:flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
              {FINANCIAL_TABS.map((tab, idx) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSelectTab(tab.id, true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      isActive
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={`Aba ${tab.label} (Alt+${idx + 1})`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    <span>{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* LADO DIREITO: AÇÕES E BOTÃO FECHAR */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-8 gap-1.5 text-xs hidden sm:flex"
                title="Recarregar dados (Alt+A)"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
                <kbd className="hidden lg:inline-block ml-1 px-1 py-0.2 text-[9px] font-mono bg-muted rounded border text-muted-foreground">
                  Alt+A
                </kbd>
              </Button>

              <div className="h-4 w-px bg-border/80" />

              {/* BOTÃO FECHAR TELA CHEIA */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseFullScreen}
                className="h-8 gap-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border/60"
                title="Fechar modo tela cheia (Pressione Esc)"
              >
                <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Fechar</span>
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-background/90 rounded border border-border/80 text-muted-foreground">
                  Esc
                </kbd>
              </Button>
            </div>
          </header>

          {/* CORPO EM TELA CHEIA COM ROLAGEM DEDICADA */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1800px] w-full mx-auto">
            {/* MINI FAIXA DE RESUMO FINANCEIRO NA TELA CHEIA */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border/40">
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/70 border border-border/40">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">A Receber</span>
                  <div className="text-sm font-bold text-emerald-600">{formatCurrency(metrics?.totalAReceber || 0)}</div>
                </div>
                <TrendingUp className="h-4 w-4 text-emerald-500/60" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/70 border border-border/40">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">A Pagar</span>
                  <div className="text-sm font-bold text-amber-600">{formatCurrency(metrics?.totalAPagar || 0)}</div>
                </div>
                <TrendingDown className="h-4 w-4 text-amber-500/60" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/70 border border-border/40">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo Previsto</span>
                  <div className="text-sm font-bold text-blue-600">{formatCurrency(metrics?.saldoPrevisto || 0)}</div>
                </div>
                <DollarSign className="h-4 w-4 text-blue-500/60" />
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/70 border border-border/40">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inadimplência</span>
                  <div className="text-sm font-bold text-rose-600">{formatCurrency(metrics?.totalInadimplencia || 0)}</div>
                </div>
                <AlertTriangle className="h-4 w-4 text-rose-500/60" />
              </div>
            </div>

            {/* CONTEÚDO DA ABA ATIVA */}
            <Tabs value={activeTab} onValueChange={(val) => handleSelectTab(val, true)} className="w-full">
              {renderTabContents()}
            </Tabs>
          </main>
        </div>
      )}

      {/* DIALOG DE BAIXA DE TÍTULO */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Baixa Financeira de Título ({selectedTitle?.prefixo}-{selectedTitle?.numero})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre a quitação total ou parcial referente ao cliente/fornecedor{" "}
              <strong>{selectedTitle?.clienteFornecedorNome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSettleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor Original</Label>
                <Input
                  disabled
                  value={formatCurrency(selectedTitle?.valorOriginal || 0)}
                  className="h-8 text-xs bg-muted"
                />
              </div>
              <div>
                <Label className="text-xs">Saldo Devedor Atual</Label>
                <Input
                  disabled
                  value={formatCurrency(selectedTitle?.saldo || 0)}
                  className="h-8 text-xs bg-muted font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Valor Efeticamente Pago (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleData.valorPago}
                  onChange={(e) => setSettleData({ ...settleData, valorPago: Number(e.target.value) })}
                  className="h-8 text-xs font-bold text-emerald-600"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Data de Pagamento</Label>
                <Input
                  type="date"
                  value={settleData.dataPagamento}
                  onChange={(e) => setSettleData({ ...settleData, dataPagamento: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desconto Comercial (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleData.desconto}
                  onChange={(e) => setSettleData({ ...settleData, desconto: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Juros / Multa (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleData.jurosMulta}
                  onChange={(e) => setSettleData({ ...settleData, jurosMulta: Number(e.target.value) })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Observações da Baixa</Label>
              <Textarea
                placeholder="Ex: Quitação via TED com comprovante em anexo"
                value={settleData.observacao}
                onChange={(e) => setSettleData({ ...settleData, observacao: e.target.value })}
                className="text-xs h-16"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setSettleDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={settling} className="gap-2">
                {settling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirmar Baixa Financeira
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE COBRANÇA COMERCIAL */}
      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Notificação de Cobrança Comercial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ação de cobrança para o cliente <strong>{collectionTitle?.clienteFornecedorNome}</strong> (Título {collectionTitle?.prefixo}-{collectionTitle?.numero}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div>
              <Label className="text-xs mb-1 block">Canal de Contato</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={collectionChannel === "whatsapp" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCollectionChannel("whatsapp")}
                  className="text-xs gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp
                </Button>
                <Button
                  type="button"
                  variant={collectionChannel === "email" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCollectionChannel("email")}
                  className="text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5 text-blue-500" /> E-mail
                </Button>
                <Button
                  type="button"
                  variant={collectionChannel === "ligacao" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCollectionChannel("ligacao")}
                  className="text-xs gap-1.5"
                >
                  <PhoneCall className="h-3.5 w-3.5 text-amber-500" /> Ligação
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs">Data de Promessa de Pagamento (Se houver)</Label>
              <Input
                type="date"
                value={promessaData}
                onChange={(e) => setPromessaData(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Anotações da Interação Comercial</Label>
              <Textarea
                value={interactionNotes}
                onChange={(e) => setInteractionNotes(e.target.value)}
                className="text-xs h-20"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCollectionDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSendCollection} disabled={sendingCollection} className="gap-2">
                {sendingCollection && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Registrar & Notificar Cliente
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG DE EDITAR ANÁLISE DE CRÉDITO */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Parâmetros de Crédito do Cliente</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste o limite de crédito comercial e status do cliente <strong>{selectedCredit?.clienteNome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            <div>
              <Label className="text-xs">Limite de Crédito Aprovado (R$)</Label>
              <Input
                type="number"
                step="1000"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                className="h-8 text-xs font-bold"
              />
            </div>

            <div>
              <Label className="text-xs">Status do Crédito Comercial</Label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "liberado" | "bloqueado" | "em_analise")}
                className="w-full h-8 text-xs rounded-md border bg-background px-2"
              >
                <option value="liberado">Liberado para Vendas</option>
                <option value="bloqueado">Bloqueado para Pedidos</option>
                <option value="em_analise">Em Análise Comercial</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Motivo / Justificativa Comercial</Label>
              <Textarea
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                placeholder="Ex: Título vencido regularizado, limite expandido mediante garantias."
                className="text-xs h-16"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setCreditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveCredit}>
                Salvar Parâmetros
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VISUALIZAÇÃO DO TÍTULO */}
      <TitleDetailsModal
        open={viewTitleDialogOpen}
        onOpenChange={setViewTitleDialogOpen}
        title={viewTitle}
        onOpenSettle={handleOpenSettle}
        onOpenCollection={handleOpenCollection}
        onOpenEdit={handleOpenEditTitle}
        onDelete={handleOpenDeleteConfirm}
      />

      {/* MODAL DE NOVO / EDITAR TÍTULO FINANCEIRO (EM TELA CHEIA / MODAL) */}
      <FinancialTitleModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditingTitle(null);
        }}
        tipo={createTitleType}
        titleToEdit={editingTitle}
        onSuccess={loadData}
        defaultFullScreen={true}
      />

      {/* DIALOG DE CONFIRMAÇÃO DE EXCLUSÃO DE TÍTULO */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 text-base font-bold">
              <Trash2 className="h-5 w-5" /> Confirmar Exclusão de Título
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Tem certeza que deseja excluir permanentemente o título{" "}
              <strong className="text-foreground font-mono">
                {deletingTitle?.prefixo}-{deletingTitle?.numero}
              </strong>{" "}
              do parceiro <strong className="text-foreground">{deletingTitle?.clienteFornecedorNome}</strong>?
              Esta ação removerá o registro e atualizará os saldos operacionais.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteTitle}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span>Excluir Título</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE GUIA DE TECLAS DE ATALHO */}
      <Dialog open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Keyboard className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Teclas de Atalho do Módulo Financeiro</DialogTitle>
                <DialogDescription className="text-xs">
                  Navegue e opere os títulos e fluxos de caixa com agilidade usando o teclado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-xs pt-1">
            {/* Seção 1: Criação e Títulos */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                <span>Criação de Títulos Financeiros</span>
              </span>
              <div className="grid grid-cols-1 gap-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo Título (Aba Ativa):</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + N
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo Título a Receber (SE1):</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + R
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Novo Título a Pagar (SE2):</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + P
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Salvar Título no Formulário:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Ctrl + Enter
                  </kbd>
                </div>
              </div>
            </div>

            {/* Seção 2: Visualização e Tela Cheia */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Maximize2 className="h-3.5 w-3.5 text-primary" />
                <span>Navegação & Modos de Visualização</span>
              </span>
              <div className="grid grid-cols-1 gap-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Alternar Modo Tela Cheia:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + F
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Fechar Janela / Tela Cheia:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Esc
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Voltar ao Painel Geral:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + ←
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Alternar Abas (1 a 6):</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + 1 .. 6
                  </kbd>
                </div>
              </div>
            </div>

            {/* Seção 3: Busca & Dados */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-primary" />
                <span>Busca e Atualização</span>
              </span>
              <div className="grid grid-cols-1 gap-1.5 bg-muted/40 p-2.5 rounded-lg border border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Focar Campo de Pesquisa:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    / ou Ctrl + K
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Atualizar Dados Financeiros:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    Alt + A
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Abrir este Guia de Atalhos:</span>
                  <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background rounded border text-foreground">
                    ? ou Alt + H
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShortcutsHelpOpen(false)}
              className="w-full text-xs"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
