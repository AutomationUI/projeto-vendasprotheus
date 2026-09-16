import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, MapPin, LayoutList, LayoutGrid, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { type Customer } from "@/lib/mock-data";
import { customersService } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getActivityScore(ultimaCompra: string): { label: string; color: string; dot: string } {
  const days = Math.floor((Date.now() - new Date(ultimaCompra).getTime()) / 86400000);
  if (days <= 30)  return { label: "Quente",  color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",  dot: "bg-emerald-500" };
  if (days <= 90)  return { label: "Morno",   color: "bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800",   dot: "bg-amber-500"  };
  return               { label: "Frio",    color: "bg-sky-50    text-sky-700    border-sky-200    dark:bg-sky-900/20    dark:text-sky-400    dark:border-sky-800",     dot: "bg-sky-500"    };
}

function getInitials(name: string) {
  return (name || "").split(" ").map(n => n?.[0] || "").join("").slice(0, 2).toUpperCase();
}

const avatarColors = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-sky-500 to-cyan-600",
];

export default function ClientesPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "cards">("cards");
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const { user } = useAuth();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (location.pathname === "/clientes/new") {
      setEditingCustomer({
        razaoSocial: "",
        cnpj: "",
        email: "",
        telefone: "",
        cidade: "",
        uf: "",
        endereco: "",
        condicaoPagamento: "30 dias",
        totalCompras: 0,
        ultimaCompra: new Date().toISOString().slice(0, 10),
      });
      setFormOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    customersService.getAll()
      .then((r) => { if (active) setData(r?.data ?? []); })
      .catch(() => { if (active) setData([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = data.filter((c) => {
    // 1. Role-based isolation
    if (user?.role === "cliente") {
      // Cliente só vê a si mesmo
      if (c.razaoSocial !== user.nome) return false;
    } else if (user?.role === "representante") {
      // Representante só vê sua carteira (assumindo filtro por vendedor ou similar)
      // No mock, representantes tem carteira específica. Vamos simplificar filtrando se ele é o "vendedor"
      // (ajuste conforme a lógica de negócio real de vinculação cliente-rep)
      // if (c.vendedor !== user.nome) return false; 
    }

    // 2. Search filters
    return (
      (c.razaoSocial?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false) ||
      (c.cnpj?.includes(debouncedSearch) ?? false)
    );
  });

  const openNew = () => {
    setEditingCustomer({
      razaoSocial: "",
      cnpj: "",
      email: "",
      telefone: "",
      cidade: "",
      uf: "",
      endereco: "",
      condicaoPagamento: "30 dias",
      totalCompras: 0,
      ultimaCompra: new Date().toISOString().slice(0, 10),
    });
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer({ ...c });
    setFormOpen(true);
  };

  const saveCustomer = () => {
    if (!editingCustomer?.razaoSocial || !editingCustomer?.cnpj) {
      toast({ title: "Erro", description: "Razão Social e CNPJ são obrigatórios.", variant: "destructive" });
      return;
    }

    if (editingCustomer.id) {
      customersService.update(editingCustomer.id, editingCustomer).then((updated) => {
        setData(data.map((c) => (c.id === updated.id ? updated : c)));
        toast({ title: "Cliente atualizado", description: "As alterações foram salvas com sucesso." });
      }).catch(() => toast({ title: "Erro", description: "Falha ao atualizar cliente.", variant: "destructive" }));
    } else {
      customersService.create(editingCustomer as Omit<Customer, "id">).then((created) => {
        setData([created, ...data]);
        toast({ title: "Cliente cadastrado", description: "Novo cliente adicionado à carteira." });
      }).catch(() => toast({ title: "Erro", description: "Falha ao cadastrar cliente.", variant: "destructive" }));
    }
    setFormOpen(false);
    setEditingCustomer(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <PageHeader
        title="Leads & Clientes"
        subtitle="Cadastro e gestão da carteira de clientes"
        actions={
          <Button 
            onClick={openNew}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        }
      />

      <Card className="card-premium border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden h-9 shrink-0">
              <button
                onClick={() => setView("cards")}
                className={cn(
                  "px-3 flex items-center gap-1.5 text-xs font-medium transition-colors",
                  view === "cards" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Cards
              </button>
              <button
                onClick={() => setView("table")}
                className={cn(
                  "px-3 flex items-center gap-1.5 text-xs font-medium transition-colors",
                  view === "table" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutList className="h-3.5 w-3.5" /> Lista
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className={view === "table" ? "px-0 pt-0" : ""}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
          <AnimatePresence mode="wait">
            {view === "cards" ? (
              <motion.div
                key="cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filtered.map((c, i) => {
                  const score = getActivityScore(c.ultimaCompra);
                  const grad = avatarColors[i % avatarColors.length];
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      whileHover={{ y: -2 }}
                      className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                      onClick={() => openEdit(c)}
                    >
                      {/* Avatar + Score */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white font-bold text-sm shadow-md`}>
                          {getInitials(c.razaoSocial)}
                        </div>
                        <Badge variant="outline" className={cn("text-[11px] font-medium border px-2 py-0.5 rounded-full", score.color)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 inline-block", score.dot)} />
                          {score.label}
                        </Badge>
                      </div>

                      {/* Name + CNPJ */}
                      <p className="font-semibold text-foreground text-sm leading-tight truncate">{c.razaoSocial}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">{c.cnpj}</p>

                      {/* Info */}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>{c.cidade} — {c.uf}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{c.telefone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      </div>

                      {/* Total + Last Purchase */}
                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-muted-foreground">Total Compras</p>
                          <p className="text-sm font-bold text-foreground">{fmt(c.totalCompras)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-muted-foreground">Última compra</p>
                          <p className="text-xs font-medium text-foreground flex items-center gap-1 justify-end">
                            <Calendar className="h-3 w-3" />
                            {new Date(c.ultimaCompra).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                    Nenhum cliente encontrado
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead>Cond. Pag.</TableHead>
                      <TableHead className="text-right">Total Compras</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => {
                      const score = getActivityScore(c.ultimaCompra);
                      return (
                        <TableRow 
                          key={c.id} 
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => openEdit(c)}
                        >
                          <TableCell className="font-medium">{c.razaoSocial}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{c.cnpj}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <MapPin className="h-3 w-3" />
                              {c.cidade}/{c.uf}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{c.condicaoPagamento}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">{fmt(c.totalCompras)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[11px] font-medium border px-2 py-0.5 rounded-full", score.color)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full mr-1.5 inline-block", score.dot)} />
                              {score.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </CardContent>
      </Card>

      {/* ── Client Form Dialog ── */}
      <Dialog open={formOpen} onOpenChange={(open) => { if(!open) { setFormOpen(false); setEditingCustomer(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingCustomer?.id ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              Insira as informações básicas para cadastro do cliente na base Protheus.
            </DialogDescription>
          </DialogHeader>

          {editingCustomer && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social *</Label>
                  <Input 
                    value={editingCustomer.razaoSocial} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, razaoSocial: e.target.value})} 
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ *</Label>
                  <Input 
                    value={editingCustomer.cnpj} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, cnpj: e.target.value})} 
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input 
                    type="email"
                    value={editingCustomer.email} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})} 
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input 
                    value={editingCustomer.telefone} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, telefone: e.target.value})} 
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Cidade</Label>
                  <Input 
                    value={editingCustomer.cidade} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, cidade: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input 
                    maxLength={2}
                    value={editingCustomer.uf} 
                    onChange={(e) => setEditingCustomer({...editingCustomer, uf: e.target.value.toUpperCase()})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Condição de Pagamento Padrão</Label>
                <Select 
                  value={editingCustomer.condicaoPagamento} 
                  onValueChange={(v) => setEditingCustomer({...editingCustomer, condicaoPagamento: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["À vista", "30 dias", "30/60", "30/60/90", "30/60/90/120"].map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); setEditingCustomer(null); }}>
              Cancelar
            </Button>
            <Button onClick={saveCustomer}>
              {editingCustomer?.id ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
