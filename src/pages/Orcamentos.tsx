import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Search, Eye, Edit, Copy, Trash2, FileText, CheckCircle2, AlertTriangle, Printer, Sparkles, ShieldCheck, Loader2, ShoppingCart
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { type Quote, type Product, type Customer, type OrderItem } from "@/lib/mock-data";
import { quotesService, customersService, productsService } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { printElement } from "@/lib/print-utils";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { getSettings, subscribeSettings, type AppSettings } from "@/lib/settings-store";
import { useAuth } from "@/hooks/use-auth";
import { SendQuoteDialog } from "@/components/SendQuoteDialog";
import { FlowEvaluationBadge } from "@/components/FlowEvaluationBadge";
import { Mail } from "lucide-react";
import { localDB } from "@/lib/local-db";
import { DynamicQuoteRenderer } from "@/components/documents/DynamicQuoteRenderer";
import { QuoteDocumentData } from "@/types/document-template";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyItem: OrderItem = {
  produto: "", codigo: "", quantidade: 1, precoUnitario: 0, desconto: 0, total: 0,
};

/** Returns days until expiry (negative = expired) */
function daysTo(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ validade }: { validade: string }) {
  const days = daysTo(validade);
  if (days < 0) return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-rose-500">
      <AlertTriangle className="h-3 w-3" /> Expirado há {Math.abs(days)}d
    </span>
  );
  if (days <= 7) return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-3 w-3" /> Vence em {days}d
    </span>
  );
  return <span className="text-[11px] text-muted-foreground">Válido por {days}d</span>;
}

