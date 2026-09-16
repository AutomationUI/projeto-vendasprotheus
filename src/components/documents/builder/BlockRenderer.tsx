import React from "react";
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  QrCode, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  CreditCard
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { DocumentBlock, QuoteDocumentData, DocumentLayoutArchetype } from "@/types/document-template";
import { AppSettings } from "@/lib/settings-store";
import { VariableHighlightBadge, renderRichTextWithVariables } from "./VariableHighlightBadge";

interface BlockRendererProps {
  block: DocumentBlock;
  data: QuoteDocumentData;
  settings: AppSettings;
  archetype?: DocumentLayoutArchetype;
  isCanvas?: boolean;
  highlightVariables?: boolean;
  selectedVariableTag?: string | null;
  activeCategoryFilter?: string | null;
  onSelectFieldOrVariable?: (info: { blockId?: string; fieldName?: string; variableTag?: string }) => void;
}

export const BlockRenderer = React.memo(function BlockRenderer({
  block,
  data,
  settings,
  archetype = "executivo",
  isCanvas = false,
  highlightVariables = false,
  selectedVariableTag = null,
  activeCategoryFilter = null,
  onSelectFieldOrVariable,
}: BlockRendererProps) {
  if (block.hidden) return null;

  const tConfig = settings.templateConfig;
  const primaryColor = tConfig.primaryColor || "#0f172a";
  const accentColor = tConfig.accentColor || "#0284c7";
  const headerBg = tConfig.headerBgColor || primaryColor;
  const headerText = tConfig.headerTextColor || "#ffffff";

  const fmtBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fmtDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const now = new Date();

  // Determinar se o bloco está em um container pequeno para ajuste proporcional
  const blockWidth = block.style?.width || "full";
  const isSmall = ["1/5", "1/4", "1/3"].includes(blockWidth);
  const isMedium = ["2/5", "1/2", "3/5"].includes(blockWidth);
  
  // Ajuste de escala de texto baseado na largura do bloco
  const textScaleClass = isSmall ? "text-[10px]" : isMedium ? "text-[11px]" : "text-xs";
  const titleScaleClass = isSmall ? "text-sm" : isMedium ? "text-base" : "text-lg";
  const headerTitleScaleClass = isSmall ? "text-base" : isMedium ? "text-lg" : "text-xl";
  const spacingClass = isSmall ? "gap-2" : isMedium ? "gap-3" : "gap-4";

  // Dicionário com todos os valores interpolados
  const variablesMap: Record<string, string> = {
    "{{cliente.nome}}": data?.cliente?.nome || "",
    "{{cliente.razaoSocial}}": data?.cliente?.razaoSocial || data?.cliente?.nome || "",
    "{{cliente.cnpjCpf}}": data?.cliente?.cnpjCpf || "",
    "{{cliente.inscricaoEstadual}}": data?.cliente?.inscricaoEstadual || "",
    "{{cliente.endereco}}": data?.cliente?.endereco || "",
    "{{cliente.cidade}}": data?.cliente?.cidade || "",
    "{{cliente.estado}}": data?.cliente?.estado || "",
    "{{cliente.cep}}": data?.cliente?.cep || "",
    "{{cliente.telefone}}": data?.cliente?.telefone || "",
    "{{cliente.email}}": data?.cliente?.email || "",
    "{{cliente.contatoNome}}": data?.cliente?.contatoNome || "",
    "{{orcamento.numero}}": String(data?.numero || ""),
    "{{orcamento.tipo}}": data?.tipo === "pedido" ? "Pedido de Venda" : "Proposta Comercial",
    "{{orcamento.dataEmissao}}": fmtDate(data?.dataEmissao),
    "{{orcamento.dataValidade}}": fmtDate(data?.dataValidade),
    "{{orcamento.status}}": data?.status || "Em Aberto",
    "{{orcamento.condicoes.pagamento}}": data?.condicoes?.pagamento || "À vista",
    "{{orcamento.condicoes.prazoEntrega}}": data?.condicoes?.prazoEntrega || "Pronta Entrega",
    "{{orcamento.condicoes.tipoFrete}}": data?.condicoes?.tipoFrete || "CIF",
    "{{orcamento.observacoes}}": data?.observacoes || "",
    "{{orcamento.totais.subtotal}}": fmtBRL(data?.totais?.subtotalProdutos),
    "{{orcamento.subtotal}}": fmtBRL(data?.totais?.subtotalProdutos),
    "{{orcamento.totais.desconto}}": fmtBRL(data?.totais?.descontoTotal),
    "{{orcamento.desconto}}": fmtBRL(data?.totais?.descontoTotal),
    "{{orcamento.totais.frete}}": fmtBRL(data?.totais?.valorFrete),
    "{{orcamento.frete}}": fmtBRL(data?.totais?.valorFrete),
    "{{orcamento.totais.impostos}}": fmtBRL(data?.totais?.valorImpostos),
    "{{orcamento.impostos}}": fmtBRL(data?.totais?.valorImpostos),
    "{{orcamento.totais.total}}": fmtBRL(data?.totais?.valorTotal),
    "{{orcamento.total}}": fmtBRL(data?.totais?.valorTotal),
    "{{orcamento.totais.margem}}": data?.totais?.margemLucroPercentual ? `${data.totais.margemLucroPercentual.toFixed(1)}%` : "0%",
    "{{vendedor.nome}}": data?.vendedor?.nome || "",
    "{{vendedor.email}}": data?.vendedor?.email || "",
    "{{vendedor.telefone}}": data?.vendedor?.telefone || "",
    "{{vendedor.departamento}}": data?.vendedor?.departamento || "Comercial",
    "{{empresa.nomeFantasia}}": tConfig?.logoText || "Sua Empresa",
    "{{empresa.razaoSocial}}": tConfig?.empresaRazaoSocial || tConfig?.logoText || "Sua Empresa S/A",
    "{{empresa.cnpj}}": tConfig?.empresaCnpj || "",
    "{{empresa.inscricaoEstadual}}": tConfig?.empresaInscricaoEstadual || "",
    "{{empresa.telefone}}": tConfig?.empresaTelefone || "",
    "{{empresa.email}}": tConfig?.empresaEmail || "",
    "{{empresa.endereco}}": tConfig?.empresaEndereco || "",
    "{{empresa.cidadeEstado}}": tConfig?.empresaCidadeEstado || "",
    "{{empresa.site}}": tConfig?.empresaSite || "",
    "{{data.hoje}}": now.toLocaleDateString("pt-BR"),
    "{{data.ano}}": now.getFullYear().toString(),
    "{{data.hora}}": now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  const styleObj: React.CSSProperties = {
    backgroundColor: block.style?.backgroundColor,
    color: block.style?.textColor,
    borderColor: block.style?.borderColor,
    borderWidth: block.style?.borderWidth ? `${block.style.borderWidth}px` : undefined,
    borderStyle: block.style?.borderStyle || (block.style?.borderWidth ? "solid" : undefined),
    borderRadius: block.style?.borderRadius ? `${block.style.borderRadius}px` : undefined,
    paddingTop: block.style?.paddingTop !== undefined ? `${block.style.paddingTop}px` : undefined,
    paddingBottom: block.style?.paddingBottom !== undefined ? `${block.style.paddingBottom}px` : undefined,
    paddingLeft: block.style?.paddingLeft !== undefined ? `${block.style.paddingLeft}px` : undefined,
    paddingRight: block.style?.paddingRight !== undefined ? `${block.style.paddingRight}px` : undefined,
    marginTop: block.style?.marginTop !== undefined ? `${block.style.marginTop}px` : undefined,
    marginBottom: block.style?.marginBottom !== undefined ? `${block.style.marginBottom}px` : undefined,
    textAlign: block.style?.textAlign,
    fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : undefined,
    fontWeight: block.style?.fontWeight,
    width: block.style?.width === "1/2" ? "50%" :
           block.style?.width === "1/3" ? "33.333%" :
           block.style?.width === "2/3" ? "66.666%" :
           block.style?.width === "1/4" ? "25%" :
           block.style?.width === "3/4" ? "75%" : "100%",
  };

  switch (block.type) {
    case "header": {
      const showLogo = block.config?.showLogo ?? true;
      const showSocial = block.config?.showSocial ?? true;
      const showBadge = block.config?.showBadge ?? true;
      const isBanner = block.config?.bannerMode ?? (archetype === "executivo" || archetype === "moderno");

      if (isBanner) {
        return (
          <div
            className={`w-full relative overflow-hidden text-white transition-all duration-300`}
            style={{
              backgroundColor: block.style?.backgroundColor || headerBg,
              color: block.style?.textColor || headerText,
              borderRadius: block.style?.borderRadius ?? 8,
              paddingTop: isSmall ? 12 : (block.style?.paddingTop ?? 24),
              paddingBottom: isSmall ? 12 : (block.style?.paddingBottom ?? 24),
              paddingLeft: isSmall ? 16 : (block.style?.paddingLeft ?? 24),
              paddingRight: isSmall ? 16 : (block.style?.paddingRight ?? 24),
              marginBottom: block.style?.marginBottom ?? 20,
            }}
          >
            <div className={`flex ${isSmall ? 'flex-col' : 'flex-col md:flex-row'} justify-between items-start ${isSmall ? '' : 'md:items-center'} ${spacingClass} relative z-10`}>
              <div className={`flex items-center ${spacingClass}`}>
                {showLogo && tConfig.logoImage ? (
                  <div className={`${isSmall ? 'p-1' : 'p-2'} bg-white rounded-lg shadow-sm shrink-0`}>
                    <img 
                      src={tConfig.logoImage} 
                      alt="Logo" 
                      className="object-contain" 
                      style={{ 
                        height: "auto",
                        maxHeight: isSmall ? "1.75rem" : "3rem",
                        maxWidth: isSmall ? "80px" : "150px",
                        width: "auto"
                      }} 
                    />
                  </div>
                ) : showLogo ? (
                  <div className={`${isSmall ? 'w-8 h-8' : 'w-12 h-12'} bg-white/10 rounded-lg flex items-center justify-center border border-white/20 shrink-0`}>
                    <Building2 className={`${isSmall ? 'w-4 h-4' : 'w-7 h-7'} text-white`} />
                  </div>
                ) : null}

                <div className="min-w-0">
                  <h1 className={`${headerTitleScaleClass} font-bold tracking-tight truncate`}>
                    <VariableHighlightBadge
                      tag="{{empresa.nomeFantasia}}"
                      value={tConfig.logoText || "VendasProtheus ERP"}
                      blockId={block.id}
                      fieldName="empresa.nomeFantasia"
                      fieldLabel="Nome da Empresa Emissora"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </h1>
                  {tConfig.empresaRazaoSocial && (
                    <div className={`${textScaleClass} opacity-80 mt-0.5 truncate`}>
                      <VariableHighlightBadge
                        tag="{{empresa.razaoSocial}}"
                        value={tConfig.empresaRazaoSocial}
                        blockId={block.id}
                        fieldName="empresa.razaoSocial"
                        fieldLabel="Razão Social da Empresa"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={`${isSmall ? 'w-full pt-2 border-t border-white/10' : 'text-right'} ${textScaleClass} font-mono opacity-90`}>
                <div className={`flex flex-wrap items-center ${isSmall ? 'justify-start' : 'justify-end'} gap-x-3 gap-y-1`}>
                  {tConfig.empresaTelefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {tConfig.empresaTelefone}
                    </span>
                  )}
                  {tConfig.empresaEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {tConfig.empresaEmail}
                    </span>
                  )}
                </div>
                <div className="mt-1 opacity-75 truncate">
                  {tConfig.empresaEndereco || "Av. das Nações Unidas, 12901 - São Paulo/SP"}
                </div>
              </div>
            </div>
            
            {/* Background Decor */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
          </div>
        );
      }

      // Classic / Clean Header
      return (
        <div 
          className="w-full flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b gap-4"
          style={styleObj}
        >
          <div className="flex items-center gap-3">
            {showLogo && tConfig.logoImage ? (
              <img 
                src={tConfig.logoImage} 
                alt="Logo" 
                className="object-contain" 
                style={{ 
                  height: "auto",
                  maxHeight: "3rem",
                  maxWidth: "min(150px, 100%)",
                  width: "auto"
                }} 
              />
            ) : showLogo ? (
              <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                <Building2 className="w-6 h-6" />
              </div>
            ) : null}
            <div>
              <h2 className="text-lg font-bold" style={{ color: primaryColor }}>
                <VariableHighlightBadge
                  tag="{{empresa.nomeFantasia}}"
                  value={tConfig.logoText || "VendasProtheus ERP"}
                  blockId={block.id}
                  fieldName="empresa.nomeFantasia"
                  fieldLabel="Nome da Empresa Emissora"
                  highlightVariables={highlightVariables}
                  selectedVariableTag={selectedVariableTag}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectFieldOrVariable={onSelectFieldOrVariable}
                />
              </h2>
              {tConfig.empresaRazaoSocial && (
                <div className="text-xs text-slate-500">
                  <VariableHighlightBadge
                    tag="{{empresa.razaoSocial}}"
                    value={tConfig.empresaRazaoSocial}
                    blockId={block.id}
                    fieldName="empresa.razaoSocial"
                    fieldLabel="Razão Social da Empresa"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
              <VariableHighlightBadge
                tag="{{orcamento.tipo}}"
                value={data.tipo === "pedido" ? "Pedido de Venda" : "Orçamento Comercial"}
                blockId={block.id}
                fieldName="orcamento.tipo"
                fieldLabel="Tipo de Documento"
                highlightVariables={highlightVariables}
                selectedVariableTag={selectedVariableTag}
                activeCategoryFilter={activeCategoryFilter}
                onSelectFieldOrVariable={onSelectFieldOrVariable}
              />{" "}
              <VariableHighlightBadge
                tag="{{orcamento.numero}}"
                value={`#${data.numero}`}
                blockId={block.id}
                fieldName="orcamento.numero"
                fieldLabel="Número da Proposta"
                highlightVariables={highlightVariables}
                selectedVariableTag={selectedVariableTag}
                activeCategoryFilter={activeCategoryFilter}
                onSelectFieldOrVariable={onSelectFieldOrVariable}
              />
            </span>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-end gap-1 flex-wrap">
              <span>Emitido em</span>
              <VariableHighlightBadge
                tag="{{orcamento.dataEmissao}}"
                value={fmtDate(data.dataEmissao)}
                blockId={block.id}
                fieldName="orcamento.dataEmissao"
                fieldLabel="Data de Emissão"
                highlightVariables={highlightVariables}
                selectedVariableTag={selectedVariableTag}
                activeCategoryFilter={activeCategoryFilter}
                onSelectFieldOrVariable={onSelectFieldOrVariable}
              />
              <span>• Válido até</span>
              <VariableHighlightBadge
                tag="{{orcamento.dataValidade}}"
                value={fmtDate(data.dataValidade)}
                blockId={block.id}
                fieldName="orcamento.dataValidade"
                fieldLabel="Data de Validade"
                highlightVariables={highlightVariables}
                selectedVariableTag={selectedVariableTag}
                activeCategoryFilter={activeCategoryFilter}
                onSelectFieldOrVariable={onSelectFieldOrVariable}
              />
            </div>
          </div>
        </div>
      );
    }

    case "client_info": {
      const showTaxId = block.config?.showTaxId ?? true;
      const showAddress = block.config?.showAddress ?? true;
      const showSeller = block.config?.showSeller ?? true;

      return (
        <div style={styleObj} className={`w-full transition-all duration-300`}>
          <div className={`grid ${isSmall ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${spacingClass}`}>
            {/* Destinatário */}
            <div className="space-y-1.5">
              <span className={`${textScaleClass} font-bold uppercase tracking-wider text-slate-400 block`}>
                Cliente / Faturamento
              </span>
              <div className={`font-bold ${isSmall ? 'text-xs' : 'text-sm'} text-slate-900 leading-snug`}>
                <VariableHighlightBadge
                  tag="{{cliente.nome}}"
                  value={data.cliente.nome}
                  blockId={block.id}
                  fieldName="cliente.nome"
                  fieldLabel="Nome / Razão Social do Cliente"
                  highlightVariables={highlightVariables}
                  selectedVariableTag={selectedVariableTag}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectFieldOrVariable={onSelectFieldOrVariable}
                />
              </div>
              {data.cliente.razaoSocial && data.cliente.razaoSocial !== data.cliente.nome && (
                <div className={`${textScaleClass} text-slate-600`}>
                  <VariableHighlightBadge
                    tag="{{cliente.razaoSocial}}"
                    value={data.cliente.razaoSocial}
                    blockId={block.id}
                    fieldName="cliente.razaoSocial"
                    fieldLabel="Razão Social do Cliente"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                </div>
              )}
              {showTaxId && data.cliente.cnpjCpf && (
                <div className={`${textScaleClass} font-mono text-slate-600 flex items-center gap-1.5 flex-wrap`}>
                  <span className="font-medium text-slate-500">CNPJ/CPF:</span>
                  <VariableHighlightBadge
                    tag="{{cliente.cnpjCpf}}"
                    value={data.cliente.cnpjCpf}
                    blockId={block.id}
                    fieldName="cliente.cnpjCpf"
                    fieldLabel="CNPJ ou CPF do Cliente"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                  {data.cliente.inscricaoEstadual && !isSmall && (
                    <>
                      <span>• IE:</span>
                      <VariableHighlightBadge
                        tag="{{cliente.inscricaoEstadual}}"
                        value={data.cliente.inscricaoEstadual}
                        blockId={block.id}
                        fieldName="cliente.inscricaoEstadual"
                        fieldLabel="Inscrição Estadual"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </>
                  )}
                </div>
              )}
              {showAddress && data.cliente.endereco && (
                <div className={`${textScaleClass} text-slate-600 flex items-start gap-1`}>
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    <VariableHighlightBadge
                      tag="{{cliente.endereco}}"
                      value={`${data.cliente.endereco}${data.cliente.cidade ? ` - ${data.cliente.cidade}/${data.cliente.estado}` : ""}${data.cliente.cep ? ` (CEP: ${data.cliente.cep})` : ""}`}
                      blockId={block.id}
                      fieldName="cliente.endereco"
                      fieldLabel="Endereço Completo do Cliente"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              )}
              {(data.cliente.telefone || data.cliente.email) && (
                <div className={`${textScaleClass} text-slate-600 flex flex-wrap gap-3 pt-0.5`}>
                  {data.cliente.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <VariableHighlightBadge
                        tag="{{cliente.telefone}}"
                        value={data.cliente.telefone}
                        blockId={block.id}
                        fieldName="cliente.telefone"
                        fieldLabel="Telefone do Cliente"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </span>
                  )}
                  {data.cliente.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <VariableHighlightBadge
                        tag="{{cliente.email}}"
                        value={data.cliente.email}
                        blockId={block.id}
                        fieldName="cliente.email"
                        fieldLabel="E-mail do Cliente"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Condições & Consultor */}
            <div className={`space-y-2 ${isSmall ? 'w-full pt-3 border-t' : 'border-t md:border-t-0 md:border-l md:pl-6 pt-3 md:pt-0'} border-slate-200`}>
              <span className={`${textScaleClass} font-bold uppercase tracking-wider text-slate-400 block`}>
                Condições da Proposta
              </span>
              <div className={`grid ${isSmall ? 'grid-cols-1' : 'grid-cols-2'} gap-2 ${textScaleClass}`}>
                <div>
                  <span className="text-slate-500 block">Pagamento:</span>
                  <span className="font-semibold text-slate-800">
                    <VariableHighlightBadge
                      tag="{{orcamento.condicoes.pagamento}}"
                      value={data.condicoes.pagamento}
                      blockId={block.id}
                      fieldName="condicoes.pagamento"
                      fieldLabel="Condição de Pagamento"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Frete:</span>
                  <span className="font-semibold text-slate-800">
                    <VariableHighlightBadge
                      tag="{{orcamento.condicoes.tipoFrete}}"
                      value={data.condicoes.tipoFrete || "CIF"}
                      blockId={block.id}
                      fieldName="condicoes.tipoFrete"
                      fieldLabel="Tipo de Frete"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Prazo de Entrega:</span>
                  <span className="font-semibold text-slate-800">
                    <VariableHighlightBadge
                      tag="{{orcamento.condicoes.prazoEntrega}}"
                      value={data.condicoes.prazoEntrega || "Pronta Entrega"}
                      blockId={block.id}
                      fieldName="condicoes.prazoEntrega"
                      fieldLabel="Prazo de Entrega"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
                {showSeller && (
                  <div>
                    <span className="text-slate-500 block">Consultor:</span>
                    <span className="font-semibold text-slate-800">
                      <VariableHighlightBadge
                        tag="{{vendedor.nome}}"
                        value={data.vendedor.nome}
                        blockId={block.id}
                        fieldName="vendedor.nome"
                        fieldLabel="Consultor Comercial"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "products_grid": {
      const showPrices = block.config?.showPrices ?? true;
      const columns = block.config?.columns ?? (isSmall ? 1 : isMedium ? 2 : 3);
      const showImages = block.config?.showImages ?? true;

      return (
        <div style={styleObj} className="w-full transition-all duration-300">
          <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {data.itens.map((item, idx) => (
              <div 
                key={item.id || idx}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col"
              >
                {showImages && (
                  <div className="aspect-square bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-slate-300">
                      <Package className="w-12 h-12 opacity-20" />
                    </div>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    <VariableHighlightBadge
                      tag="{{item.codigo}}"
                      value={item.codigo}
                      blockId={block.id}
                      fieldName={`itens.${idx}.codigo`}
                      fieldLabel="Código"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
                    <VariableHighlightBadge
                      tag="{{item.descricao}}"
                      value={item.descricao}
                      blockId={block.id}
                      fieldName={`itens.${idx}.descricao`}
                      fieldLabel="Descrição"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </h3>
                  
                  <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      <VariableHighlightBadge
                        tag="{{item.quantidade}}"
                        value={`${item.quantidade}`}
                        blockId={block.id}
                        fieldName={`itens.${idx}.quantidade`}
                        fieldLabel="Qtd"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                      {" "}
                      <VariableHighlightBadge
                        tag="{{item.unidade}}"
                        value={item.unidade || "UN"}
                        blockId={block.id}
                        fieldName={`itens.${idx}.unidade`}
                        fieldLabel="UN"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </div>
                    {showPrices && (
                      <div className="text-sm font-black text-slate-900 dark:text-white font-mono">
                        <VariableHighlightBadge
                          tag="{{item.subtotal}}"
                          value={fmtBRL(item.subtotal)}
                          blockId={block.id}
                          fieldName={`itens.${idx}.subtotal`}
                          fieldLabel="Valor"
                          highlightVariables={highlightVariables}
                          selectedVariableTag={selectedVariableTag}
                          activeCategoryFilter={activeCategoryFilter}
                          onSelectFieldOrVariable={onSelectFieldOrVariable}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "products_table": {
      const showPhotos = block.config?.showPhotos ?? true;
      const showSku = block.config?.showSku ?? true;
      const showNcm = block.config?.showNcm ?? false;
      const showDiscount = block.config?.showDiscount ?? true;
      const showTaxes = block.config?.showTaxes ?? false;
      const showDelivery = block.config?.showDelivery ?? true;
      const zebra = block.config?.zebra ?? true;
      const density = block.config?.density || "comfortable";
      const autoFit = block.config?.autoFit ?? true;

      // Calcular número de colunas ativas para auto-ajuste de tipografia e espaçamento
      const activeColsCount = 
        2 + // Descrição + Total (obrigatórios)
        (showPhotos ? 1 : 0) + 
        (showSku ? 1 : 0) + 
        (showNcm ? 1 : 0) + 
        (showDiscount ? 1 : 0) + 
        (showTaxes ? 1 : 0) + 
        (showDelivery ? 1 : 0) +
        1; // Qtd

      // Densidade e padding adaptativos
      let paddingClass = "py-2 px-2 text-xs";
      if (density === "compact" || (autoFit && activeColsCount >= 8)) {
        paddingClass = "py-1.5 px-1.5 text-[11px] leading-tight";
      } else if (density === "spacious" && activeColsCount < 7) {
        paddingClass = "py-3 px-3 text-sm";
      }

      return (
        <div style={styleObj} className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 print:overflow-visible print:w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr style={{ backgroundColor: primaryColor, color: headerText }}>
                {showPhotos && <th className={`${paddingClass} w-[5%] min-w-[32px] text-center font-semibold`}>Item</th>}
                {showSku && <th className={`${paddingClass} w-[12%] min-w-[55px] font-semibold`}>Código</th>}
                <th className={`${paddingClass} w-auto font-semibold`}>Descrição do Produto / Serviço</th>
                {showNcm && <th className={`${paddingClass} w-[9%] min-w-[50px] font-semibold text-center`}>NCM</th>}
                <th className={`${paddingClass} text-center font-semibold w-[8%] min-w-[42px]`}>Qtd</th>
                <th className={`${paddingClass} text-right font-semibold w-[14%] min-w-[65px]`}>Unitário</th>
                {showDiscount && <th className={`${paddingClass} text-center font-semibold w-[8%] min-w-[42px]`}>Desc %</th>}
                {showTaxes && <th className={`${paddingClass} text-center font-semibold w-[8%] min-w-[42px]`}>Imp %</th>}
                {showDelivery && <th className={`${paddingClass} text-center font-semibold w-[10%] min-w-[50px]`}>Prazo</th>}
                <th className={`${paddingClass} text-right font-semibold w-[16%] min-w-[75px]`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.itens.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={zebra && idx % 2 === 1 ? "bg-slate-50/70" : "bg-white"}
                >
                  {showPhotos && (
                    <td className={`${paddingClass} text-center align-middle`}>
                      {item.imagemUrl ? (
                        <img src={item.imagemUrl} alt="" className="w-7 h-7 rounded object-cover mx-auto border" />
                      ) : (
                        <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-400 font-bold text-[9px]">
                          #{idx + 1}
                        </div>
                      )}
                    </td>
                  )}
                  {showSku && (
                    <td className={`${paddingClass} font-mono font-medium text-slate-700 whitespace-nowrap align-middle`}>
                      <VariableHighlightBadge
                        tag="{{item.codigo}}"
                        value={item.codigo}
                        blockId={block.id}
                        fieldName={`itens.${idx}.codigo`}
                        fieldLabel="Código do Produto"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </td>
                  )}
                  <td className={`${paddingClass} align-middle break-words`}>
                    <div className="font-semibold text-slate-900 leading-snug">
                      <VariableHighlightBadge
                        tag="{{item.descricao}}"
                        value={item.descricao}
                        blockId={block.id}
                        fieldName={`itens.${idx}.descricao`}
                        fieldLabel="Descrição do Produto"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </div>
                    {item.especificacao && (
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                        <VariableHighlightBadge
                          tag="{{item.descricao}}"
                          value={item.especificacao}
                          blockId={block.id}
                          fieldName={`itens.${idx}.especificacao`}
                          fieldLabel="Especificação Técnica"
                          highlightVariables={highlightVariables}
                          selectedVariableTag={selectedVariableTag}
                          activeCategoryFilter={activeCategoryFilter}
                          onSelectFieldOrVariable={onSelectFieldOrVariable}
                        />
                      </div>
                    )}
                  </td>
                  {showNcm && (
                    <td className={`${paddingClass} font-mono text-slate-600 text-center whitespace-nowrap align-middle`}>
                      <VariableHighlightBadge
                        tag="{{item.codigo}}"
                        value={item.ncm || "-"}
                        blockId={block.id}
                        fieldName={`itens.${idx}.ncm`}
                        fieldLabel="NCM"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </td>
                  )}
                  <td className={`${paddingClass} text-center font-bold text-slate-800 whitespace-nowrap align-middle`}>
                    <VariableHighlightBadge
                      tag="{{item.quantidade}}"
                      value={`${item.quantidade}`}
                      blockId={block.id}
                      fieldName={`itens.${idx}.quantidade`}
                      fieldLabel="Quantidade"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                    {" "}
                    <span className="text-[9px] font-normal text-slate-500">
                      <VariableHighlightBadge
                        tag="{{item.unidade}}"
                        value={item.unidade || "UN"}
                        blockId={block.id}
                        fieldName={`itens.${idx}.unidade`}
                        fieldLabel="Unidade"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </span>
                  </td>
                  <td className={`${paddingClass} text-right text-slate-700 whitespace-nowrap align-middle`}>
                    <VariableHighlightBadge
                      tag="{{item.precoUnitario}}"
                      value={fmtBRL(item.precoUnitario)}
                      blockId={block.id}
                      fieldName={`itens.${idx}.precoUnitario`}
                      fieldLabel="Preço Unitário"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </td>
                  {showDiscount && (
                    <td className={`${paddingClass} text-center text-emerald-600 font-medium whitespace-nowrap align-middle`}>
                      <VariableHighlightBadge
                        tag="{{item.desconto}}"
                        value={item.descontoPercentual ? `${item.descontoPercentual}%` : "-"}
                        blockId={block.id}
                        fieldName={`itens.${idx}.descontoPercentual`}
                        fieldLabel="Desconto"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </td>
                  )}
                  {showTaxes && (
                    <td className={`${paddingClass} text-center text-slate-500 whitespace-nowrap align-middle`}>
                      {item.aliquotaImposto ? `${item.aliquotaImposto}%` : "-"}
                    </td>
                  )}
                  {showDelivery && (
                    <td className={`${paddingClass} text-center text-slate-600 text-[10px] whitespace-nowrap align-middle`}>
                      <VariableHighlightBadge
                        tag="{{item.prazo}}"
                        value={item.prazoItem || "Imediato"}
                        blockId={block.id}
                        fieldName={`itens.${idx}.prazoItem`}
                        fieldLabel="Prazo do Item"
                        highlightVariables={highlightVariables}
                        selectedVariableTag={selectedVariableTag}
                        activeCategoryFilter={activeCategoryFilter}
                        onSelectFieldOrVariable={onSelectFieldOrVariable}
                      />
                    </td>
                  )}
                  <td className={`${paddingClass} text-right font-bold text-slate-900 whitespace-nowrap align-middle`}>
                    <VariableHighlightBadge
                      tag="{{item.subtotal}}"
                      value={fmtBRL(item.subtotal)}
                      blockId={block.id}
                      fieldName={`itens.${idx}.subtotal`}
                      fieldLabel="Subtotal"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "totals_summary": {
      const showDiscount = block.config?.showDiscount ?? true;
      const showFreight = block.config?.showFreight ?? true;
      const showTaxes = block.config?.showTaxes ?? true;
      const showMargin = block.config?.showMargin ?? false;
      const highlightTotal = block.config?.highlightTotal ?? true;

      return (
        <div style={styleObj} className={`w-full transition-all duration-300`}>
          <div className={`flex ${isSmall ? 'flex-col' : 'flex-col md:flex-row'} justify-between items-start ${isSmall ? '' : 'md:items-center'} gap-4`}>
            <div className={`${textScaleClass} text-slate-500 space-y-1`}>
              <div className="font-semibold text-slate-700">Total de Itens: {data.itens.length} produto(s)</div>
              {showMargin && data.totais.margemLucroPercentual !== undefined && (
                <div className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block font-medium">
                  Margem Comercial:{" "}
                  <VariableHighlightBadge
                    tag="{{orcamento.totais.margem}}"
                    value={`${data.totais.margemLucroPercentual.toFixed(1)}%`}
                    blockId={block.id}
                    fieldName="totais.margem"
                    fieldLabel="Margem de Lucro Percentual"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                </div>
              )}
            </div>

            <div className={`${isSmall ? 'w-full' : 'w-full md:w-80'} space-y-1.5 ${textScaleClass}`}>
              <div className="flex justify-between text-slate-600 items-center">
                <span>Subtotal dos Produtos:</span>
                <span className="font-semibold text-slate-800">
                  <VariableHighlightBadge
                    tag="{{orcamento.totais.subtotal}}"
                    value={fmtBRL(data.totais.subtotalProdutos)}
                    blockId={block.id}
                    fieldName="totais.subtotal"
                    fieldLabel="Subtotal dos Produtos"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                </span>
              </div>
              {showDiscount && data.totais.descontoTotal > 0 && (
                <div className="flex justify-between text-emerald-600 items-center">
                  <span>Descontos Concedidos:</span>
                  <span className="font-semibold">
                    <VariableHighlightBadge
                      tag="{{orcamento.totais.desconto}}"
                      value={`- ${fmtBRL(data.totais.descontoTotal)}`}
                      blockId={block.id}
                      fieldName="totais.desconto"
                      fieldLabel="Descontos Concedidos"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              )}
              {showFreight && data.totais.valorFrete !== undefined && (
                <div className="flex justify-between text-slate-600 items-center">
                  <span>Frete ({data.condicoes.tipoFrete || "CIF"}):</span>
                  <span className="font-semibold">
                    <VariableHighlightBadge
                      tag="{{orcamento.totais.frete}}"
                      value={data.totais.valorFrete > 0 ? fmtBRL(data.totais.valorFrete) : "Incluso (Grátis)"}
                      blockId={block.id}
                      fieldName="totais.frete"
                      fieldLabel="Valor do Frete"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              )}
              {showTaxes && data.totais.valorImpostos !== undefined && (
                <div className="flex justify-between text-slate-600 items-center">
                  <span>Impostos Incidentes:</span>
                  <span className="font-semibold">
                    <VariableHighlightBadge
                      tag="{{orcamento.totais.impostos}}"
                      value={fmtBRL(data.totais.valorImpostos)}
                      blockId={block.id}
                      fieldName="totais.impostos"
                      fieldLabel="Impostos Incidentes"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              )}
              
              {highlightTotal ? (
                <div 
                  className={`flex justify-between items-center ${isSmall ? 'p-2' : 'p-3'} rounded-lg text-white mt-2`}
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className={`font-bold ${isSmall ? 'text-[11px]' : 'text-sm'}`}>VALOR TOTAL:</span>
                  <span className={`font-black ${isSmall ? 'text-base' : 'text-lg'} tracking-tight font-mono`}>
                    <VariableHighlightBadge
                      tag="{{orcamento.totais.total}}"
                      value={fmtBRL(data.totais.valorTotal)}
                      blockId={block.id}
                      fieldName="totais.total"
                      fieldLabel="Valor Total Líquido"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              ) : (
                <div className={`flex justify-between items-center pt-2 border-t font-bold ${isSmall ? 'text-[11px]' : 'text-sm'} text-slate-900`}>
                  <span>VALOR TOTAL:</span>
                  <span className={`${isSmall ? 'text-sm' : 'text-base'} font-mono`}>
                    <VariableHighlightBadge
                      tag="{{orcamento.totais.total}}"
                      value={fmtBRL(data.totais.valorTotal)}
                      blockId={block.id}
                      fieldName="totais.total"
                      fieldLabel="Valor Total Líquido"
                      highlightVariables={highlightVariables}
                      selectedVariableTag={selectedVariableTag}
                      activeCategoryFilter={activeCategoryFilter}
                      onSelectFieldOrVariable={onSelectFieldOrVariable}
                    />
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "pix_payment": {
      const pixKey = block.config?.pixKey || settings.documentConfig.sections?.pixKey || settings.templateConfig.empresaCnpj || "12.345.678/0001-90";
      const pixName = block.config?.pixBeneficiaryName || settings.documentConfig.sections?.pixBeneficiaryName || settings.templateConfig.empresaRazaoSocial || settings.templateConfig.logoText || "VendasProtheus ERP";
      const pixPayload = `00020126330014BR.GOV.BCB.PIX0114${pixKey.replace(/\D/g, "")}520400005303986540${data.totais.valorTotal.toFixed(2)}5802BR5913${pixName.substring(0, 25)}6008SAOPAULO62070503***6304`;

      return (
        <div style={styleObj} className={`w-full transition-all duration-300`}>
          <div className={`flex ${isSmall ? 'flex-col' : 'flex-col sm:flex-row'} items-center ${spacingClass}`}>
            <div className={`bg-white ${isSmall ? 'p-1.5' : 'p-2.5'} rounded-lg border border-emerald-200 shadow-2xs shrink-0`}>
              <QRCodeSVG value={pixPayload} size={isSmall ? 64 : 88} level="M" />
            </div>
            <div className={`space-y-1 ${isSmall ? 'text-center' : 'text-center sm:text-left'} flex-1`}>
              <div className={`flex items-center ${isSmall ? 'justify-center' : 'justify-center sm:justify-start'} gap-1.5 text-emerald-800 font-bold ${textScaleClass} uppercase tracking-wider`}>
                <QrCode className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} text-emerald-600`} />
                Pague Instantaneamente via PIX
              </div>
              <p className={`${textScaleClass} text-slate-600`}>
                Aponte a câmera do aplicativo do seu banco para o QR Code ao lado ou utilize a chave abaixo:
              </p>
              <div className={`bg-white ${isSmall ? 'px-2 py-1' : 'px-3 py-1.5'} rounded border border-emerald-300 font-mono ${textScaleClass} font-bold text-emerald-950 inline-block`}>
                <VariableHighlightBadge
                  tag="{{empresa.cnpj}}"
                  value={pixKey}
                  blockId={block.id}
                  fieldName="pixKey"
                  fieldLabel="Chave PIX do Recebedor"
                  highlightVariables={highlightVariables}
                  selectedVariableTag={selectedVariableTag}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectFieldOrVariable={onSelectFieldOrVariable}
                />
              </div>
              <div className="text-[11px] text-slate-500">
                Favorecido:{" "}
                <span className="font-semibold">
                  <VariableHighlightBadge
                    tag="{{empresa.razaoSocial}}"
                    value={pixName}
                    blockId={block.id}
                    fieldName="pixBeneficiaryName"
                    fieldLabel="Favorecido no PIX"
                    highlightVariables={highlightVariables}
                    selectedVariableTag={selectedVariableTag}
                    activeCategoryFilter={activeCategoryFilter}
                    onSelectFieldOrVariable={onSelectFieldOrVariable}
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "bank_details": {
      const rawText = block.content || block.config?.bankDetailsText || settings.documentConfig.dadosBancarios || "Banco: Itaú (341) | Agência: 0123 | Conta Corrente: 45678-9\nFavorecido: VendasProtheus Automação Comercial S/A";

      return (
        <div style={styleObj} className="w-full">
          <div className="flex items-center gap-2 mb-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            Dados Bancários para Transferência / TED / DOC
          </div>
          <div className="text-xs font-mono text-slate-700 whitespace-pre-line leading-relaxed bg-white p-2.5 rounded border border-slate-200">
            {renderRichTextWithVariables({
              template: rawText,
              variablesMap,
              blockId: block.id,
              fieldName: "content",
              highlightVariables,
              selectedVariableTag,
              activeCategoryFilter,
              onSelectFieldOrVariable,
            })}
          </div>
        </div>
      );
    }

    case "commercial_terms": {
      const warranty = block.config?.warrantyText || "12 meses de garantia balcão contra defeitos de fabricação.";
      const terms = block.config?.commercialText || "Faturamento mediante aprovação cadastral e disponibilidade em estoque.";

      return (
        <div style={styleObj} className="w-full text-xs space-y-2">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Garantia & Condições Gerais
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
            <div>
              <span className="font-semibold text-slate-700 block">Garantia Técnica:</span>
              <span>
                {renderRichTextWithVariables({
                  template: warranty,
                  variablesMap,
                  blockId: block.id,
                  fieldName: "warrantyText",
                  highlightVariables,
                  selectedVariableTag,
                  activeCategoryFilter,
                  onSelectFieldOrVariable,
                })}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700 block">Condições de Fornecimento:</span>
              <span>
                {renderRichTextWithVariables({
                  template: terms,
                  variablesMap,
                  blockId: block.id,
                  fieldName: "commercialText",
                  highlightVariables,
                  selectedVariableTag,
                  activeCategoryFilter,
                  onSelectFieldOrVariable,
                })}
              </span>
            </div>
          </div>
        </div>
      );
    }

    case "notes": {
      const text = block.content || data.observacoes || "Nenhuma observação adicional.";

      return (
        <div style={styleObj} className="w-full text-xs">
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            {block.title || "Observações do Orçamento"}
          </div>
          <div className="text-slate-600 whitespace-pre-line leading-relaxed bg-white p-3 rounded border border-slate-200">
            {renderRichTextWithVariables({
              template: text,
              variablesMap,
              blockId: block.id,
              fieldName: "content",
              highlightVariables,
              selectedVariableTag,
              activeCategoryFilter,
              onSelectFieldOrVariable,
            })}
          </div>
        </div>
      );
    }

    case "signatures": {
      const termsText = block.config?.termsText || "Ao aprovar esta proposta comercial, o comprador concorda integralmente com os valores, condições e prazos informados.";
      const clientLabel = block.config?.clientLabel || "Aceite do Cliente / Responsável";
      const sellerLabel = block.config?.sellerLabel || "Consultor Técnico Comercial";

      return (
        <div style={styleObj} className="w-full">
          {termsText && (
            <div className="text-[11px] text-slate-500 italic mb-6 text-center leading-relaxed">
              "
              {renderRichTextWithVariables({
                template: termsText,
                variablesMap,
                blockId: block.id,
                fieldName: "termsText",
                highlightVariables,
                selectedVariableTag,
                activeCategoryFilter,
                onSelectFieldOrVariable,
              })}
              "
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
            <div className="text-center">
              <div className="border-b border-slate-400 w-4/5 mx-auto mb-1.5" />
              <div className="font-bold text-xs text-slate-800">
                {renderRichTextWithVariables({
                  template: clientLabel,
                  variablesMap,
                  blockId: block.id,
                  fieldName: "clientLabel",
                  highlightVariables,
                  selectedVariableTag,
                  activeCategoryFilter,
                  onSelectFieldOrVariable,
                })}
              </div>
              <div className="text-[10px] text-slate-500">
                <VariableHighlightBadge
                  tag="{{cliente.nome}}"
                  value={data.cliente.nome}
                  blockId={block.id}
                  fieldName="cliente.nome"
                  fieldLabel="Nome do Cliente no Aceite"
                  highlightVariables={highlightVariables}
                  selectedVariableTag={selectedVariableTag}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectFieldOrVariable={onSelectFieldOrVariable}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="border-b border-slate-400 w-4/5 mx-auto mb-1.5" />
              <div className="font-bold text-xs text-slate-800">
                {renderRichTextWithVariables({
                  template: sellerLabel,
                  variablesMap,
                  blockId: block.id,
                  fieldName: "sellerLabel",
                  highlightVariables,
                  selectedVariableTag,
                  activeCategoryFilter,
                  onSelectFieldOrVariable,
                })}
              </div>
              <div className="text-[10px] text-slate-500">
                <VariableHighlightBadge
                  tag="{{vendedor.nome}}"
                  value={data.vendedor.nome}
                  blockId={block.id}
                  fieldName="vendedor.nome"
                  fieldLabel="Nome do Vendedor no Aceite"
                  highlightVariables={highlightVariables}
                  selectedVariableTag={selectedVariableTag}
                  activeCategoryFilter={activeCategoryFilter}
                  onSelectFieldOrVariable={onSelectFieldOrVariable}
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "digital_stamp": {
      const hash = `SHA256:${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      return (
        <div style={styleObj} className="w-full text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Documento autenticado digitalmente • Protocolo: <strong className="font-mono text-slate-600">{hash}</strong></span>
        </div>
      );
    }

    case "text": {
      return (
        <div style={styleObj} className="w-full whitespace-pre-line leading-relaxed">
          {renderRichTextWithVariables({
            template: block.content || "",
            variablesMap,
            blockId: block.id,
            fieldName: "content",
            highlightVariables,
            selectedVariableTag,
            activeCategoryFilter,
            onSelectFieldOrVariable,
          })}
        </div>
      );
    }

    case "heading": {
      return (
        <div style={styleObj} className="w-full tracking-tight">
          {renderRichTextWithVariables({
            template: block.content || "",
            variablesMap,
            blockId: block.id,
            fieldName: "content",
            highlightVariables,
            selectedVariableTag,
            activeCategoryFilter,
            onSelectFieldOrVariable,
          })}
        </div>
      );
    }

    case "image": {
      const imageUrl = block.config?.imageUrl || "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80";
      const height = block.config?.height || 120;
      const objectFit = block.config?.objectFit || "cover";

      return (
        <div style={styleObj} className="w-full overflow-hidden">
          <img 
            src={imageUrl} 
            alt={block.config?.altText || "Imagem"} 
            className="w-full rounded"
            style={{ height: `${height}px`, objectFit }}
          />
        </div>
      );
    }

    case "button": {
      const labelNode = renderRichTextWithVariables({
        template: block.content || "Aprovar Proposta",
        variablesMap,
        blockId: block.id,
        fieldName: "content",
        highlightVariables,
        selectedVariableTag,
        activeCategoryFilter,
        onSelectFieldOrVariable,
      });

      return (
        <div style={styleObj} className="w-full flex justify-center">
          <div
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg shadow-sm font-semibold transition-transform active:scale-95"
            style={{
              backgroundColor: block.style?.backgroundColor || primaryColor,
              color: block.style?.textColor || "#ffffff",
              fontSize: block.style?.fontSize ? `${block.style.fontSize}px` : "14px",
            }}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{labelNode}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </div>
        </div>
      );
    }

    case "card": {
      return (
        <div style={styleObj} className="w-full leading-relaxed">
          {block.title && (
            <div className="font-bold mb-1">
              {renderRichTextWithVariables({
                template: block.title,
                variablesMap,
                blockId: block.id,
                fieldName: "title",
                highlightVariables,
                selectedVariableTag,
                activeCategoryFilter,
                onSelectFieldOrVariable,
              })}
            </div>
          )}
          <div className="whitespace-pre-line">
            {renderRichTextWithVariables({
              template: block.content || "",
              variablesMap,
              blockId: block.id,
              fieldName: "content",
              highlightVariables,
              selectedVariableTag,
              activeCategoryFilter,
              onSelectFieldOrVariable,
            })}
          </div>
        </div>
      );
    }

    case "variables_grid": {
      const columns = block.config?.columns || 2;
      const items: Array<{ id: string; label: string; value: string }> = block.config?.items || [
        { id: "item-1", label: "Cliente / Razão Social", value: "{{cliente.nome}}" },
        { id: "item-2", label: "CNPJ / CPF", value: "{{cliente.cnpjCpf}}" },
        { id: "item-3", label: "Condição de Pagamento", value: "{{orcamento.condicoes.pagamento}}" },
        { id: "item-4", label: "Validade da Proposta", value: "{{orcamento.dataValidade}}" },
      ];

      const gridColsClass = 
        columns === 4 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4" :
        columns === 3 ? "grid-cols-1 sm:grid-cols-3" :
        "grid-cols-1 sm:grid-cols-2";

      return (
        <div style={styleObj} className="w-full">
          {block.title && (
            <div className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
              {block.title}
            </div>
          )}
          <div className={`grid ${gridColsClass} gap-3`}>
            {items.map((item, idx) => (
              <div key={item.id || idx} className="bg-white/90 dark:bg-slate-900/90 p-2.5 rounded border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                {item.label && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    {item.label}
                  </span>
                )}
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {renderRichTextWithVariables({
                    template: item.value || "",
                    variablesMap,
                    blockId: block.id,
                    fieldName: `items.${idx}.value`,
                    fieldLabel: item.label,
                    highlightVariables,
                    selectedVariableTag,
                    activeCategoryFilter,
                    onSelectFieldOrVariable,
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "variables_inline": {
      const items: Array<{ id: string; label: string; value: string }> = block.config?.items || [
        { id: "item-1", label: "Emissão", value: "{{orcamento.dataEmissao}}" },
        { id: "item-2", label: "Validade", value: "{{orcamento.dataValidade}}" },
      ];
      const separator = block.config?.separator || "|";

      return (
        <div style={styleObj} className="w-full">
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${textScaleClass}`}>
            {items.map((item, idx) => (
              <React.Fragment key={item.id || idx}>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  {item.label && (
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      {item.label}:
                    </span>
                  )}
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    {renderRichTextWithVariables({
                      template: item.value || "",
                      variablesMap,
                      blockId: block.id,
                      fieldName: `items.${idx}.value`,
                      fieldLabel: item.label,
                      highlightVariables,
                      selectedVariableTag,
                      activeCategoryFilter,
                      onSelectFieldOrVariable,
                    })}
                  </span>
                </div>
                {idx < items.length - 1 && separator && (
                  <span className="text-slate-300 dark:text-slate-700 select-none">{separator}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    case "divider": {
      return (
        <div 
          style={{
            borderTopWidth: `${block.style?.borderWidth || 1}px`,
            borderTopColor: block.style?.borderColor || "#e2e8f0",
            borderTopStyle: block.style?.borderStyle || "solid",
            marginTop: `${block.style?.marginTop || 12}px`,
            marginBottom: `${block.style?.marginBottom || 12}px`,
          }} 
          className="w-full"
        />
      );
    }

    case "spacer": {
      const height = block.config?.height || 24;
      return <div style={{ height: `${height}px` }} className="w-full" />;
    }

    case "custom_html": {
      const interpolatedHtml = renderRichTextWithVariables({
        template: block.content || "",
        variablesMap,
        blockId: block.id,
        fieldName: "content",
        highlightVariables: false,
      }) as string;

      return (
        <div 
          style={styleObj} 
          className="w-full"
          dangerouslySetInnerHTML={{ __html: interpolatedHtml }}
        />
      );
    }

    case "footer": {
      const showPageNumbers = block.config?.showPageNumbers ?? true;

      return (
        <div style={styleObj} className="w-full text-xs text-slate-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              {renderRichTextWithVariables({
                template: block.content || "",
                variablesMap,
                blockId: block.id,
                fieldName: "content",
                highlightVariables,
                selectedVariableTag,
                activeCategoryFilter,
                onSelectFieldOrVariable,
              })}
            </div>
            {showPageNumbers && (
              <div className="font-mono text-[10px] text-slate-400">
                Página 1 de 1
              </div>
            )}
          </div>
        </div>
      );
    }

    default:
      return (
        <div style={styleObj} className="w-full p-4 border border-dashed rounded text-xs text-slate-400">
          Bloco do tipo {block.type}
        </div>
      );
  }
});
