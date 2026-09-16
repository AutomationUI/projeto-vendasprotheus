import { DocumentBlock, DocumentTemplatePreset, QuoteDocumentData, DocumentLayoutArchetype } from "@/types/document-template";
import { AppSettings } from "@/lib/settings-store";
import { interpolateDocumentVariables } from "@/lib/document-variables";

/**
 * Utilitário para formatar moeda em Reais (BRL)
 */
function formatBRL(val?: number): string {
  if (val === undefined || isNaN(val)) return "R$ 0,00";
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Utilitário para formatar data BR
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

/**
 * Converte propriedades de estilo de bloco em string CSS inline
 */
export function blockStyleToCss(style?: DocumentBlock["style"]): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.backgroundColor) parts.push(`background-color: ${style.backgroundColor};`);
  if (style.textColor) parts.push(`color: ${style.textColor};`);
  if (style.borderColor) parts.push(`border-color: ${style.borderColor};`);
  if (style.borderWidth !== undefined) parts.push(`border-width: ${style.borderWidth}px;`);
  if (style.borderStyle) parts.push(`border-style: ${style.borderStyle};`);
  if (style.borderRadius !== undefined) parts.push(`border-radius: ${style.borderRadius}px;`);
  if (style.paddingTop !== undefined) parts.push(`padding-top: ${style.paddingTop}px;`);
  if (style.paddingBottom !== undefined) parts.push(`padding-bottom: ${style.paddingBottom}px;`);
  if (style.paddingLeft !== undefined) parts.push(`padding-left: ${style.paddingLeft}px;`);
  if (style.paddingRight !== undefined) parts.push(`padding-right: ${style.paddingRight}px;`);
  if (style.marginTop !== undefined) parts.push(`margin-top: ${style.marginTop}px;`);
  if (style.marginBottom !== undefined) parts.push(`margin-bottom: ${style.marginBottom}px;`);
  if (style.textAlign) parts.push(`text-align: ${style.textAlign};`);
  if (style.fontSize) parts.push(`font-size: ${style.fontSize}px;`);
  if (style.fontWeight) parts.push(`font-weight: ${style.fontWeight};`);
  if (style.opacity !== undefined) parts.push(`opacity: ${style.opacity};`);
  return parts.join(" ");
}

/**
 * Gera o HTML individual para cada tipo de bloco do orçamento
 */
