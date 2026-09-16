import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localDB } from "@/lib/local-db";
import { useToast } from "@/components/ui/use-toast";
import { type CrmChannel, type CrmStage } from "@/lib/mock-data";

interface NewOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewOpportunityModal({ open, onOpenChange, onSuccess }: NewOpportunityModalProps) {
  const { toast } = useToast();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [canal, setCanal] = useState<CrmChannel>("whatsapp");
  const [estagio, setEstagio] = useState<CrmStage>("lead");
  const [valor, setValor] = useState("15000");
  const [probabilidade, setProbabilidade] = useState("60");
  const [vendedor, setVendedor] = useState("Carlos Silva");
  const [previsaoFechamento, setPrevisaoFechamento] = useState("2026-03-20");
  const [proximoPasso, setProximoPasso] = useState("Enviar proposta inicial pelo canal de contato");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !cliente) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor informe o título da oportunidade e o cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      localDB.saveOpportunity({
        titulo,
        cliente,
        contato,
        telefone,
        email,
        canal,
        estagio,
        valor: parseFloat(valor) || 0,
        probabilidade: parseInt(probabilidade) || 50,
        vendedor,
        previsaoFechamento,
        proximoPasso,
        origemDescricao:
          canal === "whatsapp" ? "WhatsApp Business API" :
          canal === "protheus" ? "TOTVS Protheus ERP" :
          canal === "ecommerce" ? "E-commerce & Marketplace" :
          canal === "web" ? "Portal Comercial Web" : "Indicação de Parceiro",
      });

      toast({
        title: "Oportunidade Criada no CRM",
        description: `"${titulo}" foi adicionada com sucesso ao pipeline comercial.`,
      });

      // Reset form
      setTitulo("");
      setCliente("");
      setContato("");
      setTelefone("");
      setEmail("");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível cadastrar a oportunidade no momento.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Nova Oportunidade no CRM</DialogTitle>
          <DialogDescription className="text-xs">
            Cadastre um novo negócio no funil de vendas integrado às plataformas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div className="space-y-1">
            <Label className="text-xs">Título da Oportunidade *</Label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Aquisição de 10 Laptops Corporativos"
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente / Razão Social *</Label>
              <Input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Ex: Tech Solutions Ltda"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome do Contato</Label>
              <Input
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Ex: Roberto Mendes"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Telefone / WhatsApp</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: (11) 98765-4321"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: contato@cliente.com.br"
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Canal de Origem</Label>
              <Select value={canal} onValueChange={(v) => setCanal(v as CrmChannel)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp Business API</SelectItem>
                  <SelectItem value="protheus">TOTVS Protheus ERP</SelectItem>
                  <SelectItem value="ecommerce">E-commerce / Lojas B2B</SelectItem>
                  <SelectItem value="web">Portal Comercial Web</SelectItem>
                  <SelectItem value="indicacao">Indicação de Cliente / Parceiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Estágio no Funil</Label>
              <Select value={estagio} onValueChange={(v) => setEstagio(v as CrmStage)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">1. Prospecção & Leads</SelectItem>
                  <SelectItem value="qualificacao">2. Qualificação & ICP</SelectItem>
                  <SelectItem value="proposta">3. Propostas & Cotações</SelectItem>
                  <SelectItem value="negociacao">4. Negociação & Alçadas</SelectItem>
                  <SelectItem value="ganho">5. Fechados & Ganhos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor Estimado (R$)</Label>
              <Input
                type="number"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="15000"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Probabilidade (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={probabilidade}
                onChange={(e) => setProbabilidade(e.target.value)}
                placeholder="60"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Previsão Fechamento</Label>
              <Input
                type="date"
                value={previsaoFechamento}
                onChange={(e) => setPrevisaoFechamento(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Responsável / Vendedor</Label>
              <Select value={vendedor} onValueChange={setVendedor}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Carlos Silva">Carlos Silva</SelectItem>
                  <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                  <SelectItem value="João Oliveira">João Oliveira</SelectItem>
                  <SelectItem value="Ana Costa">Ana Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Próxima Ação / Follow-up</Label>
              <Input
                value={proximoPasso}
                onChange={(e) => setProximoPasso(e.target.value)}
                placeholder="Ex: Agendar call de alinhamento"
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="gap-1.5">
              Salvar Oportunidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
