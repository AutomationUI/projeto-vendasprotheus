import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BankAccount, BankCode } from "@/types/banking";
import { BANK_INFO_MAP, bankingService } from "@/lib/api/banking-service";
import { useToast } from "@/hooks/use-toast";
import { Building2, KeyRound, ShieldCheck, Loader2 } from "lucide-react";

interface NewBankAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NewBankAccountModal({ open, onOpenChange, onSuccess }: NewBankAccountModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [bancoCodigo, setBancoCodigo] = useState<BankCode>("341");
  const [agencia, setAgencia] = useState("1234");
  const [agenciaDigito, setAgenciaDigito] = useState("0");
  const [conta, setConta] = useState("98765");
  const [contaDigito, setContaDigito] = useState("1");
  const [titularNome, setTitularNome] = useState("Refractarios Industriales S.A.");
  const [cnpjTitular, setCnpjTitular] = useState("12.345.678/0001-90");
  const [chavePix, setChavePix] = useState("financeiro@refratarios.com.br");
  const [convenioCnab, setConvenioCnab] = useState("34198765");
  const [carteiraCnab, setCarteiraCnab] = useState("109");
  const [saldoAtual, setSaldoAtual] = useState("500000.00");
  const [tipoConta, setTipoConta] = useState<"Corrente" | "Pagamento" | "Investimento">("Corrente");
  const [ambienteApi, setAmbienteApi] = useState<"Sandbox" | "Producao">("Producao");
  const [clientIdApi, setClientIdApi] = useState("app_client_id_live_9982");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bancoInfo = BANK_INFO_MAP[bancoCodigo];
      const parsedSaldo = parseFloat(saldoAtual) || 0;

      await bankingService.addBankAccount({
        bancoCodigo,
        bancoNome: bancoInfo.name,
        agencia,
        agenciaDigito: agenciaDigito || undefined,
        conta,
        contaDigito,
        titularNome,
        cnpjTitular,
        chavePix,
        convenioCnab,
        carteiraCnab,
        saldoAtual: parsedSaldo,
        saldoConciliado: parsedSaldo,
        status: "Ativa",
        tipoConta,
        ambienteApi,
        clientIdApi,
        webhookUrl: `https://api.refratarios.com.br/webhooks/${bancoCodigo}`,
      });

      toast({
        title: "Conta Bancária Configurada!",
        description: `Conector com ${bancoInfo.name} ativado com sucesso.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro ao salvar conta",
        description: "Verifique os dados informados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Building2 className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Nova Conta Bancária</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Configure os parâmetros de agência, convênio CNAB 240/400 e credenciais de API Open Banking.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs pt-2">
          {/* Seção 1: Dados Institucionais */}
          <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span>Instituição e Conta Corrente</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Instituição Financeira (Banco)</Label>
                <Select value={bancoCodigo} onValueChange={(val) => setBancoCodigo(val as BankCode)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Selecione o banco" />
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
                <Label className="text-xs">Tipo de Conta</Label>
                <Select value={tipoConta} onValueChange={(val) => setTipoConta(val as "Corrente" | "Pagamento" | "Investimento")}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Corrente">Conta Corrente</SelectItem>
                    <SelectItem value="Pagamento">Conta Pagamento / Escrow</SelectItem>
                    <SelectItem value="Investimento">Conta de Investimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Agência</Label>
                  <Input value={agencia} onChange={(e) => setAgencia(e.target.value)} required className="h-8 text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs">Dígito</Label>
                  <Input value={agenciaDigito} onChange={(e) => setAgenciaDigito(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Número da Conta</Label>
                  <Input value={conta} onChange={(e) => setConta(e.target.value)} required className="h-8 text-xs bg-background" />
                </div>
                <div>
                  <Label className="text-xs">Dígito</Label>
                  <Input value={contaDigito} onChange={(e) => setContaDigito(e.target.value)} required className="h-8 text-xs bg-background" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs">Razão Social do Titular</Label>
                <Input value={titularNome} onChange={(e) => setTitularNome(e.target.value)} required className="h-8 text-xs bg-background" />
              </div>
              <div>
                <Label className="text-xs">CNPJ do Titular</Label>
                <Input value={cnpjTitular} onChange={(e) => setCnpjTitular(e.target.value)} required className="h-8 text-xs bg-background" />
              </div>
            </div>
          </div>

          {/* Seção 2: Convênios CNAB e Pix */}
          <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              <span>Parâmetros de Cobrança e CNAB</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Código do Convênio CNAB</Label>
                <Input value={convenioCnab} onChange={(e) => setConvenioCnab(e.target.value)} placeholder="Ex: 34198765" className="h-8 text-xs bg-background" />
              </div>
              <div>
                <Label className="text-xs">Carteira de Cobrança</Label>
                <Input value={carteiraCnab} onChange={(e) => setCarteiraCnab(e.target.value)} placeholder="Ex: 109" className="h-8 text-xs bg-background" />
              </div>
              <div>
                <Label className="text-xs">Saldo Inicial (R$)</Label>
                <Input type="number" step="0.01" value={saldoAtual} onChange={(e) => setSaldoAtual(e.target.value)} required className="h-8 text-xs bg-background font-mono" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Chave Pix Principal (E-mail, CNPJ, Telefone ou Aleatória)</Label>
              <Input value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="Ex: financeiro@empresa.com.br" className="h-8 text-xs bg-background" />
            </div>
          </div>

          {/* Seção 3: Credenciais Open Banking Direct */}
          <div className="space-y-2 border p-3 rounded-lg bg-muted/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Conexão API Direct / Webhook Open Banking</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ambiente da API</Label>
                <Select value={ambienteApi} onValueChange={(val) => setAmbienteApi(val as "Sandbox" | "Producao")}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Producao">Produção (Live)</SelectItem>
                    <SelectItem value="Sandbox">Homologação (Sandbox)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Client ID / API Key</Label>
                <Input value={clientIdApi} onChange={(e) => setClientIdApi(e.target.value)} placeholder="Key de autenticação OAuth 2.0" className="h-8 text-xs bg-background font-mono" />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5 bg-primary hover:bg-primary/90">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Ativar Conector Bancário</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
