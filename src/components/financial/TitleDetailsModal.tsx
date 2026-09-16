import React, { useState, useEffect } from "react";
import {
  Receipt,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PhoneCall,
  FileText,
  Building2,
  Copy,
  Check,
  Printer,
  FileCheck2,
  Info,
  Maximize2,
  Minimize2,
  X,
  ShieldCheck,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialTitle } from "@/types/financial";
import { printElement } from "@/lib/print-utils";

interface TitleDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: FinancialTitle | null;
  onOpenSettle?: (title: FinancialTitle) => void;
  onOpenCollection?: (title: FinancialTitle) => void;
  onOpenEdit?: (title: FinancialTitle) => void;
  onDelete?: (title: FinancialTitle) => void;
  defaultFullScreen?: boolean;
}

export function TitleDetailsModal({
  open,
  onOpenChange,
  title,
  onOpenSettle,
  onOpenCollection,
  onOpenEdit,
  onDelete,
  defaultFullScreen = true,
}: TitleDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(defaultFullScreen);

  // Lock body scroll and sync full screen state when opened
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      setIsFullScreen(defaultFullScreen);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, defaultFullScreen]);

  // Keyboard shortcut listener
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+F => Toggle Full Screen
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setIsFullScreen((prev) => !prev);
      }
      // Escape => Close
      if (e.key === "Escape") {
        onOpenChange(false);
      }
      // Ctrl+P / Cmd+P => Print
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || !title) return null;

  const isReceber = title.tipo === "receber";

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Check if overdue
  const isOverdue = () => {
    if (title.status === "pago") return false;
    if (!title.dataVencimento) return false;
    const today = new Date().toISOString().split("T")[0];
    return title.dataVencimento < today;
  };

  // Calculate days difference
  const calculateDaysDiff = () => {
    if (!title.dataVencimento) return 0;
    const due = new Date(title.dataVencimento);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysDiff = calculateDaysDiff();

  const handleCopySummary = async () => {
    const summary = `
========================================
ESPELHO DO TÍTULO FINANCEIRO - ERP PROTHEUS
========================================
Tipo: ${isReceber ? "Contas a Receber (SE1 - Clientes)" : "Contas a Pagar (SE2 - Fornecedores)"}
Título: ${title.prefixo}-${title.numero} (Parc. ${title.parcela})
Status: ${title.status.toUpperCase()}
Parceiro: ${title.clienteFornecedorNome} ${title.cnpjCpf ? `(${title.cnpjCpf})` : ""}
Emissão: ${formatDate(title.dataEmissao)}
Vencimento: ${formatDate(title.dataVencimento)}
${title.dataPagamento ? `Data Pagamento: ${formatDate(title.dataPagamento)}\n` : ""}
Valor Original: ${formatCurrency(title.valorOriginal)}
Valor Pago: ${formatCurrency(title.valorPagoTotal)}
Saldo em Aberto: ${formatCurrency(title.saldo)}
Forma de Pagamento: ${title.formaPagamento}
Categoria Gerencial: ${title.categoriaGerencial || "Geral"}
${title.pedidoId ? `Pedido Vinculado: ${title.pedidoId}\n` : ""}${title.orcamentoId ? `Orçamento Vinculado: ${title.orcamentoId}\n` : ""}${title.faturamentoId ? `Nota/Faturamento: ${title.faturamentoId}\n` : ""}${title.historico ? `Histórico: ${title.historico}\n` : ""}
========================================
    `.trim();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = summary;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handlePrint = () => {
    printElement("printable-title-details", `Titulo_${title?.prefixo ?? ''}_${title?.numero ?? ''}`);
  };

  // Generate simulated barcode / digit line for Brazilian boletos/pix
  const simulatedBoletoLine = `34191.79001 01043.510047 91020.150008 8 94500000${Math.round(title.saldo * 100).toString().padStart(8, "0")}`;

  // RENDER 100% FULL-SCREEN VIEW
  if (isFullScreen) {
    return (
      <div id="printable-title-details" className="printable-area fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-150">
        {/* HEADER DA TELA CHEIA */}
        <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl text-white shadow-xs shrink-0 ${
                isReceber ? "bg-emerald-600" : "bg-blue-600"
              }`}
            >
              {isReceber ? <Receipt className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base sm:text-lg font-bold text-foreground truncate">
                  {title.prefixo}-{title.numero}
                </span>
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  Parc. {title.parcela}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold shrink-0 ${
                    isReceber
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-800"
                      : "bg-blue-500/10 text-blue-700 border-blue-300 dark:border-blue-800"
                  }`}
                >
                  {isReceber ? "SE1 • Contas a Receber" : "SE2 • Contas a Pagar"}
                </Badge>
                {title.protheusRecno && (
                  <Badge variant="secondary" className="font-mono text-[10px] hidden md:inline-flex">
                    RECNO #{title.protheusRecno}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                {title.clienteFornecedorNome} {title.cnpjCpf ? `• CNPJ: ${title.cnpjCpf}` : ""}
              </p>
            </div>
          </div>

          {/* STATUS & AÇÕES DO HEADER */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Badge */}
            {title.status === "pago" && (
              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-300 gap-1 py-1 px-3 text-xs hidden sm:inline-flex">
                <CheckCircle2 className="h-3.5 w-3.5" /> Liquidado / Pago
              </Badge>
            )}
            {title.status === "pendente" && (
              <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-300 gap-1 py-1 px-3 text-xs hidden sm:inline-flex">
                <Clock className="h-3.5 w-3.5" /> Em Aberto
              </Badge>
            )}
            {title.status === "parcial" && (
              <Badge className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/20 border-blue-300 gap-1 py-1 px-3 text-xs hidden sm:inline-flex">
                <Clock className="h-3.5 w-3.5" /> Baixa Parcial
              </Badge>
            )}
            {title.status === "atrasado" && (
              <Badge className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/20 border-rose-300 gap-1 py-1 px-3 text-xs hidden sm:inline-flex">
                <AlertTriangle className="h-3.5 w-3.5" /> Vencido ({Math.abs(daysDiff)} dias)
              </Badge>
            )}

            {/* Quick Settle Action */}
            {title.status !== "pago" && onOpenSettle && (
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                onClick={() => {
                  onOpenChange(false);
                  onOpenSettle(title);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isReceber ? "Baixar Título" : "Registrar Pagamento"}</span>
              </Button>
            )}

            {/* Edit Action */}
            {onOpenEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => {
                  onOpenChange(false);
                  onOpenEdit(title);
                }}
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}

            {/* Delete Action */}
            {onDelete && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5 text-xs font-semibold border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => {
                  onOpenChange(false);
                  onDelete(title);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex"
              title="Copiar espelho do título"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex"
              title="Imprimir espelho do título (Ctrl+P)"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Alternar para janela modal reduzida (Alt+F)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Reduzir</span>
              <kbd className="hidden xl:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-muted rounded border text-muted-foreground">
                Alt+F
              </kbd>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 gap-1.5 text-xs font-semibold"
              title="Fechar visualização (Esc)"
            >
              <X className="h-3.5 w-3.5" />
              <span>Fechar</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-background rounded border text-muted-foreground">
                Esc
              </kbd>
            </Button>
          </div>
        </header>

        <div className="bg-muted/40 border-b border-border/80 px-4 sm:px-6 py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 max-w-7xl mx-auto">
            <div className="p-3 bg-background border border-border/70 rounded-xl shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-primary" /> Valor Original
              </span>
              <div className="text-base font-bold text-foreground mt-1">
                {formatCurrency(title.valorOriginal)}
              </div>
            </div>

            <div className="p-3 bg-background border border-border/70 rounded-xl shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Total Pago / Baixado
              </span>
              <div className="text-base font-bold text-emerald-600 mt-1">
                {formatCurrency(title.valorPagoTotal)}
              </div>
            </div>

            <div className="p-3 bg-background border border-border/70 rounded-xl shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" /> Saldo em Aberto
              </span>
              <div
                className={`text-base font-bold mt-1 ${
                  title.saldo > 0
                    ? isReceber
                      ? "text-blue-600"
                      : "text-amber-600"
                    : "text-muted-foreground"
                }`}
              >
                {formatCurrency(title.saldo)}
              </div>
            </div>

            <div className="p-3 bg-background border border-border/70 rounded-xl shadow-xs">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Vencimento Real
              </span>
              <div
                className={`text-base font-bold mt-1 ${
                  isOverdue() ? "text-rose-600" : "text-foreground"
                }`}
              >
                {formatDate(title.dataVencimento)}
              </div>
            </div>

            <div className="p-3 bg-background border border-border/70 rounded-xl shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" /> Modalidade
              </span>
              <div className="text-sm font-bold text-foreground mt-1 truncate">
                {title.formaPagamento || "Boleto Bancário"}
              </div>
              <span className="text-[10px] text-muted-foreground block truncate">
                {title.categoriaGerencial || "Geral"}
              </span>
            </div>
          </div>
        </div>

        {/* CORPO PRINCIPAL EM GRID RESPONSIVO (100% DA JANELA) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20 w-full">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: ABAS DE DETALHAMENTO */}
            <div className="xl:col-span-7 space-y-6">
              <Tabs defaultValue="geral" className="w-full">
                <TabsList className="grid grid-cols-3 h-10 bg-muted/60 p-1 border rounded-xl">
                  <TabsTrigger value="geral" className="text-xs font-semibold">
                    Dados do Título
                  </TabsTrigger>
                  <TabsTrigger value="vinculos" className="text-xs font-semibold">
                    Vínculos Comerciais
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="text-xs font-semibold">
                    Baixas & Liquidações
                    {title.historicoPagamentos && title.historicoPagamentos.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-primary/10 text-primary rounded-full text-[10px]">
                        {title.historicoPagamentos.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: GERAL */}
                <TabsContent value="geral" className="space-y-4 pt-4 text-xs">
                  {/* Card do Parceiro */}
                  <div className="p-5 rounded-xl border border-border/80 bg-background shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span>{isReceber ? "Cliente / Sacado" : "Fornecedor / Favorecido"}</span>
                      </span>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {isReceber ? "SA1010" : "SA2010"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Razão Social / Nome:</span>
                        <div className="text-sm font-bold text-foreground mt-0.5">
                          {title.clienteFornecedorNome}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">CNPJ / CPF:</span>
                        <div className="text-sm font-mono text-foreground mt-0.5">
                          {title.cnpjCpf || "Não informado"}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Código Interno ERP:</span>
                        <div className="text-xs font-mono text-muted-foreground mt-0.5">
                          {title.clienteFornecedorId || `CLI-${title.numero}`}
                        </div>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Classificação Comercial:</span>
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Cliente Ativo • Crédito Aprovado
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Condições Financeiras */}
                  <div className="p-5 rounded-xl border border-border/80 bg-background shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span>Condições e Classificação Financeira</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Forma de Cobrança:</span>
                        <span className="font-semibold text-foreground text-xs mt-0.5 block">
                          {title.formaPagamento || "Boleto Bancário"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Categoria Gerencial:</span>
                        <span className="font-semibold text-foreground text-xs mt-0.5 block">
                          {title.categoriaGerencial || "Geral"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground text-[11px] block">Centro de Custos / Conta:</span>
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 block">
                          CC 1.02.01 • Refratários
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Linha do Tempo de Datas */}
                  <div className="p-5 rounded-xl border border-border/80 bg-background shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>Linha do Tempo e Vencimentos</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <span className="text-[11px] text-muted-foreground block">Data de Emissão</span>
                        <span className="font-bold text-foreground text-sm mt-0.5 block">
                          {formatDate(title.dataEmissao)}
                        </span>
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <span className="text-[11px] text-muted-foreground block">Data de Vencimento</span>
                        <span
                          className={`font-bold text-sm mt-0.5 block ${
                            isOverdue() ? "text-rose-600" : "text-foreground"
                          }`}
                        >
                          {formatDate(title.dataVencimento)}
                        </span>
                        {isOverdue() && (
                          <span className="text-[10px] text-rose-500 font-medium block mt-0.5">
                            Vencido há {Math.abs(daysDiff)} dias
                          </span>
                        )}
                        {!isOverdue() && title.status !== "pago" && (
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {daysDiff === 0 ? "Vence hoje" : `Vence em ${daysDiff} dias`}
                          </span>
                        )}
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <span className="text-[11px] text-muted-foreground block">Data da Liquidação</span>
                        <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
                          {title.dataPagamento ? formatDate(title.dataPagamento) : "Em aberto"}
                        </span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 2: VÍNCULOS */}
                <TabsContent value="vinculos" className="space-y-4 pt-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 border rounded-xl bg-background space-y-1.5 shadow-xs">
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Pedido de Venda (SC5)
                      </span>
                      {title.pedidoId ? (
                        <div className="flex items-center gap-1.5 font-bold text-primary text-sm">
                          <FileText className="h-4 w-4" />
                          <span>{title.pedidoId}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não vinculado</span>
                      )}
                    </div>

                    <div className="p-4 border rounded-xl bg-background space-y-1.5 shadow-xs">
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Orçamento Comercial
                      </span>
                      {title.orcamentoId ? (
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                          <FileCheck2 className="h-4 w-4" />
                          <span>{title.orcamentoId}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Não vinculado</span>
                      )}
                    </div>

                    <div className="p-4 border rounded-xl bg-background space-y-1.5 shadow-xs">
                      <span className="text-[11px] text-muted-foreground font-medium block">
                        Nota Fiscal / Faturamento
                      </span>
                      {title.faturamentoId ? (
                        <div className="flex items-center gap-1.5 font-bold text-blue-600 text-sm">
                          <Receipt className="h-4 w-4" />
                          <span>{title.faturamentoId}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem nota emitida</span>
                      )}
                    </div>
                  </div>

                  {/* Histórico / Observação */}
                  <div className="p-5 border rounded-xl bg-background shadow-xs space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Histórico / Observações Comerciais
                    </span>
                    <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border leading-relaxed">
                      {title.historico || "Nenhuma observação cadastrada para este título financeiro."}
                    </p>
                  </div>
                </TabsContent>

                {/* TAB 3: HISTÓRICO DE BAIXAS */}
                <TabsContent value="historico" className="space-y-4 pt-4 text-xs">
                  {title.historicoPagamentos && title.historicoPagamentos.length > 0 ? (
                    <div className="border rounded-xl bg-background shadow-xs overflow-hidden">
                      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                        <span className="font-bold text-foreground">Registro de Amortizações e Baixas</span>
                        <Badge variant="outline">{title.historicoPagamentos.length} lançamentos</Badge>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Valor Pago</th>
                            <th className="p-3">Desconto</th>
                            <th className="p-3">Juros/Multa</th>
                            <th className="p-3">Forma</th>
                            <th className="p-3">Observação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {title.historicoPagamentos.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/20">
                              <td className="p-3 font-medium">{formatDate(p.data)}</td>
                              <td className="p-3 font-bold text-emerald-600">
                                {formatCurrency(p.valorPago)}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {p.desconto ? formatCurrency(p.desconto) : "-"}
                              </td>
                              <td className="p-3 text-rose-600">
                                {p.jurosMulta ? formatCurrency(p.jurosMulta) : "-"}
                              </td>
                              <td className="p-3">{p.formaPagamento}</td>
                              <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                                {p.observacao || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : title.status === "pago" || title.valorPagoTotal > 0 ? (
                    <div className="p-6 border rounded-xl bg-emerald-500/5 text-center space-y-2">
                      <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                      <div className="font-bold text-emerald-800 text-sm">
                        Título Integralmente Liquidado
                      </div>
                      <p className="text-muted-foreground text-xs max-w-md mx-auto">
                        Pagamento no valor de {formatCurrency(title.valorPagoTotal)} registrado e liquidado via{" "}
                        {title.formaPagamento}.
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 border rounded-xl bg-background text-center space-y-2 shadow-xs">
                      <Info className="h-8 w-8 text-muted-foreground mx-auto" />
                      <div className="font-bold text-foreground text-sm">Nenhuma baixa registrada</div>
                      <p className="text-muted-foreground text-xs max-w-md mx-auto">
                        Este título possui saldo em aberto de {formatCurrency(title.saldo)}. Para registrar um
                        pagamento total ou parcial, utilize a opção "Baixar Título".
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* COLUNA DIREITA: ESPELHO PROTHEUS & COMPROVANTE DIGITAL */}
            <div className="xl:col-span-5 space-y-5">
              {/* Card Espelho Protheus */}
              <div className="bg-background rounded-xl border border-border/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Espelho Protheus (Dicionário de Dados)</span>
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {isReceber ? "TABELA SE1" : "TABELA SE2"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_PREFIXO" : "E2_PREFIXO"}
                    </span>
                    <span className="font-bold text-foreground">{title.prefixo}</span>
                  </div>

                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_NUM" : "E2_NUM"}
                    </span>
                    <span className="font-bold text-foreground">{title.numero}</span>
                  </div>

                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_PARCELA" : "E2_PARCELA"}
                    </span>
                    <span className="font-bold text-foreground">{title.parcela}</span>
                  </div>

                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_TIPO" : "E2_TIPO"}
                    </span>
                    <span className="font-bold text-foreground">NF (Duplicata)</span>
                  </div>

                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_VALOR" : "E2_VALOR"}
                    </span>
                    <span className="font-bold text-foreground">{formatCurrency(title.valorOriginal)}</span>
                  </div>

                  <div className="p-2 bg-muted/40 rounded border">
                    <span className="text-[10px] text-muted-foreground block">
                      {isReceber ? "E1_SALDO" : "E2_SALDO"}
                    </span>
                    <span className="font-bold text-foreground">{formatCurrency(title.saldo)}</span>
                  </div>
                </div>

                {/* Linha Digitável / Boleto / Pix */}
                {title.saldo > 0 && (
                  <div className="p-3.5 border rounded-xl bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {title.formaPagamento === "Pix"
                          ? "Chave Pix Copia e Cola"
                          : "Linha Digitável (Boleto)"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(simulatedBoletoLine);
                          setCopiedBoleto(true);
                          setTimeout(() => setCopiedBoleto(false), 2000);
                        }}
                        className="h-6 text-[11px] gap-1 px-2 text-primary"
                      >
                        {copiedBoleto ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        {copiedBoleto ? "Copiado" : "Copiar linha"}
                      </Button>
                    </div>
                    <div className="p-2.5 bg-background border rounded-lg font-mono text-[11px] text-foreground break-all select-all">
                      {simulatedBoletoLine}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // RENDER REGULAR DIALOG VIEW (IF MINIMIZED)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="printable-title-details" className="printable-area max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* HEADER */}
        <div className="p-6 border-b bg-muted/20">
          <DialogHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    isReceber
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {isReceber ? <Receipt className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2 text-left">
                    <span className="font-mono text-lg font-bold text-foreground">
                      {title.prefixo}-{title.numero}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      Parc. {title.parcela}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 text-left">
                    {isReceber
                      ? "Contas a Receber • Tabela SE1 (Protheus)"
                      : "Contas a Pagar • Tabela SE2 (Protheus)"}
                    {title.protheusRecno ? ` • RECNO #${title.protheusRecno}` : ""}
                  </DialogDescription>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullScreen(true)}
                  className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  title="Expandir para tela cheia (Alt+F)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Tela Cheia</span>
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* METRICS CARDS BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-6 bg-muted/40 border-b text-xs">
          <div className="p-3 bg-background border rounded-lg shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Valor Original
            </span>
            <div className="text-sm font-bold text-foreground mt-1">
              {formatCurrency(title.valorOriginal)}
            </div>
          </div>

          <div className="p-3 bg-background border rounded-lg shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Valor Pago
            </span>
            <div className="text-sm font-bold text-emerald-600 mt-1">
              {formatCurrency(title.valorPagoTotal)}
            </div>
          </div>

          <div className="p-3 bg-background border rounded-lg shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-600" /> Saldo em Aberto
            </span>
            <div
              className={`text-sm font-bold mt-1 ${
                title.saldo > 0
                  ? isReceber
                    ? "text-blue-600"
                    : "text-amber-600"
                  : "text-muted-foreground"
              }`}
            >
              {formatCurrency(title.saldo)}
            </div>
          </div>

          <div className="p-3 bg-background border rounded-lg shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Vencimento
            </span>
            <div
              className={`text-sm font-bold mt-1 ${
                isOverdue() ? "text-rose-600" : "text-foreground"
              }`}
            >
              {formatDate(title.dataVencimento)}
              {isOverdue() && (
                <span className="block text-[10px] font-normal text-rose-500">
                  Vencido
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TABS CONTENT */}
        <div className="p-6">
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid grid-cols-3 mb-4 h-9">
              <TabsTrigger value="geral" className="text-xs">
                Dados do Título
              </TabsTrigger>
              <TabsTrigger value="vinculos" className="text-xs">
                Vínculos & Origem
              </TabsTrigger>
              <TabsTrigger value="historico" className="text-xs">
                Baixas & Liquidações
                {title.historicoPagamentos && title.historicoPagamentos.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-primary/10 text-primary rounded-full text-[10px]">
                    {title.historicoPagamentos.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: GERAL */}
            <TabsContent value="geral" className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 border rounded-lg bg-card space-y-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {isReceber ? "Cliente / Sacado" : "Fornecedor / Favorecido"}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {title.clienteFornecedorNome}
                    </div>
                    {title.cnpjCpf && (
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        CNPJ/CPF: {title.cnpjCpf}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 border rounded-lg bg-card space-y-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <DollarSign className="h-3.5 w-3.5 text-primary" />
                    Condições Financeiras
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Forma de Cobrança:</span>
                      <span className="font-semibold text-foreground">
                        {title.formaPagamento || "Boleto"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Categoria:</span>
                      <span className="font-semibold text-foreground">
                        {title.categoriaGerencial || "Geral"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: VÍNCULOS */}
            <TabsContent value="vinculos" className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 border rounded-lg bg-card">
                  <span className="text-[11px] text-muted-foreground block">Pedido (SC5)</span>
                  <span className="font-bold text-primary">{title.pedidoId || "-"}</span>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <span className="text-[11px] text-muted-foreground block">Orçamento</span>
                  <span className="font-bold text-foreground">{title.orcamentoId || "-"}</span>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <span className="text-[11px] text-muted-foreground block">Nota Fiscal</span>
                  <span className="font-bold text-blue-600">{title.faturamentoId || "-"}</span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: HISTÓRICO */}
            <TabsContent value="historico" className="space-y-4 text-xs">
              {title.historicoPagamentos && title.historicoPagamentos.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5">Data</th>
                        <th className="p-2.5">Valor</th>
                        <th className="p-2.5">Forma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {title.historicoPagamentos.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2.5">{formatDate(p.data)}</td>
                          <td className="p-2.5 font-bold text-emerald-600">{formatCurrency(p.valorPago)}</td>
                          <td className="p-2.5">{p.formaPagamento}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 border rounded-lg text-center text-muted-foreground">
                  Nenhuma baixa registrada.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t bg-muted/20 flex flex-wrap items-center justify-between gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs h-8 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Resumo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {title.status !== "pago" && onOpenSettle && (
              <Button
                type="button"
                size="sm"
                className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onOpenSettle(title);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isReceber ? "Baixar Título" : "Registrar Pagamento"}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TitleDetailsModal;
