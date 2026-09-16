import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, Clock, FileText, ShoppingCart, AlertTriangle, TrendingUp, DollarSign, Loader2, ArrowRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { cn } from "@/lib/utils";
import { approvalsService } from "@/lib/api/approvals-service";
import { localDB } from "@/lib/local-db";
import { useAuth } from "@/hooks/use-auth";
import type { ApprovalItem } from "@/lib/mock-data";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Urgency based on value
function getUrgency(valor: number) {
  if (valor >= 50000) return { label: "Alto", color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400", dot: "bg-rose-500" };
  if (valor >= 15000) return { label: "Médio", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400", dot: "bg-amber-500" };
  return { label: "Baixo", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400", dot: "bg-sky-500" };
}

export default function AprovacoesPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const urlStatus = searchParams.get("status")?.toLowerCase();
  const initialTab = urlStatus === "historico" ? "historico" : "pendentes";
  const [tab, setTab] = useState<"pendentes" | "historico">(initialTab);
  const [selected, setSelected] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<"aprovar" | "rejeitar" | null>(null);
  const [obs, setObs] = useState("");

  useEffect(() => {
    const status = searchParams.get("status")?.toLowerCase();
    if (status === "historico") {
      setTab("historico");
    } else if (status === "pendente") {
      setTab("pendentes");
    }
  }, [searchParams]);

  const loadApprovals = useCallback(async () => {
    try {
      const res = await approvalsService.getAll();
      setApprovals(res.data);
    } catch {
      setApprovals(localDB.getApprovals());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
    const handleSync = () => loadApprovals();
    window.addEventListener("approvalsChanged", handleSync);
    window.addEventListener("local-db-change", handleSync);
    window.addEventListener("mockDataChanged", handleSync);
    window.addEventListener("orderStatusChanged", handleSync);
    return () => {
      window.removeEventListener("approvalsChanged", handleSync);
      window.removeEventListener("local-db-change", handleSync);
      window.removeEventListener("mockDataChanged", handleSync);
      window.removeEventListener("orderStatusChanged", handleSync);
    };
  }, [loadApprovals]);

  const pendentes = approvals.filter((a) => a.status === "Pendente");
  const historico = approvals.filter((a) => a.status !== "Pendente");
  const aprovados = approvals.filter((a) => a.status === "Aprovado");
  const rejeitados = approvals.filter((a) => a.status === "Rejeitado");
  const valorPendente = pendentes.reduce((s, a) => s + a.valor, 0);

  const { user, hasPermission } = useAuth();
  const canApprove = user?.role === "admin" || hasPermission("aprovacoes", "approve") || hasPermission("pedidos", "approve");
  const canCancel = user?.role === "admin" || hasPermission("aprovacoes", "approve") || hasPermission("pedidos", "approve") || hasPermission("pedidos", "edit") || hasPermission("pedidos", "delete");

  const openAction = (item: ApprovalItem, action: "aprovar" | "rejeitar") => {
    if (action === "aprovar" && !canApprove) {
      toast({
        title: "Acesso Negado",
        description: "Seu perfil ou área não possui permissão para aprovar itens.",
        variant: "destructive",
      });
      return;
    }
    if (action === "rejeitar" && !canCancel) {
      toast({
        title: "Acesso Negado",
        description: "Seu perfil ou área não possui permissão para rejeitar ou cancelar itens.",
        variant: "destructive",
      });
      return;
    }
    setSelected(item);
    setActionType(action);
    setObs(item.observacaoAprovador || "");
  };

  const confirmAction = async () => {
    if (!selected || !actionType) return;
    setSubmitting(true);
    try {
      if (actionType === "aprovar") {
        const res = await approvalsService.approve(selected.id, obs);
        if (selected.tipo === "Pedido") {
          toast({
            title: "✅ Pedido Aprovado!",
            description: `Pedido ${selected.numero} aprovado com sucesso! Status atualizado para "Aprovado" em Pedidos.`,
          });
        } else {
          toast({
            title: "✅ Orçamento Aprovado!",
            description: `Orçamento ${selected.numero} aprovado! Gerado Pedido de Venda ${res.order?.numero || ""} com status "Aprovado".`,
          });
        }
      } else {
        await approvalsService.reject(selected.id, obs);
        toast({
          title: "❌ Item Rejeitado",
          description: `${selected.tipo} ${selected.numero} rejeitado. Status atualizado para ${selected.tipo === "Pedido" ? "Cancelado" : "Recusado"}.`,
        });
      }
      await loadApprovals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ocorreu um erro ao processar a ação.";
      toast({
        title: "Erro ao processar aprovação",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setSelected(null);
      setActionType(null);
      setObs("");
    }
  };

  const renderTable = (items: ApprovalItem[], showActions: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Urgência</TableHead>
          <TableHead>Motivo / Alçada Comercial</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="w-44 text-center">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const urg = getUrgency(item.valor);
          return (
            <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
              <TableCell>
                <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full w-fit border",
                  item.tipo === "Pedido" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                    : "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800")}>
                  {item.tipo === "Pedido" ? <ShoppingCart className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {item.tipo}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs font-semibold">{item.numero}</TableCell>
              <TableCell className="font-medium">{item.cliente}</TableCell>
              <TableCell className="text-muted-foreground">{item.vendedor}</TableCell>
              <TableCell className="text-right font-bold">{fmt(item.valor)}</TableCell>
              <TableCell>
                <span className={cn("flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border w-fit", urg.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", urg.dot)} />
                  {urg.label}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[200px]" title={item.motivo}>{item.motivo}</span>
                </div>
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status === "Pendente" ? "Pendente de Liberação Comercial" : item.status} />
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-1.5 justify-center">
                    {canApprove && (
                      <Button size="sm" className="h-7 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-1 shadow-sm" onClick={() => openAction(item, "aprovar")}>
                        <CheckCircle2 className="h-3 w-3" /> Aprovar
                      </Button>
                    )}
                    {canCancel && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1" onClick={() => openAction(item, "rejeitar")}>
                        <XCircle className="h-3 w-3" /> Rejeitar
                      </Button>
                    )}
                    {!canApprove && !canCancel && (
                      <span className="text-[11px] text-muted-foreground italic">Visualização restrita</span>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        })}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={showActions ? 9 : 8} className="text-center text-muted-foreground py-10">
              {tab === "pendentes" ? "🎉 Nenhum item pendente de aprovação!" : "Nenhum registro encontrado no histórico"}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <PageHeader
        title="Central de Aprovações"
        subtitle="Pendentes de Análise e histórico de alçadas para pedidos e orçamentos"
        actions={
          pendentes.length > 0 ? (
            <motion.div
              className="flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                {pendentes.length} Pendentes de Análise
              </span>
            </motion.div>
          ) : undefined
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Pendentes de Análise" value={pendentes.length.toString()} icon={Clock} gradient="warning" change={`${fmt(valorPendente)} em análise`} positive={false} delay={0} />
        <KpiCard title="Aprovados" value={aprovados.length.toString()} icon={CheckCircle2} gradient="success" change="Alçadas liberadas" positive={true} delay={0.07} />
        <KpiCard title="Rejeitados" value={rejeitados.length.toString()} icon={XCircle} gradient="brand" change="Reprovados / Cancelados" positive={false} delay={0.14} />
        <KpiCard title="Valor Total Pendente" value={fmt(valorPendente)} icon={DollarSign} gradient="brand" change="Volume financeiro retido" positive={true} delay={0.21} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as "pendentes" | "historico")}>
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-1.5" onClick={() => setTab("pendentes")}>
            <Clock className="h-3.5 w-3.5" />
            Pendentes
            {pendentes.length > 0 && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendentes.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5" onClick={() => setTab("historico")}>
            <TrendingUp className="h-3.5 w-3.5" />
            Histórico ({historico.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          <Card className="card-premium border-0">
            <CardContent className="px-0 pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderTable(pendentes, true)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="card-premium border-0">
            <CardContent className="px-0 pt-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderTable(historico, false)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={!!actionType && !!selected} onOpenChange={() => { if (!submitting) { setActionType(null); setSelected(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", actionType === "aprovar" ? "text-emerald-600" : "text-destructive")}>
              {actionType === "aprovar" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {actionType === "aprovar" ? "Aprovar" : "Rejeitar"} {selected?.tipo} {selected?.numero}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/60 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Cliente</p><p className="font-semibold">{selected.cliente}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Valor</p><p className="font-bold text-lg">{fmt(selected.valor)}</p></div>
                <div className="col-span-2"><p className="text-[11px] text-muted-foreground">Motivo da alçada</p><p className="font-medium text-amber-800 dark:text-amber-300">{selected.motivo}</p></div>
              </div>

              {actionType === "aprovar" && selected.tipo === "Orçamento" && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
                  <span>Ao aprovar este orçamento, ele será automaticamente convertido em um <strong>Pedido de Venda</strong> com status <strong>Aprovado</strong>.</span>
                </div>
              )}

              {actionType === "aprovar" && selected.tipo === "Pedido" && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>O status do pedido será atualizado para <strong>Aprovado</strong>, liberando-o para faturamento e produção.</span>
                </div>
              )}

              <div className="space-y-1.5">
                <p className="text-sm font-semibold">Observação do Aprovador <span className="text-muted-foreground font-normal">(opcional)</span></p>
                <Textarea placeholder="Adicione uma justificativa ou observação para o histórico de auditoria..." value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={submitting} onClick={() => { setActionType(null); setSelected(null); }}>Cancelar</Button>
                <Button onClick={confirmAction} disabled={submitting}
                  className={actionType === "aprovar"
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 gap-2"
                    : "bg-destructive hover:bg-destructive/90 gap-2"}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : actionType === "aprovar" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {actionType === "aprovar" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

