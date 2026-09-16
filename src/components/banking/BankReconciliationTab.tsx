import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BankTransaction, BankAccount } from "@/types/banking";
import { FinancialTitle } from "@/types/financial";
import { bankingService } from "@/lib/api/banking-service";
import { financialService } from "@/lib/api/financial-service";
import { bankIntegrationService, AutoReconciliationReport } from "@/lib/services/bank-integration";
import { useToast } from "@/hooks/use-toast";
import {
  Scale,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  Sparkles,
  Search,
  Filter,
  CheckCheck,
  ShieldCheck
} from "lucide-react";

interface BankReconciliationTabProps {
  accounts: BankAccount[];
}

export function BankReconciliationTab({ accounts }: BankReconciliationTabProps) {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [_titles, setTitles] = useState<FinancialTitle[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [_loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "pendente" | "conciliado">("todos");

  // Auto reconciliation report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [autoReport, setAutoReport] = useState<AutoReconciliationReport | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedAccountId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txList, tList] = await Promise.all([
        bankingService.getBankTransactions(selectedAccountId),
        financialService.getTitles(),
      ]);
      setTransactions(txList);
      setTitles(tList);
      // Auto select pending transactions
      setSelectedTxIds(txList.filter((t) => t.statusConciliacao === "pendente").map((t) => t.id));
    } catch {
      toast({ title: "Erro ao carregar dados para conciliação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTx = (id: string) => {
    if (selectedTxIds.includes(id)) {
      setSelectedTxIds(selectedTxIds.filter((tId) => tId !== id));
    } else {
      setSelectedTxIds([...selectedTxIds, id]);
    }
  };

  const handleReconcileSelected = async () => {
    if (selectedTxIds.length === 0) {
      toast({ title: "Selecione ao menos um lançamento para conciliar", variant: "destructive" });
      return;
    }

    setReconciling(true);
    try {
      const matches = selectedTxIds.map((txId) => {
        const tx = transactions.find((t) => t.id === txId);
        return {
          transactionId: txId,
          tituloId: tx?.sugestaoTituloId || "tit-101",
        };
      });

      await bankingService.reconcileBankTransactions(matches);

      toast({
        title: "Conciliação Concluída!",
        description: `${selectedTxIds.length} lançamentos conciliados com o fluxo de caixa do ERP.`,
      });

      loadData();
    } catch {
      toast({ title: "Erro na conciliação bancária", variant: "destructive" });
    } finally {
      setReconciling(false);
    }
  };

  const handleRunAutoReconciliation = async () => {
    setAutoRunning(true);
    try {
      const report = await bankIntegrationService.runAutoReconciliation(selectedAccountId, {
        autoSettleErpTitles: true,
        maxToleranceDays: 3,
      });

      setAutoReport(report);
      setReportModalOpen(true);

      toast({
        title: "Matching Automático Concluído!",
        description: `${report.autoReconciledCount} lançamentos conciliados e liquidados automaticamente.`,
      });

      loadData();
    } catch {
      toast({ title: "Erro ao executar algoritmo de conciliação automática", variant: "destructive" });
    } finally {
      setAutoRunning(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const filteredTransactions = transactions.filter((tx) => {
    const matchSearch =
      tx.historico.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.documento.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      statusFilter === "todos" || tx.statusConciliacao === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filtro por Conta e Ações */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-4 flex flex-col lg:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-foreground">Conciliação de Extrato OFX / API Direct</h4>
              <p className="text-muted-foreground text-[11px]">
                Batimento inteligente e liquidação automática entre extratos bancários e títulos do ERP.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="h-8 text-xs w-48 bg-background">
                <SelectValue placeholder="Selecione a conta bancária" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.bancoCodigo} - {acc.bancoNome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAutoReconciliation}
              disabled={autoRunning}
              className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-medium"
            >
              {autoRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
              <span>Auto Matching (IA)</span>
            </Button>

            <Button variant="outline" size="sm" onClick={loadData} className="h-8 text-xs gap-1">
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid Lançamentos do Extrato x Títulos do ERP */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span>Matching de Extrato Bancário x Títulos Financeiros</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Algoritmo de correspondência por Valor, Data e Número de Documento.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleReconcileSelected}
              disabled={reconciling || selectedTxIds.length === 0}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {reconciling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>Conciliar Selecionados ({selectedTxIds.length})</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra de Pesquisa e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-muted/30 rounded-lg text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por histórico ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">Status:</span>
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as "todos" | "pendente" | "conciliado")}>
                <SelectTrigger className="h-8 text-xs w-32 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos ({transactions.length})</SelectItem>
                  <SelectItem value="pendente">Pendentes ({transactions.filter((t) => t.statusConciliacao === "pendente").length})</SelectItem>
                  <SelectItem value="conciliado">Conciliados ({transactions.filter((t) => t.statusConciliacao === "conciliado").length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onChange={() => {
                        if (selectedTxIds.length === filteredTransactions.length) setSelectedTxIds([]);
                        else setSelectedTxIds(filteredTransactions.map((t) => t.id));
                      }}
                      className="rounded border-muted-foreground/30 text-primary h-3.5 w-3.5"
                    />
                  </th>
                  <th className="p-3">Data Extrato</th>
                  <th className="p-3">Histórico Bancário</th>
                  <th className="p-3">Documento</th>
                  <th className="p-3">Valor Extrato</th>
                  <th className="p-3">Sugestão de Match ERP</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      selectedTxIds.includes(tx.id) ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedTxIds.includes(tx.id)}
                        onChange={() => handleToggleTx(tx.id)}
                        className="rounded border-muted-foreground/30 text-primary h-3.5 w-3.5"
                      />
                    </td>
                    <td className="p-3 font-mono">{tx.data}</td>
                    <td className="p-3">
                      <p className="font-bold text-foreground">{tx.historico}</p>
                      <p className="text-[10px] text-muted-foreground">ID Extrato: {tx.id}</p>
                    </td>
                    <td className="p-3 font-mono">{tx.documento}</td>
                    <td className="p-3 font-bold font-mono">
                      <span className={tx.tipo === "credito" ? "text-emerald-600" : "text-rose-600"}>
                        {tx.tipo === "credito" ? "+" : "-"} {formatCurrency(tx.valor)}
                      </span>
                    </td>
                    <td className="p-3">
                      {tx.sugestaoTituloNumero ? (
                        <div className="flex items-center gap-1.5 text-xs text-primary font-mono">
                          <ArrowRight className="h-3 w-3" />
                          <span>Título ERP #{tx.sugestaoTituloNumero}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">Sem sugestão automática</span>
                      )}
                    </td>
                    <td className="p-3">
                      {tx.statusConciliacao === "conciliado" && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                          Conciliado
                        </Badge>
                      )}
                      {tx.statusConciliacao === "pendente" && (
                        <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">
                          Pendente
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Relatório do Matching Automático (Modal) */}
      <Dialog open={reportModalOpen} onOpenChange={setReportModalOpen}>
        <DialogContent className="max-w-2xl text-xs space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>Relatório de Conciliação Automática Inteligente</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Resultado do algoritmo de correspondência algorítmica entre extrato e títulos do ERP.
            </DialogDescription>
          </DialogHeader>

          {autoReport && (
            <div className="space-y-4">
              {/* Cards de Resumo */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-emerald-500/10 border-emerald-200">
                  <span className="text-[10px] text-muted-foreground block">Títulos Liquidados</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    {autoReport.autoReconciledCount} / {autoReport.totalTransactionsProcessed}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-primary/10 border-primary/20">
                  <span className="text-[10px] text-muted-foreground block">Valor Total Conciliado</span>
                  <span className="text-base font-bold text-primary font-mono">
                    {formatCurrency(autoReport.totalAmountReconciled)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-amber-500/10 border-amber-200">
                  <span className="text-[10px] text-muted-foreground block">Para Revisão Manual</span>
                  <span className="text-base font-bold text-amber-700 font-mono">
                    {autoReport.unmatchedTransactions.length}
                  </span>
                </div>
              </div>

              {/* Tabela de Matches Identificados */}
              <div>
                <h5 className="font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <CheckCheck className="h-4 w-4 text-emerald-600" />
                  <span>Correspondências Identificadas</span>
                </h5>

                <div className="border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2">Extrato</th>
                        <th className="p-2">Título ERP</th>
                        <th className="p-2">Valor</th>
                        <th className="p-2">Confiança</th>
                        <th className="p-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {autoReport.matches.map((m, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="p-2 font-mono">{m.transactionDocument}</td>
                          <td className="p-2 font-mono text-primary font-bold">{m.titleNumber}</td>
                          <td className="p-2 font-mono">{formatCurrency(m.titleAmount)}</td>
                          <td className="p-2">
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 font-mono text-[10px]">
                              {m.confidenceScore}%
                            </Badge>
                          </td>
                          <td className="p-2 text-[11px] text-muted-foreground">{m.matchReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button size="sm" onClick={() => setReportModalOpen(false)} className="h-8 text-xs bg-primary">
                  Concluir e Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

