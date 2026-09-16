import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search, Eye, LayoutList, Columns3, Trash2, FileText, Printer, Send, Loader2, Image as ImageIcon, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
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

              {/* Folha A4 que segue fielmente as configurações */}
              <motion.div 
                id="printable-order"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="printable-area bg-white w-full max-w-[210mm] min-h-[297mm] shadow-xl border overflow-hidden flex flex-col"
              >
                  {/* Cabeçalho Customizável */}
                  <div 
                    className={cn(
                      "p-10",
                      settings.templateConfig.layout === "moderno" ? "text-white" : "border-b pb-8"
                    )}
                    style={{ 
                      backgroundColor: settings.templateConfig.layout === "moderno" ? settings.templateConfig.primaryColor : "transparent"
                    }}
                  >
                    <div className={cn(
                      "flex items-center justify-between",
                      settings.templateConfig.layout === "minimalista" && "flex-col items-start gap-4"
                    )}>
                      {/* Logo */}
                      <div className="flex items-center gap-5">
                        {settings.templateConfig.logoImage ? (
                          <div className={cn("p-2 rounded-lg bg-white shadow-sm", settings.templateConfig.layout === "classico" && "border")}>
                            <img src={settings.templateConfig.logoImage} alt="Logo" className="max-h-20 max-w-[220px] object-contain" />
                          </div>
                        ) : (
                          <div 
                            className="w-14 h-14 rounded-xl flex shrink-0 items-center justify-center text-white font-bold shadow-md text-xl"
                            style={{ backgroundColor: settings.templateConfig.layout === "moderno" ? "rgba(255,255,255,0.2)" : settings.templateConfig.primaryColor }}
                          >
                            {settings.templateConfig.logoText.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h1 className={cn("text-3xl font-black tracking-tighter", settings.templateConfig.layout !== "moderno" && "text-slate-900")}>
                            {settings.templateConfig.logoImage ? "" : settings.templateConfig.logoText || "Sua Empresa"}
                          </h1>
                          <div className={cn("text-xs flex flex-col gap-1 mt-1 font-medium", settings.templateConfig.layout === "moderno" ? "text-white/80" : "text-slate-500")}>
                            {settings.templateConfig.empresaCnpj && <span>CNPJ: {settings.templateConfig.empresaCnpj}</span>}
                            {settings.templateConfig.empresaTelefone && <span>Tel: {settings.templateConfig.empresaTelefone}</span>}
                            {settings.templateConfig.empresaEmail && <span>{settings.templateConfig.empresaEmail}</span>}
                          </div>
                        </div>
                      </div>
                      
                      <div className={cn("text-right", settings.templateConfig.layout === "minimalista" && "text-left")}>
                        <p className={cn("text-sm uppercase font-bold tracking-widest opacity-70", settings.templateConfig.layout !== "moderno" && "text-slate-400")}>
                          Pedido de Venda
                        </p>
                        <p className={cn("font-mono font-black text-2xl h-10 flex items-center justify-end", settings.templateConfig.layout !== "moderno" && "text-slate-900")}>
                          #{selectedOrder.numero}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Corpo do Pedido */}
                  <div className="p-10 space-y-10 text-slate-800 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-10">
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3" style={{ color: settings.templateConfig.layout === "classico" ? settings.templateConfig.primaryColor : undefined }}>
                          Dados do Cliente
                        </h4>
                        <p className="font-bold text-lg text-slate-900">{selectedOrder.cliente}</p>
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                          Faturamento conforme cadastro no ERP Protheus.<br/>
                          Vendedor Responsável: {selectedOrder.vendedor}
                        </p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between border-b pb-2.5">
                          <span className="text-sm text-slate-500">Data de Emissão</span>
                          <span className="text-sm font-bold text-slate-900">{new Date(selectedOrder.data).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2.5">
                          <span className="text-sm text-slate-500">Status do Pedido</span>
                          <span className="text-sm font-bold text-slate-900">{selectedOrder.status}</span>
                        </div>
                        <div className="flex justify-between border-b pb-2.5">
                          <span className="text-sm text-slate-500">Cond. de Pagamento</span>
                          <span className="text-sm font-bold text-slate-900">{selectedOrder.condicaoPagamento || "À vista"}</span>
                        </div>
                        {settings.documentConfig.prazoEntregaPadrao && (
                          <div className="flex justify-between pb-2.5">
                            <span className="text-sm text-slate-500">Prazo de Entrega</span>
                            <span className="text-sm font-bold text-slate-900">{settings.documentConfig.prazoEntregaPadrao}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabela de Produtos */}
                    <div className="flex-1">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: settings.templateConfig.primaryColor }}>
                            {showProductImages && <th className="py-4 font-bold text-slate-900 w-12">FOTO</th>}
                            <th className="py-4 font-bold text-slate-900 w-24">CÓDIGO</th>
                            <th className="py-4 font-bold text-slate-900">DESCRIÇÃO DO PRODUTO</th>
                            <th className="py-4 font-bold text-slate-900 text-right w-16">QTD</th>
                            <th className="py-4 font-bold text-slate-900 text-right w-32">PREÇO UNIT.</th>
                            {settings.documentConfig.mostrarDescontoItem && (
                              <th className="py-4 font-bold text-slate-900 text-right w-20">DESC.%</th>
                            )}
                            <th className="py-4 font-bold text-slate-900 text-right w-32">TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-600">
                          {selectedOrder.itens?.map((item, i) => (
                            <tr key={i} className="group">
                              {showProductImages && (
                                <td className="py-3 pr-2">
                                  <ProductImageWithSkeleton
                                    src={getItemProductImage(item.codigo, item.produto)}
                                    alt={item.produto}
                                    aspectRatio="thumb"
                                    containerClassName="w-10 h-10 rounded-md border border-slate-200 overflow-hidden bg-slate-50"
                                  />
                                </td>
                              )}
                              <td className="py-4 pr-3 font-mono text-xs font-medium">{item.codigo}</td>
                              <td className="py-4 pr-3">
                                <p className="font-bold text-slate-800">{item.produto}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">NCM: 0000.00.00 | IPI: 5%</p>
                              </td>
                              <td className="py-4 pr-3 text-right font-medium">{item.quantidade}</td>
                              <td className="py-4 pr-3 text-right font-medium">{fmt(item.precoUnitario)}</td>
                              {settings.documentConfig.mostrarDescontoItem && (
                                <td className="py-4 pr-3 text-right text-slate-400 italic">
                                  {item.desconto > 0 ? `${item.desconto}%` : "—"}
                                </td>
                              )}
                              <td className="py-4 text-right font-bold text-slate-900">{fmt(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Rodapé Interno com Totais e Observações */}
                    <div className="space-y-8 mt-auto">
                      <div className="flex flex-col md:flex-row gap-10">
                        {/* Observações conforme config */}
                        <div className="flex-1">
                          {settings.documentConfig.mostrarObservacoes && selectedOrder.observacoes && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm">
                              <p className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" /> Observações do Pedido:
                              </p>
                              <p className="text-slate-600 leading-relaxed italic">{selectedOrder.observacoes}</p>
                            </div>
                          )}
                          
                          {settings.documentConfig.mostrarDadosBancarios && settings.documentConfig.dadosBancarios && (
                            <div className="mt-4 p-5 rounded-xl border border-dashed border-slate-200 bg-emerald-50/20">
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mb-2">Dados Bancários para Pagamento:</p>
                                <p className="text-xs text-slate-500 whitespace-pre-wrap">{settings.documentConfig.dadosBancarios}</p>
                            </div>
                          )}
                        </div>

                        {/* Totais */}
                        <div className="w-full md:w-80 space-y-3">
                          <div className="flex justify-between text-sm px-2">
                            <span className="text-slate-500 font-medium">Subtotal dos Itens</span>
                            <span className="font-bold text-slate-700">{fmt(selectedOrder.valor)}</span>
                          </div>
                          {settings.documentConfig.mostrarImpostos && (
                            <div className="flex justify-between text-sm px-2">
                              <span className="text-slate-500 font-medium">Total Impostos (IPI/ICMS)</span>
                              <span className="font-bold text-slate-700">{fmt(selectedOrder.valor * 0.12)}</span>
                            </div>
                          )}
                          <div 
                            className="flex justify-between p-5 rounded-2xl shadow-sm border" 
                            style={{ 
                                backgroundColor: settings.templateConfig.layout === "minimalista" ? "#f8fafc" : `${settings.templateConfig.primaryColor}10`,
                                borderColor: `${settings.templateConfig.primaryColor}20`
                            }}
                          >
                            <div className="flex flex-col justify-center">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Final</span>
                            </div>
                            <span className="font-black tracking-tighter text-3xl" style={{ color: settings.templateConfig.primaryColor }}>
                              {fmt(selectedOrder.valor)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Assinatura Digital / QR Code Simulado */}
                      <div className="pt-10 border-t flex items-center justify-between opacity-80">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-slate-100 rounded border flex items-center justify-center">
                                <Send className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="text-[10px] text-slate-400 max-w-xs uppercase font-medium">
                                Documento gerado eletronicamente em {new Date().toLocaleString("pt-BR")}.<br/>
                                Válido mediante assinatura eletrônica vinculada ao pedido no ERP.
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <p className="text-[11px] font-black text-slate-900">{settings.templateConfig.logoText}</p>
                            <p className="text-[10px] text-slate-400">{settings.templateConfig.empresaEmail}</p>
                        </div>
                      </div>
                      
                      {/* Rodapé fixo conforme config */}
                      {settings.templateConfig.textoRodape && (
                        <div className="text-[10px] text-slate-400 text-center leading-relaxed font-medium">
                          {settings.templateConfig.textoRodape}
                        </div>
                      )}
                    </div>
                  </div>
              </motion.div>
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
