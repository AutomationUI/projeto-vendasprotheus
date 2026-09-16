import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CnabBatch, BankCode, BankAccount } from "@/types/banking";
import { FinancialTitle } from "@/types/financial";
import { bankingService, BANK_INFO_MAP } from "@/lib/api/banking-service";
import { financialService } from "@/lib/api/financial-service";
import { useToast } from "@/hooks/use-toast";
import {
  FileCode,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Loader2,
  FileText,
  Layers,
  ArrowRight
} from "lucide-react";

interface CnabManagerProps {
  accounts: BankAccount[];
}

export function CnabManager({ accounts }: CnabManagerProps) {
  const { toast } = useToast();
  const [batches, setBatches] = useState<CnabBatch[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form states for Remessa export
  const [selectedBank, setSelectedBank] = useState<BankCode>("341");
  const [padraoCnab, setPadraoCnab] = useState<"CNAB240" | "CNAB400">("CNAB240");
  const [selectedTitleIds, setSelectedTitleIds] = useState<string[]>([]);

  // Form states for Retorno import
  const [retornoFileContent, setRetornoFileContent] = useState<string>("");
  const [retornoFileName, setRetornoFileName] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, tList] = await Promise.all([
        bankingService.getCnabBatches(),
        financialService.getTitles(),
      ]);
      setBatches(bList);
      // Filter pending/receber titles for remessa
      const available = tList.filter((t) => t.tipo === "receber" && t.status !== "pago");
      setTitles(available);
      if (available.length > 0) {
        setSelectedTitleIds(available.slice(0, 5).map((t) => t.id));
      }
    } catch (err) {
      toast({ title: "Erro ao carregar lotes CNAB", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAllTitles = () => {
    if (selectedTitleIds.length === titles.length) {
      setSelectedTitleIds([]);
    } else {
      setSelectedTitleIds(titles.map((t) => t.id));
    }
  };

  const handleToggleTitle = (id: string) => {
    if (selectedTitleIds.includes(id)) {
      setSelectedTitleIds(selectedTitleIds.filter((tId) => tId !== id));
    } else {
      setSelectedTitleIds([...selectedTitleIds, id]);
    }
  };

  const handleGenerateRemessa = async () => {
    if (selectedTitleIds.length === 0) {
      toast({ title: "Selecione pelo menos um título", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const batch = await bankingService.generateCnabRemessa(selectedBank, padraoCnab, selectedTitleIds);

      // Trigger automatic download of .REM file
      const element = document.createElement("a");
      const file = new Blob([batch.conteudoArquivo], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = batch.nomeArquivo;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      toast({
        title: "Arquivo de Remessa Gerado!",
        description: `Download do arquivo ${batch.nomeArquivo} com ${batch.quantidadeTitulos} títulos iniciado.`,
      });

      loadData();
    } catch (err) {
      toast({ title: "Erro ao gerar remessa CNAB", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRetornoFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      setRetornoFileContent(evt.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleProcessRetorno = async () => {
    if (!retornoFileContent) {
      toast({ title: "Selecione ou carregue um arquivo de retorno .RET", variant: "destructive" });
      return;
    }

    setProcessing(true);
    try {
      const res = await bankingService.processCnabRetorno(retornoFileContent, selectedBank);

      toast({
        title: "Retorno CNAB Processado!",
        description: `${res.titlesUpdated} títulos liquidados automaticamente no ERP. Total: R$ ${res.totalLiquidado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      });

      setRetornoFileContent("");
      setRetornoFileName("");
      loadData();
    } catch (err) {
      toast({ title: "Erro ao processar arquivo de retorno", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel 1: Gerar Arquivo de Remessa CNAB */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Download className="h-5 w-5" />
                <CardTitle className="text-base font-bold">Gerar Remessa CNAB (.REM)</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-muted font-mono">
                Envio ao Banco
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Selecione os títulos a receber para transmissão de cobrança bancária registrada.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Banco Emissor
                </label>
                <Select value={selectedBank} onValueChange={(v) => setSelectedBank(v as BankCode)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BANK_INFO_MAP).map(([code, info]) => (
                      <SelectItem key={code} value={code}>
                        {code} - {info.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                  Layout CNAB
                </label>
                <Select value={padraoCnab} onValueChange={(v) => setPadraoCnab(v as any)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNAB240">CNAB 240 (Padrão FEBRABAN)</SelectItem>
                    <SelectItem value="CNAB400">CNAB 400 (Tradicional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabela de seleção de títulos */}
            <div className="border rounded-lg overflow-hidden bg-background">
              <div className="p-2.5 bg-muted/50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTitleIds.length === titles.length && titles.length > 0}
                    onChange={handleSelectAllTitles}
                    className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span className="font-semibold text-foreground">
                    Títulos Disponíveis ({selectedTitleIds.length} de {titles.length} selecionados)
                  </span>
                </div>
                <span className="font-mono text-primary font-bold">
                  {formatCurrency(
                    titles.filter((t) => selectedTitleIds.includes(t.id)).reduce((acc, t) => acc + t.saldo, 0)
                  )}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto divide-y">
                {titles.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Nenhum título pendente para cobrança bancária.
                  </div>
                ) : (
                  titles.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTitle(t.id)}
                      className={`p-2.5 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors ${
                        selectedTitleIds.includes(t.id) ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={selectedTitleIds.includes(t.id)}
                          onChange={() => {}}
                          className="rounded border-muted-foreground/30 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <div className="truncate">
                          <p className="font-medium text-foreground truncate font-mono">
                            {t.prefixo}-{t.numero} | {t.clienteFornecedorNome}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Vencimento: {t.dataVencimento}</p>
                        </div>
                      </div>
                      <span className="font-semibold font-mono text-foreground text-right">
                        {formatCurrency(t.saldo)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerateRemessa}
              disabled={generating || selectedTitleIds.length === 0}
              className="w-full h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span>Gerar e Baixar Remessa {padraoCnab} (.REM)</span>
            </Button>
          </CardContent>
        </Card>

        {/* Painel 2: Processar Arquivo de Retorno CNAB */}
        <Card className="shadow-xs border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600">
                <Upload className="h-5 w-5" />
                <CardTitle className="text-base font-bold">Processar Retorno CNAB (.RET)</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-300">
                Baixa Automatizada
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Carregue o arquivo `.RET` recebido do banco para baixar títulos liquidados em lote.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Banco do Retorno
              </label>
              <Select value={selectedBank} onValueChange={(v) => setSelectedBank(v as BankCode)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BANK_INFO_MAP).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-emerald-500/50 transition-colors bg-muted/10">
              <input
                type="file"
                accept=".ret,.RET,.txt"
                id="file-retorno"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="file-retorno" className="cursor-pointer flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600">
                  <FileCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {retornoFileName ? retornoFileName : "Clique para selecionar o arquivo .RET"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Suporta arquivos de retorno CNAB240 e CNAB400 de qualquer instituição bancária.
                  </p>
                </div>
              </label>
            </div>

            {retornoFileName && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-200 text-emerald-800 text-[11px] flex items-center justify-between">
                <span className="font-mono">Arquivo pronto para processamento: {retornoFileName}</span>
                <Badge className="bg-emerald-600 text-white">Pronto</Badge>
              </div>
            )}

            <Button
              onClick={handleProcessRetorno}
              disabled={processing}
              className="w-full h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Executar Baixa Automatizada de Títulos</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Lotes Processados */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>Histórico de Lotes CNAB (Remessas & Retornos)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Registro auditável de transmissões bancárias e arquivos de retorno executados.
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
                  <th className="p-3">ID Lote / Arquivo</th>
                  <th className="p-3">Tipo / Padrão</th>
                  <th className="p-3">Instituição Bancária</th>
                  <th className="p-3">Data / Hora</th>
                  <th className="p-3">Qtde Títulos</th>
                  <th className="p-3">Valor Total</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="h-3.5 w-3.5 text-primary" />
                        <span>{b.nomeArquivo}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {b.tipo}
                        </Badge>
                        <span className="text-muted-foreground text-[10px] font-mono">{b.padrao}</span>
                      </div>
                    </td>
                    <td className="p-3">{b.bancoNome}</td>
                    <td className="p-3 font-mono">{b.dataGeracao}</td>
                    <td className="p-3 font-semibold">{b.quantidadeTitulos} títulos</td>
                    <td className="p-3 font-bold font-mono">{formatCurrency(b.valorTotal)}</td>
                    <td className="p-3">
                      {b.status === "Processado" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Processado</Badge>}
                      {b.status === "Transmitido" && <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Transmitido</Badge>}
                      {b.status === "Pendente" && <Badge className="bg-amber-500/15 text-amber-700 border-amber-200">Pendente</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary hover:bg-primary/10"
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([b.conteudoArquivo], { type: "text/plain" });
                          element.href = URL.createObjectURL(file);
                          element.download = b.nomeArquivo;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
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
