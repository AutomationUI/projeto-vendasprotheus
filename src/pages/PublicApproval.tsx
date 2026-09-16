import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  CheckCircle2, Clock, Smartphone, ShieldCheck, Phone, 
  ChevronRight, Download, Printer, Share2, Send, XCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { getSettings } from "@/lib/settings-store";
import { printElement } from "@/lib/print-utils";
import { type Quote } from "@/lib/mock-data";
import { quotesService } from "@/lib/api";
import { API_CONFIG } from "@/lib/api/config";
import { http } from "@/lib/api/http-client";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PublicApprovalPage() {
  const { id } = useParams();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const settings = getSettings();
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    quotesService.getById(id)
      .then((q) => { if (active) setQuote(q); })
      .catch(() => { if (active) setQuote(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      if (API_CONFIG.useMock) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        await http.post(`/quotes/${quote?.id}/approve`, {});
      }
      setStatus("approved");
    } catch {
      console.error("Erro ao aprovar proposta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      if (API_CONFIG.useMock) {
        await new Promise(r => setTimeout(r, 1500));
      } else {
        await http.post(`/quotes/${quote?.id}/reject`, { reason: rejectReason });
      }
      setStatus("rejected");
      setRejectOpen(false);
    } catch {
      console.error("Erro ao rejeitar proposta");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && status === "pending") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Carregando sua proposta...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="text-center p-8 max-w-md">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Proposta não encontrada</h1>
          <p className="text-slate-500">O link de aprovação é inválido ou a proposta foi removida.</p>
        </Card>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center p-8 border-t-4 border-t-emerald-500 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Proposta Aprovada!</h1>
            <p className="text-slate-600 mb-8">
              Obrigado pela confiança. Nossa equipe já foi notificada e o seu pedido será processado agora mesmo.
            </p>
            <div className="space-y-4">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => printElement("printable-proposal", `Comprovante_${quote?.numero}`)}>
                <Download className="mr-2 h-4 w-4" /> Baixar Comprovante (PDF)
              </Button>
              <p className="text-xs text-slate-400">Um e-mail de confirmação foi enviado para você.</p>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="text-center p-8 border-t-4 border-t-amber-500 shadow-2xl">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Revisão Solicitada</h1>
            <p className="text-slate-600 mb-4">
              Sua solicitação de revisão foi registrada. Nosso consultor entrará em contato em breve.
            </p>
            {rejectReason && (
              <div className="bg-slate-50 rounded-lg p-3 mb-6 text-left">
                <p className="text-xs text-slate-500 font-semibold mb-1">Motivo informado:</p>
                <p className="text-sm text-slate-700">{rejectReason}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">O vendedor {quote.vendedor} foi notificado.</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20 font-sans">
      {/* Top Bar Navigation (Public View) */}
      <div className="bg-white dark:bg-slate-900 border-b sticky top-0 z-50 px-4 py-3 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl bg-slate-900">
              {settings.templateConfig.logoText.charAt(0)}
            </div>
            <span className="font-bold text-lg text-slate-800 dark:text-white uppercase tracking-tight">{settings.templateConfig.logoText}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900" onClick={() => printElement("printable-proposal", `Proposta_${quote?.numero}`)}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5" /> Expira em 3 dias
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* Main Content (Document) */}
          <div className="lg:col-span-3 space-y-8">
            <Card id="printable-proposal" className="printable-area shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-0 overflow-hidden rounded-[20px]">
              <div className="h-[6px] w-full bg-[#0F172A]" />
              <CardContent className="p-10 sm:p-16 bg-white dark:bg-slate-900">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between gap-10 mb-16">
                  <div className="space-y-4">
                    <h1 className="text-[42px] leading-none font-black text-slate-900 dark:text-white tracking-tight">
                      PROPOSTA<br />COMERCIAL
                    </h1>
                    <p className="text-slate-400 font-mono text-sm tracking-widest font-bold">#{quote.numero}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-black text-slate-900 dark:text-white text-lg leading-tight uppercase">{settings.templateConfig.logoText}</p>
                    <p className="text-slate-500 text-xs font-semibold">00.000.000/0001-00</p>
                    <p className="text-slate-500 text-xs leading-relaxed max-w-[240px] ml-auto">
                      Av. Paulista, 1000, São Paulo - SP
                    </p>
                    <p className="text-slate-900 dark:text-white text-xs font-bold pt-1">(11) 99999-9999</p>
                  </div>
                </div>

                {/* Destinatário & Infos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Destinatário</h3>
                    <div className="space-y-1.5">
                      <p className="font-extrabold text-slate-800 dark:text-white text-xl">{quote.cliente}</p>
                      <p className="text-sm text-slate-500 font-medium">CNPJ: 12.345.678/0001-90</p>
                      <p className="text-sm text-slate-500 leading-relaxed font-medium">Av. Paulista, 1000 - São Paulo, SP</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Validade</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">30 dias</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Pagamento</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.condicaoPagamento}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Consultor</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{quote.vendedor}</span>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="mb-16">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-2 border-slate-900">
                        <TableHead className="py-5 text-slate-900 dark:text-white font-black text-sm uppercase">Item</TableHead>
                        <TableHead className="py-5 text-slate-900 dark:text-white font-black text-sm uppercase text-center">Qtd</TableHead>
                        <TableHead className="py-5 text-slate-900 dark:text-white font-black text-sm uppercase text-right">Unitário</TableHead>
                        <TableHead className="py-5 text-slate-900 dark:text-white font-black text-sm uppercase text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quote.itens.map((item, id) => (
                        <TableRow key={id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <TableCell className="py-8">
                            <p className="font-extrabold text-slate-800 dark:text-white text-base">{item.produto}</p>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono font-bold tracking-wider">{item.codigo}</p>
                          </TableCell>
                          <TableCell className="py-8 text-center font-bold text-slate-600 dark:text-slate-300">{item.quantidade}</TableCell>
                          <TableCell className="py-8 text-right font-bold text-slate-600 dark:text-slate-300">{fmt(item.precoUnitario)}</TableCell>
                          <TableCell className="py-8 text-right font-black text-slate-900 dark:text-white text-base">{fmt(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary */}
                <div className="flex flex-col items-end gap-3 mb-16">
                  <div className="flex justify-between items-center w-full max-w-[280px]">
                    <span className="text-sm font-bold text-slate-400">Subtotal de Itens</span>
                    <span className="text-sm font-extrabold text-slate-700">{fmt(quote.valor)}</span>
                  </div>
                  <div className="flex justify-between items-center w-full max-w-[280px]">
                    <span className="text-sm font-bold text-slate-400">Frete (CIF)</span>
                    <span className="text-sm font-extrabold text-emerald-600 uppercase tracking-tight">Grátis</span>
                  </div>
                  <div className="w-full max-w-[320px] mt-4">
                    <div className="bg-[#F8FAFC] dark:bg-slate-800/50 px-8 py-5 rounded-[15px] border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <span className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Total Geral</span>
                      <span className="text-[32px] font-black text-slate-900 dark:text-white tracking-tighter">{fmt(quote.valor)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Legal */}
                <div className="mt-20">
                  <div className="bg-[#EEF2FF] dark:bg-indigo-950/20 p-6 rounded-[12px] border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-[13px] text-indigo-700 dark:text-indigo-400 leading-relaxed font-medium italic">
                      "Condições válidas apenas durante o prazo de validade desta proposta. Valores sujeitos a alteração sem aviso prévio após o vencimento."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg p-6 flex items-center gap-5 bg-white dark:bg-slate-900 rounded-[15px]">
                <div className="w-14 h-14 rounded-[12px] bg-blue-50 flex items-center justify-center shrink-0">
                  <Smartphone className="text-blue-600 h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-slate-800 dark:text-white">Assinatura Digital</h4>
                  <p className="text-[12px] text-slate-500 font-medium pt-0.5">Proteção via token e IP</p>
                </div>
              </Card>
              <Card className="border-0 shadow-lg p-6 flex items-center gap-5 bg-white dark:bg-slate-900 rounded-[15px]">
                <div className="w-14 h-14 rounded-[12px] bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="text-emerald-600 h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-slate-800 dark:text-white">Hospedagem Segura</h4>
                  <p className="text-[12px] text-slate-500 font-medium pt-0.5">Dados criptografados</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <Card className="border-0 shadow-[0_25px_60px_rgba(0,0,0,0.1)] bg-[#0F172A] text-white overflow-hidden rounded-[20px]">
                <div className="p-8 space-y-8 relative">
                  {/* Decorative element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-[0.03] rounded-full -mr-16 -mt-16" />
                  
                  <div className="space-y-2">
                    <h2 className="text-[22px] font-black tracking-tight leading-tight">Decisão de Compra</h2>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">Aprove esta proposta agora para garantir o estoque.</p>
                  </div>

                  <div className="space-y-4">
                    <Button 
                      className="w-full h-[60px] text-lg font-black bg-[#10B981] hover:bg-[#059669] text-white rounded-[12px] shadow-xl shadow-emerald-500/20 border-0 group tracking-tight"
                      onClick={handleApprove}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      APROVAR PROPOSTA <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full h-[54px] text-slate-300 font-bold hover:text-white hover:bg-white/5 border border-white/10 rounded-[12px]"
                      onClick={() => setRejectOpen(true)}
                      disabled={submitting}
                    >
                      Solicitar Revisão
                    </Button>
                  </div>

                  <div className="w-full h-[1px] bg-white/5" />

                  <div className="space-y-5">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Suporte Direto</p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[12px] bg-slate-800 flex items-center justify-center border border-white/5">
                        <Phone className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-base font-black tracking-tight">{quote.vendedor}</p>
                        <p className="text-xs text-slate-400 font-medium italic">Consultor Técnico comercial</p>
                      </div>
                    </div>
                    <Button className="w-full bg-[#6366F1] hover:bg-[#4F46E5] h-[54px] rounded-[12px] font-black tracking-tight text-white gap-2">
                       Falar com Vendedor <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Secure link info */}
              <div className="px-2 space-y-6 text-center">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Propulsado por ProtheusVendas®</p>
                <div className="flex justify-center gap-6 text-slate-300 dark:text-slate-700">
                   <Share2 className="h-5 w-5 hover:text-slate-600 transition-colors cursor-pointer" />
                   <ShieldCheck className="h-5 w-5 hover:text-slate-600 transition-colors cursor-pointer" />
                   <Smartphone className="h-5 w-5 hover:text-slate-600 transition-colors cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Rejection Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Revisão</DialogTitle>
            <DialogDescription>
              Informe o motivo para que nosso consultor possa ajustar a proposta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Gostaria de negociar o prazo de pagamento..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleReject} disabled={submitting} variant="destructive">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Solicitar Revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
