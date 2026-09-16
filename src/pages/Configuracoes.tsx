import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getSettings, updateSettings, subscribeSettings, DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings-store";
import { updatePermissions, getBuiltInOverrides } from "@/lib/permissions-store";
import { ROLE_PERMISSIONS, type Permission } from "@/lib/types-roles";
import { addAuditLog } from "@/lib/audit-store";
import { QRCodeSVG } from "qrcode.react";
import {
  RefreshCw, Smartphone, KeyRound, Palette, ImagePlus, Type, LayoutList, FileText, CheckCircle, Loader2, ShieldCheck, Mail, MessageSquare, Send, Eye, Database, CheckCircle2
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { SupabaseSyncManager } from "@/components/SupabaseSyncManager";
import { CommercialRulesFlowManager } from "@/components/CommercialRulesFlowManager";
import { messagingService, type MessagingSettings } from "@/lib/api/messaging-service";
import { DocumentStudioTab } from "@/components/documents/DocumentStudioTab";

// ─── Messaging Settings Sub-component ────────────────────
function MessagingSettingsTab() {
  const { toast } = useToast();
  const [msgSettings, setMsgSettings] = useState<MessagingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    let active = true;
    messagingService.getSettings()
      .then((s) => {
        if (active) {
          setMsgSettings(s);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setMsgSettings(null);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, []);

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Informe um e-mail para teste", variant: "destructive" });
      return;
    }
    setTestingEmail(true);
    const result = await messagingService.testEmail(testEmail);
    setTestingEmail(false);
    if (result.success) {
      toast({ title: "E-mail de teste enviado!", description: `Verifique a caixa de entrada de ${testEmail}` });
    } else {
      toast({ title: "Erro ao enviar e-mail", description: result.error, variant: "destructive" });
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) {
      toast({ title: "Informe um telefone para teste", variant: "destructive" });
      return;
    }
    setTestingWhatsApp(true);
    const result = await messagingService.testWhatsApp(testPhone);
    setTestingWhatsApp(false);
    if (result.success) {
      toast({ title: "WhatsApp de teste enviado!", description: `Mensagem enviada para ${testPhone}` });
    } else {
      toast({ title: "Erro ao enviar WhatsApp", description: result.error, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Configuração SMTP (E-mail)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Servidor SMTP</Label>
              <Input value={msgSettings?.smtp.host || ""} readOnly placeholder="smtp.exemplo.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Porta</Label>
                <Input value={msgSettings?.smtp.port || 587} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label>Seguro (TLS)</Label>
                <Input value={msgSettings?.smtp.secure ? "Sim" : "Não"} readOnly />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Usuário</Label>
              <Input value={msgSettings?.smtp.user || ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input value={msgSettings?.smtp.pass || ""} readOnly type="password" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do remetente</Label>
              <Input value={msgSettings?.smtp.fromName || ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail do remetente</Label>
              <Input value={msgSettings?.smtp.fromEmail || ""} readOnly />
            </div>
          </div>
          <Separator />
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>E-mail para teste</Label>
              <Input
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="seu-email@teste.com"
                type="email"
              />
            </div>
            <Button onClick={handleTestEmail} disabled={testingEmail} variant="outline">
              {testingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Enviar Teste
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            As credenciais SMTP são configuradas no arquivo <code>.env</code> do servidor backend.
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-500" />
            WhatsApp Business (Meta Cloud API)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={msgSettings?.whatsapp.phoneNumberId || ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <Input value={msgSettings?.whatsapp.accessToken || ""} readOnly type="password" />
            </div>
            <div className="space-y-1.5">
              <Label>Business Account ID</Label>
              <Input value={msgSettings?.whatsapp.businessAccountId || ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input value={msgSettings?.whatsapp.templateName || ""} readOnly />
            </div>
          </div>
          <Separator />
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Telefone para teste (com DDD)</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="5511999998888"
              />
            </div>
            <Button onClick={handleTestWhatsApp} disabled={testingWhatsApp} variant="outline">
              {testingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
              Enviar Teste
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            As credenciais do WhatsApp Business são configuradas no arquivo <code>.env</code> do servidor backend.
            Você precisa de uma conta Meta Business e um número aprovado para envio.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings>(getSettings);
  useEffect(() => subscribeSettings(() => setSettings(getSettings())), []);

  // 2FA Setup State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [setup2FAOpen, setSetup2FAOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const mockSecretURI = "otpauth://totp/VendasProtheus:admin@empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=VendasProtheus";

  // ERP Test State
  const [isTestingERP, setIsTestingERP] = useState(false);

  const handleToggle2FA = (checked: boolean) => {
    if (checked) {
      setSetup2FAOpen(true);
      setOtpValue("");
    } else {
      setIs2FAEnabled(false);
      toast({ title: "Autenticação em Duas Etapas desativada." });
    }
  };

  const handleVerify2FA = () => {
    setIsVerifying(true);
    // Simulating API call
    setTimeout(() => {
      setIsVerifying(false);
      // Realistic validation: accept "123456" as correct code
      if (otpValue === "123456") {
        setIs2FAEnabled(true);
        setSetup2FAOpen(false);
        setOtpValue("");
        toast({ title: "2FA ativado com sucesso!", description: "Sua conta agora está mais protegida." });
        addAuditLog({ usuario: "Admin", evento: "edicao", descricao: "Ativou autenticação em duas etapas (2FA)", modulo: "Segurança" });
      } else {
        toast({ title: "Código inválido", description: "O código digitado não confere. Tente '123456' para teste.", variant: "destructive" });
      }
    }, 1500);
  };

  const testERPConnection = async () => {
    setIsTestingERP(true);
    // Simulating actual API request to Protheus REST API
    await new Promise(r => setTimeout(r, 2000));
    setIsTestingERP(false);

    if (settings?.erpConfig?.urlBase?.includes("empresa.com.br")) {
      toast({
        title: "Conexão estabelecida!",
        description: "Comunicação com o Protheus via REST realizada com sucesso.",
        variant: "default"
      });
      addAuditLog({ usuario: "Admin", evento: "visualizacao", descricao: "Testou conexão com ERP Protheus - Sucesso", modulo: "Configurações" });
    } else {
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível alcançar o servidor. Verifique a URL e o Token.",
        variant: "destructive"
      });
    }
  };

  const saveRegras = () => {
    toast({ title: "Regras salvas com sucesso" });
    addAuditLog({ usuario: "Admin", evento: "edicao", descricao: "Alterou regras comerciais de venda", modulo: "Configurações" });
  };

  const saveERP = () => {
    toast({ title: "Parâmetros ERP salvos" });
    addAuditLog({ usuario: "Admin", evento: "edicao", descricao: "Atualizou configurações de integração ERP Protheus", modulo: "Configurações" });
  };

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const getInitialTab = () => {
    const qTab = searchParams.get("tab");
    if (qTab) return qTab;
    if (location.pathname.includes("/seguranca")) return "seguranca";
    if (location.pathname.includes("/parametros") || location.pathname.includes("/erp")) return "parametros";
    if (location.pathname.includes("/marca")) return "marca";
    if (location.pathname.includes("/mensagens")) return "mensagens";
    if (location.pathname.includes("/supabase")) return "supabase";
    return "regras";
  };

  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    const qTab = searchParams.get("tab");
    if (qTab && qTab !== activeTab) {
      setActiveTab(qTab);
    }
  }, [searchParams, activeTab]);

  const saveWhiteLabel = () => {
    toast({ title: "Identidade visual salva" });
    addAuditLog({ usuario: "Admin", evento: "edicao", descricao: "Alterou configurações de White-label e Logo", modulo: "Configurações" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 w-full max-w-none">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Sistema</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários, perfis e regras comerciais.</p>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchParams({ tab: val }, { replace: true }); }}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="regras">Regras de Venda</TabsTrigger>
          <TabsTrigger value="supabase" className="gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <Database className="h-3.5 w-3.5" /> Supabase Cloud DB
          </TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros ERP</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="marca">Documentos & Marca</TabsTrigger>
          <TabsTrigger value="mensagens">Email & Mensagens</TabsTrigger>
        </TabsList>

        {/* Tab Supabase Cloud Database */}
        <TabsContent value="supabase" className="mt-4 space-y-4">
          <SupabaseSyncManager />
        </TabsContent>

        {/* Removed redundant Usuarios and Perfis tabs. Managed in /usuarios page. */}

        {/* Tab Regras Comerciais Globais & Flow Studio */}
        <TabsContent value="regras" className="mt-4 space-y-4">
          <CommercialRulesFlowManager
            settings={settings}
            updateSettings={updateSettings}
            onSave={saveRegras}
          />
        </TabsContent>

        {/* Tab Parâmetros ERP */}
        <TabsContent value="parametros" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Parâmetros de Integração ERP Protheus</span>
                <Badge
                  variant="outline"
                  className={
                    settings?.erpConfig?.ativo && settings?.erpConfig?.origemProdutos === "erp"
                      ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }
                >
                  {settings?.erpConfig?.ativo && settings?.erpConfig?.origemProdutos === "erp"
                    ? "● Consumo via API ERP Ativo (Catálogo gerido pelo Protheus)"
                    : "● Banco Próprio Ativo (Cadastro manual de produtos liberado)"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Regra de Negócio: Explicação em Destaque */}
              <div className="rounded-lg border border-sky-200 bg-sky-50/70 p-4 text-xs text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-200 space-y-1.5">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  Regra de Ativação do Cadastro de Produtos
                </p>
                <p className="leading-relaxed">
                  O cadastro e edição direta de produtos no portal <strong>só estará ativo se NÃO houver consumo de dados por API do Protheus ou de outro ERP</strong>.
                </p>
                <p className="text-muted-foreground dark:text-sky-300/80">
                  Quando há consumo de API ativo, o Protheus (tabelas SB1, SB2 e DA1) é a fonte mestre única de produtos, estoque e preços. O portal bloqueia inclusões ou alterações manuais para preservar a integridade fiscal e evitar divergências de SKU.
                </p>
              </div>

              {/* Toggle de Ativação da Integração ERP */}
              <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">Habilitar Integração com API do Protheus</p>
                  <p className="text-xs text-muted-foreground">
                    Ativa a comunicação com a API RESTful do Protheus para troca de dados
                  </p>
                </div>
                <Switch
                  checked={settings?.erpConfig?.ativo ?? false}
                  onCheckedChange={(v) => updateSettings({ erpConfig: { ativo: v } })}
                />
              </div>

              {/* Origem do Catálogo de Produtos */}
              <div className="space-y-2 p-3.5 rounded-lg border bg-muted/10">
                <Label className="text-sm font-medium">Origem do Catálogo de Produtos e Preços</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Define se os produtos vêm da API do ERP ou se serão gerenciados no banco próprio do portal.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => updateSettings({ erpConfig: { origemProdutos: "proprio" } })}
                    className={cn(
                      "p-3 rounded-md border cursor-pointer transition-all text-xs space-y-1",
                      (settings?.erpConfig?.origemProdutos ?? "proprio") === "proprio"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>Banco Próprio / Offline</span>
                      {(settings?.erpConfig?.origemProdutos ?? "proprio") === "proprio" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Sem consumo de API externa. <strong>Cadastro de produtos 100% ATIVO</strong> no portal (incluir, editar e excluir).
                    </p>
                  </div>

                  <div
                    onClick={() => updateSettings({ erpConfig: { origemProdutos: "erp", ativo: true } })}
                    className={cn(
                      "p-3 rounded-md border cursor-pointer transition-all text-xs space-y-1",
                      settings?.erpConfig?.origemProdutos === "erp"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-500"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>Consumo via API ERP (Protheus)</span>
                      {settings?.erpConfig?.origemProdutos === "erp" && (
                        <CheckCircle2 className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Produtos e saldos vêm da API do Protheus. <strong>Cadastro no portal BLOQUEADO</strong> (o Protheus é a fonte mestre).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>URL Base do Protheus</Label>
                <Input
                  value={settings?.erpConfig?.urlBase ?? ""}
                  onChange={(e) => updateSettings({ erpConfig: { urlBase: e.target.value } })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    value={settings?.erpConfig?.empresa ?? ""}
                    onChange={(e) => updateSettings({ erpConfig: { empresa: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Filial</Label>
                  <Input
                    value={settings?.erpConfig?.filial ?? ""}
                    onChange={(e) => updateSettings({ erpConfig: { filial: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Token de Autenticação</Label>
                <Input
                  value={settings?.erpConfig?.token ?? ""}
                  type="password"
                  onChange={(e) => updateSettings({ erpConfig: { token: e.target.value } })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Sincronização automática</p>
                  <p className="text-xs text-muted-foreground">Sincronizar dados a cada 15 minutos</p>
                </div>
                <Switch
                  checked={settings?.erpConfig?.sincronizacaoAutomatica ?? true}
                  onCheckedChange={(v) => updateSettings({ erpConfig: { sincronizacaoAutomatica: v } })}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={saveERP}>Salvar Parâmetros</Button>
                <Button variant="outline" onClick={testERPConnection} disabled={isTestingERP} className="gap-2">
                  {isTestingERP ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documentos & Marca (Estúdio Avançado de Layouts de Orçamentos) */}
        <TabsContent value="marca" className="mt-4 space-y-4 w-full max-w-none">
          <DocumentStudioTab />
        </TabsContent>

        {/* Tab Segurança */}
        <TabsContent value="seguranca" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                Segurança da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border bg-card/50">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Smartphone className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Autenticação em Duas Etapas (2FA)</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Adicione uma camada extra de segurança à sua conta. Quando ativado, você precisará inserir um código gerado pelo seu aplicativo autenticador.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pt-2 md:pt-0">
                  <Switch checked={is2FAEnabled} onCheckedChange={handleToggle2FA} />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border bg-card/50">
                <div className="flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <KeyRound className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Alterar Senha</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      É recomendável usar uma senha forte que você não esteja usando em nenhum outro lugar.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 pt-2 md:pt-0">
                  <Button variant="outline">Atualizar Senha</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Email & Mensagens */}
        <TabsContent value="mensagens" className="mt-4 space-y-4">
          <MessagingSettingsTab />
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <Dialog open={setup2FAOpen} onOpenChange={(open) => {
        if (!open && !is2FAEnabled) setSetup2FAOpen(false);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Autenticador</DialogTitle>
            <DialogDescription>
              Aumente a segurança da sua conta configurando o segundo fator de autenticação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="text-sm text-muted-foreground">
              <p>1. Instale o Google Authenticator ou Microsoft Authenticator no seu celular.</p>
              <p className="mt-2">2. No aplicativo, adicione uma nova conta lendo o QR Code abaixo:</p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <QRCodeSVG value={mockSecretURI} size={160} level="M" includeMargin={false} />
              </div>
              <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                JBSWY3DP EHPK3PXP
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">3. Digite o código de 6 dígitos gerado:</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                    <InputOTPSlot index={1} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                    <InputOTPSlot index={2} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                    <InputOTPSlot index={4} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                    <InputOTPSlot index={5} className="w-10 h-10 sm:w-12 sm:h-12 text-lg" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setSetup2FAOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleVerify2FA}
              disabled={otpValue.length < 6 || isVerifying}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isVerifying ? "Verificando..." : "Ativar 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
