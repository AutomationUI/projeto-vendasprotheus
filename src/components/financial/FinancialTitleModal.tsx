import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  CreditCard,
  Plus,
  Loader2,
  Receipt,
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Calculator,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { financialService } from "@/lib/api/financial-service";

import { FinancialTitle } from "@/types/financial";

interface FinancialTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "receber" | "pagar";
  titleToEdit?: FinancialTitle | null;
  onSuccess?: () => void;
  defaultFullScreen?: boolean;
}

export function FinancialTitleModal({
  open,
  onOpenChange,
  tipo,
  titleToEdit,
  onSuccess,
  defaultFullScreen = true,
}: FinancialTitleModalProps) {
  const { toast } = useToast();
  const isReceber = titleToEdit ? titleToEdit.tipo === "receber" : tipo === "receber";

  // Full Screen State (Defaulting to true as requested by the user)
  const [isFullScreen, setIsFullScreen] = useState(defaultFullScreen);

  // Form states
  const [clienteFornecedorNome, setClienteFornecedorNome] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [valorOriginal, setValorOriginal] = useState("");
  const [dataEmissao, setDataEmissao] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dataVencimento, setDataVencimento] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [prefixo, setPrefixo] = useState(isReceber ? "FAT" : "FIN");
  const [numero, setNumero] = useState("");
  const [parcela, setParcela] = useState("01/01");
  const [formaPagamento, setFormaPagamento] = useState<
    "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro"
  >("Boleto");
  const [categoriaGerencial, setCategoriaGerencial] = useState(
    isReceber ? "Venda de Produtos Industriais" : "Matéria-Prima e Suprimentos"
  );
  const [pedidoId, setPedidoId] = useState("");
  const [faturamentoId, setFaturamentoId] = useState("");
  const [historico, setHistorico] = useState("");
  const [loading, setLoading] = useState(false);

  // Re-sync default values when modal opens, titleToEdit or tipo changes
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      if (titleToEdit) {
        setPrefixo(titleToEdit.prefixo || (titleToEdit.tipo === "receber" ? "FAT" : "FIN"));
        setNumero(titleToEdit.numero || "");
        setParcela(titleToEdit.parcela || "01/01");
        setDataEmissao(titleToEdit.dataEmissao || new Date().toISOString().split("T")[0]);
        setDataVencimento(titleToEdit.dataVencimento || new Date().toISOString().split("T")[0]);
        setCategoriaGerencial(
          titleToEdit.categoriaGerencial ||
            (titleToEdit.tipo === "receber"
              ? "Venda de Produtos Industriais"
              : "Matéria-Prima e Suprimentos")
        );
        setFormaPagamento(titleToEdit.formaPagamento || "Boleto");
        setClienteFornecedorNome(titleToEdit.clienteFornecedorNome || "");
        setCnpjCpf(titleToEdit.cnpjCpf || "");
        setValorOriginal(String(titleToEdit.valorOriginal || ""));
        setPedidoId(titleToEdit.pedidoId || "");
        setFaturamentoId(titleToEdit.faturamentoId || "");
        setHistorico(titleToEdit.historico || "");
      } else {
        setPrefixo(isReceber ? "FAT" : "FIN");
        setNumero(`${Math.floor(100000 + Math.random() * 900000)}`);
        setParcela("01/01");
        setDataEmissao(new Date().toISOString().split("T")[0]);
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
        setDataVencimento(defaultDueDate.toISOString().split("T")[0]);
        setCategoriaGerencial(
          isReceber
            ? "Venda de Produtos Industriais"
            : "Matéria-Prima e Suprimentos"
        );
        setFormaPagamento("Boleto");
        setClienteFornecedorNome("");
        setCnpjCpf("");
        setValorOriginal("");
        setPedidoId("");
        setFaturamentoId("");
        setHistorico("");
      }
      setIsFullScreen(true);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, isReceber, titleToEdit]);

  // Categories suggestions based on tipo
  const categoriesSuggestions = isReceber
    ? [
        "Venda de Produtos Industriais",
        "Venda de Refratários Silico-Aluminosos",
        "Serviços e Manutenção de Fornos",
        "Outras Receitas Comerciais",
      ]
    : [
        "Matéria-Prima e Suprimentos",
        "Energia e Utilidades Industriais",
        "Serviços de Terceiros e Manutenção",
        "Fretes e Logística de Entrega",
        "Despesas Administrativas",
      ];

  const parsedValor = parseFloat(
    valorOriginal.replace(/\./g, "").replace(",", ".")
  ) || 0;

  // Calculate days until due
  const calculateDaysUntilDue = () => {
    if (!dataVencimento) return 0;
    const due = new Date(dataVencimento);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysToDue = calculateDaysUntilDue();

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!clienteFornecedorNome.trim()) {
        toast({
          title: "Campo obrigatório",
          description: `Por favor, informe a razão social do ${
            isReceber ? "cliente" : "fornecedor"
          }.`,
          variant: "destructive",
        });
        return;
      }

      const valorNum = parseFloat(
        valorOriginal.replace(/\./g, "").replace(",", ".")
      );
      if (isNaN(valorNum) || valorNum <= 0) {
        toast({
          title: "Valor inválido",
          description: "Por favor, informe um valor original numérico maior que zero.",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);
      try {
        const payload = {
          tipo: titleToEdit ? titleToEdit.tipo : tipo,
          prefixo: prefixo.trim() || (isReceber ? "FAT" : "FIN"),
          numero: numero.trim() || `${Math.floor(100000 + Math.random() * 900000)}`,
          parcela: parcela.trim() || "01/01",
          clienteFornecedorNome: clienteFornecedorNome.trim(),
          cnpjCpf: cnpjCpf.trim() || undefined,
          valorOriginal: valorNum,
          dataEmissao,
          dataVencimento,
          formaPagamento,
          categoriaGerencial,
          pedidoId: pedidoId.trim() || undefined,
          faturamentoId: faturamentoId.trim() || undefined,
          historico: historico.trim() || undefined,
        };

        if (titleToEdit) {
          await financialService.updateTitle(titleToEdit.id, payload);
          toast({
            title: "Título Financeiro Atualizado",
            description: `As alterações no título ${prefixo}-${numero} foram salvas com sucesso.`,
          });
        } else {
          await financialService.createTitle(payload);
          toast({
            title: isReceber
              ? "Título a Receber Cadastrado"
              : "Título a Pagar Cadastrado",
            description: `Título ${prefixo}-${numero} no valor de ${valorNum.toLocaleString(
              "pt-BR",
              { style: "currency", currency: "BRL" }
            )} adicionado com sucesso.`,
          });
        }

        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      } catch {
        toast({
          title: "Erro ao salvar título",
          description:
            "Ocorreu uma falha ao processar o título financeiro. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      clienteFornecedorNome,
      valorOriginal,
      tipo,
      prefixo,
      numero,
      parcela,
      cnpjCpf,
      dataEmissao,
      dataVencimento,
      formaPagamento,
      categoriaGerencial,
      pedidoId,
      faturamentoId,
      historico,
      isReceber,
      titleToEdit,
      onOpenChange,
      onSuccess,
      toast,
    ]
  );

  // Keyboard shortcut listener inside the modal
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Meta+Enter => Submit form
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      // Alt+F => Toggle Full Screen
      if (e.altKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setIsFullScreen((prev) => !prev);
      }
      // Escape => Handled by Dialog or manual
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleSubmit, onOpenChange]);

  if (!open) return null;

  // RENDER FULL-SCREEN VIEW
  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-150">
        {/* HEADER DA TELA CHEIA */}
        <header className="h-16 px-4 sm:px-6 border-b border-border/80 bg-background/95 backdrop-blur-sm flex items-center justify-between gap-4 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl text-white shadow-xs ${
                isReceber ? "bg-emerald-600" : "bg-amber-600"
              }`}
            >
              {isReceber ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg text-foreground">
                  {titleToEdit
                    ? `Editar Título ${prefixo}-${numero}`
                    : isReceber
                    ? "Novo Título a Receber (SE1 - Clientes)"
                    : "Novo Título a Pagar (SE2 - Fornecedores)"}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold ${
                    isReceber
                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-800"
                      : "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-800"
                  }`}
                >
                  Modo Tela Cheia
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {isReceber
                  ? "Cadastre faturamentos de vendas, duplicatas mercantis e parcelamentos de clientes."
                  : "Cadastre despesas operacionais, compras de insumos industriais e fornecedores."}
              </p>
            </div>
          </div>

          {/* ATALHOS & AÇÕES DO HEADER */}
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(false)}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              title="Alternar para janela modal reduzida (Alt+F)"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Janela Reduzida</span>
              <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-muted rounded border text-muted-foreground">
                Alt+F
              </kbd>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 gap-1.5 text-xs font-semibold"
              title="Cancelar e Fechar (Esc)"
            >
              <X className="h-3.5 w-3.5" />
              <span>Fechar</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-background rounded border text-muted-foreground">
                Esc
              </kbd>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={loading}
              className={`h-9 gap-2 text-xs font-semibold text-white shadow-xs px-4 ${
                isReceber
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
              id="btn-salvar-titulo-fullscreen"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {titleToEdit
                      ? "Salvar Alterações"
                      : isReceber
                      ? "Cadastrar Título a Receber"
                      : "Cadastrar Título a Pagar"}
                  </span>
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[10px] font-mono bg-black/20 text-white rounded border border-white/30">
                    Ctrl+Enter
                  </kbd>
                </>
              )}
            </Button>
          </div>
        </header>

        {/* CORPO EM GRID RESPONSIVO (FORMULÁRIO + PRÉVIA EM TEMPO REAL) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-muted/20">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* COLUNA ESQUERDA: FORMULÁRIO DE ENTRADA */}
            <div className="lg:col-span-7 bg-background p-6 rounded-xl border border-border/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Dados Cadastrais do Título</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Campos com <span className="text-rose-500 font-bold">*</span> são obrigatórios
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Razão Social / Parceiro */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{isReceber ? "Cliente / Razão Social" : "Fornecedor / Razão Social"}</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder={
                      isReceber
                        ? "Ex: Indústrias Metalúrgicas MetalSil S.A."
                        : "Ex: Mineração e Fornecedora de Matéria-Prima Ltda."
                    }
                    value={clienteFornecedorNome}
                    onChange={(e) => setClienteFornecedorNome(e.target.value)}
                    className="h-10 text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">CNPJ / CPF</Label>
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={cnpjCpf}
                      onChange={(e) => setCnpjCpf(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Valor Original (R$)</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={valorOriginal}
                      onChange={(e) => setValorOriginal(e.target.value)}
                      className={`h-10 text-sm font-bold ${
                        isReceber
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Box de Numeração do Título */}
                <div className="p-4 bg-muted/40 rounded-xl border border-border/70 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Numeração e Prazos do Documento
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Prefixo</Label>
                      <Input
                        value={prefixo}
                        onChange={(e) => setPrefixo(e.target.value.toUpperCase())}
                        className="h-9 text-xs font-mono uppercase"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Número do Título</Label>
                      <Input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="h-9 text-xs font-mono"
                        placeholder="000105"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium">Parcela</Label>
                      <Input
                        value={parcela}
                        onChange={(e) => setParcela(e.target.value)}
                        className="h-9 text-xs font-mono"
                        placeholder="01/01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>Data de Emissão</span>
                      </Label>
                      <Input
                        type="date"
                        value={dataEmissao}
                        onChange={(e) => setDataEmissao(e.target.value)}
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] flex items-center gap-1 font-medium">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>Data de Vencimento</span>
                        <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={dataVencimento}
                        onChange={(e) => setDataVencimento(e.target.value)}
                        className="h-9 text-xs font-medium"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Classificação Gerencial e Forma de Pagamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Forma de Liquidação / Pagamento</Label>
                    <select
                      value={formaPagamento}
                      onChange={(e) =>
                        setFormaPagamento(
                          e.target.value as
                            | "Boleto"
                            | "Pix"
                            | "Cartão"
                            | "Transferência"
                            | "Dinheiro"
                        )
                      }
                      className="w-full h-10 text-xs rounded-md border bg-background px-3 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="Pix">Pix Instantâneo</option>
                      <option value="Transferência">Transferência Bancária / TED</option>
                      <option value="Cartão">Cartão de Crédito / Débito</option>
                      <option value="Dinheiro">Dinheiro / À Vista</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Categoria Gerencial</Label>
                    <Input
                      value={categoriaGerencial}
                      onChange={(e) => setCategoriaGerencial(e.target.value)}
                      placeholder="Ex: Venda de Refratários"
                      className="h-10 text-xs"
                      list="categoria-suggestions-fullscreen"
                    />
                    <datalist id="categoria-suggestions-fullscreen">
                      {categoriesSuggestions.map((cat) => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Vínculo de Pedido e Faturamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      {isReceber ? "Pedido Comercial (Opcional)" : "Ordem de Compra (Opcional)"}
                    </Label>
                    <Input
                      placeholder={isReceber ? "Ex: PED-805" : "Ex: OC-204"}
                      value={pedidoId}
                      onChange={(e) => setPedidoId(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nota Fiscal / Documento (Opcional)</Label>
                    <Input
                      placeholder="Ex: NF-1060"
                      value={faturamentoId}
                      onChange={(e) => setFaturamentoId(e.target.value)}
                      className="h-10 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Histórico Operacional */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Histórico / Observações Comerciais</Label>
                  <Textarea
                    placeholder={
                      isReceber
                        ? "Descrição detalhada do fornecimento de peças refratárias, condições de pagamento ou faturamento..."
                        : "Descrição da compra de matéria-prima, insumos industriais ou serviços contratados..."
                    }
                    value={historico}
                    onChange={(e) => setHistorico(e.target.value)}
                    className="text-xs h-20 resize-none"
                  />
                </div>
              </form>
            </div>

            {/* COLUNA DIREITA: SIMULAÇÃO E PRÉVIA EM TEMPO REAL */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card de Simulação do Título */}
              <div className="bg-background p-5 rounded-xl border border-border/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span>Prévia em Tempo Real</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-semibold ${
                      isReceber
                        ? "text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40"
                        : "text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/40"
                    }`}
                  >
                    {isReceber ? "+ Receita Comercial" : "- Despesa Operacional"}
                  </Badge>
                </div>

                {/* Visual do Título / Duplicata */}
                <div className="p-4 rounded-xl border border-border/70 bg-muted/30 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-muted-foreground">Documento</span>
                      <div className="font-mono font-bold text-sm text-foreground">
                        {prefixo || (isReceber ? "FAT" : "FIN")}-{numero || "000000"} / {parcela || "01/01"}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      Pendente (A Vencer)
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">
                      {isReceber ? "Cliente Sacado" : "Fornecedor Beneficiário"}
                    </span>
                    <div className="font-semibold text-xs text-foreground truncate">
                      {clienteFornecedorNome.trim() || "Razão Social Não Informada"}
                    </div>
                    {cnpjCpf && (
                      <span className="text-[10px] font-mono text-muted-foreground block">{cnpjCpf}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Valor do Título</span>
                      <span
                        className={`text-base font-extrabold ${
                          isReceber ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {parsedValor.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block">Vencimento</span>
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{dataVencimento || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-background/80 border border-border/40 text-[11px] flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Prazo calculado:
                    </span>
                    <span className="font-bold text-primary">
                      {daysToDue >= 0 ? `${daysToDue} dias a vencer` : `${Math.abs(daysToDue)} dias vencido`}
                    </span>
                  </div>
                </div>

                {/* Guia de Teclas de Atalho */}
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Teclas de Atalho Rápidas</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
                      <span>Salvar Título:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-foreground">
                        Ctrl+Enter
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
                      <span>Tela Cheia:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-foreground">
                        Alt+F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
                      <span>Fechar:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-foreground">
                        Esc
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-background border border-border/40">
                      <span>Próximo Campo:</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border text-foreground">
                        Tab
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // RENDER STANDARD MODAL VIEW (com botão para maximizar para tela cheia)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 mb-1 pr-6">
            <Badge
              variant="outline"
              className={`gap-1 px-2.5 py-0.5 text-xs font-semibold ${
                isReceber
                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:border-emerald-800"
                  : "bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-800"
              }`}
            >
              {isReceber ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Contas a Receber (SE1)</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>Contas a Pagar (SE2)</span>
                </>
              )}
            </Badge>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsFullScreen(true)}
              className="h-7 text-xs gap-1 text-primary border-primary/30"
              title="Expandir em Tela Cheia (Alt+F)"
            >
              <Maximize2 className="h-3 w-3" />
              <span>Tela Cheia</span>
              <kbd className="text-[9px] font-mono bg-muted px-1 rounded border">Alt+F</kbd>
            </Button>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {titleToEdit
              ? `Editar Título ${prefixo}-${numero}`
              : isReceber
              ? "Novo Título a Receber"
              : "Novo Título a Pagar"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isReceber
              ? "Cadastre um novo título de venda, duplicata comercial ou faturamento a receber de cliente."
              : "Cadastre um compromisso financeiro, compra de insumos ou despesa operacional a pagar a fornecedor."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-1">
          {/* Identificação de Parceiro (Cliente ou Fornecedor) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{isReceber ? "Cliente / Razão Social" : "Fornecedor / Razão Social"}</span>
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder={
                isReceber
                  ? "Ex: Indústrias Metalúrgicas MetalSil S.A."
                  : "Ex: Mineração e Fornecedora de Matéria-Prima Ltda."
              }
              value={clienteFornecedorNome}
              onChange={(e) => setClienteFornecedorNome(e.target.value)}
              className="h-9 text-xs"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">CNPJ / CPF</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                <span>Valor Original (R$)</span>
                <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={valorOriginal}
                onChange={(e) => setValorOriginal(e.target.value)}
                className={`h-9 text-xs font-bold ${
                  isReceber ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}
                required
              />
            </div>
          </div>

          {/* Dados do Documento / Título */}
          <div className="p-3 bg-muted/40 rounded-lg border border-border/60 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Dados do Título e Numeração
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px]">Prefixo</Label>
                <Input
                  value={prefixo}
                  onChange={(e) => setPrefixo(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono uppercase"
                  maxLength={5}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Número Documento</Label>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="000105"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Parcela</Label>
                <Input
                  value={parcela}
                  onChange={(e) => setParcela(e.target.value)}
                  className="h-8 text-xs font-mono"
                  placeholder="01/01"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Data de Emissão</span>
                </Label>
                <Input
                  type="date"
                  value={dataEmissao}
                  onChange={(e) => setDataEmissao(e.target.value)}
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>Data de Vencimento</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="h-8 text-xs font-medium"
                  required
                />
              </div>
            </div>
          </div>

          {/* Classificação Gerencial & Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Forma de Pagamento</Label>
              <select
                value={formaPagamento}
                onChange={(e) =>
                  setFormaPagamento(
                    e.target.value as
                      | "Boleto"
                      | "Pix"
                      | "Cartão"
                      | "Transferência"
                      | "Dinheiro"
                  )
                }
                className="w-full h-9 text-xs rounded-md border bg-background px-3 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="Boleto">Boleto Bancário</option>
                <option value="Pix">Pix Instantâneo</option>
                <option value="Transferência">Transferência Bancária / TED</option>
                <option value="Cartão">Cartão de Crédito / Débito</option>
                <option value="Dinheiro">Dinheiro / À Vista</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoria Gerencial</Label>
              <Input
                value={categoriaGerencial}
                onChange={(e) => setCategoriaGerencial(e.target.value)}
                placeholder="Ex: Vendas de Refratários"
                className="h-9 text-xs"
                list="categoria-suggestions"
              />
              <datalist id="categoria-suggestions">
                {categoriesSuggestions.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Vínculo de Pedido / Faturamento (Opcional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {isReceber ? "Pedido Comercial (Opcional)" : "Ordem de Compra (Opcional)"}
              </Label>
              <Input
                placeholder={isReceber ? "Ex: PED-805" : "Ex: OC-204"}
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nota Fiscal / Documento (Opcional)</Label>
              <Input
                placeholder="Ex: NF-1060"
                value={faturamentoId}
                onChange={(e) => setFaturamentoId(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Histórico / Observação Comercial */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Histórico / Descrição Operacional</Label>
            <Textarea
              placeholder={
                isReceber
                  ? "Descrição das condições comerciais, fornecimento de peças refratárias ou faturamento..."
                  : "Descrição da compra de matérias-primas, insumos industriais ou serviços contratados..."
              }
              value={historico}
              onChange={(e) => setHistorico(e.target.value)}
              className="text-xs h-18 resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/40">
            <div className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
              <span>Atalhos:</span>
              <kbd className="px-1 py-0.2 font-mono bg-muted rounded border text-[10px]">Ctrl+Enter</kbd> salvar |
              <kbd className="px-1 py-0.2 font-mono bg-muted rounded border text-[10px]">Alt+F</kbd> tela cheia |
              <kbd className="px-1 py-0.2 font-mono bg-muted rounded border text-[10px]">Esc</kbd> fechar
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className={`gap-1.5 text-xs font-semibold text-white shadow-xs ${
                  isReceber
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>
                      {isReceber ? "Cadastrar Título a Receber" : "Cadastrar Título a Pagar"}
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
