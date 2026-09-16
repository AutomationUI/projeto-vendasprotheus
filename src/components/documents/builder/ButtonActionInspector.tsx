import React from "react";
import { 
  Link, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Printer, 
  Mail, 
  ArrowDownCircle, 
  Download,
  ExternalLink,
  Sparkles,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ButtonActionConfig, ButtonActionType, QuoteDocumentData } from "@/types/document-template";
import { executeButtonAction } from "@/lib/button-action-executor";
import { useToast } from "@/hooks/use-toast";

interface ButtonActionInspectorProps {
  buttonConfig?: ButtonActionConfig;
  onChange: (updated: ButtonActionConfig) => void;
  quoteData?: QuoteDocumentData;
  showTestButton?: boolean;
}

const ACTION_TYPES: { type: ButtonActionType; label: string; icon: React.ElementType; desc: string }[] = [
  {
    type: "approve_quote",
    label: "Aprovar Proposta Comercial",
    icon: CheckCircle,
    desc: "Permite ao cliente aprovar o orçamento com 1 clique no portal interativo",
  },
  {
    type: "whatsapp",
    label: "Conversar no WhatsApp",
    icon: MessageSquare,
    desc: "Abre o WhatsApp com mensagem e número do consultor pré-preenchidos",
  },
  {
    type: "copy_pix",
    label: "Copiar Chave PIX",
    icon: Copy,
    desc: "Copia a chave PIX da empresa para a área de transferência do cliente",
  },
  {
    type: "link",
    label: "Abrir Link / Portal Web",
    icon: Link,
    desc: "Redireciona para o portal do cliente, catálogo online ou termos de serviço",
  },
  {
    type: "email_seller",
    label: "Enviar E-mail ao Vendedor",
    icon: Mail,
    desc: "Abre o cliente de e-mail com destinatário e assunto pré-configurados",
  },
  {
    type: "print_pdf",
    label: "Imprimir / Salvar PDF",
    icon: Printer,
    desc: "Abre a caixa de impressão/PDF do navegador",
  },
  {
    type: "reject_quote",
    label: "Recusar Proposta",
    icon: XCircle,
    desc: "Permite ao cliente registrar a recusa com justificativa",
  },
  {
    type: "download_file",
    label: "Baixar Catálogo / Anexo",
    icon: Download,
    desc: "Download direto de especificações técnicas ou manual de produtos",
  },
  {
    type: "scroll_to_block",
    label: "Rolar até Seção / Assinatura",
    icon: ArrowDownCircle,
    desc: "Rola a página suavemente até o bloco de aceite/assinatura",
  },
];

