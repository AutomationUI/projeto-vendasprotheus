import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankWebhookLog } from "@/types/banking";
import { bankingService } from "@/lib/api/banking-service";
import { useToast } from "@/hooks/use-toast";
import {
  Wifi,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Code2,
  Activity,
  Radio
} from "lucide-react";

export function BankWebhookLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<BankWebhookLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BankWebhookLog | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const l = await bankingService.getWebhookLogs();
      setLogs(l);
      if (l.length > 0) setSelectedLog(l[0]);
    } catch (err) {
      toast({ title: "Erro ao carregar logs de webhook", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabela de Eventos Recebidos */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
                <span>Stream de Notificações Webhook Open Banking</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Eventos em tempo real de Pix recebidos, liquidações de boleto e conciliação bancária.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="h-7 text-xs gap-1">
              <RefreshCw className="h-3 w-3" />
            </Button>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Instituição Bancária</th>
                    <th className="p-3">Evento</th>
                    <th className="p-3">HTTP Status</th>
                    <th className="p-3">Resultado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? "bg-primary/5 font-medium" : ""
                      }`}
                    >
                      <td className="p-3 font-mono text-[11px]">{log.timestamp}</td>
                      <td className="p-3 font-semibold">{log.banco}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {log.evento}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono font-bold">
                        <span className={log.statusHttp === 200 ? "text-emerald-600" : "text-rose-600"}>
                          {log.statusHttp}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.processadoSucesso ? (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Sucesso</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-rose-600">
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Falha</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Visualizador do Payload JSON */}
        <Card className="lg:col-span-1 shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Code2 className="h-5 w-5" />
              <CardTitle className="text-base font-bold">Detalhes da Requisição (Payload)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Corpo JSON recebido no endpoint seguro de webhook.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            {!selectedLog ? (
              <div className="p-4 text-center text-muted-foreground">
                Selecione um evento para inspecionar o payload.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 rounded bg-muted/40 text-[11px] space-y-1">
                  <p className="text-muted-foreground">Mensagem do Gateway:</p>
                  <p className="font-semibold text-foreground">{selectedLog.mensagem}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                    JSON Payload Recebido
                  </label>
                  <pre className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-64">
                    {selectedLog.payload}
                  </pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
