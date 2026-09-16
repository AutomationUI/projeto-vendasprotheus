import { QuoteDocumentData, DocumentBlock, DocumentTemplatePreset, DocumentLayoutArchetype } from "@/types/document-template";
import { AppSettings } from "@/lib/settings-store";

export interface DocumentVariableDefinition {
  tag: string;
  label: string;
  category: "cliente" | "orcamento" | "totais" | "vendedor" | "empresa" | "sistema";
  example: string;
}

export interface VariableCategoryTheme {
  id: "cliente" | "orcamento" | "totais" | "vendedor" | "empresa" | "sistema";
  label: string;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  chipBg: string;
  chipText: string;
  chipBorder: string;
  hoverBg: string;
  dotColor: string;
  accentColor: string;
  activeRing: string;
}

export const VARIABLE_CATEGORIES_CONFIG: Record<
  "cliente" | "orcamento" | "totais" | "vendedor" | "empresa" | "sistema",
  VariableCategoryTheme
> = {
  cliente: {
    id: "cliente",
    label: "Cliente & Faturamento",
    colorName: "Azul Céu",
    badgeBg: "bg-blue-50/95 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-300 dark:border-blue-700",
    chipBg: "bg-blue-600 text-white",
    chipText: "text-blue-600 dark:text-blue-400",
    chipBorder: "border-blue-200 dark:border-blue-800",
    hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/60",
    dotColor: "bg-blue-500",
    accentColor: "#2563eb",
    activeRing: "ring-2 ring-blue-500 ring-offset-1",
  },
  orcamento: {
    id: "orcamento",
    label: "Proposta & Prazos",
    colorName: "Índigo",
    badgeBg: "bg-indigo-50/95 dark:bg-indigo-950/60",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    badgeBorder: "border-indigo-300 dark:border-indigo-700",
    chipBg: "bg-indigo-600 text-white",
    chipText: "text-indigo-600 dark:text-indigo-400",
    chipBorder: "border-indigo-200 dark:border-indigo-800",
    hoverBg: "hover:bg-indigo-100 dark:hover:bg-indigo-900/60",
    dotColor: "bg-indigo-500",
    accentColor: "#6366f1",
    activeRing: "ring-2 ring-indigo-500 ring-offset-1",
  },
  totais: {
    id: "totais",
    label: "Totais & Financeiro",
    colorName: "Verde Esmeralda",
    badgeBg: "bg-emerald-50/95 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-300 dark:border-emerald-700",
    chipBg: "bg-emerald-600 text-white",
    chipText: "text-emerald-600 dark:text-emerald-400",
    chipBorder: "border-emerald-200 dark:border-emerald-800",
    hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/60",
    dotColor: "bg-emerald-500",
    accentColor: "#10b981",
    activeRing: "ring-2 ring-emerald-500 ring-offset-1",
  },
  vendedor: {
    id: "vendedor",
    label: "Vendedor / Consultor",
    colorName: "Âmbar Laranja",
    badgeBg: "bg-amber-50/95 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-300 dark:border-amber-700",
    chipBg: "bg-amber-600 text-white",
    chipText: "text-amber-700 dark:text-amber-400",
    chipBorder: "border-amber-200 dark:border-amber-800",
    hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/60",
    dotColor: "bg-amber-500",
    accentColor: "#f59e0b",
    activeRing: "ring-2 ring-amber-500 ring-offset-1",
  },
  empresa: {
    id: "empresa",
    label: "Empresa Emissora",
    colorName: "Roxo Violeta",
    badgeBg: "bg-purple-50/95 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-300 dark:border-purple-700",
    chipBg: "bg-purple-600 text-white",
    chipText: "text-purple-600 dark:text-purple-400",
    chipBorder: "border-purple-200 dark:border-purple-800",
    hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/60",
    dotColor: "bg-purple-500",
    accentColor: "#9333ea",
    activeRing: "ring-2 ring-purple-500 ring-offset-1",
  },
  sistema: {
    id: "sistema",
    label: "Data & Sistema",
    colorName: "Rosa Carmim",
    badgeBg: "bg-rose-50/95 dark:bg-rose-950/60",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBorder: "border-rose-300 dark:border-rose-700",
    chipBg: "bg-rose-600 text-white",
    chipText: "text-rose-600 dark:text-rose-400",
    chipBorder: "border-rose-200 dark:border-rose-800",
    hoverBg: "hover:bg-rose-100 dark:hover:bg-rose-900/60",
    dotColor: "bg-rose-500",
    accentColor: "#e11d48",
    activeRing: "ring-2 ring-rose-500 ring-offset-1",
  },
};