export function ButtonActionInspector({
  buttonConfig,
  onChange,
  quoteData,
  showTestButton = true,
}: ButtonActionInspectorProps) {
  const { toast } = useToast();

  const currentConfig: ButtonActionConfig = buttonConfig || {
    actionType: "approve_quote",
    variant: "primary",
    openInNewTab: true,
  };

  const handleChange = (partial: Partial<ButtonActionConfig>) => {
    onChange({
      ...currentConfig,
      ...partial,
    });
  };

  const handleTestAction = async () => {
    await executeButtonAction(currentConfig, {
      quoteData,
      onShowToast: (title, description) => toast({ title, description }),
      onApproveQuote: () => {
        toast({
          title: "Simulação: Proposta Aprovada!",
          description: "No portal do cliente, esta ação atualiza o status do orçamento no Protheus para Aprovado.",
        });
      },
      onRejectQuote: () => {
        toast({
          title: "Simulação: Proposta Recusada",
          description: "O cliente pode enviar o motivo da recusa diretamente para o vendedor.",
        });
      },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Ação Interativa do Botão</span>
        </div>

        {showTestButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestAction}
            className="h-6 text-[11px] gap-1 px-2 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950"
            title="Testar a execução da ação configurada"
          >
            <Play className="w-3 h-3 fill-current" />
            Testar Ação
          </Button>
        )}
      </div>

      {/* Tipo de Ação */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-slate-600 dark:text-slate-400">Tipo de Ação</Label>
        <Select
          value={currentConfig.actionType}
          onValueChange={(val: ButtonActionType) => handleChange({ actionType: val })}
        >
          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {ACTION_TYPES.map((act) => {
              const Icon = act.icon;
              return (
                <SelectItem key={act.type} value={act.type}>
                  <div className="flex items-center gap-2 py-0.5">
                    <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <div>
                      <span className="font-medium">{act.label}</span>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-slate-500 leading-tight">
          {ACTION_TYPES.find(a => a.type === currentConfig.actionType)?.desc}
        </p>
      </div>

      {/* Configurações específicas conforme o tipo de ação */}
      {currentConfig.actionType === "whatsapp" && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">Número WhatsApp (com DDD)</Label>
            <Input
              placeholder="(11) 98765-4321 ou em branco para usar o do Vendedor"
              value={currentConfig.phone || ""}
              onChange={(e) => handleChange({ phone: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
            <span className="text-[9px] text-slate-400">
              Se deixar em branco, o sistema utilizará a variável do consultor responsável.
            </span>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Mensagem Pré-formatada</Label>
            <Textarea
              rows={2}
              placeholder="Olá! Gostaria de aprovar a proposta {{orcamento.numero}} no valor de {{orcamento.totais.total}}."
              value={currentConfig.messageTemplate || ""}
              onChange={(e) => handleChange({ messageTemplate: e.target.value })}
              className="text-xs bg-white dark:bg-slate-800 resize-none"
            />
            <span className="text-[9px] text-slate-400">
              Suporta tags dinâmicas como {'{{orcamento.numero}}'} e {'{{cliente.nome}}'}.
            </span>
          </div>
        </div>
      )}

      {currentConfig.actionType === "link" && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">URL de Destino</Label>
            <div className="relative">
              <ExternalLink className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="https://suaempresa.com.br/portal-cliente"
                value={currentConfig.url || ""}
                onChange={(e) => handleChange({ url: e.target.value })}
                className="h-7 pl-7 text-xs bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Abrir em Nova Aba</Label>
            <Switch
              checked={currentConfig.openInNewTab !== false}
              onCheckedChange={(checked) => handleChange({ openInNewTab: checked })}
            />
          </div>
        </div>
      )}

      {currentConfig.actionType === "copy_pix" && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">Chave PIX ou Código Copia e Cola</Label>
            <Input
              placeholder="00.123.456/0001-78 ou chave aleatória"
              value={currentConfig.pixKey || ""}
              onChange={(e) => handleChange({ pixKey: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Mensagem de Confirmação</Label>
            <Input
              placeholder="Chave PIX copiada com sucesso!"
              value={currentConfig.confirmationMessage || ""}
              onChange={(e) => handleChange({ confirmationMessage: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      )}

      {currentConfig.actionType === "approve_quote" && (
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-[10px] leading-relaxed">
            ✨ <strong>Aprovação Interativa:</strong> No portal digital do cliente, este botão abre um modal de confirmação de assinatura/aceite com termos contratuais e registra o aceite com IP, data e hora.
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Mensagem de Sucesso</Label>
            <Input
              placeholder="Proposta aprovada com sucesso! Entraremos em contato para faturamento."
              value={currentConfig.confirmationMessage || ""}
              onChange={(e) => handleChange({ confirmationMessage: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      )}

      {currentConfig.actionType === "email_seller" && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">E-mail de Destino</Label>
            <Input
              placeholder="vendas@empresa.com.br (em branco = e-mail do vendedor)"
              value={currentConfig.emailTo || ""}
              onChange={(e) => handleChange({ emailTo: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Assunto do E-mail</Label>
            <Input
              placeholder="Aprovação do Orçamento {{orcamento.numero}}"
              value={currentConfig.emailSubject || ""}
              onChange={(e) => handleChange({ emailSubject: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      )}

      {currentConfig.actionType === "download_file" && (
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">URL do Arquivo / Catálogo</Label>
            <Input
              placeholder="https://suaempresa.com.br/arquivos/catalogo-2026.pdf"
              value={currentConfig.downloadUrl || ""}
              onChange={(e) => handleChange({ downloadUrl: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Nome do Arquivo ao Salvar</Label>
            <Input
              placeholder="catalogo-produtos.pdf"
              value={currentConfig.fileName || ""}
              onChange={(e) => handleChange({ fileName: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      )}

      {currentConfig.actionType === "scroll_to_block" && (
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <Label className="text-[11px]">ID ou Nome da Seção Alvo</Label>
            <Input
              placeholder="Ex: block-signature ou termos"
              value={currentConfig.targetBlockId || ""}
              onChange={(e) => handleChange({ targetBlockId: e.target.value })}
              className="h-7 text-xs bg-white dark:bg-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