export function generateBlockHtml(
  block: DocumentBlock,
  data: QuoteDocumentData,
  settings: AppSettings,
  archetype: DocumentLayoutArchetype = "executivo",
  rawVariables: boolean = false
): string {
  if (block.hidden) return "";

  const tConfig = settings.templateConfig || {};
  const primaryColor = tConfig.primaryColor || "#0f172a";
  const accentColor = tConfig.accentColor || "#0284c7";
  const headerBg = tConfig.headerBgColor || primaryColor;
  const headerText = tConfig.headerTextColor || "#ffffff";
  const cssStyle = blockStyleToCss(block.style);

  // Helper para interpolar se não estiver no modo de variáveis brutas
  const resolveText = (text?: string): string => {
    if (!text) return "";
    return rawVariables ? text : interpolateDocumentVariables(text, data);
  };

  // Se o bloco possui elementos internos compostos (custom_block / editado pelo editor interno)
  if ((block.elements && block.elements.length > 0) || block.type === "custom_block" || block.type === "reusable_block") {
    const elements = block.elements || [];
    const minH = block.style?.minHeight || 120;
    
    const elementsHtml = elements.map(el => {
      const elCssStyle: string[] = [
        `position: absolute;`,
        `left: ${el.x}px;`,
        `top: ${el.y}px;`,
        `width: ${el.width}px;`,
        el.height ? `height: ${el.height}px;` : `height: auto;`,
        `z-index: ${el.zIndex || 1};`,
        el.style?.backgroundColor ? `background-color: ${el.style.backgroundColor};` : "",
        el.style?.textColor ? `color: ${el.style.textColor};` : "",
        el.style?.borderColor ? `border-color: ${el.style.borderColor};` : "",
        el.style?.borderWidth ? `border-width: ${el.style.borderWidth}px; border-style: solid;` : "",
        el.style?.borderRadius !== undefined ? `border-radius: ${el.style.borderRadius}px;` : "",
        el.style?.fontSize ? `font-size: ${el.style.fontSize}px;` : "",
        el.style?.fontWeight ? `font-weight: ${el.style.fontWeight};` : "",
        el.style?.textAlign ? `text-align: ${el.style.textAlign};` : "",
        el.style?.opacity !== undefined ? `opacity: ${el.style.opacity};` : "",
        el.style?.padding ? `padding: ${el.style.padding}px;` : "",
        el.style?.boxShadow ? `box-shadow: ${el.style.boxShadow};` : "",
        el.style?.letterSpacing ? `letter-spacing: ${el.style.letterSpacing};` : "",
        `box-sizing: border-box;`,
      ].filter(Boolean).join(" ");

      const rawContent = el.content || (el.variableTag ? el.variableTag : "");
      const interpolated = resolveText(rawContent);

      if (el.type === "divider") {
        return `        <div class="doc-el-divider" style="position: absolute; left: ${el.x}px; top: ${el.y}px; width: ${el.width}px; border-top: ${el.style?.borderWidth || 1}px solid ${el.style?.borderColor || "#cbd5e1"}; z-index: ${el.zIndex || 1};"></div>`;
      }

      if (el.type === "shape") {
        return `        <div class="doc-el-shape" style="${elCssStyle}"></div>`;
      }

      if (el.type === "qr_code") {
        return `        <div class="doc-el-qrcode" style="${elCssStyle} display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 4px; padding: 4px;">
          <svg viewBox="0 0 24 24" width="${Math.max(24, Math.min(el.width - 12, (el.height || el.width) - 12))}" height="${Math.max(24, Math.min(el.width - 12, (el.height || el.width) - 12))}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #0f172a;">
            <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
          </svg>
        </div>`;
      }

      if (el.type === "image") {
        return `        <div class="doc-el-image" style="${elCssStyle} overflow: hidden; display: flex; align-items: center; justify-content: center;">
          ${el.config?.url 
            ? `<img src="${el.config.url}" alt="${el.name || "Imagem"}" style="width: 100%; height: 100%; object-fit: contain;" />` 
            : `<div style="width: 100%; height: 100%; background-color: #f1f5f9; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #94a3b8;">Imagem</div>`
          }
        </div>`;
      }

      if (el.type === "button") {
        const btnConfig = el.buttonConfig;
        let href = "#";
        const target = btnConfig?.openInNewTab ? "_blank" : "_self";
        let onClickAttr = "";

        if (btnConfig?.actionType === "whatsapp") {
          const rawPhone = btnConfig.phone || data.vendedor?.telefone || "";
          const cleanPhone = rawPhone.replace(/\D/g, "");
          const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          const msg = encodeURIComponent(btnConfig.customMessage || `Olá, gostaria de falar sobre o orçamento #${data.numero}`);
          href = `https://wa.me/${phoneWithCountry}?text=${msg}`;
        } else if (btnConfig?.actionType === "link" && btnConfig.url) {
          href = btnConfig.url;
        } else if (btnConfig?.actionType === "print_pdf" || btnConfig?.actionType === "download_file") {
          onClickAttr = `onclick="window.print(); return false;"`;
        }

        return `        <a href="${href}" target="${target}" ${onClickAttr} class="doc-el-button" style="${elCssStyle} display: flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold; cursor: pointer; text-align: center;">
          <span>${interpolated || el.name || "Botão"}</span>
        </a>`;
      }

      if (el.type === "badge") {
        return `        <div class="doc-el-badge" style="${elCssStyle} display: flex; align-items: center; justify-content: center; font-weight: bold; text-align: center;">
          <span>${interpolated || el.name || "Badge"}</span>
        </div>`;
      }

      if (el.type === "heading") {
        return `        <h3 class="doc-el-heading" style="${elCssStyle} margin: 0; line-height: 1.3;">
          ${interpolated || el.name || "Título"}
        </h3>`;
      }

      return `        <div class="doc-el-text" style="${elCssStyle} white-space: pre-wrap; word-break: break-word; line-height: 1.4;">
          ${interpolated}
        </div>`;
    }).join("\n");

    return `
      <!-- Bloco Composto: ${block.title || "Bloco Personalizado"} -->
      <section class="doc-composed-block" style="position: relative; width: 100%; min-height: ${minH}px; overflow: hidden; margin-bottom: 12px; ${cssStyle}">
${elementsHtml}
      </section>`;
  }

  switch (block.type) {
    case "header": {
      const showLogo = block.config?.showLogo ?? true;
      const showSocial = block.config?.showSocial ?? true;
      const showBadge = block.config?.showBadge ?? true;
      const isBanner = block.config?.bannerMode ?? (archetype === "executivo" || archetype === "moderno");

      const docTipoLabel = rawVariables ? "{{orcamento.tipo}}" : (data.tipo === "pedido" ? "Pedido de Venda" : "Proposta Comercial");
      const docNumero = rawVariables ? "{{orcamento.numero}}" : `#${data.numero}`;
      const docEmissao = rawVariables ? "{{orcamento.data_emissao}}" : formatDate(data.dataEmissao);
      const docValidade = rawVariables ? "{{orcamento.data_validade}}" : formatDate(data.dataValidade);
      const companyName = rawVariables ? "{{empresa.nome}}" : (tConfig.logoText || "VendasProtheus ERP");
      const companyRazao = rawVariables ? "{{empresa.razao_social}}" : (tConfig.empresaRazaoSocial || "");
      const companyCnpj = rawVariables ? "{{empresa.cnpj}}" : (tConfig.empresaCnpj || "");
      const companyTel = rawVariables ? "{{empresa.telefone}}" : (tConfig.empresaTelefone || "");
      const companyEmail = rawVariables ? "{{empresa.email}}" : (tConfig.empresaEmail || "");

      if (isBanner) {
        return `
        <!-- Bloco: Cabeçalho Banner -->
        <header class="doc-header-banner" style="background-color: ${block.style?.backgroundColor || headerBg}; color: ${block.style?.textColor || headerText}; border-radius: ${block.style?.borderRadius ?? 8}px; padding: ${block.style?.paddingTop ?? 24}px; margin-bottom: ${block.style?.marginBottom ?? 20}px; ${cssStyle}">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              ${showLogo && tConfig.logoImage ? `
                <div style="background: #ffffff; padding: 8px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <img src="${tConfig.logoImage}" alt="Logo" style="height: 48px; max-width: 150px; object-fit: contain;" />
                </div>
              ` : `
                <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">
                  🏢
                </div>
              `}
              <div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em;">${companyName}</h1>
                ${companyRazao ? `<p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.85;">${companyRazao}</p>` : ""}
                ${showSocial ? `
                  <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 6px; font-size: 11px; opacity: 0.8;">
                    ${companyCnpj ? `<span>CNPJ: ${companyCnpj}</span>` : ""}
                    ${companyTel ? `<span>Tel: ${companyTel}</span>` : ""}
                    ${companyEmail ? `<span>${companyEmail}</span>` : ""}
                  </div>
                ` : ""}
              </div>
            </div>
            <div style="text-align: right;">
              ${showBadge ? `
                <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${accentColor}; color: #ffffff; margin-bottom: 4px;">
                  ${docTipoLabel}
                </span>
              ` : ""}
              <div style="font-size: 24px; font-weight: 900; font-family: monospace; letter-spacing: -0.03em;">${docNumero}</div>
              <div style="font-size: 11px; opacity: 0.85; margin-top: 2px;">
                Emissão: ${docEmissao} | Validade: ${docValidade}
              </div>
            </div>
          </div>
        </header>`;
      }

      return `
      <!-- Bloco: Cabeçalho Clássico -->
      <header class="doc-header-classic" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 2px solid ${primaryColor}; ${cssStyle}">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${showLogo && tConfig.logoImage ? `
            <img src="${tConfig.logoImage}" alt="Logo" style="height: 48px; max-width: 150px; object-fit: contain;" />
          ` : `
            <div style="width: 42px; height: 42px; background: rgba(15,23,42,0.08); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 18px;">🏢</div>
          `}
          <div>
            <h1 style="margin: 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">${companyName}</h1>
            ${companyRazao ? `<p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${companyRazao}</p>` : ""}
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 16px; font-weight: bold; color: ${primaryColor};">${docTipoLabel} ${docNumero}</h2>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Emissão: ${docEmissao} | Validade: ${docValidade}</p>
        </div>
      </header>`;
    }

    case "client_info": {
      const showAddress = block.config?.showAddress ?? true;
      const showSeller = block.config?.showSeller ?? true;

      const clientName = rawVariables ? "{{cliente.nome}}" : (data.cliente?.nome || "Cliente");
      const clientTaxId = rawVariables ? "{{cliente.cnpj_cpf}}" : (data.cliente?.cnpjCpf || "-");
      const clientEmail = rawVariables ? "{{cliente.email}}" : (data.cliente?.email || "-");
      const clientPhone = rawVariables ? "{{cliente.telefone}}" : (data.cliente?.telefone || "-");
      const clientAddress = rawVariables ? "{{cliente.endereco_completo}}" : `${data.cliente?.endereco || ""}, ${data.cliente?.cidade || ""} - ${data.cliente?.estado || ""}`;
      const sellerName = rawVariables ? "{{vendedor.nome}}" : (data.vendedor?.nome || "-");
      const sellerEmail = rawVariables ? "{{vendedor.email}}" : (data.vendedor?.email || "");

      return `
      <!-- Bloco: Dados do Cliente & Contato -->
      <section class="doc-client-info" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; ${cssStyle}">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          <div>
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 4px; letter-spacing: 0.05em;">Destinatário / Cliente</span>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a;">${clientName}</div>
            <div style="font-size: 12px; color: #475569; margin-top: 2px;">CNPJ/CPF: ${clientTaxId}</div>
            <div style="font-size: 12px; color: #475569;">Email: ${clientEmail} | Tel: ${clientPhone}</div>
            ${showAddress ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">📍 ${clientAddress}</div>` : ""}
          </div>
          ${showSeller ? `
          <div style="border-left: 1px dashed #cbd5e1; padding-left: 16px;">
            <span style="display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: ${primaryColor}; margin-bottom: 4px; letter-spacing: 0.05em;">Atendimento Comercial</span>
            <div style="font-size: 13px; font-weight: 600; color: #0f172a;">${sellerName}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${sellerEmail}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Departamento de Vendas Protheus</div>
          </div>
          ` : ""}
        </div>
      </section>`;
    }

    case "products_table": {
      const showPhotos = block.config?.showPhotos ?? false;
      const showNcm = block.config?.showNcm ?? false;
      const showDelivery = block.config?.showDelivery ?? false;
      const zebra = block.config?.zebra ?? true;

      const itemsRows = rawVariables ? `
        <tr>
          <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #64748b;">{{item.codigo}}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">
            <div>{{item.descricao}}</div>
            <div style="font-size: 10px; color: #64748b;">{{item.especificacao}}</div>
          </td>
          <td style="padding: 10px 12px; text-align: center; font-weight: 600;">{{item.quantidade}} {{item.unidade}}</td>
          <td style="padding: 10px 12px; text-align: right; color: #334155;">{{item.preco_unitario}}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">{{item.subtotal}}</td>
        </tr>
      ` : (data.itens || []).map((it, idx) => `
        <tr style="background-color: ${zebra && idx % 2 === 1 ? "#f8fafc" : "#ffffff"}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-family: monospace; font-size: 11px; color: #64748b;">${it.codigo}</td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 600; font-size: 12px; color: #0f172a;">${it.descricao}</div>
            ${it.especificacao ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${it.especificacao}</div>` : ""}
          </td>
          <td style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #0f172a;">
            ${it.quantidade} <span style="font-size: 10px; color: #64748b; font-weight: normal;">${it.unidade}</span>
          </td>
          <td style="padding: 10px 12px; text-align: right; font-size: 12px; color: #334155;">${formatBRL(it.precoUnitario)}</td>
          <td style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">${formatBRL(it.subtotal)}</td>
        </tr>
      `).join("");

      return `
      <!-- Bloco: Tabela de Itens / Produtos -->
      <section class="doc-products-table" style="margin-bottom: 18px; ${cssStyle}">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
          <thead>
            <tr style="background-color: ${primaryColor}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;">
              <th style="padding: 10px 12px; width: 100px;">Cód.</th>
              <th style="padding: 10px 12px;">Descrição do Produto / Serviço</th>
              <th style="padding: 10px 12px; text-align: center; width: 90px;">Qtd</th>
              <th style="padding: 10px 12px; text-align: right; width: 120px;">Unitário</th>
              <th style="padding: 10px 12px; text-align: right; width: 130px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </section>`;
    }

    case "totals_summary": {
      const showHighlight = block.config?.showHighlight ?? true;
      const subtotal = rawVariables ? "{{orcamento.subtotal}}" : formatBRL(data.totais?.subtotalProdutos);
      const discount = rawVariables ? "{{orcamento.desconto}}" : formatBRL(data.totais?.descontoTotal);
      const taxes = rawVariables ? "{{orcamento.impostos}}" : formatBRL(data.totais?.valorImpostos);
      const total = rawVariables ? "{{orcamento.total}}" : formatBRL(data.totais?.valorTotal);

      return `
      <!-- Bloco: Resumo Financeiro / Totais -->
      <section class="doc-totals-summary" style="display: flex; justify-content: flex-end; margin-bottom: 20px; ${cssStyle}">
        <div style="width: 100%; max-width: 320px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="padding: 12px 16px; font-size: 12px; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #475569;">
              <span>Subtotal dos Itens:</span>
              <span style="font-weight: 600; color: #0f172a;">${subtotal}</span>
            </div>
            ${data.totais?.descontoTotal || rawVariables ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #16a34a;">
                <span>Desconto Aplicado:</span>
                <span style="font-weight: 600;">- ${discount}</span>
              </div>
            ` : ""}
            <div style="display: flex; justify-content: space-between; color: #475569;">
              <span>Impostos / Tributos:</span>
              <span style="font-weight: 600; color: #0f172a;">${taxes}</span>
            </div>
          </div>
          <div style="background-color: ${showHighlight ? primaryColor : "#e2e8f0"}; color: ${showHighlight ? "#ffffff" : "#0f172a"}; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em;">Valor Total:</span>
            <span style="font-size: 18px; font-weight: 900; font-family: monospace;">${total}</span>
          </div>
        </div>
      </section>`;
    }

    case "pix_payment": {
      const pixKey = rawVariables ? "{{pix.chave}}" : (block.config?.pixKey || settings.documentConfig?.sections?.pixKey || "12.345.678/0001-90");
      const pixName = rawVariables ? "{{pix.favorecido}}" : (block.config?.pixBeneficiaryName || settings.documentConfig?.sections?.pixBeneficiaryName || tConfig.empresaRazaoSocial || "VENDAS PROTHEUS ERP");
      const totalAmount = rawVariables ? "{{orcamento.total}}" : formatBRL(data.totais?.valorTotal);

      return `
      <!-- Bloco: Pagamento Instantâneo via PIX -->
      <section class="doc-pix-payment" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; ${cssStyle}">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; color: #15803d; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
            <span>⚡ Pagamento via PIX Instantâneo</span>
          </div>
          <div style="font-size: 12px; color: #166534;">
            Chave PIX: <code style="background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-family: monospace;">${pixKey}</code>
          </div>
          <div style="font-size: 11px; color: #15803d; margin-top: 2px;">
            Favorecido: <strong>${pixName}</strong> | Valor: <strong>${totalAmount}</strong>
          </div>
        </div>
        <div style="width: 64px; height: 64px; background: #ffffff; border: 1px solid #86efac; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px;">
          📱
        </div>
      </section>`;
    }

    case "commercial_terms": {
      const terms = resolveText(block.config?.commercialText || block.content || "Pagamento em 30/60 dias faturado via boleto bancário mediante aprovação de crédito.");
      const warranty = resolveText(block.config?.warrantyText || "12 meses de garantia integral contra defeitos de fabricação e suporte técnico especializado.");

      return `
      <!-- Bloco: Condições Comerciais e Garantia -->
      <section class="doc-commercial-terms" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; ${cssStyle}">
        <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.05em;">
          Condições Comerciais & Prazos
        </h3>
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #334155; line-height: 1.5;">${terms}</p>
        ${warranty ? `<p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;"><strong>Garantia:</strong> ${warranty}</p>` : ""}
      </section>`;
    }

    case "signatures": {
      const terms = resolveText(block.config?.termsText || "Ao assinar ou confirmar este documento, o cliente declara concordar integralmente com os valores, quantidades e termos aqui apresentados.");
      const clientName = rawVariables ? "{{cliente.nome}}" : (data.cliente?.nome || "Cliente Responsável");
      const sellerName = rawVariables ? "{{vendedor.nome}}" : (data.vendedor?.nome || "Consultor Comercial");

      return `
      <!-- Bloco: Termo de Aceite e Assinaturas -->
      <section class="doc-signatures" style="margin-top: 24px; margin-bottom: 20px; page-break-inside: avoid; ${cssStyle}">
        <p style="font-size: 10px; color: #64748b; text-align: center; margin-bottom: 24px; line-height: 1.4;">${terms}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center;">
          <div>
            <div style="border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${clientName}</div>
            <div style="font-size: 10px; color: #64748b;">De Acordo / Assinatura do Cliente</div>
          </div>
          <div>
            <div style="border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px;"></div>
            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">${sellerName}</div>
            <div style="font-size: 10px; color: #64748b;">Representante / Vendas Protheus</div>
          </div>
        </div>
      </section>`;
    }

    case "heading": {
      const headingText = resolveText(block.content || block.title || "Título da Seção");
      return `
      <!-- Bloco: Título / Cabeçalho de Seção -->
      <h2 style="font-size: ${block.style?.fontSize || 16}px; font-weight: ${block.style?.fontWeight || "bold"}; color: ${block.style?.textColor || primaryColor}; margin: 16px 0 8px 0; ${cssStyle}">
        ${headingText}
      </h2>`;
    }

    case "text": {
      const textContent = resolveText(block.content || "Parágrafo de texto descritivo.");
      return `
      <!-- Bloco: Parágrafo de Texto -->
      <p style="font-size: ${block.style?.fontSize || 12}px; color: ${block.style?.textColor || "#334155"}; line-height: 1.6; margin: 8px 0; ${cssStyle}">
        ${textContent}
      </p>`;
    }

    case "card": {
      const cardContent = resolveText(block.content || "Conteúdo do cartão informativo.");
      return `
      <!-- Bloco: Card Informativo -->
      <div class="doc-card" style="background-color: ${block.style?.backgroundColor || "#f8fafc"}; border: 1px solid ${block.style?.borderColor || "#e2e8f0"}; border-radius: ${block.style?.borderRadius || 8}px; padding: 14px 18px; margin-bottom: 14px; ${cssStyle}">
        ${block.title ? `<h4 style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: ${primaryColor};">${block.title}</h4>` : ""}
        <div style="font-size: 12px; color: #334155; line-height: 1.5;">${cardContent}</div>
      </div>`;
    }

    case "button": {
      const btnText = resolveText(block.content || block.title || "Aprovar Proposta");
      const btnBg = block.style?.backgroundColor || primaryColor;
      const btnColor = block.style?.textColor || "#ffffff";
      return `
      <!-- Bloco: Botão de Ação -->
      <div class="doc-block-button" style="text-align: ${block.style?.textAlign || "center"}; margin: 16px 0; ${cssStyle}">
        <a href="#" onclick="window.print(); return false;" style="display: inline-block; background-color: ${btnBg}; color: ${btnColor}; padding: 10px 24px; border-radius: ${block.style?.borderRadius || 8}px; font-weight: bold; font-size: ${block.style?.fontSize || 14}px; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${btnText}
        </a>
      </div>`;
    }

    case "divider": {
      return `
      <!-- Bloco: Divisor / Linha Separadora -->
      <hr style="border: none; border-top: ${block.style?.borderWidth || 1}px ${block.style?.borderStyle || "solid"} ${block.style?.borderColor || "#e2e8f0"}; margin: 16px 0; ${cssStyle}" />`;
    }

    case "spacer": {
      const height = block.config?.height || block.style?.paddingTop || 24;
      return `
      <!-- Bloco: Espaçador Vertical -->
      <div style="height: ${height}px; ${cssStyle}"></div>`;
    }

    case "custom_html": {
      const rawHtml = resolveText(block.content || "<!-- Código HTML customizado -->");
      return `
      <!-- Bloco: HTML Customizado -->
      <div class="doc-custom-html" style="${cssStyle}">
        ${rawHtml}
      </div>`;
    }

    case "footer": {
      const footerText = resolveText(block.content || tConfig.footerText || "Proposta gerada automaticamente pelo sistema VendasProtheus ERP.");
      return `
      <!-- Bloco: Rodapé do Documento -->
      <footer class="doc-footer" style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: ${block.style?.textAlign || "center"}; display: flex; justify-content: space-between; align-items: center; ${cssStyle}">
        <span>${footerText}</span>
        <span>Página 1 de 1</span>
      </footer>`;
    }

    default: {
      const content = resolveText(block.content || block.title || "");
      return `
      <div class="doc-block-${block.type}" style="${cssStyle}">
        ${content}
      </div>`;
    }
  }
}

