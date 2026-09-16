import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankAccount } from "@/types/banking";
import { bankingService } from "@/lib/api/banking-service";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  RefreshCw,
  Plus,
  QrCode,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Trash2,
  ExternalLink,
  Wifi,
  Loader2
} from "lucide-react";

interface BankAccountsListProps {
  accounts: BankAccount[];
  onRefresh: () => void;
  onOpenNewModal: () => void;
}

export function BankAccountsList({ accounts, onRefresh, onOpenNewModal }: BankAccountsListProps) {
  const { toast } = useToast();
  const [testingId, setTestingId] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  const handleTestConnection = async (acc: BankAccount) => {
    setTestingId(acc.id);
    try {
      const res = await bankingService.testBankConnection(acc.id);
      if (res.success) {
        toast({
          title: "Conexão Bancária OK!",
          description: `${res.message} (Latência: ${res.latencyMs}ms)`,
        });
      } else {
        toast({
          title: "Falha na Conexão Bancária",
          description: res.message,
          variant: "destructive",
        });
      }
      onRefresh();
    } catch (err: any) {
      toast({
        title: "Erro ao testar conexão",
        description: err.message || "Servidor bancário indisponível.",
        variant: "destructive",
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (acc: BankAccount) => {
    if (!confirm(`Deseja realmente remover o conector bancário do ${acc.bancoNome}?`)) return;
    try {
      await bankingService.deleteBankAccount(acc.id);
      toast({ title: "Conta Removida", description: `Conector do ${acc.bancoNome} removido.` });
      onRefresh();
    } catch (err) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const totalSaldo = accounts.reduce((sum, a) => sum + a.saldoAtual, 0);

  return (
    <div className="space-y-4">
      {/* Resumo Consolidado Bancário */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-900/10 via-background to-background border-blue-200/50 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Saldo Consolidado Total</p>
                <h3 className="text-xl font-bold text-blue-900 dark:text-blue-300 mt-1">
                  {formatCurrency(totalSaldo)}
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Building2 className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>{accounts.length} contas bancárias integradas</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/10 via-background to-background border-emerald-200/50 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Open Banking API Direct</p>
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                  {accounts.filter((a) => a.status === "Ativa").length} / {accounts.length} Ativas
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Wifi className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span>Criptografia mTLS & OAuth 2.0 ativas</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/10 via-background to-background border-amber-200/50 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Arquivos CNAB 240 / 400</p>
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-1">
                  Conveniada
                </h3>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <FileCode className="h-6 w-6" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500" />
              <span>Lotes de remessa/retorno habilitados</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Contas Bancárias */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span>Contas Bancárias e Conectores Open Banking</span>
          <Badge variant="outline" className="text-[10px] font-mono">
            {accounts.length} Instituições
          </Badge>
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} className="h-8 text-xs gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar Saldos
          </Button>
          <Button size="sm" onClick={onOpenNewModal} className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Nova Conta Bancária
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <Card key={acc.id} className="shadow-xs hover:border-primary/40 transition-all border-border/80">
            <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted">
                    {acc.bancoCodigo}
                  </span>
                  <CardTitle className="text-sm font-bold text-foreground">{acc.bancoNome}</CardTitle>
                </div>
                <CardDescription className="text-xs text-muted-foreground font-mono">
                  Ag: {acc.agencia}{acc.agenciaDigito ? `-${acc.agenciaDigito}` : ""} | C/C: {acc.conta}-{acc.contaDigito} ({acc.tipoConta})
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                {acc.status === "Ativa" && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200">
                    Online
                  </Badge>
                )}
                {acc.status === "Em Homologação" && (
                  <Badge className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-200">
                    Sandbox
                  </Badge>
                )}
                {acc.status === "Inativa" && (
                  <Badge variant="secondary">Inativa</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Saldo Atual em Conta</span>
                  <span className="text-base font-bold text-foreground font-mono">
                    {formatCurrency(acc.saldoAtual)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Saldo Conciliado</span>
                  <span className="text-xs font-semibold text-emerald-600 font-mono">
                    {formatCurrency(acc.saldoConciliado)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <KeyRound className="h-3 w-3 text-amber-600" />
                  <span>Convênio: <strong className="text-foreground font-mono">{acc.convenioCnab || "N/A"}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <FileCode className="h-3 w-3 text-blue-600" />
                  <span>Carteira: <strong className="text-foreground font-mono">{acc.carteiraCnab || "N/A"}</strong></span>
                </div>
                <div className="flex items-center gap-1 col-span-2 truncate">
                  <QrCode className="h-3 w-3 text-purple-600" />
                  <span>Chave Pix: <strong className="text-foreground truncate">{acc.chavePix || "Não informada"}</strong></span>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Sincronizado: {acc.dataUltimaSincronizacao}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1"
                    onClick={() => handleTestConnection(acc)}
                    disabled={testingId === acc.id}
                  >
                    {testingId === acc.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : (
                      <Wifi className="h-3 w-3 text-emerald-600" />
                    )}
                    <span>Testar API</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleDelete(acc)}
                    title="Excluir Conector"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