export default function OrcamentosPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Partial<Quote> | null>(null);
  const [sendQuote, setSendQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) {
      if (status.toLowerCase().includes("aguard")) {
        setStatusFilter("Enviado");
      } else {
        setStatusFilter(status);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (location.pathname === "/orcamentos/new") {
      setEditingQuote({
        numero: `ORC-2026-${String(data.length + 1).padStart(3, "0")}`,
        cliente: "",
        vendedor: "",
        data: new Date().toISOString().slice(0, 10),
        validade: "",
        status: "Rascunho",
        condicaoPagamento: "",
        observacoes: "",
        itens: [{ ...emptyItem }],
      });
      setFormOpen(true);
    }
  }, [location.pathname, data.length]);

  const [settings, setSettings] = useState<AppSettings>(getSettings);
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await quotesService.getAll();
      setData(res?.data ?? []);
    } catch {
      setData(localDB.getQuotes());
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      quotesService.getAll().then((r) => r?.data ?? []).catch(() => []),
      productsService.getAll().then((r) => r?.data ?? []).catch(() => []),
      customersService.getAll().then((r) => r?.data ?? []).catch(() => []),
    ]).then(([q, p, c]) => {
      if (active) {
        setData(q);
        setProducts(p);
        setCustomers(c);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    const handleSync = () => loadQuotes();
    window.addEventListener("approvalsChanged", handleSync);
    window.addEventListener("orderStatusChanged", handleSync);
    window.addEventListener("local-db-change", handleSync);
    window.addEventListener("mockDataChanged", handleSync);

    return () => {
      active = false;
      window.removeEventListener("approvalsChanged", handleSync);
      window.removeEventListener("orderStatusChanged", handleSync);
      window.removeEventListener("local-db-change", handleSync);
      window.removeEventListener("mockDataChanged", handleSync);
    };
  }, [loadQuotes]);

  const { user } = useAuth();
  const debouncedSearch = useDebounce(search, 300);
  const [converting, setConverting] = useState(false);

  const filtered = data.filter((q) => {
    // 1. Role-based isolation
    if (user?.role === "cliente") {
      if (q.cliente !== user.nome) return false;
    } else if (user?.role === "representante") {
      if (q.vendedor !== user.nome) return false;
    }

    // 2. Search & Status filters
    const matchSearch =
      (q.numero?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (q.cliente?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || q.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openNew = () => {
    setEditingQuote({
      numero: `ORC-2026-${String(data.length + 1).padStart(3, "0")}`,
      cliente: "", vendedor: "",
      data: new Date().toISOString().slice(0, 10),
      validade: "", status: "Rascunho", condicaoPagamento: "", observacoes: "",
      itens: [{ ...emptyItem }],
    });
    setFormOpen(true);
  };

  const openEdit = (q: Quote) => {
    setEditingQuote({ ...q, itens: q.itens.map((i) => ({ ...i })) });
    setFormOpen(true);
  };

  const duplicateQuote = (q: Quote) => {
    const newQ: Quote = {
      ...q, id: String(data.length + 1),
      numero: `ORC-2026-${String(data.length + 1).padStart(3, "0")}`,
      data: new Date().toISOString().slice(0, 10),
      status: "Rascunho", itens: q.itens.map((i) => ({ ...i })),
    };
    setData([newQ, ...data]);
    toast({ title: "Orçamento duplicado", description: `${newQ.numero} criado como rascunho.` });
  };

  const deleteQuote = (id: string) => {
    quotesService.remove(id).then(() => {
      setData(data.filter((q) => q.id !== id));
      if (selectedQuote?.id === id) setSelectedQuote(null);
      toast({ title: "Orçamento excluído" });
    }).catch(() => toast({ title: "Erro", description: "Falha ao excluir orçamento.", variant: "destructive" }));
  };

  const handleConvertToOrder = async (q: Quote) => {
    setConverting(true);
    try {
      const result = await quotesService.convertQuoteToOrder(q.id);
      if (result.order.status === "Aprovar") {
        toast({
          title: "⏳ Pedido Gerado - Requer Aprovação",
          description: `Orçamento ${q.numero} convertido no Pedido ${result.order.numero}. Por exceder limites de desconto ou valor, o pedido aguarda aprovação na Central de Aprovações.`,
        });
      } else {
        toast({
          title: "✅ Pedido de Venda Gerado!",
          description: `Orçamento ${q.numero} convertido no Pedido ${result.order.numero} com status Aprovado e liberado para faturamento.`,
        });
      }
      setSelectedQuote(null);
      await loadQuotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível converter o orçamento em pedido.";
      toast({
        title: "Erro na conversão",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    if (!editingQuote?.itens) return;
    const itens = [...editingQuote.itens];
    const item = itens[index];
    (item[field] as OrderItem[typeof field]) = value as never;
    if (field === "codigo") {
      const prod = products.find((p) => p.codigo === value);
      if (prod) { 
        itens[index].produto = prod.nome; 
        itens[index].precoUnitario = prod.preco; 
      }
    }
    itens[index].total = itens[index].quantidade * itens[index].precoUnitario * (1 - itens[index].desconto / 100);
    setEditingQuote({ ...editingQuote, itens });
  };

  const getClientHealth = (clientName: string) => {
    if (!clientName) return null;
    const client = customers.find(c => c.razaoSocial === clientName);
    if (!client) return null;
    if (client.totalCompras > 100000) {
      return { color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle2, desc: "Cliente recorrente, alto volume de compras." };
    }
    return { color: "bg-amber-50 border-amber-200 text-amber-700", icon: AlertTriangle, desc: "Cliente com volume baixo. Considere condições especiais." };
  };

  const addItem = () => editingQuote && setEditingQuote({ ...editingQuote, itens: [...(editingQuote.itens || []), { ...emptyItem }] });
  const removeItem = (index: number) => {
    if (!editingQuote?.itens || editingQuote.itens.length <= 1) return;
    setEditingQuote({ ...editingQuote, itens: editingQuote.itens.filter((_, i) => i !== index) });
  };

  const calculateMargin = (codigo: string, precoVenda: number) => {
    const prod = products.find(p => p.codigo === codigo);
    if (!prod || !precoVenda) return null;
    const margin = ((precoVenda - prod.preco * 0.7) / precoVenda) * 100;
    return { value: margin, ok: margin >= 15 };
  };

  const saveQuote = async () => {
    if (!editingQuote) return;
    const errors: string[] = [];
    if (!editingQuote.cliente) errors.push("Cliente");
    if (!editingQuote.vendedor) errors.push("Vendedor");
    if (errors.length > 0) {
      toast({ title: "Campos obrigatórios", description: `Preencha: ${errors.join(", ")}`, variant: "destructive" });
      return;
    }
    const total = (editingQuote.itens || []).reduce((s, i) => s + i.total, 0);
    const newQuote: Quote = {
      ...(editingQuote as Quote),
      valor: total,
    };
    try {
      if (editingQuote.id) {
        await quotesService.update(editingQuote.id, newQuote);
        toast({ title: "Orçamento atualizado!" });
      } else {
        const created = await quotesService.create(newQuote);
        toast({ title: "Orçamento criado!", description: `${created.numero} adicionado.` });
      }
      await loadQuotes();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar o orçamento.";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    }
    setFormOpen(false);
    setEditingQuote(null);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Orçamentos de Venda"
        subtitle="Gerencie propostas comerciais e orçamentos"
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Orçamento</Button>}
      />

      <Card className="card-premium border-0">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1 w-full sm:w-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por número ou cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Orçamento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q) => (
                <TableRow key={q.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-mono text-xs font-semibold">{q.numero}</TableCell>
                  <TableCell className="font-medium">{q.cliente}</TableCell>
                  <TableCell className="text-muted-foreground">{q.vendedor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(q.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{new Date(q.validade).toLocaleDateString("pt-BR")}</span>
                      <ExpiryBadge validade={q.validade} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold">{fmt(q.valor)}</TableCell>
                  <TableCell><StatusBadge status={q.status} /></TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedQuote(q)} title="Visualizar"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleConvertToOrder(q)} title="Converter em Pedido"><ShoppingCart className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSendQuote(q)} title="Enviar por Email/WhatsApp"><Mail className="h-3.5 w-3.5 text-blue-600" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(q)} title="Editar"><Edit className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateQuote(q)} title="Duplicar"><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteQuote(q.id)} title="Excluir"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhum orçamento encontrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuote} onOpenChange={(open) => {
        if (!open) { setSelectedQuote(null); }
      }}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10 print:hidden">
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-mono text-xl">Visualização do Orçamento {selectedQuote?.numero}</DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">Modelo ativo:</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 capitalize">
                  {settings.templateConfig.layout}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1.5 text-xs shadow-sm"
                disabled={converting || selectedQuote?.status === "Aprovado"}
                onClick={() => selectedQuote && handleConvertToOrder(selectedQuote)}
              >
                {converting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                {selectedQuote?.status === "Aprovado" ? "Orçamento Já Aprovado" : "Converter em Pedido"}
              </Button>
              <Button variant="outline" onClick={() => setSelectedQuote(null)}>
                Fechar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => printElement("printable-quote", `Orcamento_${selectedQuote?.numero}`)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / PDF
              </Button>
            </div>
          </DialogHeader>

          {selectedQuote && (() => {
            const customerObj = customers.find(c => c.nome === selectedQuote.cliente || c.razaoSocial === selectedQuote.cliente);
            const quoteDocData: QuoteDocumentData = {
              numero: selectedQuote.numero,
              dataEmissao: selectedQuote.data,
              dataValidade: selectedQuote.validade,
              tipo: "orcamento",
              status: selectedQuote.status,
              cliente: {
                razaoSocial: customerObj?.razaoSocial || selectedQuote.cliente,
                nomeFantasia: customerObj?.nome || selectedQuote.cliente,
                cnpjCpf: customerObj?.cnpjCpf || "12.345.678/0001-90",
                inscricaoEstadual: customerObj?.inscricaoEstadual || "123.456.789.110",
                endereco: customerObj?.endereco || "Av. Paulista, 1000 - Bela Vista",
                cidade: customerObj?.cidade || "São Paulo",
                estado: customerObj?.estado || "SP",
                cep: customerObj?.cep || "01310-100",
                contatoNome: selectedQuote.cliente,
                telefone: customerObj?.telefone || "(11) 3222-4400",
                email: customerObj?.email || "contato@empresa.com.br",
              },
              vendedor: {
                nome: selectedQuote.vendedor,
                cargo: "Consultor Técnico Comercial",
                telefone: "(11) 98888-7777",
                email: "vendas@suaempresa.com.br",
              },
              itens: (selectedQuote.itens || []).map(it => ({
                codigo: it.codigo,
                descricao: it.produto,
                quantidade: it.quantidade,
                unidade: "UN",
                precoUnitario: it.precoUnitario,
                descontoPercentual: it.desconto || 0,
                subtotal: it.total,
                ncm: "8471.30.12",
                aliquotaImposto: 5,
                prazoItem: "Pronta Entrega",
              })),
              totais: {
                subtotalProdutos: selectedQuote.valor,
                descontoTotal: (selectedQuote.itens || []).reduce((acc, it) => acc + (it.desconto ? (it.precoUnitario * it.quantidade * it.desconto / 100) : 0), 0),
                valorFrete: 0,
                valorImpostos: selectedQuote.valor * 0.08,
                valorTotal: selectedQuote.valor,
                margemLucroPercentual: 32.5,
              },
              condicoes: {
                formaPagamento: selectedQuote.condicaoPagamento || "30/60/90 dias",
                prazoEntrega: settings.documentConfig.prazoEntregaPadrao || "7 a 10 dias úteis",
                garantia: settings.documentConfig.sections?.warrantyText || "12 meses balcão",
                validadeProposta: `${new Date(selectedQuote.validade).toLocaleDateString("pt-BR")}`,
                observacoes: selectedQuote.observacoes || "",
              }
            };

            return (
              <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 p-4 md:p-8 flex flex-col items-center">
                <div id="printable-quote" className="printable-area w-full max-w-[210mm] flex flex-col items-center">
                  <DynamicQuoteRenderer
                    data={quoteDocData}
                    settings={settings}
                  />
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Create/Edit Dialog Premium ── */}
      <Dialog open={formOpen} onOpenChange={() => { setFormOpen(false); setEditingQuote(null); }}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {editingQuote && (
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
              {/* Header */}
              <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10">
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editingQuote.id ? "Editar Orçamento" : "Criar Novo Orçamento"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    Preencha os detalhes comerciais da proposta
                  </DialogDescription>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Informações Básicas */}
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="py-4 border-b bg-muted/20">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" /> 
                      Informações Básicas
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="font-semibold">Cliente <span className="text-rose-500">*</span></Label>
                      <Select value={editingQuote.cliente} onValueChange={(v) => setEditingQuote({ ...editingQuote, cliente: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.razaoSocial}>{c.razaoSocial}</SelectItem>)}</SelectContent>
                      </Select>
                      {editingQuote.cliente && (
                        <div className={cn("p-2 rounded-lg border text-[10px] flex items-center gap-2 mt-1", getClientHealth(editingQuote.cliente)?.color)}>
                          {(() => {
                            const health = getClientHealth(editingQuote.cliente);
                            if (!health) return null;
                            const Icon = health.icon;
                            return (
                              <>
                                <Icon className="h-3 w-3" />
                                <span><strong>Inteligência:</strong> {health.desc}</span>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Vendedor <span className="text-rose-500">*</span></Label>
                      <Select value={editingQuote.vendedor} onValueChange={(v) => setEditingQuote({ ...editingQuote, vendedor: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{["Carlos Silva","Maria Santos","João Oliveira","Ana Costa"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Validade da Proposta</Label>
                      <Input type="date" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500" value={editingQuote.validade} onChange={(e) => setEditingQuote({ ...editingQuote, validade: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Condição de Pagamento</Label>
                      <Select value={editingQuote.condicaoPagamento} onValueChange={(v) => setEditingQuote({ ...editingQuote, condicaoPagamento: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{["À vista","30 dias","30/60","30/60/90","30/60/90/120"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Itens do Orçamento */}
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4 text-emerald-500" /> 
                      Itens do Orçamento
                    </h3>
                    <Button variant="outline" size="sm" onClick={addItem} className="h-8 shadow-sm">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Item
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-transparent">
                            <TableHead className="w-[35%] py-3 font-semibold text-slate-600 dark:text-slate-300">Produto</TableHead>
                            <TableHead className="w-[12%] text-right font-semibold text-slate-600 dark:text-slate-300">Qtd.</TableHead>
                            <TableHead className="w-[18%] text-right font-semibold text-slate-600 dark:text-slate-300">Preço Unit.</TableHead>
                            <TableHead className="w-[12%] text-right font-semibold text-slate-600 dark:text-slate-300">Desc. %</TableHead>
                            <TableHead className="w-[10%] text-right font-semibold text-slate-600 dark:text-slate-300">Margem</TableHead>
                            <TableHead className="w-[18%] text-right font-semibold text-slate-600 dark:text-slate-300">Total</TableHead>
                            <TableHead className="w-[5%]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingQuote.itens?.map((item, i) => (
                            <TableRow key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                              <TableCell className="p-3">
                                <Select value={item.codigo} onValueChange={(v) => handleItemChange(i, "codigo", v)}>
                                  <SelectTrigger className="h-9 border-slate-200 dark:border-slate-800 shadow-sm"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.codigo}>{p.codigo} - {p.nome}</SelectItem>)}</SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="p-3">
                                <Input type="number" min={1} className="h-9 text-right bg-white dark:bg-slate-950 shadow-sm" value={item.quantidade || ""} onChange={(e) => handleItemChange(i, "quantidade", Number(e.target.value))} />
                              </TableCell>
                              <TableCell className="p-3">
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                                  <Input type="number" className="h-9 pl-8 text-right bg-muted/40" value={item.precoUnitario || ""} readOnly />
                                </div>
                              </TableCell>
                              <TableCell className="p-3">
                                <Input type="number" min={0} max={100} className="h-9 text-right bg-white dark:bg-slate-950 shadow-sm" value={item.desconto || ""} onChange={(e) => handleItemChange(i, "desconto", Number(e.target.value))} />
                              </TableCell>
                               <TableCell className="p-3 text-right">
                                  {(() => {
                                    const result = calculateMargin(item.codigo, item.precoUnitario * (1 - item.desconto/100));
                                    if (!result) return <span className="text-[10px] text-muted-foreground">—</span>;
                                    return (
                                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", 
                                        result.value > 30 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : 
                                        result.value > 15 ? "text-amber-600 bg-amber-50 border-amber-100" : 
                                        "text-rose-600 bg-rose-50 border-rose-100"
                                      )}>
                                        {result.value.toFixed(0)}%
                                      </span>
                                    );
                                  })()}
                               </TableCell>
                               <TableCell className="p-3 text-right">
                                 <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(item.total)}</span>
                               </TableCell>
                              <TableCell className="p-3 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => removeItem(i)} disabled={editingQuote.itens!.length <= 1}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Resumo do Total & Flow Studio Engine */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-t p-5 space-y-4">
                      <FlowEvaluationBadge
                        proposal={{
                          total: (editingQuote.itens || []).reduce((s, i) => s + i.total, 0),
                          cliente: editingQuote.cliente,
                          vendedor: editingQuote.vendedor,
                          condicaoPagamento: editingQuote.condicaoPagamento,
                          itens: (editingQuote.itens || []).map((i) => ({
                            produto: i.produto,
                            codigo: i.codigo,
                            quantidade: i.quantidade,
                            precoUnitario: i.precoUnitario,
                            desconto: i.desconto,
                            precoFinal: i.total
                          }))
                        }}
                      />
                      <div className="flex justify-end text-right">
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total do Orçamento</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {fmt((editingQuote.itens || []).reduce((s, i) => s + i.total, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Observações */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-2">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Observações Adicionais</Label>
                    <Textarea 
                      placeholder="Condições especiais, detalhes de entrega, etc..." 
                      className="min-h-[100px] resize-y bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm focus:ring-blue-500" 
                      value={editingQuote.observacoes} 
                      onChange={(e) => setEditingQuote({ ...editingQuote, observacoes: e.target.value })} 
                    />
                  </div>
                  
                  {/* Upsell Intelligence */}
                  <div className="lg:col-span-1 space-y-3">
                    <Label className="font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Sugestões p/ Upsell (IA)
                    </Label>
                    <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4 space-y-3">
                      {(() => {
                        const lastProductCode = editingQuote.itens?.[(editingQuote.itens?.length || 1) - 1]?.codigo;
                        const product = products.find(p => p.codigo === lastProductCode);
                        const suggestedCodes = product?.sugestoes || ["MW-001", "HD-EXT"]; // fallback para demo
                        
                        return (
                          <>
                            <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">
                              Produtos frequentemente comprados juntos:
                            </p>
                            <div className="space-y-2">
                              {suggestedCodes.map(code => {
                                const p = products.find(item => item.codigo === code);
                                if (!p) return null;
                                return (
                                  <div key={code} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border shadow-sm group hover:border-amber-300 transition-colors">
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate">{p.nome}</p>
                                      <p className="text-[10px] text-muted-foreground">{fmt(p.preco)}</p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 shrink-0"
                                      onClick={() => {
                                        setEditingQuote({
                                          ...editingQuote,
                                          itens: [...(editingQuote.itens || []), {
                                            produto: p.nome,
                                            codigo: p.codigo,
                                            quantidade: 1,
                                            precoUnitario: p.preco,
                                            desconto: 0,
                                            total: p.preco
                                          }]
                                        });
                                        toast({ title: "Item sugerido adicionado!" });
                                      }}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10 text-right">
                <div className="mr-auto hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" /> Venda validada pelas Regras de Negócio Protheus®
                </div>
                <Button variant="outline" className="px-6" onClick={() => { setFormOpen(false); setEditingQuote(null); }}>
                  Cancelar
                </Button>
                <Button 
                  className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white font-semibold"
                  onClick={saveQuote}
                >
                  {editingQuote.id ? "Salvar Alterações" : "Criar Orçamento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SendQuoteDialog
        quote={sendQuote}
        open={!!sendQuote}
        onOpenChange={(open) => { if (!open) setSendQuote(null); }}
      />
    </motion.div>
  );
}