/**
 * Gera o documento HTML completo e independente (com tags <!DOCTYPE html>, estilos CSS e metadados)
 */
export function generateFullDocumentHtml(
  preset: DocumentTemplatePreset,
  blocks: DocumentBlock[],
  data: QuoteDocumentData,
  settings: AppSettings,
  options: { rawVariables?: boolean; title?: string } = {}
): string {
  const { rawVariables = false, title = `Orçamento_${data.numero || "Modelo"}` } = options;
  const tConfig = settings.templateConfig || {};
  const primaryColor = preset.colors?.primary || tConfig.primaryColor || "#0f172a";
  const fontFamily = preset.fontFamily || tConfig.fontFamily || "sans";
  const fontCss = fontFamily === "serif" ? "Georgia, serif" : fontFamily === "mono" ? "'Courier New', monospace" : "'Inter', system-ui, -apple-system, sans-serif";

  const renderedBlocksHtml = blocks
    .map(block => generateBlockHtml(block, data, settings, preset.archetype, rawVariables))
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${preset.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* Estilos Globais do Documento A4 */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #f1f5f9;
      font-family: ${fontCss};
      color: #0f172a;
      line-height: 1.5;
      padding: 20px;
      display: flex;
      justify-content: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .a4-page {
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 18mm;
      position: relative;
      overflow: hidden;
      margin: 0 auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    img {
      max-width: 100%;
    }

    /* Regras de Impressão */
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .a4-page {
        box-shadow: none;
        padding: 14mm;
        width: 100%;
        min-height: auto;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="a4-page">
${renderedBlocksHtml}
  </div>
</body>
</html>`;
}
