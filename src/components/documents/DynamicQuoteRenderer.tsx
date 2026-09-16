import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  MapPin, 
  Calendar, 
  CreditCard, 
  Truck, 
  ShieldCheck, 
  FileCheck, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Layers,
  FileSpreadsheet
} from "lucide-react";
import { AppSettings } from "@/lib/settings-store";
import { QuoteDocumentData, DocumentCustomSections, DocumentBlock } from "@/types/document-template";
import { DEFAULT_DOCUMENT_SECTIONS } from "@/lib/document-presets";
import { BlockRenderer } from "./builder/BlockRenderer";

interface DynamicQuoteRendererProps {
  data: QuoteDocumentData;
  settings: AppSettings;
  overrideSections?: Partial<DocumentCustomSections>;
  watermarkText?: string;
  className?: string;
  isPrintMode?: boolean;
}

export const DynamicQuoteRenderer: React.FC<DynamicQuoteRendererProps> = ({
  data,
  settings,
  overrideSections,
  watermarkText,
  className = "",
}) => {
  const tConfig = settings.templateConfig;
  const activePreset = (settings.savedPresets || []).find(p => p.id === tConfig.activePresetId);
  const customBlocks: DocumentBlock[] | undefined = activePreset?.blocks;

  // Se o modelo ativo possuir blocos customizados do Construtor Visual
  if (customBlocks && customBlocks.length > 0) {
    return (
      <div
        id="printable-quote-document"
        className={`printable-area bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-2xl border border-slate-200 p-[18mm] relative transition-all duration-200 select-text ${className}`}
        style={{
          pageBreakAfter: "avoid",
          boxSizing: "border-box",
          fontFamily: tConfig.fontFamily === "serif" ? "Georgia, serif" : tConfig.fontFamily === "mono" ? "Courier New, monospace" : "Inter, system-ui, sans-serif"
        }}
      >
        {watermarkText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            <span className="text-slate-200/40 text-7xl font-black uppercase transform -rotate-45 tracking-widest">
              {watermarkText}
            </span>
          </div>
        )}
        <div className="relative z-10 space-y-0">
          {customBlocks.map((block) => (
            <BlockRenderer
              key={block.id}
              block={block}
              data={data}
              settings={settings}
              archetype={tConfig.layout || "executivo"}
              isCanvas={false}
            />
          ))}
        </div>
      </div>
    );
  }

  const sections: DocumentCustomSections = {

    ...DEFAULT_DOCUMENT_SECTIONS,
    ...(settings.documentConfig?.sections || {}),
    ...(overrideSections || {}),
  };

  const primaryColor = tConfig.primaryColor || "#0f172a";
  const secondaryColor = tConfig.secondaryColor || "#334155";
  const accentColor = tConfig.accentColor || "#0284c7";
  const headerBgColor = tConfig.headerBgColor || primaryColor;
  const headerTextColor = tConfig.headerTextColor || "#ffffff";
  const archetype = tConfig.layout || "executivo";
  const fontFamily = tConfig.fontFamily || "sans";
  const radius = tConfig.radius || "md";
  const density = tConfig.density || sections.tableDensity || "comfortable";

  // Font family class
  const fontClass = 
    fontFamily === "serif" ? "font-serif" : 
    fontFamily === "mono" ? "font-mono" : "font-sans";

  // Radius class
  const radiusClass = 
    radius === "none" ? "rounded-none" : 
    radius === "sm" ? "rounded-sm" : 
    radius === "lg" ? "rounded-xl" : "rounded-lg";

  // Padding / Density for table
  const tablePy = 
    density === "compact" ? "py-2 text-xs" : 
    density === "spacious" ? "py-4 text-sm" : "py-3 text-xs sm:text-sm";

  const formatBRL = (val?: number) => {
    if (val === undefined || isNaN(val)) return "R$ 0,00";
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  // Generate PIX QR payload
  const pixPayload = `00020126580014BR.GOV.BCB.PIX0114${(sections.pixKey || tConfig.empresaCnpj || "12345678000190").replace(/\D/g, "")}520400005303986540${(data.totais.valorTotal || 0).toFixed(2)}5802BR5920${(sections.pixBeneficiaryName || tConfig.empresaRazaoSocial || "VENDASPROTHEUS").substring(0, 20)}6009${(sections.pixCity || "SAOPAULO").substring(0, 15)}62070503***6304`;

  return (
    <div
      id="printable-quote-document"
      className={`printable-area bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] mx-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col justify-between relative transition-all duration-200 select-text ${fontClass} ${className}`}
      style={{
        pageBreakAfter: "avoid",
        boxSizing: "border-box",
      }}
    >
      {/* Watermark if present */}
      {watermarkText && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] select-none rotate-[-30deg] z-0">
          <span className="text-8xl font-black uppercase tracking-widest">{watermarkText}</span>
        </div>
      )}

      {/* ── 1. CABEÇALHO DO DOCUMENTO ── */}
      <header className="relative z-10">
        {archetype === "executivo" ? (
          <div>
            <div 
              className="p-8 sm:p-10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm"
              style={{ backgroundColor: headerBgColor, color: headerTextColor }}
            >
              {/* Logo & Identidade */}
              <div className="flex items-center gap-5">
                {sections.showLogo && tConfig.logoImage ? (
                  <div className="p-2 bg-white rounded-lg shadow-sm border shrink-0">
                    <img src={tConfig.logoImage} alt="Logo" className="max-h-16 max-w-[180px] object-contain" />
                  </div>
                ) : sections.showLogo ? (
                  <div 
                    className="w-14 h-14 rounded-xl flex shrink-0 items-center justify-center text-white font-bold shadow-md text-xl bg-white/10 border border-white/20 backdrop-blur-xs"
                  >
                    {(tConfig.logoText || "VP").substring(0, 2).toUpperCase()}
                  </div>
                ) : null}

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none uppercase">
                    {tConfig.logoText || tConfig.empresaRazaoSocial || "VENDASPROTHEUS ERP"}
                  </h1>
                  <p className="text-xs mt-1 text-white/80 font-medium tracking-wide">
                    {tConfig.empresaRazaoSocial || "Soluções em Gestão e Automação Comercial B2B"}
                  </p>
                  
                  {/* Dados de Contato no Header */}
                  {sections.showCompanySocial && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/70 mt-2 font-mono">
                      {tConfig.empresaCnpj && <span>CNPJ: {tConfig.empresaCnpj}</span>}
                      {tConfig.empresaInscricaoEstadual && <span>IE: {tConfig.empresaInscricaoEstadual}</span>}
                      {tConfig.empresaTelefone && <span>Tel: {tConfig.empresaTelefone}</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* Número do Documento e Status */}
              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-4 sm:pt-0 w-full sm:w-auto border-white/10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/15 text-white backdrop-blur-xs mb-2">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  {data.tipo === "pedido" ? "Pedido de Venda" : "Proposta Comercial"}
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight">
                  #{data.numero}
                </div>
                <div className="text-[11px] text-white/70 mt-0.5">
                  Emissão: {formatDate(data.dataEmissao)}
                </div>
              </div>
            </div>

            {/* Linha de Destaque / Accent Stripe */}
            <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
          </div>
        ) : archetype === "moderno" ? (
          <div className="p-8 sm:p-10 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {sections.showLogo && tConfig.logoImage ? (
                  <img src={tConfig.logoImage} alt="Logo" className="max-h-16 max-w-[180px] object-contain" />
                ) : sections.showLogo ? (
                  <div 
                    className="w-12 h-12 rounded-xl flex shrink-0 items-center justify-center text-white font-bold shadow-md text-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {(tConfig.logoText || "VP").substring(0, 2).toUpperCase()}
                  </div>
                ) : null}

                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {tConfig.logoText || "Sua Empresa"}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    {tConfig.empresaEndereco} {tConfig.empresaCidadeEstado && `• ${tConfig.empresaCidadeEstado}`}
                  </p>
                  <div className="flex gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                    {tConfig.empresaCnpj && <span>CNPJ: {tConfig.empresaCnpj}</span>}
                    {tConfig.empresaEmail && <span>{tConfig.empresaEmail}</span>}
                  </div>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs text-right min-w-[180px]">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded text-white inline-block mb-1" style={{ backgroundColor: primaryColor }}>
                  {data.tipo === "pedido" ? "Pedido Confirmado" : "Orçamento Oficial"}
                </span>
                <div className="font-mono text-xl font-black text-slate-900">#{data.numero}</div>
                <div className="text-[10px] text-slate-500">Validade: {formatDate(data.dataValidade)}</div>
              </div>
            </div>
          </div>
        ) : archetype === "minimalista" ? (
          <div className="p-8 sm:p-10 border-b border-slate-900/10">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {tConfig.logoText || "VENDAS PROTHEUS"}
                </h1>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {tConfig.empresaRazaoSocial} • CNPJ {tConfig.empresaCnpj} • Tel {tConfig.empresaTelefone}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400">Proposta Técnica</span>
                <div className="text-2xl font-mono font-light text-slate-900">#{data.numero}</div>
                <div className="text-xs text-slate-500">{formatDate(data.dataEmissao)}</div>
              </div>
            </div>
          </div>
        ) : archetype === "tecnico" ? (
          <div className="p-6 border-b-2 border-slate-800 bg-slate-900 text-white font-mono">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-600 rounded text-white font-bold text-xs">DOC-ENG</div>
                <div>
                  <h1 className="text-lg font-bold uppercase">{tConfig.logoText || "ESPECIFICAÇÃO TÉCNICA E COMERCIAL"}</h1>
                  <p className="text-[11px] text-slate-400">CNPJ: {tConfig.empresaCnpj} | CONECTOR PROTHEUS SE1/SC5</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-orange-400">ID: {data.numero}</div>
                <div className="text-[10px] text-slate-400">DATA: {formatDate(data.dataEmissao)} | REV: 01</div>
              </div>
            </div>
          </div>
        ) : (
          /* Clássico */
          <div className="p-8 sm:p-10 border-b-2" style={{ borderColor: primaryColor }}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {sections.showLogo && tConfig.logoImage ? (
                  <img src={tConfig.logoImage} alt="Logo" className="max-h-16 max-w-[180px] object-contain" />
                ) : sections.showLogo ? (
                  <div className="w-12 h-12 rounded border flex items-center justify-center font-bold text-lg" style={{ color: primaryColor }}>
                    {(tConfig.logoText || "VP").substring(0, 2).toUpperCase()}
                  </div>
                ) : null}
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{tConfig.logoText || "Sua Empresa"}</h1>
                  <p className="text-xs text-slate-600">{tConfig.empresaRazaoSocial}</p>
                  <p className="text-[11px] text-slate-500 font-mono">CNPJ: {tConfig.empresaCnpj} | IE: {tConfig.empresaInscricaoEstadual}</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold" style={{ color: primaryColor }}>ORÇAMENTO COMERCIAL</h2>
                <div className="font-mono text-xl font-bold">Nº {data.numero}</div>
                <div className="text-xs text-slate-500">Emissão: {formatDate(data.dataEmissao)}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── CORPO PRINCIPAL DO DOCUMENTO ── */}
      <main className="p-8 sm:p-10 space-y-6 flex-1 relative z-10">
        {/* ── 2. DADOS DO CLIENTE & INFORMAÇÕES GERAIS ── */}
        {sections.showClientDetails && (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border ${radiusClass}`} style={{ backgroundColor: archetype === "minimalista" ? "transparent" : "#f8fafc" }}>
            {/* Lado Esquerdo: Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Dados do Cliente / Faturamento
                </span>
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight pt-1">{data.cliente.nome}</p>
              {data.cliente.razaoSocial && data.cliente.razaoSocial !== data.cliente.nome && (
                <p className="text-xs text-slate-600">{data.cliente.razaoSocial}</p>
              )}
              {sections.showClientTaxId && data.cliente.cnpjCpf && (
                <p className="text-xs font-mono text-slate-500">
                  CNPJ/CPF: {data.cliente.cnpjCpf} {data.cliente.inscricaoEstadual ? `| IE: ${data.cliente.inscricaoEstadual}` : ""}
                </p>
              )}
              {sections.showClientAddress && data.cliente.endereco && (
                <p className="text-xs text-slate-500 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>{data.cliente.endereco}{data.cliente.cidade ? `, ${data.cliente.cidade}-${data.cliente.estado}` : ""} {data.cliente.cep ? `(CEP: ${data.cliente.cep})` : ""}</span>
                </p>
              )}
              {data.cliente.contatoNome && (
                <p className="text-xs text-slate-600 font-medium pt-1">
                  A/C: {data.cliente.contatoNome} {data.cliente.telefone ? `• ${data.cliente.telefone}` : ""}
                </p>
              )}
            </div>

            {/* Lado Direito: Condições e Vendedor */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                <FileCheck className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Condições da Proposta
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Validade da Proposta</span>
                  <span className="font-bold text-slate-800">{formatDate(data.dataValidade)}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Condição de Pagamento</span>
                  <span className="font-bold text-slate-800">{data.condicoes.pagamento || "À vista / 28dd"}</span>
                </div>
                {sections.showDeliveryTime && (
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Prazo de Entrega</span>
                    <span className="font-medium text-slate-800">{data.condicoes.prazoEntrega || sections.deliveryTimeText}</span>
                  </div>
                )}
                {data.condicoes.tipoFrete && (
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">Tipo de Frete</span>
                    <span className="font-medium text-slate-800">{data.condicoes.tipoFrete}</span>
                  </div>
                )}
              </div>

              {sections.showSellerContact && data.vendedor?.nome && (
                <div className="pt-2 border-t border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500">Consultor Responsável:</span>
                  <span className="font-bold text-slate-800">{data.vendedor.nome}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 3. TABELA DE ITENS (PRODUTOS / SERVIÇOS) ── */}
        <div className={`overflow-hidden border border-slate-200 ${radiusClass}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr 
                className="text-xs uppercase tracking-wider border-b"
                style={{
                  backgroundColor: archetype === "executivo" ? "#f1f5f9" : archetype === "moderno" ? "#f8fafc" : "#f4f4f5",
                  color: primaryColor,
                }}
              >
                {sections.showProductPhotos && <th className="p-3 w-12 text-center">Item</th>}
                {sections.showProductSku && <th className="p-3 w-24">Código</th>}
                <th className="p-3">Descrição do Produto / Serviço</th>
                {sections.showProductNcm && <th className="p-3 w-20 text-center">NCM</th>}
                <th className="p-3 text-right w-16">Qtd</th>
                <th className="p-3 text-right w-28">Preço Unit.</th>
                {sections.showItemDiscount && <th className="p-3 text-right w-20">Desc.</th>}
                {sections.showItemTaxes && <th className="p-3 text-right w-16">Imp.</th>}
                <th className="p-3 text-right w-32">Total Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.itens.map((item, idx) => (
                <tr 
                  key={idx} 
                  className={`transition-colors ${sections.zebraTable && idx % 2 === 1 ? "bg-slate-50/60" : "bg-white"}`}
                >
                  {sections.showProductPhotos && (
                    <td className={`${tablePy} px-3 text-center`}>
                      {item.imagemUrl ? (
                        <img 
                          src={item.imagemUrl} 
                          alt={item.descricao} 
                          className="w-10 h-10 object-cover rounded-md border border-slate-200 mx-auto"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-mono mx-auto">
                          #{idx + 1}
                        </div>
                      )}
                    </td>
                  )}
                  {sections.showProductSku && (
                    <td className={`${tablePy} px-3 font-mono text-xs font-semibold text-slate-500`}>
                      {item.codigo}
                    </td>
                  )}
                  <td className={`${tablePy} px-3`}>
                    <p className="font-bold text-slate-900 leading-snug">{item.descricao}</p>
                    {sections.showItemNotes && item.especificacao && (
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.especificacao}</p>
                    )}
                    {sections.showItemDeliveryTime && item.prazoItem && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-1 font-medium">
                        <Clock className="w-2.5 h-2.5" /> Prazo: {item.prazoItem}
                      </span>
                    )}
                  </td>
                  {sections.showProductNcm && (
                    <td className={`${tablePy} px-3 text-center font-mono text-xs text-slate-400`}>
                      {item.ncm || "-"}
                    </td>
                  )}
                  <td className={`${tablePy} px-3 text-right font-bold text-slate-900`}>
                    {item.quantidade} <span className="text-[10px] font-normal text-slate-400">{item.unidade || "UN"}</span>
                  </td>
                  <td className={`${tablePy} px-3 text-right font-medium text-slate-700`}>
                    {formatBRL(item.precoUnitario)}
                  </td>
                  {sections.showItemDiscount && (
                    <td className={`${tablePy} px-3 text-right text-xs text-slate-500`}>
                      {item.descontoPercentual && item.descontoPercentual > 0 ? (
                        <span className="text-amber-700 font-semibold">{item.descontoPercentual}%</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  {sections.showItemTaxes && (
                    <td className={`${tablePy} px-3 text-right font-mono text-xs text-slate-500`}>
                      {item.aliquotaImposto ? `${item.aliquotaImposto}%` : "-"}
                    </td>
                  )}
                  <td className={`${tablePy} px-3 text-right font-bold text-slate-950`}>
                    {formatBRL(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 4. RESUMO FINANCEIRO, PIX & CONDIÇÕES ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Lado Esquerdo (Condições, PIX, Garantia) - 7 colunas */}
          <div className="md:col-span-7 space-y-4">
            {/* PIX e Dados Bancários */}
            {sections.showPixQrCode && (
              <div className={`p-4 border border-emerald-500/30 bg-emerald-50/30 flex items-start gap-4 ${radiusClass}`}>
                <div className="p-2 bg-white rounded-lg border border-emerald-200 shrink-0 shadow-2xs">
                  <QRCodeSVG value={pixPayload} size={80} level="M" />
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Pagamento Facilitado via PIX
                  </span>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Escaneie o QR Code no seu aplicativo bancário ou utilize a chave PIX institucional:
                  </p>
                  <p className="font-mono font-bold text-emerald-900 bg-white/80 px-2 py-0.5 rounded border border-emerald-200/60 inline-block text-[11px]">
                    Chave ({sections.pixKeyType.toUpperCase()}): {sections.pixKey || tConfig.empresaCnpj}
                  </p>
                </div>
              </div>
            )}

            {/* Dados Bancários para Transferência */}
            {sections.showBankDetails && sections.bankDetailsText && (
              <div className={`p-3.5 border border-slate-200 bg-slate-50/50 text-xs ${radiusClass}`}>
                <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px] uppercase tracking-wider mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Dados para Depósito / TED / DOC
                </span>
                <p className="text-slate-600 font-mono whitespace-pre-wrap text-[11px] leading-relaxed">
                  {sections.bankDetailsText}
                </p>
              </div>
            )}

            {/* Condições Comerciais e Garantia */}
            {sections.showCommercialConditions && (
              <div className="space-y-2 text-xs text-slate-600">
                {sections.commercialConditionsText && (
                  <p className="leading-relaxed bg-slate-50 p-3 rounded border text-[11px]">
                    <strong className="text-slate-800 block mb-0.5">Condições Gerais:</strong>
                    {sections.commercialConditionsText}
                  </p>
                )}
                {sections.showWarranty && sections.warrantyText && (
                  <p className="text-[11px] flex items-center gap-1.5 text-slate-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <strong>Garantia:</strong> {sections.warrantyText}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Lado Direito (Totais Financeiros) - 5 colunas */}
          <div className="md:col-span-5 space-y-3">
            <div className={`p-5 border border-slate-200 bg-slate-50/80 space-y-3 ${radiusClass}`}>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal dos Produtos</span>
                <span className="font-bold text-slate-900">{formatBRL(data.totais.subtotalProdutos)}</span>
              </div>

              {sections.showGeneralDiscount && data.totais.descontoTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Desconto Comercial Concedido</span>
                  <span className="font-bold">- {formatBRL(data.totais.descontoTotal)}</span>
                </div>
              )}

              {sections.showFreight && data.totais.valorFrete !== undefined && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Frete ({data.condicoes.tipoFrete || "CIF"})</span>
                  <span className="font-bold text-slate-900">
                    {data.totais.valorFrete === 0 ? "Incluso (Grátis)" : formatBRL(data.totais.valorFrete)}
                  </span>
                </div>
              )}

              {sections.showTaxesBreakdown && data.totais.valorImpostos && (
                <div className="flex justify-between text-xs text-slate-500 pt-1 border-t border-slate-200">
                  <span>Impostos Incidentes (IPI / ICMS-ST)</span>
                  <span className="font-mono">{formatBRL(data.totais.valorImpostos)}</span>
                </div>
              )}

              {/* CARD DE VALOR TOTAL */}
              <div 
                className={`p-4 text-white shadow-md flex flex-col justify-center mt-3 ${radiusClass}`}
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center justify-between text-xs uppercase font-bold tracking-wider text-white/80">
                  <span>Valor Total da Proposta</span>
                  {sections.showMarginBadge && data.totais.margemLucroPercentual && (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold">
                      Margem OK
                    </span>
                  )}
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-tight mt-1 leading-none">
                  {formatBRL(data.totais.valorTotal)}
                </div>
                <div className="text-[10px] text-white/70 mt-1">
                  Pagamento: {data.condicoes.pagamento}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 5. OBSERVAÇÕES & TERMO DE ACEITE ── */}
        {sections.showGeneralNotes && data.observacoes && (
          <div className={`p-4 border border-slate-200 bg-slate-50/50 text-xs ${radiusClass}`}>
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
              Observações Especiais do Pedido:
            </span>
            <p className="text-slate-600 leading-relaxed italic">{data.observacoes}</p>
          </div>
        )}

        {/* ── 6. ASSINATURAS E SELO DIGITAL ── */}
        {sections.showSignatures && (
          <div className="pt-6 border-t border-slate-200 space-y-6">
            {sections.termsOfAcceptance && (
              <p className="text-[10px] text-slate-500 text-center leading-relaxed italic max-w-xl mx-auto">
                "{sections.termsOfAcceptance}"
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              {/* Assinatura Cliente */}
              <div className="text-center space-y-2">
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto pb-1" />
                <p className="text-xs font-bold text-slate-900">{sections.signatureClientLabel || "Aceite do Comprador"}</p>
                <p className="text-[10px] text-slate-400 font-mono">Data: ___/___/______ | CPF/Assinatura</p>
              </div>

              {/* Assinatura Vendedor / Empresa */}
              <div className="text-center space-y-2">
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto pb-1" />
                <p className="text-xs font-bold text-slate-900">{data.vendedor.nome || sections.signatureSellerLabel}</p>
                <p className="text-[10px] text-slate-400 font-mono">Departamento Comercial Protheus ERP</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 7. SELO DE AUTENTICAÇÃO DIGITAL ── */}
        {sections.showDigitalStamp && (
          <div className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Autenticação Digital SHA-256: 8f4c7e9a...3b21</span>
            </div>
            <div className="text-slate-400">
              Homologado via Conector ERP Protheus SE1/SC5 em {new Date().toLocaleDateString("pt-BR")}
            </div>
          </div>
        )}
      </main>

      {/* ── 8. RODAPÉ FIXO ── */}
      {sections.showFooter && (
        <footer className="p-6 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left relative z-10">
          <div>
            <span className="font-bold text-slate-600">{tConfig.empresaRazaoSocial || tConfig.logoText}</span>
            {tConfig.empresaSite && <span> • {tConfig.empresaSite}</span>}
            {tConfig.empresaEmail && <span> • {tConfig.empresaEmail}</span>}
          </div>
          <div className="leading-tight max-w-md">
            {sections.footerText || tConfig.textoRodape}
          </div>
          {sections.footerPageNumbers && (
            <div className="font-mono text-slate-500 font-bold shrink-0">
              Página 1 de 1
            </div>
          )}
        </footer>
      )}
    </div>
  );
};