/**
 * Obtém a categoria de uma variável a partir de sua tag
 */
export function getVariableCategory(tag: string): "cliente" | "orcamento" | "totais" | "vendedor" | "empresa" | "sistema" {
  if (tag.includes("cliente.")) return "cliente";
  if (tag.includes("totais.") || tag.includes(".total") || tag.includes(".subtotal") || tag.includes(".desconto") || tag.includes(".frete") || tag.includes(".impostos") || tag.includes(".margem")) return "totais";
  if (tag.includes("vendedor.")) return "vendedor";
  if (tag.includes("empresa.")) return "empresa";
  if (tag.includes("data.") || tag.includes("sistema.")) return "sistema";
  if (tag.includes("orcamento.")) return "orcamento";
  return "orcamento";
}

/**
 * Obtém o tema visual de cores para uma variável
 */
export function getVariableTheme(tag: string): VariableCategoryTheme {
  const category = getVariableCategory(tag);
  return VARIABLE_CATEGORIES_CONFIG[category] || VARIABLE_CATEGORIES_CONFIG.orcamento;
}

/**
 * Encontra todas as tags {{...}} contidas em uma string
 */
export function findVariablesInText(text?: string): string[] {
  if (!text) return [];
  const regex = /\{\{([a-zA-Z0-9_.]+)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return Array.from(new Set(matches));
}

export interface VariableUsageLocation {
  tag: string;
  blockId: string;
  blockTitle: string;
  blockType: string;
  fieldName: string;
  fieldLabel: string;
}

/**
 * Mapeia todos os usos de variáveis em todos os blocos do layout
 */
export function mapVariableUsagesInBlocks(blocks: DocumentBlock[]): VariableUsageLocation[] {
  const usages: VariableUsageLocation[] = [];

  for (const block of blocks) {
    if (block.hidden) continue;

    const addUsage = (tag: string, fieldName: string, fieldLabel: string) => {
      usages.push({
        tag,
        blockId: block.id,
        blockTitle: block.title || block.type,
        blockType: block.type,
        fieldName,
        fieldLabel,
      });
    };

    // 1. Verificar texto de conteúdo livre
    if (block.content) {
      const found = findVariablesInText(block.content);
      found.forEach((tag) => addUsage(tag, "content", "Conteúdo Principal"));
    }

    // 2. Verificar títulos
    if (block.title) {
      const found = findVariablesInText(block.title);
      found.forEach((tag) => addUsage(tag, "title", "Título"));
    }

    // 3. Verificar campos de config específicos
    if (block.config) {
      for (const [key, val] of Object.entries(block.config)) {
        if (typeof val === "string") {
          const found = findVariablesInText(val);
          found.forEach((tag) => addUsage(tag, key, `Configuração: ${key}`));
        }
      }
    }

    // 4. Mapeamento implícito por tipo de bloco padrão
    if (block.type === "client_info") {
      addUsage("{{cliente.nome}}", "cliente.nome", "Nome do Cliente");
      if (block.config?.showTaxId ?? true) {
        addUsage("{{cliente.cnpjCpf}}", "cliente.cnpjCpf", "CNPJ/CPF do Cliente");
        addUsage("{{cliente.inscricaoEstadual}}", "cliente.inscricaoEstadual", "Inscrição Estadual");
      }
      if (block.config?.showAddress ?? true) {
        addUsage("{{cliente.endereco}}", "cliente.endereco", "Endereço do Cliente");
        addUsage("{{cliente.cidade}}", "cliente.cidade", "Cidade");
        addUsage("{{cliente.estado}}", "cliente.estado", "UF");
        addUsage("{{cliente.cep}}", "cliente.cep", "CEP");
      }
      if (block.config?.showSeller ?? true) {
        addUsage("{{vendedor.nome}}", "vendedor.nome", "Consultor Comercial");
      }
      addUsage("{{orcamento.condicoes.pagamento}}", "condicoes.pagamento", "Condição de Pagamento");
      addUsage("{{orcamento.condicoes.prazoEntrega}}", "condicoes.prazoEntrega", "Prazo de Entrega");
      addUsage("{{orcamento.condicoes.tipoFrete}}", "condicoes.tipoFrete", "Tipo de Frete");
    }

    if (block.type === "header") {
      addUsage("{{empresa.nomeFantasia}}", "empresa.nomeFantasia", "Nome da Empresa");
      addUsage("{{orcamento.numero}}", "orcamento.numero", "Número do Orçamento");
      addUsage("{{orcamento.dataEmissao}}", "orcamento.dataEmissao", "Data de Emissão");
      addUsage("{{orcamento.dataValidade}}", "orcamento.dataValidade", "Data de Validade");
    }

    if (block.type === "totals_summary") {
      addUsage("{{orcamento.totais.subtotal}}", "totais.subtotal", "Subtotal dos Produtos");
      addUsage("{{orcamento.totais.total}}", "totais.total", "Valor Total Geral");
      if (block.config?.showDiscount ?? true) {
        addUsage("{{orcamento.totais.desconto}}", "totais.desconto", "Desconto Total");
      }
      if (block.config?.showFreight ?? true) {
        addUsage("{{orcamento.totais.frete}}", "totais.frete", "Frete");
      }
      if (block.config?.showTaxes ?? true) {
        addUsage("{{orcamento.totais.impostos}}", "totais.impostos", "Impostos");
      }
    }

    if (block.type === "signatures") {
      addUsage("{{cliente.nome}}", "cliente.nome", "Nome do Cliente no Aceite");
      addUsage("{{vendedor.nome}}", "vendedor.nome", "Nome do Vendedor no Aceite");
    }

    if (block.type === "products_table" || block.type === "products_grid") {
      addUsage("{{item.codigo}}", "itens.codigo", "Código dos Itens");
      addUsage("{{item.descricao}}", "itens.descricao", "Descrição dos Itens");
      addUsage("{{item.quantidade}}", "itens.quantidade", "Quantidade dos Itens");
      addUsage("{{item.precoUnitario}}", "itens.precoUnitario", "Preço Unitário");
      addUsage("{{item.subtotal}}", "itens.subtotal", "Subtotal dos Itens");
    }
  }

  return usages;
}

export const DOCUMENT_VARIABLES: DocumentVariableDefinition[] = [
  // Cliente
  { tag: "{{cliente.nome}}", label: "Nome / Fantasia do Cliente", category: "cliente", example: "Metalúrgica Paulista Indústria e Comércio S/A" },
  { tag: "{{cliente.razaoSocial}}", label: "Razão Social do Cliente", category: "cliente", example: "Metalúrgica Paulista S/A" },
  { tag: "{{cliente.cnpjCpf}}", label: "CNPJ ou CPF do Cliente", category: "cliente", example: "45.123.890/0001-34" },
  { tag: "{{cliente.inscricaoEstadual}}", label: "Inscrição Estadual (IE)", category: "cliente", example: "112.456.789.001" },
  { tag: "{{cliente.endereco}}", label: "Endereço Completo", category: "cliente", example: "Av. das Indústrias, 4.500 - Distrito Industrial" },
  { tag: "{{cliente.cidade}}", label: "Cidade do Cliente", category: "cliente", example: "Campinas" },
  { tag: "{{cliente.estado}}", label: "Estado (UF)", category: "cliente", example: "SP" },
  { tag: "{{cliente.cep}}", label: "CEP", category: "cliente", example: "13080-000" },
  { tag: "{{cliente.telefone}}", label: "Telefone do Cliente", category: "cliente", example: "(11) 3456-7890" },
  { tag: "{{cliente.email}}", label: "E-mail do Cliente", category: "cliente", example: "compras@metalurgicapaulista.com.br" },
  { tag: "{{cliente.contatoNome}}", label: "Nome do Contato / A/C", category: "cliente", example: "Dr. Roberto Mendonça" },

  // Orçamento / Proposta
  { tag: "{{orcamento.numero}}", label: "Número do Orçamento", category: "orcamento", example: "ORC-2026-0842" },
  { tag: "{{orcamento.tipo}}", label: "Tipo de Documento", category: "orcamento", example: "Proposta Comercial" },
  { tag: "{{orcamento.dataEmissao}}", label: "Data de Emissão", category: "orcamento", example: "15/09/2026" },
  { tag: "{{orcamento.dataValidade}}", label: "Data de Validade", category: "orcamento", example: "30/09/2026" },
  { tag: "{{orcamento.status}}", label: "Status da Proposta", category: "orcamento", example: "Em Análise" },
  { tag: "{{orcamento.condicoes.pagamento}}", label: "Condição de Pagamento", category: "orcamento", example: "28/56/84 dias (Boleto / PIX)" },
  { tag: "{{orcamento.condicoes.prazoEntrega}}", label: "Prazo de Entrega Geral", category: "orcamento", example: "10 dias úteis" },
  { tag: "{{orcamento.condicoes.tipoFrete}}", label: "Tipo de Frete (CIF/FOB)", category: "orcamento", example: "CIF" },
  { tag: "{{orcamento.observacoes}}", label: "Observações do Pedido", category: "orcamento", example: "Faturamento direto via filial matriz SP." },

  // Totais
  { tag: "{{orcamento.totais.total}}", label: "Valor Total Líquido", category: "totais", example: "R$ 47.270,00" },
  { tag: "{{orcamento.total}}", label: "Valor Total (Atalho)", category: "totais", example: "R$ 47.270,00" },
  { tag: "{{orcamento.totais.subtotal}}", label: "Subtotal dos Itens", category: "totais", example: "R$ 49.550,00" },
  { tag: "{{orcamento.subtotal}}", label: "Subtotal dos Itens (Atalho)", category: "totais", example: "R$ 49.550,00" },
  { tag: "{{orcamento.totais.desconto}}", label: "Desconto Total", category: "totais", example: "R$ 2.280,00" },
  { tag: "{{orcamento.desconto}}", label: "Desconto Total (Atalho)", category: "totais", example: "R$ 2.280,00" },
  { tag: "{{orcamento.totais.frete}}", label: "Valor do Frete", category: "totais", example: "R$ 0,00" },
  { tag: "{{orcamento.totais.impostos}}", label: "Impostos Totais (IPI/ICMS)", category: "totais", example: "R$ 5.124,00" },
  { tag: "{{orcamento.totais.margem}}", label: "Margem de Lucro (%)", category: "totais", example: "31,5%" },

  // Vendedor
  { tag: "{{vendedor.nome}}", label: "Nome do Consultor", category: "vendedor", example: "Carlos Eduardo Andrade" },
  { tag: "{{vendedor.email}}", label: "E-mail do Consultor", category: "vendedor", example: "carlos.andrade@vendasprotheus.com.br" },
  { tag: "{{vendedor.telefone}}", label: "Telefone do Consultor", category: "vendedor", example: "(11) 98765-4321" },
  { tag: "{{vendedor.departamento}}", label: "Departamento Comercial", category: "vendedor", example: "Vendas Corporativas & Projetos" },

  // Empresa
  { tag: "{{empresa.nomeFantasia}}", label: "Nome Fantasia da Empresa", category: "empresa", example: "VendasProtheus ERP" },
  { tag: "{{empresa.razaoSocial}}", label: "Razão Social da Empresa", category: "empresa", example: "VendasProtheus Automação Comercial S/A" },
  { tag: "{{empresa.cnpj}}", label: "CNPJ da Empresa", category: "empresa", example: "12.345.678/0001-90" },
  { tag: "{{empresa.inscricaoEstadual}}", label: "Inscrição Estadual (IE)", category: "empresa", example: "110.234.567.890" },
  { tag: "{{empresa.telefone}}", label: "Telefone da Empresa", category: "empresa", example: "(11) 3456-8000" },
  { tag: "{{empresa.email}}", label: "E-mail da Empresa", category: "empresa", example: "comercial@vendasprotheus.com.br" },
  { tag: "{{empresa.endereco}}", label: "Endereço da Empresa", category: "empresa", example: "Av. Paulista, 1000 - Bela Vista, SP" },
  { tag: "{{empresa.site}}", label: "Website", category: "empresa", example: "www.vendasprotheus.com.br" },

  // Sistema
  { tag: "{{data.hoje}}", label: "Data Atual", category: "sistema", example: new Date().toLocaleDateString("pt-BR") },
  { tag: "{{data.ano}}", label: "Ano Corrente", category: "sistema", example: new Date().getFullYear().toString() },
  { tag: "{{data.hora}}", label: "Hora Atual", category: "sistema", example: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) },
  
  // Itens (para uso em tabelas e listas)
  { tag: "{{item.codigo}}", label: "Código do Item", category: "orcamento", example: "PROD-001" },
  { tag: "{{item.descricao}}", label: "Descrição do Item", category: "orcamento", example: "Cabo de Aço Galvanizado 1/2\"" },
  { tag: "{{item.quantidade}}", label: "Quantidade do Item", category: "orcamento", example: "10" },
  { tag: "{{item.unidade}}", label: "Unidade de Medida", category: "orcamento", example: "MT" },
  { tag: "{{item.precoUnitario}}", label: "Preço Unitário", category: "totais", example: "R$ 45,00" },
  { tag: "{{item.subtotal}}", label: "Subtotal do Item", category: "totais", example: "R$ 450,00" },
  { tag: "{{item.desconto}}", label: "Desconto do Item", category: "totais", example: "5%" },
  { tag: "{{item.prazo}}", label: "Prazo de Entrega do Item", category: "orcamento", example: "5 dias" },
];

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

/**
 * Substitui tags {{variavel}} no texto fornecido com base nos dados reais do orçamento e configurações.
 */
export function interpolateDocumentVariables(
  template: string = "",
  data?: QuoteDocumentData,
  settings?: AppSettings
): string {
  if (!template) return "";
  if (!data && !settings) return template;

  const tConfig = settings?.templateConfig;
  const now = new Date();

  const map: Record<string, string> = {
    // Cliente
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

    // Orçamento
    "{{orcamento.numero}}": String(data?.numero || ""),
    "{{orcamento.tipo}}": data?.tipo === "pedido" ? "Pedido de Venda" : "Proposta Comercial",
    "{{orcamento.dataEmissao}}": fmtDate(data?.dataEmissao),
    "{{orcamento.dataValidade}}": fmtDate(data?.dataValidade),
    "{{orcamento.status}}": data?.status || "Em Aberto",
    "{{orcamento.condicoes.pagamento}}": data?.condicoes?.pagamento || "À vista",
    "{{orcamento.condicoes.prazoEntrega}}": data?.condicoes?.prazoEntrega || "Pronta Entrega",
    "{{orcamento.condicoes.tipoFrete}}": data?.condicoes?.tipoFrete || "CIF",
    "{{orcamento.observacoes}}": data?.observacoes || "",

    // Totais
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

    // Vendedor
    "{{vendedor.nome}}": data?.vendedor?.nome || "",
    "{{vendedor.email}}": data?.vendedor?.email || "",
    "{{vendedor.telefone}}": data?.vendedor?.telefone || "",
    "{{vendedor.departamento}}": data?.vendedor?.departamento || "Comercial",

    // Empresa
    "{{empresa.nomeFantasia}}": tConfig?.logoText || "Sua Empresa",
    "{{empresa.razaoSocial}}": tConfig?.empresaRazaoSocial || tConfig?.logoText || "Sua Empresa S/A",
    "{{empresa.cnpj}}": tConfig?.empresaCnpj || "",
    "{{empresa.inscricaoEstadual}}": tConfig?.empresaInscricaoEstadual || "",
    "{{empresa.telefone}}": tConfig?.empresaTelefone || "",
    "{{empresa.email}}": tConfig?.empresaEmail || "",
    "{{empresa.endereco}}": tConfig?.empresaEndereco || "",
    "{{empresa.cidadeEstado}}": tConfig?.empresaCidadeEstado || "",
    "{{empresa.site}}": tConfig?.empresaSite || "",

    // Sistema
    "{{data.hoje}}": now.toLocaleDateString("pt-BR"),
    "{{data.ano}}": now.getFullYear().toString(),
    "{{data.hora}}": now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };

  let result = template;
  for (const [key, val] of Object.entries(map)) {
    result = result.split(key).join(val);
  }

  return result;
}

/**
 * Cria a lista padrão de blocos estruturados a partir das seções e arquétipo de um preset.
 */
export function createDefaultBlocksFromPreset(preset: DocumentTemplatePreset): DocumentBlock[] {
  const sections = preset.sections;
  const primaryColor = preset.colors.primary;

  const blocks: DocumentBlock[] = [
    // 1. Cabeçalho
    {
      id: "block-header-main",
      type: "header",
      title: "Cabeçalho Principal & Identidade",
      config: {
        showLogo: sections.showLogo ?? true,
        showSocial: sections.showCompanySocial ?? true,
        showBadge: sections.showDocumentBadge ?? true,
        headerAlignment: sections.headerAlignment || "between",
        bannerMode: sections.showHeaderBanner ?? (preset.archetype === "executivo" || preset.archetype === "moderno"),
      },
      style: {
        backgroundColor: preset.colors.headerBg,
        textColor: preset.colors.headerText,
        marginBottom: 16,
      }
    },

    // 2. Dados do Cliente e Condições Gerais
    {
      id: "block-client-proposal",
      type: "client_info",
      title: "Dados do Cliente & Faturamento",
      config: {
        showTaxId: sections.showClientTaxId ?? true,
        showAddress: sections.showClientAddress ?? true,
        showSeller: sections.showSellerContact ?? true,
        showDeliveryTime: sections.showDeliveryTime ?? true,
      },
      style: {
        backgroundColor: preset.archetype === "minimalista" ? "transparent" : "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: preset.radius === "none" ? 0 : preset.radius === "sm" ? 4 : preset.radius === "lg" ? 12 : 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 16,
      }
    },

    // 3. Tabela de Produtos
    {
      id: "block-products-table",
      type: "products_table",
      title: "Tabela de Produtos & Serviços",
      config: {
        showPhotos: sections.showProductPhotos ?? true,
        showSku: sections.showProductSku ?? true,
        showNcm: sections.showProductNcm ?? (preset.archetype === "tecnico"),
        showDiscount: sections.showItemDiscount ?? true,
        showTaxes: sections.showItemTaxes ?? false,
        showDelivery: sections.showItemDeliveryTime ?? true,
        showNotes: sections.showItemNotes ?? true,
        zebra: sections.zebraTable ?? true,
        density: sections.tableDensity || "comfortable",
      },
      style: {
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: preset.radius === "none" ? 0 : preset.radius === "sm" ? 4 : preset.radius === "lg" ? 12 : 8,
        marginBottom: 20,
      }
    },

    // 4. Totais e Resumo Financeiro
    {
      id: "block-totals-summary",
      type: "totals_summary",
      title: "Resumo Financeiro & Totais",
      config: {
        showDiscount: sections.showGeneralDiscount ?? true,
        showFreight: sections.showFreight ?? true,
        showTaxes: sections.showTaxesBreakdown ?? true,
        showMargin: sections.showMarginBadge ?? false,
        highlightTotal: sections.showTotalHighlight ?? true,
      },
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: preset.radius === "none" ? 0 : preset.radius === "sm" ? 4 : preset.radius === "lg" ? 12 : 8,
        paddingTop: 16,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingRight: 16,
        marginBottom: 20,
      }
    },

    // 5. PIX e Pagamentos (se ativado)
    ...(sections.showPixQrCode ? [{
      id: "block-pix-payment",
      type: "pix_payment" as const,
      title: "Pagamento Instantâneo via PIX",
      config: {
        pixKey: sections.pixKey || "",
        pixKeyType: sections.pixKeyType || "cnpj",
        pixBeneficiaryName: sections.pixBeneficiaryName || "",
        pixCity: sections.pixCity || "SAOPAULO",
      },
      style: {
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderColor: "rgba(16, 185, 129, 0.2)",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 16,
      }
    }] : []),

    // 6. Dados Bancários (se ativado)
    ...(sections.showBankDetails ? [{
      id: "block-bank-details",
      type: "bank_details" as const,
      title: "Dados Bancários para Depósito/TED",
      content: sections.bankDetailsText || "",
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 16,
      }
    }] : []),

    // 7. Condições Comerciais & Garantia
    ...(sections.showCommercialConditions ? [{
      id: "block-commercial-terms",
      type: "commercial_terms" as const,
      title: "Garantia & Condições Comerciais",
      config: {
        warrantyText: sections.warrantyText || "12 meses de garantia balcão.",
        commercialText: sections.commercialConditionsText || "",
      },
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 16,
      }
    }] : []),

    // 8. Observações
    ...(sections.showGeneralNotes ? [{
      id: "block-notes-order",
      type: "notes" as const,
      title: "Observações Gerais do Orçamento",
      content: "{{orcamento.observacoes}}",
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 14,
        paddingRight: 14,
        marginBottom: 16,
      }
    }] : []),

    // 9. Assinaturas e Termo de Aceite
    ...(sections.showSignatures ? [{
      id: "block-signatures-acceptance",
      type: "signatures" as const,
      title: "Linhas de Assinatura & Termo de Aceite",
      config: {
        termsText: sections.termsOfAcceptance || "Ao aprovar esta proposta, o cliente aceita as condições descritas.",
        clientLabel: sections.signatureClientLabel || "Aceite do Comprador / Responsável",
        sellerLabel: sections.signatureSellerLabel || "Consultor Técnico Comercial",
      },
      style: {
        paddingTop: 16,
        paddingBottom: 16,
        marginBottom: 16,
      }
    }] : []),

    // 10. Selo Digital SHA-256
    ...(sections.showDigitalStamp ? [{
      id: "block-digital-stamp",
      type: "digital_stamp" as const,
      title: "Selo de Autenticação Digital",
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        borderRadius: 8,
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        marginBottom: 16,
      }
    }] : []),

    // 10.5 Ações Interativas (Portal Web CTA)
    ...(sections.showInteractiveActions ? [{
      id: "block-interactive-actions",
      type: "custom_block" as const,
      title: "Painel de Ações Interativas (Web)",
      isComposed: true,
      style: {
        backgroundColor: "transparent",
        paddingTop: 24,
        paddingBottom: 24,
        marginBottom: 16,
        textAlign: sections.interactiveActionsAlignment || "center",
      },
      elements: [
        ...(sections.showApproveButton ? [{
          id: `cta-approve-${Date.now()}`,
          type: "button" as const,
          content: "Aprovar Proposta Comercial",
          x: 0,
          y: 0,
          width: 260,
          height: 48,
          zIndex: 1,
          config: {
            buttonAction: { actionType: "approve_quote" as const }
          },
          style: {
            backgroundColor: primaryColor,
            textColor: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            borderRadius: 6,
          }
        }] : []),
        ...(sections.showWhatsappButton ? [{
          id: `cta-whatsapp-${Date.now()}`,
          type: "button" as const,
          content: "Falar no WhatsApp",
          x: sections.showApproveButton ? 280 : 0,
          y: 0,
          width: 220,
          height: 48,
          zIndex: 2,
          config: {
            buttonAction: { 
              actionType: "whatsapp" as const,
              phone: "{{vendedor.telefone}}",
              whatsappMessage: "Olá {{vendedor.nome}}, estou visualizando a proposta {{orcamento.numero}} e gostaria de tirar uma dúvida."
            }
          },
          style: {
            backgroundColor: "#25D366",
            textColor: "#ffffff",
            fontSize: "14px",
            fontWeight: "600",
            borderRadius: 6,
          }
        }] : []),
      ]
    }] : []),

    // 11. Rodapé
    {
      id: "block-footer-main",
      type: "footer",
      title: "Rodapé Institucional",
      content: sections.footerText || "{{empresa.razaoSocial}} • {{empresa.site}} • {{empresa.email}}",
      config: {
        showPageNumbers: sections.footerPageNumbers ?? true,
      },
      style: {
        backgroundColor: "#f8fafc",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        paddingTop: 12,
        paddingBottom: 12,
        paddingLeft: 16,
        paddingRight: 16,
        textAlign: "center",
      }
    }
  ];

  return blocks;
}

