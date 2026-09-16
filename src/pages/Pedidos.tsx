import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Eye, LayoutList, Columns3, Trash2, FileText, Printer, Loader2, Image as ImageIcon, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type Order, type OrderStatus, type Product, type Customer, type OrderItem } from "@/lib/mock-data";
import { ordersService, productsService, customersService } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { getSettings, subscribeSettings, type AppSettings } from "@/lib/settings-store";
import { useAuth } from "@/hooks/use-auth";
import { printElement } from "@/lib/print-utils";
import { ProductImageWithSkeleton } from "@/components/products/ProductImageWithSkeleton";
import { OrderProductsGallery } from "@/components/orders/OrderProductsGallery";
import { FlowEvaluationBadge } from "@/components/FlowEvaluationBadge";
import { localDB } from "@/lib/local-db";
import { DocumentPrintLayout } from "@/components/documents/DocumentPrintLayout";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ALL_STATUSES: OrderStatus[] = ["Pendente", "Aprovar", "Aprovado", "Faturado", "Cancelado"];

const kanbanColors: Record<OrderStatus, string> = {
  Pendente:  "border-l-amber-500",
  Aprovar:   "border-l-indigo-500",
  Aprovado:  "border-l-sky-500",
  Faturado:  "border-l-emerald-500",
  Cancelado: "border-l-rose-500",
};

