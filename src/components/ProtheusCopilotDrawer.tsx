import React, { useState } from "react";
import {
  Sparkles,
  Calculator,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Building,
  Layers,
  ArrowRight
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { customers } from "@/lib/mock-data";
import { useUIStore } from "@/store/use-ui-store";

interface ProtheusCopilotDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProtheusCopilotDrawer({ open: propOpen, onOpenChange: propOnOpenChange }: ProtheusCopilotDrawerProps) {
  const { isCopilotOpen, setCopilotOpen } = useUIStore();

  const open = propOpen !== undefined ? propOpen : isCopilotOpen;
  const onOpenChange = propOnOpenChange !== undefined ? propOnOpenChange : setCopilotOpen;
  // Tab 1: Simulador de Margem & Alçadas
  const [basePrice, setBasePrice] = useState<number>(10000);
  const [costPrice, setCostPrice] = useState<number>(5500);
  const [discountPercent, setDiscountPercent] = useState<number>(8);
  const [paymentDays, setPaymentDays] = useState<number>(30);
  const [repCommissionRate, setRepCommissionRate] = useState<number>(5);

  // Calculations
  const finalPrice = basePrice * (1 - discountPercent / 100);
  const grossMargin = finalPrice - costPrice;
  const grossMarginPercent = (grossMargin / finalPrice) * 100;
  const commissionVal = finalPrice * (repCommissionRate / 100);
  const financialCost = (finalPrice * (paymentDays / 30) * 0.015); // 1.5% a.m.
  const netContribution = grossMargin - commissionVal - financialCost;
  const netMarginPercent = (netContribution / finalPrice) * 100;

  // Alçada Determination
  let approvalTier = "AUTÔNOMO (Aprovado Automaticamente)";
  let approvalBadgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200";
  let approvalReason = "Desconto dentro da faixa liberada para o representante (≤ 10%).";

  if (discountPercent > 18 || netMarginPercent < 15) {
    approvalTier = "ALÇADA DIRETORIA (Nível 3)";
    approvalBadgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200";
    approvalReason = "Desconto elevado (>18%) ou Margem Líquida abaixo do piso corporativo (15%).";
  } else if (discountPercent > 10 || netMarginPercent < 25) {
    approvalTier = "ALÇADA GERÊNCIA REGIONAL (Nível 2)";
    approvalBadgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
    approvalReason = "Desconto superior a 10%. Requer validação do Gerente de Contas.";
  }

  // Tab 2: Simulador de Prazos & Condições de Pagamento
  const [selectedCondition, setSelectedCondition] = useState<string>("30/60/90");
  const [paymentMethod, setPaymentMethod] = useState<string>("boleto");
  const [freightType, setFreightType] = useState<"CIF" | "FOB">("CIF");
  const [orderProposalTotal, setOrderProposalTotal] = useState<number>(25000);

  const getInstallmentsCount = (cond: string) => {
    if (cond === "avista") return 1;
    if (cond === "30dd") return 1;
    if (cond === "30/60") return 2;
    if (cond === "30/60/90") return 3;
    if (cond === "30/60/90/120") return 4;
    return 1;
  };

  const installments = getInstallmentsCount(selectedCondition);
  const promptPaymentDiscount = selectedCondition === "avista" ? 0.05 : 0;
  const effectiveOrderTotal = orderProposalTotal * (1 - promptPaymentDiscount);
  const installmentValue = effectiveOrderTotal / installments;

  // Tab 3: Analisador de Risco de Crédito Comercial
  const [selectedCustomerIdx, setSelectedCustomerIdx] = useState<number>(0);
  const selectedCustomer = customers[selectedCustomerIdx] || customers[0];
  const customerCreditLimit = (selectedCustomer?.totalCompras || 100000) * 0.45;
  const currentExposure = 42500;
  const availableCredit = Math.max(0, customerCreditLimit - currentExposure);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Sparkles className="h-4 w-4" /> Nexus Sales Copilot
          </div>
          <SheetTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Inteligência Comercial & Negociação de Vendas
          </SheetTitle>
          <SheetDescription className="text-xs text-neutral-500 mt-1">
            Simulador de margem de contribuição, alçadas de desconto corporativas, projeção de parcelamento e limites de crédito comercial.
          </SheetDescription>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="margin" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 pt-3 border-b border-neutral-200 dark:border-neutral-800">
            <TabsList className="grid grid-cols-3 w-full bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-xl">
              <TabsTrigger value="margin" className="text-xs font-semibold py-1.5 rounded-lg flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" /> Margem & Alçada
              </TabsTrigger>
              <TabsTrigger value="terms" className="text-xs font-semibold py-1.5 rounded-lg flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" /> Prazos & Parcelas
              </TabsTrigger>
              <TabsTrigger value="credit" className="text-xs font-semibold py-1.5 rounded-lg flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Limite Comercial
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: MARGEM & ALÇADA */}
          <TabsContent value="margin" className="flex-1 overflow-y-auto p-5 space-y-5 m-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Preço de Tabela (R$)
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Custo Base de Vendas (R$)
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 p-3.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-600 dark:text-neutral-400">Desconto Comercial Negociado:</span>
                    <span className="font-mono font-bold text-primary">{discountPercent}% (R$ {(basePrice * (discountPercent / 100)).toFixed(2)})</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full accent-primary h-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 cursor-pointer"
                  />
                </div>

                <div className="flex justify-between gap-4 pt-1 text-xs">
                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-neutral-500 block">Comissão Vendedor</span>
                    <select
                      value={repCommissionRate}
                      onChange={(e) => setRepCommissionRate(Number(e.target.value))}
                      className="w-full h-8 px-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-bold"
                    >
                      <option value="2">2.0% (Padrão Outlet)</option>
                      <option value="3">3.0% (Distribuição)</option>
                      <option value="4">4.0% (Venda Direta)</option>
                      <option value="5">5.0% (Meta Plus)</option>
                    </select>
                  </div>

                  <div className="flex-1 space-y-1">
                    <span className="text-[11px] text-neutral-500 block">Prazo Médio (Dias)</span>
                    <select
                      value={paymentDays}
                      onChange={(e) => setPaymentDays(Number(e.target.value))}
                      className="w-full h-8 px-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg font-bold"
                    >
                      <option value="0">À Vista (0 DD)</option>
                      <option value="30">30 DD</option>
                      <option value="45">30/60 DD (PMP 45)</option>
                      <option value="60">30/60/90 DD (PMP 60)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Simulation Result Card */}
              <div className="p-4 rounded-2xl bg-neutral-900 dark:bg-black text-white space-y-3 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <span className="text-xs text-neutral-400">Preço Final Sugerido</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    R$ {finalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-neutral-800/60 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">Margem Bruta</span>
                    <span className="text-xs font-bold font-mono text-white">
                      {grossMarginPercent.toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-2 bg-neutral-800/60 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">Comissão (R$)</span>
                    <span className="text-xs font-bold font-mono text-amber-400">
                      R$ {commissionVal.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2 bg-neutral-800/60 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">Margem Líquida</span>
                    <span className={`text-xs font-bold font-mono ${netMarginPercent >= 20 ? "text-emerald-400" : "text-rose-400"}`}>
                      {netMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Status da Alçada */}
                <div className={`p-3 rounded-xl border text-xs space-y-1 ${approvalBadgeClass}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{approvalTier}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{approvalReason}</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PRAZOS & CONDIÇÕES COMERCIAIS */}
          <TabsContent value="terms" className="flex-1 overflow-y-auto p-5 space-y-5 m-0">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Valor da Proposta / Orçamento (R$)
                </label>
                <input
                  type="number"
                  value={orderProposalTotal}
                  onChange={(e) => setOrderProposalTotal(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Condição Comercial
                  </label>
                  <select
                    value={selectedCondition}
                    onChange={(e) => setSelectedCondition(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold"
                  >
                    <option value="avista">À Vista / PIX (-5% desc.)</option>
                    <option value="30dd">30 Dias Direto</option>
                    <option value="30/60">30 / 60 Dias (2x)</option>
                    <option value="30/60/90">30 / 60 / 90 Dias (3x)</option>
                    <option value="30/60/90/120">30 / 60 / 90 / 120 Dias (4x)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Forma de Pagamento
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold"
                  >
                    <option value="boleto">Boleto Bancário Faturado</option>
                    <option value="pix">PIX Comercial Instantâneo</option>
                    <option value="cartao">Cartão Corporativo B2B</option>
                    <option value="ted">Transferência TED / Bancária</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Modalidade de Frete
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFreightType("CIF")}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                      freightType === "CIF"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-muted-foreground"
                    }`}
                  >
                    <span className="font-bold block">CIF (Incluso)</span>
                    <span className="text-[10px] opacity-75">Por conta do emissor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFreightType("FOB")}
                    className={`p-2 rounded-lg text-xs font-semibold border transition-all text-left ${
                      freightType === "FOB"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-muted-foreground"
                    }`}
                  >
                    <span className="font-bold block">FOB (Cliente)</span>
                    <span className="text-[10px] opacity-75">Redespacho indicado</span>
                  </button>
                </div>
              </div>

              {/* Installments Simulation Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary" /> Projeção de Parcelas Comerciais
                </h4>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                    <span className="text-[10px] text-neutral-500 block">Total Efetivo da Proposta</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      R$ {effectiveOrderTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60">
                    <span className="text-[10px] text-neutral-500 block">Valor por Parcela ({installments}x)</span>
                    <span className="text-sm font-bold font-mono text-primary">
                      R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-800/40 space-y-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Resumo Comercial da Negociação
                  </span>
                  <p className="text-xs text-neutral-800 dark:text-neutral-200">
                    Condição: <strong>{selectedCondition.toUpperCase()}</strong> • Pagamento: <strong>{paymentMethod.toUpperCase()}</strong> • Frete: <strong>{freightType}</strong>
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: RISCO & LIMITE DE CRÉDITO */}
          <TabsContent value="credit" className="flex-1 overflow-y-auto p-5 space-y-5 m-0">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Selecionar Cliente para Análise
                </label>
                <select
                  value={selectedCustomerIdx}
                  onChange={(e) => setSelectedCustomerIdx(Number(e.target.value))}
                  className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold"
                >
                  {customers.map((c, idx) => (
                    <option key={c.id} value={idx}>{c.razaoSocial} ({c.cnpj})</option>
                  ))}
                </select>
              </div>

              {/* Credit Profile */}
              <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Score Comercial do Cliente</span>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    880 / 1000 (Excelente)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl">
                    <span className="text-[10px] text-neutral-500 block">Limite de Compras Concedido</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      R$ {customerCreditLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-2.5 bg-neutral-50 dark:bg-neutral-950 rounded-xl">
                    <span className="text-[10px] text-neutral-500 block">Pedidos em Aberto</span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      R$ {currentExposure.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Parecer Comercial
                  </div>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                    Cliente com histórico 100% adimplente nos últimos 12 meses. Limite disponível para novos faturamentos: <strong>R$ {availableCredit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/70 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
            <Layers className="h-3.5 w-3.5 text-primary" /> Motor Comercial & Negociação
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-xs"
          >
            Fechar Copilot
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
