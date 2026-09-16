import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Printer,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Building2,
  Phone,
  Mail,
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
  FileText,
  Sliders,
  ChevronDown,
  Sparkles,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printElement, PrintOptions } from "@/lib/print-utils";
import { getSettings, type AppSettings } from "@/lib/settings-store";
import {
  QuoteDocumentData,
  DocumentLayoutArchetype,
  DocumentFontFamily,
  DocumentDensity,
} from "@/types/document-template";
import { type Quote, type Order, type Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// ─── UTILITY FORMATTERS ───

export const formatCurrency = (v: number | undefined | null): string => {
  if (v === undefined || v === null || isNaN(v)) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
};

// ─── DATA ADAPTERS: QUOTE & ORDER TO QUOTEDOCUMENTDATA ───

export function quoteToDocumentData(
  quote: Quote,
  settings?: AppSettings,
  productsList?: Product[]
): QuoteDocumentData {
  const currentSettings = settings || getSettings();
  const subtotal = (quote.itens || []).reduce(
    (acc, it) => acc + (it.precoUnitario || 0) * (it.quantidade || 1),
    0
  );
  const totalDiscount = (quote.itens || []).reduce(
    (acc, it) =>
      acc +
      (it.desconto
        ? (it.precoUnitario * (it.quantidade || 1) * it.desconto) / 100
        : 0),
    0
  );
  const totalValue = quote.valor || subtotal - totalDiscount;

  return {
    numero: quote.numero || `ORC-${quote.id}`,
    tipo: "orcamento",
    dataEmissao: quote.data || new Date().toISOString().slice(0, 10),
    dataValidade: quote.validade || new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
    status: quote.status || "Enviado",
    cliente: {
      nome: quote.cliente || "Cliente Não Informado",
      razaoSocial: quote.cliente,
      cnpjCpf: "12.345.678/0001-90",
      email: "contato@cliente.com.br",
      telefone: "(11) 3456-7890",
      endereco: "Av. Comercial das Indústrias, 1200 - Bloco B",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-100",
      contatoNome: "Departamento de Suprimentos & Compras",
    },
    vendedor: {
      nome: quote.vendedor || "Consultor de Vendas Protheus",
      email: "vendas@empresa.com.br",
      telefone: "(11) 98765-4321",
      departamento: "Comercial / B2B",
    },
    condicoes: {
      pagamento: quote.condicaoPagamento || "30/60/90 dias",
      prazoEntrega: currentSettings.documentConfig?.prazoEntregaPadrao || "7 a 10 dias úteis",
      tipoFrete: "CIF",
      valorFrete: 0,
      validadeDias: 15,
    },
    itens: (quote.itens || []).map((it, idx) => {
      const prodMatch = productsList?.find(
        (p) => p.codigo === it.codigo || p.nome.toLowerCase() === it.produto.toLowerCase()
      );
      return {
        codigo: it.codigo || `ITEM-${idx + 1}`,
        descricao: it.produto || "Item",
        imagemUrl: prodMatch?.primaryImageUrl || (prodMatch?.images && prodMatch.images[0]?.url),
        quantidade: it.quantidade || 1,
        unidade: prodMatch?.unidade || "UN",
        precoUnitario: it.precoUnitario || 0,
        descontoPercentual: it.desconto || 0,
        subtotal: it.total || (it.precoUnitario * (it.quantidade || 1) * (1 - (it.desconto || 0) / 100)),
        ncm: "8471.30.12",
        aliquotaImposto: 5,
        prazoItem: "Pronta Entrega",
        especificacao: prodMatch?.categoria ? `Categoria: ${prodMatch.categoria}` : undefined,
      };
    }),
    totais: {
      subtotalProdutos: subtotal,
      descontoTotal: totalDiscount,
      valorFrete: 0,
      valorImpostos: totalValue * 0.08,
      valorTotal: totalValue,
      margemLucroPercentual: 32.5,
    },
    observacoes: quote.observacoes || "Faturamento direto via TOTVS Protheus. Sujeito à análise de crédito.",
    condicoesGerais: "Preços e condições comerciais válidos até a data limite da proposta. O aceite formal autoriza a emissão do Pedido de Venda.",
  };
}

export function orderToDocumentData(
  order: Order,
  settings?: AppSettings,
  productsList?: Product[]
): QuoteDocumentData {
  const currentSettings = settings || getSettings();
  const subtotal = (order.itens || []).reduce(
    (acc, it) => acc + (it.precoUnitario || 0) * (it.quantidade || 1),
    0
  );
  const totalDiscount = (order.itens || []).reduce(
    (acc, it) =>
      acc +
      (it.desconto
        ? (it.precoUnitario * (it.quantidade || 1) * it.desconto) / 100
        : 0),
    0
  );
  const totalValue = order.valor || subtotal - totalDiscount;

  return {
    numero: order.numero || `PV-${order.id}`,
    tipo: "pedido",
    dataEmissao: order.data || new Date().toISOString().slice(0, 10),
    dataValidade: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    status: order.status || "Aprovado",
    cliente: {
      nome: order.cliente || "Cliente Não Informado",
      razaoSocial: order.cliente,
      cnpjCpf: "12.345.678/0001-90",
      email: "compras@cliente.com.br",
      telefone: "(11) 3456-7890",
      endereco: "Rua Industrial do Comércio, 500",
      cidade: "São Paulo",
      estado: "SP",
      cep: "04571-010",
      contatoNome: "Central de Recebimento & Faturamento",
    },
    vendedor: {
      nome: order.vendedor || "Consultor Comercial",
      email: "vendas@empresa.com.br",
      telefone: "(11) 98765-4321",
      departamento: "Vendas Corporativas",
    },
    condicoes: {
      pagamento: order.condicaoPagamento || "30 dias",
      prazoEntrega: currentSettings.documentConfig?.prazoEntregaPadrao || "5 a 7 dias úteis",
      tipoFrete: "CIF",
      valorFrete: 0,
    },
    itens: (order.itens || []).map((it, idx) => {
      const prodMatch = productsList?.find(
        (p) => p.codigo === it.codigo || p.nome.toLowerCase() === it.produto.toLowerCase()
      );
      return {
        codigo: it.codigo || `PRD-${idx + 1}`,
        descricao: it.produto || "Produto",
        imagemUrl: prodMatch?.primaryImageUrl || (prodMatch?.images && prodMatch.images[0]?.url),
        quantidade: it.quantidade || 1,
        unidade: prodMatch?.unidade || "UN",
        precoUnitario: it.precoUnitario || 0,
        descontoPercentual: it.desconto || 0,
        subtotal: it.total || (it.precoUnitario * (it.quantidade || 1) * (1 - (it.desconto || 0) / 100)),
        ncm: "8471.30.12",
        aliquotaImposto: 5,
        prazoItem: "Faturamento Imediato",
        especificacao: prodMatch?.categoria ? `Categoria: ${prodMatch.categoria}` : undefined,
      };
    }),
    totais: {
      subtotalProdutos: subtotal,
      descontoTotal: totalDiscount,
      valorFrete: 0,
      valorImpostos: totalValue * 0.08,
      valorTotal: totalValue,
    },
    observacoes: order.observacoes || "Pedido integrado e transmitido ao ERP Protheus. Separação em andamento.",
    condicoesGerais: "Mercadoria acompanha Nota Fiscal Eletrônica (NF-e) e Danfe. Confira a embalagem no ato do recebimento.",
  };
}

// ─── COMPONENT PROPS & OPTIONS ───

export interface DocumentPrintLayoutProps {
  /** Unified document data */
  data?: QuoteDocumentData;
  /** Direct quote object (automatically mapped if provided) */
  quote?: Quote;
  /** Direct order object (automatically mapped if provided) */
  order?: Order;
  /** Global app settings (will fallback to getSettings() if omitted) */
  settings?: AppSettings;
  /** List of products for image resolution and specs */
  products?: Product[];
  /** Archetype override (moderno, classico, minimalista, tecnico, executivo) */
  archetype?: DocumentLayoutArchetype;
  /** Font family override */
  fontFamily?: DocumentFontFamily;
  /** Table density */
  density?: DocumentDensity;
  /** Whether to show the top interactive control bar (Print, download, toggles) */
  showToolbar?: boolean;
  /** Watermark text (e.g., "ORÇAMENTO", "PEDIDO DE VENDA", "APROVADO", "CONFIDENCIAL", "RASCUNHO") */
  watermark?: string;
  /** Show/hide product photos inside the items table */
  showProductPhotos?: boolean;
  /** Show/hide formal signatures block */
  showSignatures?: boolean;
  /** Show/hide PIX QR code and bank transfer box */
  showBankDetails?: boolean;
  /** Show/hide financial margin badge (internal view) */
  showMargin?: boolean;
  /** Custom printable element ID */
  printableId?: string;
  /** Custom wrapper class */
  className?: string;
  /** Callback when printing is initiated */
  onPrint?: () => void;
}

// ─── MAIN DEDICATED PRINT LAYOUT COMPONENT ───

export const DocumentPrintLayout: React.FC<DocumentPrintLayoutProps> = ({
  data: propData,
  quote,
  order,
  settings: propSettings,
  products = [],
  archetype: propArchetype,
  fontFamily: propFontFamily,
  density: propDensity,
  showToolbar = true,
  watermark: propWatermark,
  showProductPhotos: propShowProductPhotos,
  showSignatures: propShowSignatures = true,
  showBankDetails: propShowBankDetails = true,
  showMargin: propShowMargin = false,
  printableId = "printable-document-layout",
  className = "",
  onPrint,
}) => {
  const { toast } = useToast();
  const settings = propSettings || getSettings();
  const tConfig = settings.templateConfig;
  const dConfig = settings.documentConfig;

  // Resolve document data from props
  const docData: QuoteDocumentData = React.useMemo(() => {
    if (propData) return propData;
    if (quote) return quoteToDocumentData(quote, settings, products);
    if (order) return orderToDocumentData(order, settings, products);
    // Fallback sample data
    return {
      numero: "DOC-2026-001",
      tipo: "proposta",
      dataEmissao: new Date().toISOString().slice(0, 10),
      dataValidade: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
      status: "Aprovado",
      cliente: {
        nome: "Tech Solutions Indústria e Comércio Ltda",
        cnpjCpf: "12.345.678/0001-90",
        email: "compras@techsolutions.com.br",
        telefone: "(11) 3456-7890",
        endereco: "Av. das Nações Unidas, 14.200 - Torre Norte",
        cidade: "São Paulo",
        estado: "SP",
        cep: "04794-000",
      },
      vendedor: {
        nome: "Carlos Silva",
        email: "carlos.silva@empresa.com.br",
        telefone: "(11) 98765-4321",
        departamento: "Grandes Contas B2B",
      },
      condicoes: {
        pagamento: "30/60/90 dias via Boleto Bancário",
        prazoEntrega: "7 a 10 dias úteis",
        tipoFrete: "CIF",
      },
      itens: [
        {
          codigo: "NB-015",
          descricao: "Notebook Pro 15 - Intel Core i7 16GB SSD 512GB",
          quantidade: 5,
          unidade: "UN",
          precoUnitario: 2800,
          descontoPercentual: 5,
          subtotal: 13300,
          ncm: "8471.30.12",
          prazoItem: "Pronta Entrega",
        },
        {
          codigo: "MN-274",
          descricao: "Monitor Ultrawide 27'' IPS 4K HDR",
          quantidade: 5,
          unidade: "UN",
          precoUnitario: 1750,
          descontoPercentual: 0,
          subtotal: 8750,
          ncm: "8528.52.20",
          prazoItem: "Pronta Entrega",
        },
      ],
      totais: {
        subtotalProdutos: 22750,
        descontoTotal: 700,
        valorFrete: 0,
        valorImpostos: 1820,
        valorTotal: 22050,
      },
      observacoes: "Proposta técnica sujeita às condições gerais de fornecimento e faturamento TOTVS Protheus.",
    };
  }, [propData, quote, order, settings, products]);

  // Interactive toolbar local state
  const [activeArchetype, setActiveArchetype] = useState<DocumentLayoutArchetype>(
    propArchetype || tConfig.layout || "moderno"
  );
  const [activeFontFamily, setActiveFontFamily] = useState<DocumentFontFamily>(
    propFontFamily || tConfig.fontFamily || "sans"
  );
  const [activeWatermark, setActiveWatermark] = useState<string>(
    propWatermark ?? (docData.status === "Aprovado" ? "APROVADO" : docData.tipo === "pedido" ? "PEDIDO DE VENDA" : "")
  );
  const [showImages, setShowImages] = useState<boolean>(
    propShowProductPhotos ?? (dConfig.sections?.showProductPhotos ?? true)
  );
  const [showSignaturesState, setShowSignaturesState] = useState<boolean>(propShowSignatures);
  const [showBankDetailsState, setShowBankDetailsState] = useState<boolean>(propShowBankDetails);
  const [paperFormat, setPaperFormat] = useState<"a4" | "letter">("a4");
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Colors
  const primaryColor = tConfig.primaryColor || "#0f172a";
  const accentColor = tConfig.accentColor || "#2563eb";
  const headerBgColor = tConfig.headerBgColor || primaryColor;
  const headerTextColor = tConfig.headerTextColor || "#ffffff";

  // Document Title & Type Badge
  const docTypeLabel =
    docData.tipo === "pedido"
      ? "PEDIDO DE VENDA"
      : docData.tipo === "orcamento"
      ? "ORÇAMENTO COMERCIAL"
      : "PROPOSTA TÉCNICO-COMERCIAL";

  // Trigger Print using the centralized printElement helper
  const handlePrint = () => {
    if (onPrint) onPrint();
    const docTitle = `${docTypeLabel} - ${docData.numero} - ${docData.cliente.nome || "Cliente"}`;
    printElement(printableId, {
      title: docTitle,
      paperSize: paperFormat,
      orientation: "portrait",
      marginMm: 10,
    });
  };

  // Copy Formatted Summary to Clipboard
  const handleCopySummary = async () => {
    try {
      const summary = `📄 *${docTypeLabel} #${docData.numero}*
🏢 *Cliente:* ${docData.cliente.nome}
📅 *Emissão:* ${formatDate(docData.dataEmissao)} | *Validade:* ${formatDate(docData.dataValidade)}
👤 *Vendedor:* ${docData.vendedor.nome}

📦 *ITENS:*
${docData.itens
  .map(
    (it, i) =>
      `${i + 1}. [${it.codigo}] ${it.descricao} - ${it.quantidade} ${it.unidade || "UN"} x ${formatCurrency(
        it.precoUnitario
      )} = ${formatCurrency(it.subtotal)}`
  )
  .join("\n")}

💰 *Total Geral:* ${formatCurrency(docData.totais.valorTotal)}
💳 *Condição:* ${docData.condicoes.pagamento}
🚚 *Prazo de Entrega:* ${docData.condicoes.prazoEntrega || "A combinar"}`;

      await navigator.clipboard.writeText(summary);
      setCopiedSummary(true);
      toast({
        title: "Resumo copiado com sucesso!",
        description: "Texto formatado pronto para envio via WhatsApp ou E-mail.",
      });
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível acessar a área de transferência.",
        variant: "destructive",
      });
    }
  };

  // Font family css class
  const fontClass =
    activeFontFamily === "serif"
      ? "font-serif"
      : activeFontFamily === "mono"
      ? "font-mono"
      : "font-sans";

  return (
    <div className={cn("w-full flex flex-col items-center", className)}>
      {/* ── TOP ACTION & CONTROL TOOLBAR (PRINT-HIDDEN) ── */}
      {showToolbar && (
        <div className="w-full max-w-[210mm] mb-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center flex-wrap gap-2">
            {/* Direct Print CTA */}
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-sm h-8 px-3"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </Button>

            {/* Layout Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">Layout:</span>
              <Select
                value={activeArchetype}
                onValueChange={(v) => setActiveArchetype(v as DocumentLayoutArchetype)}
              >
                <SelectTrigger className="h-8 w-[125px] text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderno">Moderno</SelectItem>
                  <SelectItem value="executivo">Executivo</SelectItem>
                  <SelectItem value="classico">Clássico</SelectItem>
                  <SelectItem value="minimalista">Minimalista</SelectItem>
                  <SelectItem value="tecnico">Técnico / Fiscal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Typography Selector */}
            <Select
              value={activeFontFamily}
              onValueChange={(v) => setActiveFontFamily(v as DocumentFontFamily)}
            >
              <SelectTrigger className="h-8 w-[105px] text-xs font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sans">Sans-serif</SelectItem>
                <SelectItem value="serif">Serif (Formal)</SelectItem>
                <SelectItem value="mono">Monospace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Toggle Image Thumbnails */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImages(!showImages)}
              className={cn(
                "h-8 text-xs gap-1.5",
                showImages && "bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold"
              )}
              title={showImages ? "Ocultar fotos dos itens" : "Exibir fotos dos itens"}
            >
              {showImages ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Fotos</span>
            </Button>

            {/* Dropdown for More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Opções</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400">
                  Ajustes de Impressão
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setShowSignaturesState(!showSignaturesState)}>
                  <span className="flex items-center justify-between w-full">
                    <span>Bloco de Assinaturas</span>
                    {showSignaturesState ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBankDetailsState(!showBankDetailsState)}>
                  <span className="flex items-center justify-between w-full">
                    <span>PIX & Dados Bancários</span>
                    {showBankDetailsState ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : null}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400">
                  Marca d'Água
                </DropdownMenuLabel>
                {["", "ORÇAMENTO", "PEDIDO DE VENDA", "APROVADO", "CONFIDENCIAL", "RASCUNHO", "CANCELADO"].map((wm) => (
                  <DropdownMenuItem key={wm || "none"} onClick={() => setActiveWatermark(wm)}>
                    <span className="flex items-center justify-between w-full">
                      <span>{wm || "(Sem marca d'água)"}</span>
                      {activeWatermark === wm && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy Summary */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="h-8 text-xs gap-1.5"
              title="Copiar resumo textual formatado"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedSummary ? "Copiado!" : "Copiar"}</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── THE PRINTABLE DOCUMENT CANVAS (A4/PDF-READY) ── */}
      <div
        id={printableId}
        className={cn(
          "printable-area bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] shadow-xl border border-slate-200 overflow-hidden relative transition-all duration-200 select-text flex flex-col",
          fontClass,
          className
        )}
        style={{
          boxSizing: "border-box",
          pageBreakAfter: "avoid",
        }}
      >
        {/* ── WATERMARK OVERLAY ── */}
        {activeWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
            <span
              className={cn(
                "text-7xl md:text-8xl font-black uppercase transform -rotate-45 tracking-widest text-slate-900/5 select-none text-center px-4",
                activeWatermark === "CANCELADO" && "text-rose-600/10",
                activeWatermark === "APROVADO" && "text-emerald-600/10",
                activeWatermark === "CONFIDENCIAL" && "text-amber-600/10"
              )}
            >
              {activeWatermark}
            </span>
          </div>
        )}

        <div className="relative z-10 flex flex-col flex-1">
          {/* ══════════════════════════════════════════════════════
              1. CABEÇALHO DO DOCUMENTO & IDENTIDADE VISUAL
          ══════════════════════════════════════════════════════ */}
          {activeArchetype === "moderno" || activeArchetype === "executivo" ? (
            // Modern / Executivo: Banner Branded Header
            <div
              className="p-8 md:p-10 text-white transition-all relative overflow-hidden"
              style={{ backgroundColor: headerBgColor }}
            >
              {/* Subtle visual texture/accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 opacity-80"
                style={{ backgroundColor: accentColor }}
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                {/* Logo & Company Identity */}
                <div className="flex items-center gap-5">
                  {tConfig.logoImage ? (
                    <div className="p-2.5 rounded-xl bg-white shadow-md shrink-0">
                      <img
                        src={tConfig.logoImage}
                        alt="Logo da Empresa"
                        className="max-h-16 max-w-[200px] object-contain"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex shrink-0 items-center justify-center font-black text-xl shadow-inner border border-white/20"
                      style={{ backgroundColor: "rgba(255,255,255,0.15)", color: headerTextColor }}
                    >
                      {(tConfig.logoText || "VP").substring(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <h1
                      className="text-2xl md:text-3xl font-black tracking-tight"
                      style={{ color: headerTextColor }}
                    >
                      {tConfig.empresaNomeFantasia || tConfig.logoText || "Sua Empresa"}
                    </h1>
                    {tConfig.empresaRazaoSocial && (
                      <p className="text-xs opacity-80 font-medium">{tConfig.empresaRazaoSocial}</p>
                    )}
                    <div className="text-[11px] opacity-75 flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {tConfig.empresaCnpj && <span>CNPJ: {tConfig.empresaCnpj}</span>}
                      {tConfig.empresaInscricaoEstadual && <span>IE: {tConfig.empresaInscricaoEstadual}</span>}
                      {tConfig.empresaTelefone && <span>Tel: {tConfig.empresaTelefone}</span>}
                      {tConfig.empresaEmail && <span>{tConfig.empresaEmail}</span>}
                    </div>
                  </div>
                </div>

                {/* Document Type & Number Badge */}
                <div className="sm:text-right bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/15 shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-80 block">
                    {docTypeLabel}
                  </span>
                  <span className="text-2xl md:text-3xl font-mono font-black block tracking-tight">
                    #{docData.numero}
                  </span>
                  {docData.status && (
                    <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-900 shadow-xs">
                      {docData.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : activeArchetype === "classico" ? (
            // Clássico: Formal Corporate Clean Top Header
            <div className="p-8 border-b-2 border-slate-900 bg-white">
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-4">
                  {tConfig.logoImage ? (
                    <img
                      src={tConfig.logoImage}
                      alt="Logo"
                      className="max-h-16 max-w-[180px] object-contain"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {(tConfig.logoText || "VP").substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-slate-900">
                      {tConfig.empresaRazaoSocial || tConfig.logoText || "Sua Empresa"}
                    </h1>
                    <p className="text-xs text-slate-600 mt-0.5">
                      CNPJ: {tConfig.empresaCnpj || "00.000.000/0001-00"} | IE: {tConfig.empresaInscricaoEstadual || "Isento"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {tConfig.empresaEndereco || "Endereço Comercial"} - Tel: {tConfig.empresaTelefone || "(11) 0000-0000"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {docTypeLabel}
                  </h2>
                  <p className="font-serif font-black text-2xl text-slate-900 mt-0.5">
                    Nº {docData.numero}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Emissão: <strong>{formatDate(docData.dataEmissao)}</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : activeArchetype === "tecnico" ? (
            // Técnico / Fiscal: High density tabular top header
            <div className="p-6 border-b border-slate-300 bg-slate-50">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-8 flex items-center gap-3">
                  {tConfig.logoImage && (
                    <img src={tConfig.logoImage} alt="Logo" className="max-h-12 object-contain" />
                  )}
                  <div>
                    <h1 className="text-lg font-bold font-mono text-slate-900">
                      {tConfig.empresaRazaoSocial || tConfig.logoText || "EMPRESA PROTHEUS TOTVS"}
                    </h1>
                    <p className="text-[11px] font-mono text-slate-600">
                      CNPJ: {tConfig.empresaCnpj} | IE: {tConfig.empresaInscricaoEstadual || "-"} | TEL: {tConfig.empresaTelefone}
                    </p>
                  </div>
                </div>
                <div className="col-span-4 text-right border-l border-slate-300 pl-3">
                  <div className="text-[10px] font-mono font-bold uppercase text-slate-500">{docTypeLabel}</div>
                  <div className="text-xl font-mono font-bold text-slate-900">COD: {docData.numero}</div>
                  <div className="text-[11px] font-mono text-slate-600">EMISSÃO: {formatDate(docData.dataEmissao)}</div>
                </div>
              </div>
            </div>
          ) : (
            // Minimalista: Clean, Airy & Minimalist
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-xl font-light tracking-wide text-slate-900 uppercase">
                    {tConfig.empresaNomeFantasia || tConfig.logoText || "Empresa"}
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tConfig.empresaEmail} | {tConfig.empresaTelefone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-slate-400">{docTypeLabel}</p>
                  <p className="text-2xl font-light text-slate-900">#{docData.numero}</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              2. DADOS DO CLIENTE & INFORMAÇÕES DA PROPOSTA
          ══════════════════════════════════════════════════════ */}
          <div className="p-8 md:p-10 space-y-8 flex-1 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/80 dark:bg-slate-900/30 p-5 rounded-xl border border-slate-200/80">
              {/* Cliente */}
              <div className="md:col-span-7 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Destinatário / Cliente</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {docData.cliente.razaoSocial || docData.cliente.nome}
                  </h3>
                  {docData.cliente.cnpjCpf && (
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      CNPJ/CPF: <strong>{docData.cliente.cnpjCpf}</strong>
                      {docData.cliente.inscricaoEstadual && (
                        <span> | IE: {docData.cliente.inscricaoEstadual}</span>
                      )}
                    </p>
                  )}
                  {docData.cliente.endereco && (
                    <p className="text-xs text-slate-600 mt-1 flex items-start gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {docData.cliente.endereco}
                        {docData.cliente.cidade && `, ${docData.cliente.cidade}`}
                        {docData.cliente.estado && ` - ${docData.cliente.estado}`}
                        {docData.cliente.cep && ` | CEP: ${docData.cliente.cep}`}
                      </span>
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                    {docData.cliente.telefone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {docData.cliente.telefone}
                      </span>
                    )}
                    {docData.cliente.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> {docData.cliente.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhes Comerciais & Prazos */}
              <div className="md:col-span-5 space-y-2 md:border-l md:border-slate-200 md:pl-6">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Condições Comerciais</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Data de Emissão:</span>
                    <span className="font-bold text-slate-900">{formatDate(docData.dataEmissao)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">
                      {docData.tipo === "pedido" ? "Previsão de Entrega:" : "Validade da Proposta:"}
                    </span>
                    <span className="font-bold text-slate-900">{formatDate(docData.dataValidade)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Condição de Pagto:</span>
                    <span className="font-bold text-slate-900">{docData.condicoes.pagamento}</span>
                  </div>
                  {docData.condicoes.prazoEntrega && (
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Prazo de Entrega:</span>
                      <span className="font-bold text-slate-900">{docData.condicoes.prazoEntrega}</span>
                    </div>
                  )}
                  {docData.vendedor.nome && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Consultor Comercial:</span>
                      <span className="font-bold text-slate-900">{docData.vendedor.nome}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                3. TABELA DE PRODUTOS / SERVIÇOS
            ══════════════════════════════════════════════════════ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Itens do Documento ({docData.itens.length})</span>
                </h3>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className="text-slate-900 font-bold border-b border-slate-200"
                      style={{ backgroundColor: activeArchetype === "moderno" ? "#f8fafc" : "#f1f5f9" }}
                    >
                      <th className="py-3 px-3 text-center w-10">#</th>
                      {showImages && <th className="py-3 px-2 w-12 text-center">FOTO</th>}
                      <th className="py-3 px-3 w-28">CÓDIGO</th>
                      <th className="py-3 px-3">DESCRIÇÃO DOS PRODUTOS / SERVIÇOS</th>
                      <th className="py-3 px-3 text-center w-16">QTD</th>
                      <th className="py-3 px-3 text-right w-28">VALOR UNIT.</th>
                      <th className="py-3 px-3 text-right w-20">DESC.%</th>
                      <th className="py-3 px-3 text-right w-32">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 text-slate-700">
                    {docData.itens.map((item, idx) => (
                      <tr
                        key={idx}
                        className={cn(
                          "transition-colors hover:bg-slate-50/50",
                          idx % 2 === 1 && "bg-slate-50/40"
                        )}
                        style={{ pageBreakInside: "avoid" }}
                      >
                        <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>

                        {showImages && (
                          <td className="py-2.5 px-2 text-center">
                            {item.imagemUrl ? (
                              <img
                                src={item.imagemUrl}
                                alt={item.descricao}
                                className="w-9 h-9 object-cover rounded-md border border-slate-200 mx-auto"
                              />
                            ) : (
                              <div className="w-9 h-9 bg-slate-100 rounded-md border border-dashed border-slate-300 flex items-center justify-center mx-auto text-slate-400 text-[10px]">
                                Sem foto
                              </div>
                            )}
                          </td>
                        )}

                        <td className="py-3 px-3 font-mono font-semibold text-slate-900 text-xs">
                          {item.codigo}
                        </td>

                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.descricao}</p>
                          <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-500 mt-0.5">
                            {item.ncm && <span>NCM: {item.ncm}</span>}
                            {item.aliquotaImposto ? (
                              <span>IPI: {item.aliquotaImposto}%</span>
                            ) : null}
                            {item.prazoItem && (
                              <span className="text-emerald-600 font-medium">
                                • {item.prazoItem}
                              </span>
                            )}
                            {item.especificacao && <span>• {item.especificacao}</span>}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-900">
                          {item.quantidade} <span className="text-[10px] font-normal text-slate-500">{item.unidade || "UN"}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-medium text-slate-800">
                          {formatCurrency(item.precoUnitario)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {item.descontoPercentual ? `${item.descontoPercentual}%` : "-"}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono text-xs">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                4. TOTAIS & RESUMO FINANCEIRO
            ══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start" style={{ pageBreakInside: "avoid" }}>
              {/* Observações Comerciais & Dados de Pagamento */}
              <div className="md:col-span-7 space-y-4">
                {docData.observacoes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Observações Importantes
                    </p>
                    <p className="text-slate-600 leading-relaxed">{docData.observacoes}</p>
                  </div>
                )}

                {/* Bloco PIX & Dados Bancários */}
                {showBankDetailsState && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Dados para Pagamento via PIX / Transferência</span>
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Banco: <strong>Banco do Brasil (001)</strong> | Agência: <strong>1234-5</strong> | CC: <strong>98765-4</strong>
                      </p>
                      <p className="text-slate-600 text-[11px]">
                        Chave PIX (CNPJ): <strong>{tConfig.empresaCnpj || "12.345.678/0001-90"}</strong>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Favorecido: {tConfig.empresaRazaoSocial || tConfig.logoText || "Empresa Protheus Ltda"}
                      </p>
                    </div>

                    <div className="shrink-0 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs text-center">
                      <QRCodeSVG
                        value={`00020126580014BR.GOV.BCB.PIX0114${tConfig.empresaCnpj?.replace(/\D/g, "") || "12345678000190"}520400005303986540${docData.totais.valorTotal.toFixed(2)}5802BR5915EMPRESA PROTHEUS6009SAO PAULO62070503***6304`}
                        size={64}
                        level="M"
                      />
                      <span className="block text-[9px] font-bold text-slate-500 mt-1 uppercase">PIX QR Code</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quadro de Totais */}
              <div className="md:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-medium font-mono">{formatCurrency(docData.totais.subtotalProdutos)}</span>
                </div>

                {docData.totais.descontoTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Desconto Concedido:</span>
                    <span className="font-mono">-{formatCurrency(docData.totais.descontoTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Frete ({docData.condicoes.tipoFrete || "CIF"}):</span>
                  <span className="font-medium font-mono">
                    {docData.totais.valorFrete ? formatCurrency(docData.totais.valorFrete) : "Incluso / Isento"}
                  </span>
                </div>

                {docData.totais.valorImpostos && docData.totais.valorImpostos > 0 ? (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Impostos Estimados (IPI/ICMS):</span>
                    <span className="font-mono">{formatCurrency(docData.totais.valorImpostos)}</span>
                  </div>
                ) : null}

                <div className="pt-3 border-t-2 border-slate-300 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 block uppercase tracking-tight">
                      Valor Total
                    </span>
                    <span className="text-[10px] text-slate-500">Condição: {docData.condicoes.pagamento}</span>
                  </div>
                  <span
                    className="text-2xl font-black font-mono tracking-tight"
                    style={{ color: primaryColor }}
                  >
                    {formatCurrency(docData.totais.valorTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                5. TERMOS DE ACEITE & ASSINATURAS FORMAIS
            ══════════════════════════════════════════════════════ */}
            {showSignaturesState && (
              <div className="mt-8 pt-6 border-t border-slate-200 space-y-6" style={{ pageBreakInside: "avoid" }}>
                <div className="bg-slate-50/60 p-3.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 text-center">
                  Declaro estar ciente e de acordo com os preços, prazos, especificações técnicas e condições comerciais descritas neste documento, autorizando o faturamento e fornecimento conforme especificado.
                </div>

                <div className="grid grid-cols-2 gap-10 pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-400 w-4/5 mx-auto h-8" />
                    <p className="text-xs font-bold text-slate-900">{docData.cliente.nome}</p>
                    <p className="text-[10px] text-slate-500">De acordo do Cliente / Comprador Responsável</p>
                    <p className="text-[9px] text-slate-400">Data: ____/____/________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b border-slate-400 w-4/5 mx-auto h-8" />
                    <p className="text-xs font-bold text-slate-900">{docData.vendedor.nome}</p>
                    <p className="text-[10px] text-slate-500">{tConfig.empresaRazaoSocial || tConfig.logoText || "Empresa Vendedora"}</p>
                    <p className="text-[9px] text-slate-400">Consultor Comercial</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════
              6. RODAPÉ INSTITUCIONAL
          ══════════════════════════════════════════════════════ */}
          <div className="p-4 px-8 bg-slate-100 text-slate-500 text-[10px] flex items-center justify-between border-t border-slate-200 mt-auto">
            <span>
              {tConfig.textoRodape || `${tConfig.empresaNomeFantasia || "Vendas Protheus"} • Documento emitido eletronicamente`}
            </span>
            <span className="font-mono">
              Emissão: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