export default function PedidosPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const urlStatus = searchParams.get("status");
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || "all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [view, setView] = useState<"table" | "kanban">("table");

  useEffect(() => {
    if (location.pathname === "/pedidos/new" || location.pathname === "/pedidos/from-quote") {
      setEditingOrder({
        numero: `PV-2026-${String(data.length + 1).padStart(3, "0")}`,
        cliente: "",
        vendedor: "",
        data: new Date().toISOString().slice(0, 10),
        status: "Pendente",
        condicaoPagamento: "",
        observacoes: location.pathname.includes("from-quote") ? "Convertido a partir de Orçamento" : "",
        itens: [{ produto: "", codigo: "", quantidade: 1, precoUnitario: 0, desconto: 0, total: 0 }],
      });
      setFormOpen(true);
    }
  }, [location.pathname, data.length]);

  useEffect(() => {
    const currentStatus = searchParams.get("status");
    if (currentStatus) {
      setStatusFilter(currentStatus);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  // Configuração global de exibição de fotos de produtos nos pedidos
  const [showProductImages, setShowProductImages] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("vendasprotheus_show_order_thumbnails");
      return saved !== "false";
    } catch {
      return true;
    }
  });

  const toggleShowProductImages = (val: boolean) => {
    setShowProductImages(val);
    try {
      localStorage.setItem("vendasprotheus_show_order_thumbnails", String(val));
    } catch {
      // ignore
    }
  };

  const getItemProductImage = (codigo: string, produtoNome: string): string | undefined => {
    const prod = products.find(
      (p) => p.codigo.toLowerCase() === codigo.toLowerCase() || p.nome.toLowerCase() === produtoNome.toLowerCase()
    );
    if (prod?.primaryImageUrl) return prod.primaryImageUrl;
    if (prod?.images && prod.images.length > 0) return prod.images[0].url;
    return undefined;
  };
  
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const res = await ordersService.getAll();
      setData(res?.data ?? []);
    } catch {
      setData(localDB.getOrders());
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      ordersService.getAll().then((r) => r?.data ?? []).catch(() => []),
      productsService.getAll().then((r) => r?.data ?? []).catch(() => []),
      customersService.getAll().then((r) => r?.data ?? []).catch(() => []),
    ]).then(([o, p, c]) => {
      if (active) {
        setData(o);
        setProducts(p);
        setCustomers(c);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    const handleSync = () => loadOrders();
    window.addEventListener("orderStatusChanged", handleSync);
    window.addEventListener("approvalsChanged", handleSync);
    window.addEventListener("local-db-change", handleSync);
    window.addEventListener("mockDataChanged", handleSync);

    return () => {
      active = false;
      window.removeEventListener("orderStatusChanged", handleSync);
      window.removeEventListener("approvalsChanged", handleSync);
      window.removeEventListener("local-db-change", handleSync);
      window.removeEventListener("mockDataChanged", handleSync);
    };
  }, [loadOrders]);

  const emptyItem: OrderItem = { produto: "", codigo: "", quantidade: 1, precoUnitario: 0, desconto: 0, total: 0 };

  const [settings, setSettings] = useState<AppSettings>(getSettings);
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), []);

  const openNew = () => {
    setEditingOrder({
      numero: `PV-2026-${String(data.length + 1).padStart(3, "0")}`,
      cliente: "", vendedor: "", data: new Date().toISOString().slice(0, 10),
      status: "Pendente", condicaoPagamento: "", observacoes: "", itens: [{ ...emptyItem }],
    });
    setFormOpen(true);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    if (!editingOrder?.itens) return;
    const itens = [...editingOrder.itens];
    const item = itens[index];
    (item[field] as OrderItem[typeof field]) = value as never;
    if (field === "codigo") {
      const prod = products.find((p) => p.codigo === value);
      if (prod) { itens[index].produto = prod.nome; itens[index].precoUnitario = prod.preco; }
    }
    itens[index].total = itens[index].quantidade * itens[index].precoUnitario * (1 - itens[index].desconto / 100);
    setEditingOrder({ ...editingOrder, itens });
  };

  const addItem = () => editingOrder && setEditingOrder({ ...editingOrder, itens: [...(editingOrder.itens || []), { ...emptyItem }] });
  const removeItem = (index: number) => {
    if (!editingOrder?.itens || editingOrder.itens.length <= 1) return;
    setEditingOrder({ ...editingOrder, itens: editingOrder.itens.filter((_, i) => i !== index) });
  };

  const saveOrder = async () => {
    if (!editingOrder) return;

    const mandatory = settings.documentConfig.camposObrigatorios || [];
    const errors: string[] = [];
    
    if (!editingOrder.cliente) errors.push("Cliente");
    if (!editingOrder.vendedor) errors.push("Vendedor");
    if (mandatory.includes("condicaoPagamento") && !editingOrder.condicaoPagamento) errors.push("Condição de Pagamento");
    
    if (errors.length > 0) {
      toast({ 
        title: "Campos obrigatórios ausentes", 
        description: `Preencha: ${errors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const total = (editingOrder.itens || []).reduce((s, i) => s + i.total, 0);
    const orderPayload = {
      ...(editingOrder as Order),
      valor: total,
    };

    try {
      if (editingOrder.id) {
        const updated = await ordersService.update(editingOrder.id, orderPayload);
        if (updated.status === "Aprovar") {
          toast({
            title: "⏳ Pendente de Liberação Comercial",
            description: `${updated.numero} requer liberação de alçada comercial por desconto ou valor total.`,
          });
        } else {
          toast({ title: "Pedido atualizado!" });
        }
      } else {
        const created = await ordersService.create(orderPayload);
        if (created.status === "Aprovar") {
          toast({
            title: "⏳ Pendente de Liberação Comercial",
            description: `${created.numero} cadastrado e enviado para a Central de Aprovações para liberação de alçada.`,
          });
        } else {
          toast({
            title: "✅ Pedido criado!",
            description: `${created.numero} adicionado com sucesso.`,
          });
        }
      }
      await loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar o pedido.";
      toast({
        title: "Erro ao salvar pedido",
        description: msg,
        variant: "destructive",
      });
    }

    setFormOpen(false);
    setEditingOrder(null);
  };

  const { user } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  const filtered = data.filter((o) => {
    if (user?.role === "representante" && o.vendedor !== user.nome) return false;
    const matchSearch =
      (o.numero?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (o.cliente?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false);
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportToExcel = () => {
    const headers = [
      "Número do Pedido",
      "Cliente",
      "Vendedor",
      "Data",
      "Condição de Pagamento",
      "Status",
      "Valor Total (R$)"
    ];

    const rows = filtered.map((o) => [
      o.numero,
      o.cliente,
      o.vendedor,
      o.data,
      o.condicaoPagamento,
      o.status,
      o.valor
    ]);

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos de Venda");
    XLSX.writeFile(wb, `pedidos_venda_${new Date().toISOString().slice(0, 10)}.xlsx`);

    toast({
      title: "Sucesso!",
      description: `Exportados ${filtered.length} pedidos em formato Excel (.xlsx).`,
    });
  };

  const exportToCSV = () => {
    const headers = [
      "Numero do Pedido",
      "Cliente",
      "Vendedor",
      "Data",
      "Condicao de Pagamento",
      "Status",
      "Valor Total"
    ];

    const rows = filtered.map((o) => [
      o.numero,
      o.cliente,
      o.vendedor,
      o.data,
      o.condicaoPagamento,
      o.status,
      o.valor
    ]);

    const aoa = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_venda_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Sucesso!",
      description: `Exportados ${filtered.length} pedidos em formato CSV.`,
    });
  };

  const exportToPDF = () => {
    const settings = getSettings();
    const { templateConfig: tc } = settings;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace("#", "");
      return [
        parseInt(h.substring(0, 2), 16) || 15,
        parseInt(h.substring(2, 4), 16) || 23,
        parseInt(h.substring(4, 6), 16) || 42,
      ];
    };
    const primary = hexToRgb(tc?.primaryColor || "#0f172a");

    // Header bar
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageW, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(tc?.logoText || "SISTEMA ERP PROTHEUS", margin, 10);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const companyInfo = [tc?.empresaCnpj, tc?.empresaTelefone, tc?.empresaEmail]
      .filter(Boolean)
      .join("  •  ");
    doc.text(companyInfo, margin, 16);
    if (tc?.empresaEndereco) {
      doc.text(tc?.empresaEndereco, margin, 21);
    }

    // Title & Subtitle
    const y = 33;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO DE PEDIDOS DE VENDA", margin, y);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")}  •  ${filtered.length} pedidos`,
      pageW - margin,
      y,
      { align: "right" }
    );

    const headers = [
      "Número",
      "Cliente",
      "Vendedor",
      "Data",
      "Condição",
      "Status",
      "Valor Total"
    ];

    const rows = filtered.map((o) => [
      o.numero || "",
      o.cliente || "",
      o.vendedor || "",
      o.data ? new Date(o.data + "T00:00:00").toLocaleDateString("pt-BR") : "",
      o.condicaoPagamento || "",
      o.status || "",
      o.valor ? fmt(o.valor) : "R$ 0,00"
    ]);

    autoTable(doc, {
      startY: y + 4,
      head: [headers],
      body: rows,
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: {
        fillColor: primary,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        6: { halign: "right" },
      },
      margin: { left: margin, right: margin, bottom: 20 },
      didDrawPage: (pageData) => {
        // Footer on every page
        const footerY = pageH - 12;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        const footerText = tc?.textoRodape || "";
        if (footerText) {
          doc.text(footerText, pageW / 2, footerY, { align: "center", maxWidth: pageW - margin * 2 });
        }

        doc.setFontSize(6.5);
        doc.text(
          `Página ${pageData.pageNumber} • ${tc?.logoText || "VendasProtheus"}`,
          pageW - margin,
          pageH - 6,
          { align: "right" }
        );
        doc.text(
          `Gerado em ${new Date().toLocaleString("pt-BR")}`,
          margin,
          pageH - 6
        );
      },
    });

    doc.save(`pedidos_venda_${new Date().toISOString().slice(0, 10)}.pdf`);

    toast({
      title: "Sucesso!",
      description: `Exportados ${filtered.length} pedidos em formato PDF.`,
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Pedidos de Venda"
        subtitle="Gerencie todos os pedidos de venda"
        actions={<Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo Pedido</Button>}
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
                  {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1.5 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 px-3">
                    <Download className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Exportar</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1.5" align="end">
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={exportToExcel}
                      className="justify-start text-xs h-8 text-slate-700 dark:text-slate-300 font-normal hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <FileText className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                      Excel (.xlsx)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={exportToCSV}
                      className="justify-start text-xs h-8 text-slate-700 dark:text-slate-300 font-normal hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      <FileText className="h-3.5 w-3.5 mr-2 text-amber-500" />
                      CSV (.csv)
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={exportToPDF}
                      className="justify-start text-xs h-8 text-slate-700 dark:text-slate-300 font-normal hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <FileText className="h-3.5 w-3.5 mr-2 text-rose-500" />
                      PDF (.pdf)
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant={showProductImages ? "default" : "outline"}
                size="sm"
                onClick={() => toggleShowProductImages(!showProductImages)}
                className="h-9 text-xs gap-1.5 px-3"
                title="Alternar exibição de fotos de produtos no painel de pedidos"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showProductImages ? "Fotos: Ativas" : "Fotos: Ocultas"}</span>
              </Button>
              <Button variant={view === "table" ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => setView("table")}><LayoutList className="h-4 w-4" /></Button>
              <Button variant={view === "kanban" ? "default" : "outline"} size="icon" className="h-9 w-9" onClick={() => setView("kanban")}><Columns3 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Carregando pedidos de venda...</p>
            </div>
          ) : view === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  {showProductImages && <TableHead>Produtos</TableHead>}
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold">{order.numero}</TableCell>
                    <TableCell className="font-medium">{order.cliente}</TableCell>
                    {showProductImages && (
                      <TableCell className="py-2">
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {order.itens?.slice(0, 3).map((item, idx) => {
                            const img = getItemProductImage(item.codigo, item.produto);
                            return (
                              <ProductImageWithSkeleton
                                key={idx}
                                src={img}
                                alt={item.produto}
                                aspectRatio="thumb"
                                containerClassName="w-7 h-7 rounded-md border-2 border-background shadow-2xs shrink-0"
                              />
                            );
                          })}
                          {(order.itens?.length || 0) > 3 && (
                            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-muted text-[10px] font-bold text-muted-foreground border-2 border-background shrink-0">
                              +{(order.itens?.length || 0) - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">{order.vendedor}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(order.data).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-bold">{fmt(order.valor)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status as OrderStatus} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(order)} className="h-7 w-7">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={showProductImages ? 8 : 7} className="text-center text-muted-foreground py-10">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            // ── Kanban View ──
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
              {ALL_STATUSES.map((status) => {
                const cols = filtered.filter((o) => o.status === status);
                return (
                  <div key={status} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={status} />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{cols.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 min-h-[120px]">
                      {cols.map((order) => (
                        <motion.div
                          key={order.id}
                          initial={{ opacity: 0, scale: 0.96 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "rounded-lg border border-l-4 bg-card p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow",
                            kanbanColors[order.status as OrderStatus]
                          )}
                          onClick={() => setSelectedOrder(order)}
                        >
                          <p className="text-xs font-mono font-semibold text-primary">{order.numero}</p>
                          <p className="text-xs font-medium text-foreground mt-0.5 truncate">{order.cliente}</p>
                          <p className="text-[11px] text-muted-foreground">{order.vendedor}</p>
                          <p className="text-xs font-bold text-foreground mt-1.5">{fmt(order.valor)}</p>

                          {showProductImages && order.itens && order.itens.length > 0 && (
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/40 overflow-hidden">
                              {order.itens.slice(0, 4).map((item, idx) => {
                                const img = getItemProductImage(item.codigo, item.produto);
                                return (
                                  <ProductImageWithSkeleton
                                    key={idx}
                                    src={img}
                                    alt={item.produto}
                                    aspectRatio="thumb"
                                    containerClassName="w-6 h-6 rounded border border-border/60 shrink-0"
                                  />
                                );
                              })}
                              {order.itens.length > 4 && (
                                <span className="text-[10px] text-muted-foreground font-semibold ml-0.5">
                                  +{(order.itens.length - 4)}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      {cols.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border/60 p-4 text-center">
                          <p className="text-xs text-muted-foreground/50">Sem pedidos</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => {
        if (!open) { setSelectedOrder(null); }
      }}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="p-6 border-b">
              <div className="flex flex-col gap-1">
                <DialogTitle className="font-mono text-xl">Visualização do Pedido {selectedOrder?.numero}</DialogTitle>
                <DialogDescription className="sr-only">Detalhes completos do pedido de venda.</DialogDescription>
              </div>
            </DialogHeader>
          <div className="px-6 py-4 border-b flex flex-row items-center justify-between sticky top-0 bg-background z-10 print:hidden">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Fechar
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => printElement("printable-order", `Pedido_${selectedOrder?.numero}`)}
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / PDF
              </Button>
            </div>

            {selectedOrder?.status === "Aprovar" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white gap-1.5 shadow-sm"
                  onClick={async () => {
                    const approvals = localDB.getApprovals();
                    const appItem = approvals.find(
                      (a) => a.tipo === "Pedido" && (a.numero === selectedOrder.numero || a.id === selectedOrder.id)
                    );
                    if (appItem) {
                      localDB.approveItem(appItem.id, "Aprovado via tela de Pedidos");
                    } else {
                      localDB.updateOrder(selectedOrder.id, { status: "Aprovado" });
                    }
                    toast({
                      title: "✅ Pedido Aprovado!",
                      description: `Pedido ${selectedOrder.numero} aprovado e liberado com sucesso.`,
                    });
                    setSelectedOrder((prev) => (prev ? { ...prev, status: "Aprovado" } : null));
                    await loadOrders();
                  }}
                >
                  <CheckCircle2 className="h-4 w-4" /> Aprovar Pedido
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                  onClick={async () => {
                    const approvals = localDB.getApprovals();
                    const appItem = approvals.find(
                      (a) => a.tipo === "Pedido" && (a.numero === selectedOrder.numero || a.id === selectedOrder.id)
                    );
                    if (appItem) {
                      localDB.rejectItem(appItem.id, "Rejeitado via tela de Pedidos");
                    } else {
                      localDB.updateOrder(selectedOrder.id, { status: "Cancelado" });
                    }
                    toast({
                      title: "❌ Pedido Reprovado / Cancelado",
                      description: `Pedido ${selectedOrder.numero} cancelado.`,
                    });
                    setSelectedOrder((prev) => (prev ? { ...prev, status: "Cancelado" } : null));
                    await loadOrders();
                  }}
                >
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
              </div>
            )}
          </div>
          
          {selectedOrder && (
            <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 p-4 md:p-8 flex flex-col items-center">
              {/* Alerta de Pedido Aguardando Aprovação */}
              {selectedOrder.status === "Aprovar" && (
                <div className="w-full max-w-[210mm] mb-4 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 flex items-center justify-between gap-3 print:hidden shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Pendente de Liberação Comercial
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        Este pedido possui desconto ou valor total acima da alçada cadastrada. Ele está registrado na <strong>Central de Aprovações</strong> aguardando liberação gerencial.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {/* Galeria Centralizada de Fotos de Produtos do Pedido */}
              <div className="w-full max-w-[210mm] mb-6 print:hidden">
                <OrderProductsGallery
                  order={selectedOrder}
                  products={products}
                  showImages={showProductImages}
                  onToggleShowImages={toggleShowProductImages}
                  className="bg-white dark:bg-slate-900 shadow-md"
                />
              </div>

              {/* Layout de Impressão A4 Profissional & Branded */}
              <div className="w-full max-w-[210mm] flex justify-center">
                <DocumentPrintLayout
                  order={selectedOrder}
                  settings={settings}
                  products={products}
                  showProductPhotos={showProductImages}
                  printableId="printable-order"
                  showToolbar={true}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Create/Edit Dialog Premium ── */}
      <Dialog open={formOpen} onOpenChange={() => { setFormOpen(false); setEditingOrder(null); }}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          {editingOrder && (
            <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
              {/* Header */}
              <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10">
                <div>
                  <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {editingOrder.id ? "Editar Pedido" : "Criar Novo Pedido de Venda"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                    Preencha as informações do pedido para faturamento imediato
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
                      Dados do Pedido
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="font-semibold">Cliente <span className="text-rose-500">*</span></Label>
                      <Select value={editingOrder.cliente} onValueChange={(v) => setEditingOrder({ ...editingOrder, cliente: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.razaoSocial}>{c.razaoSocial}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Vendedor <span className="text-rose-500">*</span></Label>
                      <Select value={editingOrder.vendedor} onValueChange={(v) => setEditingOrder({ ...editingOrder, vendedor: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{["Carlos Silva","Maria Santos","João Oliveira","Ana Costa"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Data da Emissão</Label>
                      <Input type="date" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500" value={editingOrder.data} onChange={(e) => setEditingOrder({ ...editingOrder, data: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Condição de Pagamento</Label>
                      <Select value={editingOrder.condicaoPagamento} onValueChange={(v) => setEditingOrder({ ...editingOrder, condicaoPagamento: v })}>
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>{["À vista","30 dias","30/60","30/60/90","30/60/90/120"].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Itens do Pedido */}
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Plus className="h-4 w-4 text-emerald-500" /> 
                      Itens do Pedido
                    </h3>
                    <Button variant="outline" size="sm" onClick={addItem} className="h-8 shadow-sm">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Produto
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
                            <TableHead className="w-[18%] text-right font-semibold text-slate-600 dark:text-slate-300">Total</TableHead>
                            <TableHead className="w-[5%]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {editingOrder.itens?.map((item, i) => (
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
                                <span className="font-bold text-slate-800 dark:text-slate-200">{fmt(item.total)}</span>
                              </TableCell>
                              <TableCell className="p-3 text-center">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => removeItem(i)} disabled={editingOrder.itens!.length <= 1}>
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
                          total: (editingOrder.itens || []).reduce((s, i) => s + i.total, 0),
                          cliente: editingOrder.cliente,
                          vendedor: editingOrder.vendedor,
                          condicaoPagamento: editingOrder.condicaoPagamento,
                          itens: (editingOrder.itens || []).map((i) => ({
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
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total do Pedido</p>
                          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {fmt((editingOrder.itens || []).reduce((s, i) => s + i.total, 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Observações */}
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 dark:text-slate-300">Observações Adicionais / Faturamento</Label>
                  <Textarea 
                    placeholder="Instruções de logística, particularidade do CTE, etc..." 
                    className="min-h-[80px] resize-y bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm focus:ring-blue-500" 
                    value={editingOrder.observacoes} 
                    onChange={(e) => setEditingOrder({ ...editingOrder, observacoes: e.target.value })} 
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t flex justify-end gap-3 sticky bottom-0 z-10">
                <Button variant="outline" className="px-6" onClick={() => { setFormOpen(false); setEditingOrder(null); }}>
                  Cancelar
                </Button>
                <Button 
                  className="px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md text-white font-semibold"
                  onClick={saveOrder}
                >
                  Criar Pedido de Venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