/**
 * Cria um novo bloco vazio com configurações e estilos inteligentes de acordo com o tipo escolhido.
 */
export function createNewBlock(type: DocumentBlock["type"], archetype: DocumentLayoutArchetype = "executivo", primaryColor = "#0f172a"): DocumentBlock {
  const id = `block-${type}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

  switch (type) {
    case "text":
      return {
        id,
        type: "text",
        title: "Bloco de Texto",
        content: "Insira aqui o seu texto personalizado. Você pode utilizar variáveis como {{cliente.nome}} ou {{orcamento.numero}}.",
        style: {
          fontSize: 13,
          textColor: "#334155",
          textAlign: "left",
          lineHeight: 1.6 as any,
          paddingTop: 8,
          paddingBottom: 8,
          marginBottom: 12,
        }
      };

    case "heading":
      return {
        id,
        type: "heading",
        title: "Título de Seção",
        content: "Proposta Comercial Especial #{{orcamento.numero}}",
        style: {
          fontSize: 20,
          fontWeight: "bold",
          textColor: primaryColor,
          textAlign: "left",
          paddingTop: 8,
          paddingBottom: 8,
          marginBottom: 12,
          borderBottomWidth: 2 as any,
          borderColor: primaryColor,
        }
      };

    case "image":
      return {
        id,
        type: "image",
        title: "Imagem / Banner Comercial",
        config: {
          imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80",
          altText: "Banner Institucional",
          height: 140,
          objectFit: "cover",
        },
        style: {
          borderRadius: 8,
          marginBottom: 16,
        }
      };

    case "button":
      return {
        id,
        type: "button",
        title: "Botão Call-to-Action",
        content: "Aprovar Proposta Online",
        config: {
          url: "https://seusite.com.br/aprovar/{{orcamento.numero}}",
          target: "_blank",
          icon: "CheckCircle2",
        },
        style: {
          backgroundColor: primaryColor,
          textColor: "#ffffff",
          fontWeight: "bold",
          fontSize: 14,
          borderRadius: 8,
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 24,
          paddingRight: 24,
          textAlign: "center",
          marginBottom: 16,
        }
      };

    case "card":
      return {
        id,
        type: "card",
        title: "Card em Destaque",
        content: "**Diferencial Competitivo:** Todos os nossos equipamentos possuem suporte 24x7 e garantia estendida de fábrica inclusa no valor total de {{orcamento.totais.total}}.",
        style: {
          backgroundColor: "#f0fdf4",
          borderColor: "#86efac",
          borderWidth: 1,
          borderRadius: 8,
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 16,
          paddingRight: 16,
          textColor: "#166534",
          fontSize: 13,
          marginBottom: 16,
        }
      };

    case "divider":
      return {
        id,
        type: "divider",
        title: "Linha Divisória",
        style: {
          borderColor: "#cbd5e1",
          borderWidth: 1,
          borderStyle: "solid",
          marginTop: 12,
          marginBottom: 12,
        }
      };

    case "spacer":
      return {
        id,
        type: "spacer",
        title: "Espaçamento",
        config: {
          height: 24,
        },
        style: {
          marginBottom: 0,
        }
      };

    case "custom_html":
      return {
        id,
        type: "custom_html",
        title: "Código HTML Personalizado",
        content: `<div style="padding: 12px; border-left: 4px solid ${primaryColor}; background-color: #f8fafc;">
  <strong style="color: ${primaryColor};">Aviso Importante:</strong>
  <p style="margin-top: 4px; font-size: 12px; color: #475569;">Valores e prazos válidos exclusivamente para o cliente <strong>{{cliente.nome}}</strong> até <strong>{{orcamento.dataValidade}}</strong>.</p>
</div>`,
        style: {
          marginBottom: 16,
        }
      };

    case "products_grid":
      return {
        id,
        type: "products_grid",
        title: "Grade de Produtos",
        config: {
          columns: 3,
          showImages: true,
          showPrices: true
        },
        style: {
          paddingTop: 16,
          paddingBottom: 16,
          marginBottom: 20,
        }
      };

    case "variables_grid":
      return {
        id,
        type: "variables_grid",
        title: "Grid de Variáveis (Lado a Lado)",
        config: {
          columns: 2,
          items: [
            { id: "item-1", label: "Razão Social / Cliente", value: "{{cliente.nome}}" },
            { id: "item-2", label: "CNPJ / CPF", value: "{{cliente.cnpjCpf}}" },
            { id: "item-3", label: "Condição de Pagamento", value: "{{orcamento.condicoes.pagamento}}" },
            { id: "item-4", label: "Validade da Proposta", value: "{{orcamento.dataValidade}}" },
          ]
        },
        style: {
          backgroundColor: "#f8fafc",
          borderColor: "#e2e8f0",
          borderWidth: 1,
          borderRadius: 8,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 14,
          paddingRight: 14,
          marginBottom: 16,
        }
      };

    case "variables_inline":
      return {
        id,
        type: "variables_inline",
        title: "Variáveis na Mesma Linha",
        config: {
          separator: "|",
          items: [
            { id: "item-1", label: "Emissão", value: "{{orcamento.dataEmissao}}" },
            { id: "item-2", label: "Validade", value: "{{orcamento.dataValidade}}" },
          ]
        },
        style: {
          paddingTop: 8,
          paddingBottom: 8,
          marginBottom: 12,
        }
      };

    default:
      return {
        id,
        type,
        title: `Bloco ${type}`,
        style: {
          marginBottom: 16,
        }
      };
  }
}
