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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { type CrmOpportunity } from "@/lib/mock-data";

interface WhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: CrmOpportunity | null;
}

const TEMPLATES = [
  {
    id: "proposta",
    title: "Envio de Proposta Comercial",
    text: (opp: CrmOpportunity) =>
      `Olá ${opp.contato || opp.cliente}, tudo bem? Aqui é da equipe comercial. Conforme combinamos, preparei a proposta comercial para "${opp.titulo}" no valor de ${opp.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Segue o resumo para sua avaliação. Ficamos à disposição!`,
  },
  {
    id: "followup",
    title: "Follow-up de Negociação",
    text: (opp: CrmOpportunity) =>
      `Olá ${opp.contato || opp.cliente}, passando para acompanhar o andamento da proposta de "${opp.titulo}". Conseguiu avaliar com sua diretoria? Temos condições especiais de faturamento para fechamento nesta semana!`,
  },
  {
    id: "condicao",
    title: "Condição Especial de Pagamento",
    text: (opp: CrmOpportunity) =>
      `Olá ${opp.contato || opp.cliente}, boas notícias! Conseguimos aprovar uma condição de pagamento diferenciada para o seu projeto de "${opp.titulo}". Gostaria de conversar por aqui para finalizarmos os detalhes?`,
  },
];

export function WhatsAppModal({ open, onOpenChange, opportunity }: WhatsAppModalProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState("followup");
  const [message, setMessage] = useState("");

  // Update message when opportunity or template changes
  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  const currentMessage = message || (opportunity ? activeTemplate.text(opportunity) : "");

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (opportunity) {
      const tmpl = TEMPLATES.find((t) => t.id === templateId);
      if (tmpl) setMessage(tmpl.text(opportunity));
    }
  };

  const handleSendWhatsApp = () => {
    if (!opportunity) return;
    const cleanPhone = (opportunity.telefone || "").replace(/\D/g, "");
    const encoded = encodeURIComponent(currentMessage);
    const url = cleanPhone ? `https://wa.me/55${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank");

    toast({
      title: "Contato Registrado no CRM",
      description: `Follow-up registrado para ${opportunity.cliente}. Janela do WhatsApp Web iniciada.`,
    });
    onOpenChange(false);
  };

  if (!opportunity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">WhatsApp CRM Instantâneo</DialogTitle>
              <DialogDescription className="text-xs">
                Disparo de mensagem rápida para {opportunity.cliente}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-1 text-xs">
          <div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border/60">
            <div>
              <span className="text-muted-foreground block text-[10px]">Destinatário</span>
              <span className="font-semibold text-foreground">{opportunity.contato || opportunity.cliente}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px]">Telefone</span>
              <span className="font-mono text-foreground font-medium">{opportunity.telefone || "Não cadastrado"}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Modelos de Mensagem Comercial</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                    selectedTemplate === t.id
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Mensagem a ser enviada</Label>
            <Textarea
              rows={4}
              value={currentMessage}
              onChange={(e) => setMessage(e.target.value)}
              className="text-xs leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendWhatsApp}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar via WhatsApp Web
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
