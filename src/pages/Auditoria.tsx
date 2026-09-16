import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CalendarIcon, Search, Shield, UserCog, FileEdit, Trash2, LogIn, LogOut,
  CheckCircle2, XCircle, Eye, Download, Filter, RotateCcw,
} from "lucide-react";
import { getAuditLogs, subscribeAuditLogs, type EventType } from "@/lib/audit-store";

const eventConfig: Record<EventType, { label: string; icon: React.ElementType; color: string }> = {
  login:        { label: "Login",        icon: LogIn,        color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  logout:       { label: "Logout",       icon: LogOut,       color: "bg-muted text-muted-foreground" },
  criacao:      { label: "Criação",      icon: FileEdit,     color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  edicao:       { label: "Edição",       icon: UserCog,      color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  exclusao:     { label: "Exclusão",     icon: Trash2,       color: "bg-destructive/15 text-destructive" },
  aprovacao:    { label: "Aprovação",    icon: CheckCircle2, color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  rejeicao:     { label: "Rejeição",     icon: XCircle,      color: "bg-destructive/15 text-destructive" },
  visualizacao: { label: "Visualização", icon: Eye,          color: "bg-muted text-muted-foreground" },
};

export default function AuditoriaPage() {
  const [logs, setLogs] = useState(getAuditLogs);
  const [search, setSearch] = useState("");
  const [eventoFiltro, setEventoFiltro] = useState<string>("todos");
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>("todos");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();

  useEffect(() => {
    return subscribeAuditLogs(() => setLogs([...getAuditLogs()]));
  }, []);

  const usuarios = [...new Set(logs.map((l) => l.usuario))];

  const filteredLogs = logs
    .filter((log) => {
      if (search && !(log.descricao || "").toLowerCase().includes(search.toLowerCase()) && !(log.usuario || "").toLowerCase().includes(search.toLowerCase())) return false;
      if (eventoFiltro !== "todos" && log.evento !== eventoFiltro) return false;
      if (usuarioFiltro !== "todos" && log.usuario !== usuarioFiltro) return false;
      if (dataInicio && log.dataHora < dataInicio) return false;
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (log.dataHora > fim) return false;
      }
      return true;
    })
    .sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());

  const resetFilters = () => {
    setSearch("");
    setEventoFiltro("todos");
    setUsuarioFiltro("todos");
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  const today = new Date().toDateString();
  const kpis = {
    total: logs.length,
    hoje: logs.filter((l) => l.dataHora.toDateString() === today).length,
    criticos: logs.filter((l) => ["exclusao", "rejeicao"].includes(l.evento)).length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria do Sistema</h1>
          <p className="text-sm text-muted-foreground">Logs de auditoria e rastreabilidade de ações</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3"><Shield className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total de Registros</p><p className="text-2xl font-bold text-foreground">{kpis.total}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-blue-500/10 p-3"><CalendarIcon className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-sm text-muted-foreground">Ações Hoje</p><p className="text-2xl font-bold text-foreground">{kpis.hoje}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-destructive/10 p-3"><XCircle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-sm text-muted-foreground">Ações Críticas</p><p className="text-2xl font-bold text-foreground">{kpis.criticos}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Descrição ou usuário…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Tipo de Evento</label>
            <Select value={eventoFiltro} onValueChange={setEventoFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os eventos</SelectItem>
                {Object.entries(eventConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-muted-foreground mb-1 block">Usuário</label>
            <Select value={usuarioFiltro} onValueChange={setUsuarioFiltro}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {usuarios.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dataInicio && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataInicio ? format(dataInicio, "dd/MM/yyyy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Data Fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !dataFim && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataFim ? format(dataFim, "dd/MM/yyyy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Limpar
          </Button>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Data/Hora</TableHead>
                <TableHead className="w-[150px]">Usuário</TableHead>
                <TableHead className="w-[130px]">Evento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[130px]">Módulo</TableHead>
                <TableHead className="w-[130px]">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhum registro encontrado com os filtros aplicados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const cfg = eventConfig[log.evento];
                  const Icon = cfg.icon;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {format(log.dataHora, "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.usuario}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 font-normal", cfg.color)}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.descricao}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-normal">{log.modulo}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground text-center">Exibindo {filteredLogs.length} de {logs.length} registros</p>
    </motion.div>
  );
}
