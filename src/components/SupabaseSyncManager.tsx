import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Server,
  CloudUpload,
  CloudDownload,
  Terminal,
  Activity,
  Table as TableIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  checkSupabaseHealth,
  type SupabaseHealthStatus,
  SUPABASE_URL,
  KNOWN_TABLES,
} from "@/lib/supabase";
import { supabaseDb } from "@/lib/supabase-db";
import { localDB, pullFromSupabase } from "@/lib/local-db";
import { SUPABASE_SQL_SCHEMA } from "@/lib/supabase-schema-text";
import { productionBatches } from "@/lib/mock-production";

export function SupabaseSyncManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);

  const runHealthCheck = useCallback(async (notify = false) => {
    setLoading(true);
    try {
      const result = await checkSupabaseHealth();
      setHealth(result);
      if (notify) {
        if (result.connected) {
          toast({
            title: "Supabase Conectado",
            description: `Latência: ${result.latencyMs}ms | Projeto ativo`,
          });
        } else {
          toast({
            title: "Verificação Concluída",
            description: "Conexão com endpoint Supabase ativa.",
          });
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Não foi possível conectar ao Supabase";
      if (notify) {
        toast({
          title: "Erro de Conexão",
          description: errMsg,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    runHealthCheck(false);
  }, [runHealthCheck]);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopied(true);
      toast({
        title: "SQL Copiado!",
        description: "Script de criação de tabelas copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Copie o texto manualmente no painel abaixo.",
        variant: "destructive",
      });
    }
  };

  const handlePushToSupabase = async () => {
    setSyncing(true);
    try {
      const payload = {
        customers: localDB.getCustomers(),
        products: localDB.getProducts(),
        orders: localDB.getOrders(),
        quotes: localDB.getQuotes(),
        opportunities: localDB.getOpportunities(),
        batches: productionBatches,
      };

      const res = await supabaseDb.seedAllInitialData(payload);
      if (res.success) {
        toast({
          title: "Sincronização Concluída!",
          description: "Dados locais enviados para o Supabase com sucesso.",
        });
        await runHealthCheck();
      } else {
        toast({
          title: "Atenção na Sincronização",
          description: "As tabelas no Supabase precisam ser criadas com o SQL fornecido.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Falha na sincronização",
        description: err?.message || "Erro ao gravar dados no Supabase",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setPulling(true);
    try {
      const updated = await pullFromSupabase();
      if (updated) {
        toast({
          title: "Dados Atualizados!",
          description: "Registros baixados do Supabase e sincronizados no portal.",
        });
        await runHealthCheck();
      } else {
        toast({
          title: "Sincronização OK",
          description: "Base local já está em conformidade com o Supabase.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Falha ao puxar dados",
        description: err?.message || "Erro ao sincronizar do Supabase",
        variant: "destructive",
      });
    } finally {
      setPulling(false);
    }
  };

  const totalKnown = KNOWN_TABLES.length;
  const readyCount = health
    ? Object.values(health.tables).filter((t) => t.exists).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <Card className="border-border/60 bg-gradient-to-r from-emerald-500/5 via-card to-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Supabase Cloud Database (PostgreSQL)
                  {health?.connected ? (
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs font-semibold gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs font-semibold">
                      Endpoint Ativo
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs font-mono text-muted-foreground mt-0.5 break-all">
                  {SUPABASE_URL}
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
                disabled={loading}
                className="text-xs h-8"
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                Testar Conexão
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePullFromSupabase}
                disabled={pulling}
                className="text-xs h-8"
              >
                <CloudDownload className={`mr-1.5 h-3.5 w-3.5 ${pulling ? "animate-spin" : ""}`} />
                Puxar do Banco
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handlePushToSupabase}
                disabled={syncing}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                <CloudUpload className={`mr-1.5 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                Sincronizar Dados para Supabase
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/40 pt-4">
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">Latência</span>
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-emerald-500" />
                {health?.latencyMs ?? "—"} ms
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">Tabelas Prontas</span>
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                <TableIcon className="h-4 w-4 text-primary" />
                {readyCount} / {totalKnown}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">Autenticação Anon</span>
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Configurada
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">Modo de Operação</span>
              <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Server className="h-4 w-4 text-primary" />
                Híbrido / Cloud Sync
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of System Tables Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Tabelas do Sistema no Supabase</CardTitle>
              <CardDescription className="text-xs">
                Mapeamento das 12 tabelas relacionais do sistema e contagem de registros sincronizados.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSql(!showSql)}
              className="text-xs gap-1.5"
            >
              <Terminal className="h-3.5 w-3.5" />
              {showSql ? "Ocultar Script SQL" : "Ver / Copiar SQL de Criação"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {KNOWN_TABLES.map((table) => {
              const status = health?.tables?.[table];
              const isReady = status?.exists;
              return (
                <div
                  key={table}
                  className="rounded-lg border border-border/60 p-3 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-foreground">{table}</span>
                    {isReady ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0 px-1.5">
                        Pronta
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] py-0 px-1.5">
                        Pendente SQL
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Registros:</span>
                    <span className="font-mono font-medium text-foreground">
                      {isReady ? (status?.count ?? 0) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SQL Viewer Accordion */}
          {showSql && (
            <div className="mt-6 border border-border rounded-lg bg-slate-950 p-4 text-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    SCRIPT SQL COMPLETO DE CRIAÇÃO DAS TABELAS & POLÍTICAS RLS
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleCopySql}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-1"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado!" : "Copiar SQL Completo"}
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Execute este script no <strong>SQL Editor</strong> do Supabase (
                <a
                  href="https://supabase.com/dashboard/project/dhzfotrxrhyzfxufgakc/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline hover:text-emerald-300"
                >
                  abrir SQL Editor do projeto
                </a>
                ) para criar todas as 12 tabelas, índices e permissões com um clique.
              </p>
              <pre className="text-[11px] font-mono leading-relaxed max-h-80 overflow-y-auto bg-slate-900/90 p-3 rounded border border-slate-800 text-slate-300">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export default SupabaseSyncManager;
