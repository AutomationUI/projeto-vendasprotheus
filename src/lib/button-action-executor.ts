import { ButtonActionConfig, QuoteDocumentData } from "@/types/document-template";
import { copyToClipboard } from "@/lib/utils";

export interface ActionExecutionContext {
  quoteData?: QuoteDocumentData;
  onApproveQuote?: () => void;
  onRejectQuote?: () => void;
  onShowToast?: (title: string, description?: string) => void;
}

export function interpolateActionText(template: string = "", quoteData?: QuoteDocumentData): string {
  if (!template || !quoteData) return template;

  const fmtBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const variables: Record<string, string> = {
    "{{cliente.nome}}": quoteData.cliente?.nome || "",
    "{{cliente.razaoSocial}}": quoteData.cliente?.razaoSocial || quoteData.cliente?.nome || "",
    "{{cliente.cnpjCpf}}": quoteData.cliente?.cnpjCpf || "",
    "{{cliente.telefone}}": quoteData.cliente?.telefone || "",
    "{{cliente.email}}": quoteData.cliente?.email || "",
    "{{orcamento.numero}}": String(quoteData.numero || ""),
    "{{orcamento.dataEmissao}}": quoteData.dataEmissao || new Date().toLocaleDateString("pt-BR"),
    "{{orcamento.dataValidade}}": quoteData.dataValidade || "",
    "{{orcamento.totais.total}}": fmtBRL(quoteData.totais?.valorTotal),
    "{{orcamento.condicoes.pagamento}}": quoteData.condicoes?.pagamento || "",
    "{{vendedor.nome}}": quoteData.vendedor?.nome || "",
    "{{vendedor.telefone}}": quoteData.vendedor?.telefone || "",
    "{{vendedor.email}}": quoteData.vendedor?.email || "",
  };

  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.split(key).join(value);
  }
  return result;
}

export async function executeButtonAction(
  config?: ButtonActionConfig,
  context?: ActionExecutionContext
): Promise<boolean> {
  if (!config) {
    context?.onShowToast?.("Ação não configurada", "Este botão não possui uma ação definida.");
    return false;
  }

  const { actionType } = config;
  const quoteData = context?.quoteData;

  switch (actionType) {
    case "whatsapp": {
      const rawPhone = config.phone || quoteData?.vendedor?.telefone || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      
      const defaultMsg = `Olá! Gostaria de falar sobre o Orçamento ${quoteData?.numero || ""} no valor de ${quoteData?.totais?.valorTotal ? "R$ " + quoteData.totais.valorTotal : ""}.`;
      const msg = interpolateActionText(config.messageTemplate || defaultMsg, quoteData);
      
      const url = cleanPhone 
        ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;

      window.open(url, "_blank", "noopener,noreferrer");
      context?.onShowToast?.(
        "Abrindo WhatsApp...",
        cleanPhone ? `Iniciando conversa com ${rawPhone}` : "Iniciando conversa no WhatsApp"
      );
      return true;
    }

    case "link": {
      if (!config.url) {
        context?.onShowToast?.("Link vazio", "Por favor, configure o endereço URL do botão.");
        return false;
      }
      const finalUrl = interpolateActionText(config.url, quoteData);
      const target = config.openInNewTab !== false ? "_blank" : "_self";
      window.open(finalUrl, target, target === "_blank" ? "noopener,noreferrer" : undefined);
      return true;
    }

    case "copy_pix": {
      const pixKey = interpolateActionText(config.pixKey || "00.123.456/0001-78", quoteData);
      try {
        await copyToClipboard(pixKey);
        context?.onShowToast?.(
          "Chave PIX Copiada!",
          config.confirmationMessage || `Chave ${pixKey} copiada para a área de transferência.`
        );
        return true;
      } catch {
        context?.onShowToast?.("Falha ao copiar PIX", "Não foi possível copiar para a área de transferência.");
        return false;
      }
    }

    case "approve_quote": {
      if (context?.onApproveQuote) {
        context.onApproveQuote();
      } else {
        context?.onShowToast?.(
          "Proposta Aprovada!",
          config.confirmationMessage || `O orçamento ${quoteData?.numero || ""} foi aceito pelo cliente com sucesso.`
        );
      }
      return true;
    }

    case "reject_quote": {
      if (context?.onRejectQuote) {
        context.onRejectQuote();
      } else {
        context?.onShowToast?.(
          "Proposta Recusada",
          config.confirmationMessage || "A recusa da proposta foi registrada no sistema."
        );
      }
      return true;
    }

    case "print_pdf": {
      window.print();
      return true;
    }

    case "email_seller": {
      const emailTo = config.emailTo || quoteData?.vendedor?.email || "";
      const defaultSubject = `Aprovação de Proposta / Orçamento ${quoteData?.numero || ""}`;
      const subject = interpolateActionText(config.emailSubject || defaultSubject, quoteData);
      const body = interpolateActionText(config.emailBody || `Olá,\n\nSegue confirmação referente ao orçamento ${quoteData?.numero || ""}.\n\nAtenciosamente,`, quoteData);
      
      const mailtoUrl = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
      return true;
    }

    case "scroll_to_block": {
      if (!config.targetBlockId) return false;
      const targetEl = document.getElementById(`doc-block-${config.targetBlockId}`) || 
                       document.getElementById(config.targetBlockId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    }

    case "download_file": {
      if (!config.downloadUrl) {
        context?.onShowToast?.("Link de download ausente", "Configure a URL do arquivo a ser baixado.");
        return false;
      }
      const a = document.createElement("a");
      a.href = interpolateActionText(config.downloadUrl, quoteData);
      a.download = config.fileName || "documento.pdf";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    default:
      return false;
  }
}
