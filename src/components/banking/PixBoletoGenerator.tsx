import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PixBoletoRecord, BankAccount } from "@/types/banking";
import { FinancialTitle } from "@/types/financial";
import { bankingService } from "@/lib/api/banking-service";
import { financialService } from "@/lib/api/financial-service";
import { printElement } from "@/lib/print-utils";
import { useToast } from "@/hooks/use-toast";
import {
  QrCode,
  Copy,
  Check,
  Printer,
  Zap,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Loader2,
  FileText,
  DollarSign,
  Sparkles
} from "lucide-react";

interface PixBoletoGeneratorProps {
  accounts: BankAccount[];
}

export function PixBoletoGenerator({ accounts }: PixBoletoGeneratorProps) {
  const { toast } = useToast();
  const [records, setRecords] = useState<PixBoletoRecord[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form states
  const [selectedTitleId, setSelectedTitleId] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || "");
  const [selectedRecord, setSelectedRecord] = useState<PixBoletoRecord | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pbList, tList] = await Promise.all([
        bankingService.getPixBoletos(),
        financialService.getTitles(),
      ]);
      setRecords(pbList);
      const available = tList.filter((t) => t.tipo === "receber");
      setTitles(available);
      if (available.length > 0) setSelectedTitleId(available[0].id);
      if (pbList.length > 0) setSelectedRecord(pbList[0]);
    } catch (err) {
      toast({ title: "Erro ao carregar dados de Pix/Boleto", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTitleId) {
      toast({ title: "Selecione um título financeiro", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const rec = await bankingService.generatePixBoleto(selectedTitleId, selectedAccountId);
      toast({
        title: "Boleto Híbrido com Pix Gerado!",
        description: `QR Code Pix e Linha Digitável gerados para ${rec.clienteNome}.`,
      });
      setSelectedRecord(rec);
      loadData();
    } catch (err) {
      toast({ title: "Erro ao gerar Boleto Pix", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyPix = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Pix Copia e Cola Copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Emissão de Boleto Híbrido + Pix */}
        <Card className="lg:col-span-1 shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-bold">Emitir Boleto Híbrido (Pix + Código)</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Gera em tempo real o QR Code Pix dinâmico e a linha digitável via API bancária.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Conta Bancária Emissora
              </label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bancoCodigo} - {acc.bancoNome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Título a Receber (SE1)
              </label>
              <Select value={selectedTitleId} onValueChange={setSelectedTitleId}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {titles.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.prefixo}-{t.numero} | {t.clienteFornecedorNome} ({formatCurrency(t.saldo)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full h-9 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>Emitir Pix & Boleto Híbrido</span>
            </Button>
          </CardContent>
        </Card>

        {/* Visualizador do Boleto e QR Code Selecionado */}
        <Card className="lg:col-span-2 shadow-xs border-border/80">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">Visualização do Instrumento de Cobrança</CardTitle>
                <CardDescription className="text-xs">
                  Boleto bancário com QR Code do Pix acoplado para liquidação instantânea.
                </CardDescription>
              </div>
            </div>
            {selectedRecord && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => printElement("printable-boleto", `Boleto_${selectedRecord?.id}`)}
                className="h-8 text-xs gap-1"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Boleto
              </Button>
            )}
          </CardHeader>

          <CardContent className="text-xs">
            {!selectedRecord ? (
              <div className="p-8 text-center text-muted-foreground">
                Selecione ou emita um Boleto para visualizar a cobrança.
              </div>
            ) : (
              <div id="printable-boleto" className="printable-area border rounded-xl p-4 bg-background space-y-4 shadow-2xs">
                {/* Cabecalho do Boleto */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono px-2 py-0.5 rounded bg-muted">
                      {selectedRecord.bancoEmissor.substring(0, 15)}
                    </span>
                    <span className="text-sm font-semibold font-mono">{selectedRecord.linhaDigitavel}</span>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                    {selectedRecord.status}
                  </Badge>
                </div>

                {/* Grid do QR Code Pix + Dados do Sacado */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  {/* Bloco QR Code */}
                  <div className="flex flex-col items-center justify-center p-3 rounded-lg border bg-muted/20 text-center">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" /> Pague com Pix (Instantâneo)
                    </span>
                    <img
                      src={selectedRecord.qrCodeBase64}
                      alt="QR Code Pix"
                      className="w-28 h-28 border p-1 rounded bg-white shadow-2xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyPix(selectedRecord.pixCopiaECola, selectedRecord.id)}
                      className="mt-2 text-[10px] h-7 gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      {copiedId === selectedRecord.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>Pix Copia e Cola</span>
                    </Button>
                  </div>

                  {/* Bloco de Informações da Cobrança */}
                  <div className="md:col-span-2 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Sacado / Cliente</span>
                        <span className="font-bold text-foreground text-xs">{selectedRecord.clienteNome}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Valor do Título</span>
                        <span className="font-bold text-primary text-sm font-mono">{formatCurrency(selectedRecord.valor)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block">Nosso Número</span>
                        <span className="font-mono font-medium">{selectedRecord.nossoNumero}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Data de Emissão</span>
                        <span className="font-mono font-medium">{selectedRecord.dataEmissao}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Vencimento</span>
                        <span className="font-mono font-bold text-amber-600">{selectedRecord.dataVencimento}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block mb-0.5">TxID Pix Open Banking</span>
                      <Input value={selectedRecord.txidPix} readOnly className="h-7 text-[10px] font-mono bg-muted" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Boletos Emitidos */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Boletos e Cobranças Pix Geradas</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Lista de registros ativos com acompanhamento de liquidação Pix via Webhook.
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
                  <th className="p-3">Título / Nosso Nº</th>
                  <th className="p-3">Cliente Sacado</th>
                  <th className="p-3">Banco Emissor</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className={`hover:bg-muted/30 cursor-pointer transition-colors ${
                      selectedRecord?.id === r.id ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <td className="p-3 font-mono">
                      <p className="font-bold text-primary">{r.tituloNumero}</p>
                      <p className="text-[10px] text-muted-foreground">{r.nossoNumero}</p>
                    </td>
                    <td className="p-3">{r.clienteNome}</td>
                    <td className="p-3">{r.bancoEmissor}</td>
                    <td className="p-3 font-mono">{r.dataVencimento}</td>
                    <td className="p-3 font-bold font-mono">{formatCurrency(r.valor)}</td>
                    <td className="p-3">
                      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                      >
                        Visualizar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
