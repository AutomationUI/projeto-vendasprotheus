import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BankAccount } from "@/types/banking";
import { bankingService } from "@/lib/api/banking-service";
import { BankAccountsList } from "@/components/banking/BankAccountsList";
import { NewBankAccountModal } from "@/components/banking/NewBankAccountModal";
import { CnabManager } from "@/components/banking/CnabManager";
import { PixBoletoGenerator } from "@/components/banking/PixBoletoGenerator";
import { BankReconciliationTab } from "@/components/banking/BankReconciliationTab";
import { BankWebhookLogs } from "@/components/banking/BankWebhookLogs";
import {
  Landmark,
  Building2,
  FileCode,
  Zap,
  Scale,
  Radio,
  RefreshCw,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function IntegracaoBancariaPage() {
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const resolveTab = (pathname: string, tabQuery: string | null) => {
    if (pathname.includes("/cnab") || tabQuery === "cnab") return "cnab";
    if (pathname.includes("/pix") || tabQuery === "pix" || tabQuery === "pix-boletos" || tabQuery === "pix-boleto") return "pix-boleto";
    if (pathname.includes("/conciliacao") || tabQuery === "conciliacao") return "conciliacao";
    if (pathname.includes("/webhooks") || tabQuery === "webhooks" || tabQuery === "logs") return "webhooks";
    return "contas";
  };

  const [activeTab, setActiveTab] = useState(() => resolveTab(location.pathname, searchParams.get("tab")));
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [newModalOpen, setNewModalOpen] = useState(false);

  useEffect(() => {
    const tab = resolveTab(location.pathname, searchParams.get("tab"));
    setActiveTab(tab);
  }, [location.pathname, searchParams]);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await bankingService.getBankAccounts();
      setAccounts(data);
    } catch (_err) {
      toast({ title: "Erro ao carregar contas bancárias", variant: "destructive" });
    }
  }, [toast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return (
    <div className="space-y-6">
      {/* Structural Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Landmark className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>Módulo de Integração Bancária & Open Banking</span>
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-300">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Direct API Live
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Conectores bancários (Itaú, Bradesco, BB, Santander, Sicoob, Inter), CNAB 240/400, Pix QR Code & Conciliação OFX.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAccounts} className="h-9 text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar Dados
          </Button>
          <Button size="sm" onClick={() => setNewModalOpen(true)} className="h-9 text-xs gap-1.5 bg-primary hover:bg-primary/90 font-semibold shadow-xs">
            <Plus className="h-3.5 w-3.5" /> Nova Conta Bancária
          </Button>
        </div>
      </div>

      {/* Tabs Principais do Módulo Bancário */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60">
          <TabsTrigger value="contas" className="text-xs py-2 gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Contas Bancárias</span>
          </TabsTrigger>
          <TabsTrigger value="cnab" className="text-xs py-2 gap-1.5">
            <FileCode className="h-3.5 w-3.5" />
            <span>Remessa & Retorno CNAB</span>
          </TabsTrigger>
          <TabsTrigger value="pix-boleto" className="text-xs py-2 gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Pix & Boleto Híbrido</span>
          </TabsTrigger>
          <TabsTrigger value="conciliacao" className="text-xs py-2 gap-1.5">
            <Scale className="h-3.5 w-3.5" />
            <span>Conciliação OFX</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-xs py-2 gap-1.5">
            <Radio className="h-3.5 w-3.5 text-emerald-500" />
            <span>Logs & Webhooks</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          <BankAccountsList
            accounts={accounts}
            onRefresh={loadAccounts}
            onOpenNewModal={() => setNewModalOpen(true)}
          />
        </TabsContent>

        <TabsContent value="cnab" className="space-y-4">
          <CnabManager accounts={accounts} />
        </TabsContent>

        <TabsContent value="pix-boleto" className="space-y-4">
          <PixBoletoGenerator accounts={accounts} />
        </TabsContent>

        <TabsContent value="conciliacao" className="space-y-4">
          <BankReconciliationTab accounts={accounts} />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <BankWebhookLogs />
        </TabsContent>
      </Tabs>

      {/* Modal de Nova Conta Bancária */}
      <NewBankAccountModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSuccess={loadAccounts}
      />
    </div>
  );
}
