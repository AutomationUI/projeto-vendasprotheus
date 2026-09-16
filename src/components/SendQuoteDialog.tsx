import { useState, useEffect } from "react";
import { Mail, MessageSquare, Send, Loader2, FileText, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Quote, Customer } from "@/lib/mock-data";
import { customersService } from "@/lib/api";
import { messagingService } from "@/lib/api/messaging-service";
import { generateQuotePDF } from "@/lib/export-quote-pdf";

interface SendQuoteDialogProps {
  quote: Quote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendQuoteDialog({ quote, open, onOpenChange }: SendQuoteDialogProps) {
  const [tab, setTab] = useState<"email" | "whatsapp" | "ambos">("email");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Resolve customer by matching razaoSocial
  const [customer, setCustomer] = useState<Customer | undefined>();
  useEffect(() => {
    if (!quote) { setCustomer(undefined); return; }
    let active = true;
    customersService.getAll({ search: quote.cliente, limit: 1 })
      .then((r) => {
        if (active) setCustomer(r?.data?.find((c) => c.razaoSocial === quote.cliente));
      })
      .catch(() => {
        if (active) setCustomer(undefined);
      });
    return () => { active = false; };
  }, [quote]);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // Reset fields when dialog opens with new quote
  const resetFields = () => {
    setEmail(customer?.email || "");
    setPhone(customer?.telefone || "");
    setSubject(quote ? `Proposta Comercial #${quote.numero}` : "");
    setMessage(
      quote
        ? `Olá${customer ? ` ${customer.razaoSocial}` : ""}! Segue a proposta comercial #${quote.numero} para sua análise.`
        : ""
    );
    setSent(false);
    setTab("email");
  };

  const handleOpenChange = (open: boolean) => {
    if (open) resetFields();
    onOpenChange(open);
  };

  if (!quote) return null;

  const approvalLink = `${window.location.origin}/aprovar/${quote.id}`;

  const handleSend = async () => {
    if (tab === "email" || tab === "ambos") {
      if (!email) {
        toast.error("Informe o e-mail do destinatário");
        return;
      }
    }
    if (tab === "whatsapp" || tab === "ambos") {
      if (!phone) {
        toast.error("Informe o telefone do destinatário");
        return;
      }
    }

    setSending(true);

    try {
      // Generate PDF
      const { pdfBase64 } = generateQuotePDF(quote, customer);

      const results: string[] = [];

      if (tab === "email" || tab === "ambos") {
        const res = await messagingService.sendEmail({
          quoteId: quote.id,
          to: email,
          subject,
          customerName: customer?.razaoSocial || quote.cliente,
          quoteNumero: quote.numero,
          approvalLink,
          pdfBase64,
        });
        if (res.success) {
          results.push("E-mail enviado");
        } else {
          toast.error(`Erro ao enviar e-mail: ${res.error}`);
        }
      }

      if (tab === "whatsapp" || tab === "ambos") {
        const res = await messagingService.sendWhatsApp({
          quoteId: quote.id,
          to: phone,
          customerName: customer?.razaoSocial || quote.cliente,
          quoteNumero: quote.numero,
          approvalLink,
          pdfBase64,
        });
        if (res.success) {
          results.push("WhatsApp enviado");
        } else {
          toast.error(`Erro ao enviar WhatsApp: ${res.error}`);
        }
      }

      if (results.length > 0) {
        toast.success(`Orçamento #${quote.numero}: ${results.join(" e ")}`);
        setSent(true);
      }
    } catch (err) {
      toast.error("Erro inesperado ao enviar orçamento");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPDF = () => {
    const { blob } = generateQuotePDF(quote, customer);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposta-${quote.numero}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Orçamento
          </DialogTitle>
          <DialogDescription>
            {quote.numero} — {quote.cliente} — {formatCurrency(quote.valor)}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Orçamento enviado com sucesso!</p>
            <p className="text-sm text-muted-foreground text-center">
              O cliente receberá a proposta e poderá aprovar diretamente pelo link.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-1" />
                Baixar PDF
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email" className="gap-1.5">
                  <Mail className="h-4 w-4" />
                  E-mail
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="ambos" className="gap-1.5">
                  <Send className="h-4 w-4" />
                  Ambos
                </TabsTrigger>
              </TabsList>

              {/* Email tab */}
              <TabsContent value="email" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="send-email">E-mail do destinatário</Label>
                  <Input
                    id="send-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-subject">Assunto</Label>
                  <Input
                    id="send-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* WhatsApp tab */}
              <TabsContent value="whatsapp" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="send-phone">Telefone (com DDD)</Label>
                  <Input
                    id="send-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-msg">Mensagem</Label>
                  <Textarea
                    id="send-msg"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Both tab */}
              <TabsContent value="ambos" className="space-y-3 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="send-both-email">E-mail</Label>
                  <Input
                    id="send-both-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="cliente@empresa.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="send-both-phone">Telefone (com DDD)</Label>
                  <Input
                    id="send-both-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* PDF info badge */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
              <FileText className="h-4 w-4" />
              <span>PDF da proposta será gerado e anexado automaticamente</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {quote.itens.length} {quote.itens.length === 1 ? "item" : "itens"}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-1" />
                Baixar PDF
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                  Cancelar
                </Button>
                <Button onClick={handleSend} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
