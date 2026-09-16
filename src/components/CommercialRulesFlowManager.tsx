import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GitBranch,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Zap,
  Play,
  Scale,
  ShieldCheck,
  TrendingDown,
  Layers,
  Sparkles,
  DollarSign
} from "lucide-react";
import {
  COMMERCIAL_FLOWS,
  evaluateCommercialRules,
  CommercialEvaluationResult
} from "@/lib/sales-flow-engine";
import { AppSettings } from "@/lib/settings-store";
import { useToast } from "@/hooks/use-toast";

interface CommercialRulesFlowManagerProps {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  onSave: () => void;
}

export function CommercialRulesFlowManager({
  settings,
  updateSettings,
  onSave
}: CommercialRulesFlowManagerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const regras = settings.regrasVenda;

  // Simulator local state
  const [simValorPedido, setSimValorPedido] = useState<number>(45000);
  const [simDesconto, setSimDesconto] = useState<number>(12);
  const [simMargem, setSimMargem] = useState<number>(28);

  // Evaluate simulation in real-time
  const simResult: CommercialEvaluationResult = evaluateCommercialRules(
    {
      total: simValorPedido * (1 - simDesconto / 100),
      subtotal: simValorPedido,
      descontoPercentual: simDesconto,
      descontoValor: simValorPedido * (simDesconto / 100),
      margemPercentual: simMargem,
    },
    regras
  );

  const isSimulating = false; // Could be tied to a hook

  const activeFlow = COMMERCIAL_FLOWS.find((f) => f.id === (regras.flowId || "discount-approval")) || COMMERCIAL_FLOWS[0];

  const handleFlowSelect = (flowId: string) => {
    const selected = COMMERCIAL_FLOWS.find((f) => f.id === flowId);
    updateSettings({
      regrasVenda: {
        ...regras,
        flowId,
        flowName: selected?.name
      }
    });
    toast({
      title: "Fluxo Comercial Vinculado",
      description: `As regras de cálculo agora utilizam a esteira "${selected?.name}".`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner Flow Studio Connection */}
      <Card className="border-indigo-200 dark:border-indigo-900 bg-gradient-to-r from-indigo-50/70 via-white to-blue-50/70 dark:from-indigo-950/30 dark:via-background dark:to-blue-950/30 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/20">
                <GitBranch className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  Motor de Regras Comerciais & Flow Studio
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Conectado ao Flow Engine
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Os cálculos de orçamentos, propostas e pedidos executam dinamicamente a esteira visual do Flow Studio.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/crm-flow")}
              className="border-indigo-300 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir no Flow Studio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg bg-background/80 border text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">Workflow Ativo:</span>
                <p className="font-semibold text-foreground truncate">{activeFlow.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">Versão em Produção:</span>
                <p className="font-semibold text-foreground">{activeFlow.version} (Homologado)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <span className="text-muted-foreground">Governança Comercial:</span>
                <p className="font-semibold text-foreground">Auditoria & Alçadas 100% Ativas</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Configurações Globais vs Simulador Interativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Parametrização das Regras e Alçadas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                Workflow Comercial Selecionado
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione o fluxo do Flow Studio que governará as regras de cálculo, descontos e validações.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Esteira de Decisão Oficial
                </Label>
                <Select value={regras.flowId || "discount-approval"} onValueChange={handleFlowSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o fluxo comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMERCIAL_FLOWS.map((flow) => (
                      <SelectItem key={flow.id} value={flow.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{flow.name}</span>
                          <span className="text-xs text-muted-foreground">({flow.category} - {flow.version})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {activeFlow.description}
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5" />
                  Escalonamento de Alçadas de Desconto
                </h4>

                {/* Desconto Vendedor (Auto) */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <div>
                    <p className="text-sm font-medium">Alçada do Vendedor (Auto-Aprovado)</p>
                    <p className="text-xs text-muted-foreground">
                      Desconto máximo que o representante aplica sem necessidade de aprovação
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      className="w-20 text-right font-medium"
                      value={regras.descontoMaximoSemAprovacao ?? 8}
                      onChange={(e) =>
                        updateSettings({
                          regrasVenda: {
                            ...regras,
                            descontoMaximoSemAprovacao: Number(e.target.value)
                          }
                        })
                      }
                    />
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Desconto Gerência Regional */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <div>
                    <p className="text-sm font-medium">Alçada da Gerência Comercial</p>
                    <p className="text-xs text-muted-foreground">
                      Teto de desconto que a Gerência Regional pode deliberar
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      className="w-20 text-right font-medium"
                      value={regras.alçadaGerenciaDesconto ?? 15}
                      onChange={(e) =>
                        updateSettings({
                          regrasVenda: {
                            ...regras,
                            alçadaGerenciaDesconto: Number(e.target.value)
                          }
                        })
                      }
                    />
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Margem Mínima de Contribuição */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      Piso de Margem de Contribuição Líquida
                      <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 border-amber-300">
                        Governança
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Abaixo deste percentual, o pedido é travado para parecer da Diretoria
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      className="w-20 text-right font-medium"
                      value={regras.margemMinimaContribuicao ?? 25}
                      onChange={(e) =>
                        updateSettings({
                          regrasVenda: {
                            ...regras,
                            margemMinimaContribuicao: Number(e.target.value)
                          }
                        })
                      }
                    />
                    <span className="text-xs font-semibold text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Valor Alto / Alçada Obrigatória */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <div>
                    <p className="text-sm font-medium">Aprovação Obrigatória por Volume</p>
                    <p className="text-xs text-muted-foreground">
                      Pedidos com valor total líquido acima deste montante exigem aprovação
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      className="w-28 text-right font-medium"
                      value={regras.valorAprovacaoObrigatoria ?? 50000}
                      onChange={(e) =>
                        updateSettings({
                          regrasVenda: {
                            ...regras,
                            valorAprovacaoObrigatoria: Number(e.target.value)
                          }
                        })
                      }
                    />
                  </div>
                </div>

                {/* Bloqueio por Estoque */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <div>
                    <p className="text-sm font-medium">Bloquear Venda Sem Estoque</p>
                    <p className="text-xs text-muted-foreground">
                      Impede a confirmação do pedido se o saldo do produto no Protheus for zero
                    </p>
                  </div>
                  <Switch
                    checked={regras.bloquearVendaSemEstoque ?? true}
                    onCheckedChange={(v) =>
                      updateSettings({
                        regrasVenda: {
                          ...regras,
                          bloquearVendaSemEstoque: v
                        }
                      })
                    }
                  />
                </div>

                {/* Notificação no WhatsApp do Aprovador */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border">
                  <div>
                    <p className="text-sm font-medium">Disparo de Alerta no WhatsApp do Aprovador</p>
                    <p className="text-xs text-muted-foreground">
                      Notifica imediatamente o Gerente ou Diretor no momento em que o pedido é retido
                    </p>
                  </div>
                  <Switch
                    checked={regras.notificarWhatsAppAprovador ?? true}
                    onCheckedChange={(v) =>
                      updateSettings({
                        regrasVenda: {
                          ...regras,
                          notificarWhatsAppAprovador: v
                        }
                      })
                    }
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button onClick={onSave} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar Regras & Atualizar Motor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna 2: Simulador em Tempo Real do Motor Flow Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-indigo-200 dark:border-indigo-900/60 shadow-md">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/20 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                  <CardTitle className="text-base">Simulador de Regras em Tempo Real</CardTitle>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs">
                  Live Flow
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Altere os valores de teste para visualizar exatamente qual nó do Flow Studio será acionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Inputs de Simulação */}
              <div className="space-y-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Valor Bruto da Venda:</span>
                    <span className="font-semibold">R$ {simValorPedido.toLocaleString("pt-BR")}</span>
                  </div>
                  <Input
                    type="number"
                    value={simValorPedido}
                    onChange={(e) => setSimValorPedido(Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Desconto Solicitado (%):</span>
                    <span className="font-semibold text-indigo-600">{simDesconto}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="30"
                      step="0.5"
                      value={simDesconto}
                      onChange={(e) => setSimDesconto(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <Input
                      type="number"
                      value={simDesconto}
                      onChange={(e) => setSimDesconto(Number(e.target.value))}
                      className="h-8 w-16 text-right text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Margem de Contribuição (%):</span>
                    <span className="font-semibold text-emerald-600">{simMargem}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={simMargem}
                      onChange={(e) => setSimMargem(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <Input
                      type="number"
                      value={simMargem}
                      onChange={(e) => setSimMargem(Number(e.target.value))}
                      className="h-8 w-16 text-right text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Resultado da Avaliação do Motor */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  simResult.nivelAprovacao === "Auto-Aprovado"
                    ? "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800"
                    : simResult.nivelAprovacao === "Gerência Comercial"
                    ? "bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800"
                    : "bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {simResult.nivelAprovacao === "Auto-Aprovado" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">
                        Decisão da Esteira
                      </span>
                      <h4 className="font-semibold text-sm">
                        {simResult.nivelAprovacao}
                      </h4>
                    </div>
                  </div>
                  <Badge
                    variant={simResult.aprovadoAutomatico ? "default" : "destructive"}
                    className="text-[11px]"
                  >
                    {simResult.aprovadoAutomatico ? "Liberação Instantânea" : "Pendente de Liberação Comercial"}
                  </Badge>
                </div>

                <p className="text-xs text-foreground/80 mt-1 leading-relaxed">
                  {simResult.motivoPrincipal}
                </p>

                {simResult.sugestaoAjuste && (
                  <div className="mt-2.5 p-2 rounded bg-background/80 border text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>{simResult.sugestaoAjuste}</span>
                  </div>
                )}
              </div>

              {/* Trilha do Workflow Acionado */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border space-y-2 text-xs">
                <span className="font-semibold text-muted-foreground block text-[11px] uppercase tracking-wider">
                  Trilha do Grafo Executado (Nós do Flow Studio)
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {simResult.flowExecutado.caminhoExecutado.map((nodeId, idx) => (
                    <div key={nodeId} className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 font-mono text-[10px]">
                        #{nodeId}
                      </span>
                      {idx < simResult.flowExecutado.caminhoExecutado.length - 1 && (
                        <span className="text-muted-foreground">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
