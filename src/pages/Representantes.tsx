import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users,
  Search,
  MapPin,
  Phone,
  Mail,
  Target,
  Percent,
  Briefcase,
  UserPlus,
  Eye,
  TrendingUp,
  Building2,
  Pencil,
} from "lucide-react";
import { MOCK_REPRESENTANTES, type Representante, type CarteiraCliente } from "@/lib/types-roles";
import { RepresentanteForm, type RepresentanteFormData } from "@/components/RepresentanteForm";
import { toast } from "sonner";

const statusColors: Record<CarteiraCliente["status"], string> = {
  Ativo: "bg-emerald-500/10 text-emerald-700 border-emerald-300/40",
  Inativo: "bg-muted text-muted-foreground border-border",
  Prospecto: "bg-blue-500/10 text-blue-700 border-blue-300/40",
};

function RepCard({
  rep,
  onView,
  onEdit,
}: {
  rep: Representante;
  onView: () => void;
  onEdit: () => void;
}) {
  const totalCarteira = rep.carteira.reduce((sum, c) => sum + c.totalCompras, 0);
  const metaPercent = Math.min(100, Math.round((totalCarteira / (rep.metaMensal * 12)) * 100));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {rep.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold truncate">{rep.nome}</h3>
                <Badge
                  variant="outline"
                  className={rep.ativo
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-300/40 text-[10px]"
                    : "bg-muted text-muted-foreground text-[10px]"
                  }
                >
                  {rep.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{rep.codigo} · {rep.regiao}</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold">{rep.carteira.length}</p>
              <p className="text-[10px] text-muted-foreground">Clientes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{rep.comissao}%</p>
              <p className="text-[10px] text-muted-foreground">Comissão</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">
                {(totalCarteira / 1000).toFixed(0)}k
              </p>
              <p className="text-[10px] text-muted-foreground">Vendas</p>
            </div>
          </div>

          {/* Meta progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Meta anual</span>
              <span className="font-medium">{metaPercent}%</span>
            </div>
            <Progress value={metaPercent} className="h-1.5" />
          </div>

          {/* Contact + Action */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{rep.telefone}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs gap-1">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button variant="ghost" size="sm" onClick={onView} className="text-xs gap-1">
                <Eye className="h-3.5 w-3.5" /> Carteira
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function RepresentantesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedRep, setSelectedRep] = useState<Representante | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representante | null>(null);

  const qTab = searchParams.get("tab");
  const initialTab = (qTab === "carteira" || qTab === "metas" || qTab === "comissoes") ? qTab : "equipe";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["equipe", "carteira", "metas", "comissoes"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val }, { replace: true });
  };

  const handleNewRep = () => {
    setEditingRep(null);
    setFormOpen(true);
  };

  const handleEditRep = (rep: Representante) => {
    setEditingRep(rep);
    setFormOpen(true);
  };

  const handleSave = (data: RepresentanteFormData) => {
    toast.success(editingRep ? `Representante "${data.nome}" atualizado.` : `Representante "${data.nome}" cadastrado.`);
  };

  const filtered = MOCK_REPRESENTANTES.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.nome.toLowerCase().includes(q) || r.codigo.toLowerCase().includes(q) || r.regiao.toLowerCase().includes(q);
  });

  // All clients flattened for Carteira view
  const allCarteiras = MOCK_REPRESENTANTES.flatMap((r) =>
    r.carteira.map((c) => ({ ...c, repNome: r.nome, repCodigo: r.codigo, repRegiao: r.regiao }))
  );

  const filteredCarteira = allCarteiras.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.razaoSocial.toLowerCase().includes(q) || c.cnpj.includes(q) || c.repNome.toLowerCase().includes(q) || c.cidade.toLowerCase().includes(q);
  });

  // Global stats
  const totalClientes = MOCK_REPRESENTANTES.reduce((s, r) => s + r.carteira.length, 0);
  const totalVendas = MOCK_REPRESENTANTES.reduce(
    (s, r) => s + r.carteira.reduce((cs, c) => cs + c.totalCompras, 0), 0
  );
  const ativos = MOCK_REPRESENTANTES.filter((r) => r.ativo).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Representantes & Força de Vendas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão de equipe comercial, carteira de clientes, metas e comissionamento
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleNewRep}>
          <UserPlus className="h-4 w-4" /> Novo Representante
        </Button>
      </div>

      {/* KPIs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { icon: Users, label: "Representantes", value: MOCK_REPRESENTANTES.length, color: "text-primary" },
          { icon: Users, label: "Ativos", value: ativos, color: "text-emerald-600" },
          { icon: Building2, label: "Clientes na carteira", value: totalClientes, color: "text-blue-600" },
          { icon: TrendingUp, label: "Vendas total", value: `R$ ${(totalVendas / 1000).toFixed(0)}k`, color: "text-primary" },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-1.5 border rounded-md bg-card px-3 py-1.5">
            <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
            <span className="text-sm font-bold">{k.value}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">{k.label}</span>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="equipe" className="gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" /> Força de Vendas & Equipe
          </TabsTrigger>
          <TabsTrigger value="carteira" className="gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" /> Carteira de Contas
          </TabsTrigger>
          <TabsTrigger value="metas" className="gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" /> Metas & Performance
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="gap-1.5 text-xs">
            <Percent className="h-3.5 w-3.5" /> Extrato de Comissões
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar representante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {/* TAB 1: EQUIPE */}
        <TabsContent value="equipe" className="m-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((rep) => (
              <RepCard key={rep.id} rep={rep} onView={() => setSelectedRep(rep)} onEdit={() => handleEditRep(rep)} />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center py-12 text-muted-foreground text-sm">
                Nenhum representante encontrado
              </p>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: CARTEIRA DE CONTAS */}
        <TabsContent value="carteira" className="m-0 space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente / Razão Social</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Representante Responsável</TableHead>
                    <TableHead className="text-right">Total Compras</TableHead>
                    <TableHead>Última Compra</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCarteira.map((c, i) => (
                    <TableRow key={c.clienteId + "-" + i}>
                      <TableCell className="font-medium text-sm">{c.razaoSocial}</TableCell>
                      <TableCell className="text-xs font-mono">{c.cnpj}</TableCell>
                      <TableCell className="text-sm">{c.cidade}/{c.uf}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-medium text-foreground">{c.repNome}</span>
                        <span className="text-xs text-muted-foreground ml-1 font-mono">({c.repCodigo})</span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums font-semibold">
                        R$ {c.totalCompras.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {new Date(c.ultimaCompra).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[c.status]}`}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCarteira.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum cliente de carteira encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: METAS & PERFORMANCE */}
        <TabsContent value="metas" className="m-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((rep) => {
              const totalVendasRep = rep.carteira.reduce((s, c) => s + c.totalCompras, 0);
              const metaAnual = rep.metaMensal * 12;
              const pctMeta = Math.round((totalVendasRep / metaAnual) * 100);
              return (
                <Card key={rep.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {rep.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{rep.nome}</h4>
                        <p className="text-xs text-muted-foreground">{rep.regiao} • Meta Mensal: R$ {rep.metaMensal.toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <Badge variant={pctMeta >= 80 ? "default" : "secondary"}>
                      {pctMeta}% atingido
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Realizado: R$ {totalVendasRep.toLocaleString("pt-BR")}</span>
                      <span>Meta Anual: R$ {metaAnual.toLocaleString("pt-BR")}</span>
                    </div>
                    <Progress value={Math.min(100, pctMeta)} className="h-2" />
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 4: EXTRATO DE COMISSÕES */}
        <TabsContent value="comissoes" className="m-0 space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Representante</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead className="text-center">Taxa Comissão (%)</TableHead>
                    <TableHead className="text-right">Volume de Vendas</TableHead>
                    <TableHead className="text-right">Comissão Calculada</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((rep) => {
                    const totalVendasRep = rep.carteira.reduce((s, c) => s + c.totalCompras, 0);
                    const comissaoTotal = totalVendasRep * (rep.comissao / 100);
                    return (
                      <TableRow key={rep.id}>
                        <TableCell className="font-medium text-sm">
                          <div>{rep.nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{rep.codigo}</div>
                        </TableCell>
                        <TableCell className="text-sm">{rep.regiao}</TableCell>
                        <TableCell className="text-center text-sm font-semibold text-primary">{rep.comissao}%</TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-mono">
                          R$ {totalVendasRep.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {comissaoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">
                            Liberado P/ Pagamento
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Carteira Dialog */}
      <Dialog open={!!selectedRep} onOpenChange={() => setSelectedRep(null)}>
        <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden">
          {selectedRep && (
            <>
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {selectedRep.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedRep.nome}
                  <Badge variant="outline" className="text-[10px] ml-1">{selectedRep.codigo}</Badge>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-3 text-xs mt-1">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedRep.regiao}</span>
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedRep.email}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedRep.telefone}</span>
                  <span className="flex items-center gap-1"><Target className="h-3 w-3" />Meta: R$ {selectedRep.metaMensal.toLocaleString("pt-BR")}/mês</span>
                  <span className="flex items-center gap-1"><Percent className="h-3 w-3" />Comissão: {selectedRep.comissao}%</span>
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Carteira de Clientes ({selectedRep.carteira.length})</h3>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <UserPlus className="h-3.5 w-3.5" /> Adicionar Cliente
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead className="text-right">Total Compras</TableHead>
                      <TableHead>Última Compra</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRep.carteira.map((c) => (
                      <TableRow key={c.clienteId}>
                        <TableCell className="font-medium text-sm">{c.razaoSocial}</TableCell>
                        <TableCell className="text-xs font-mono">{c.cnpj}</TableCell>
                        <TableCell className="text-sm">{c.cidade}/{c.uf}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          R$ {c.totalCompras.toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {new Date(c.ultimaCompra).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[c.status]}`}>
                            {c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <RepresentanteForm
        open={formOpen}
        onOpenChange={setFormOpen}
        representante={editingRep}
        onSave={handleSave}
      />
    </div>
  );
}
