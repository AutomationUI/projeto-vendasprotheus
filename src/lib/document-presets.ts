import { DocumentTemplatePreset, QuoteDocumentData } from "@/types/document-template";

export const DEFAULT_DOCUMENT_SECTIONS = {
  // Cabeçalho
  showLogo: true,
  showHeaderBanner: true,
  headerAlignment: "between" as const,
  showCompanySocial: true,
  showDocumentBadge: true,
  
  // Cliente & Contato
  showClientDetails: true,
  showClientAddress: true,
  showClientTaxId: true,
  showSellerContact: true,
  showDatesAndValidity: true,

  // Tabela
  showProductPhotos: true,
  showProductSku: true,
  showProductNcm: true,
  showItemDiscount: true,
  showItemTaxes: false,
  showItemDeliveryTime: true,
  showItemNotes: true,
  zebraTable: true,
  tableDensity: "comfortable" as const,

  // Totais
  showSubtotal: true,
  showFreight: true,
  showTaxesBreakdown: false,
  showMarginBadge: false,
  showGeneralDiscount: true,
  showTotalHighlight: true,

  // Condições Comerciais
  showCommercialConditions: true,
  commercialConditionsText: "Validade da proposta sujeita à disponibilidade de estoque. Faturamento direto mediante aprovação de crédito.",
  showDeliveryTime: true,
  deliveryTimeText: "10 a 15 dias úteis após confirmação do pedido",
  showWarranty: true,
  warrantyText: "12 meses de garantia contra defeitos de fabricação (balcão)",

  // PIX e Dados Bancários
  showBankDetails: true,
  bankDetailsText: "Banco do Brasil (001)\nAgência: 1234-5 | C/C: 98765-4\nFavorecido: VendasProtheus ERP S/A",
  showPixQrCode: true,
  pixKey: "12.345.678/0001-90",
  pixKeyType: "cnpj" as const,
  pixBeneficiaryName: "VendasProtheus S/A",
  pixCity: "SAO PAULO",

  // Observações & Aceite
  showGeneralNotes: true,
  showSignatures: true,
  signatureClientLabel: "De Acordo do Cliente / Responsável",
  signatureSellerLabel: "Consultor Técnico Comercial",
  showDigitalStamp: true,
  termsOfAcceptance: "Ao aprovar esta proposta comercial, o comprador concorda com os termos, prazos e condições financeiras descritas neste instrumento contratual.",

  // Ações Interativas (Portal Web)
  showInteractiveActions: false,
  interactiveActionsAlignment: "center" as const,
  showWhatsappButton: true,
  showApproveButton: true,

  // Rodapé
  showFooter: true,
  footerText: "Proposta gerada eletronicamente pelo Sistema de Gestão Comercial e ERP Protheus. Documento confidencial.",
  footerPageNumbers: true,
};

export const DOCUMENT_PRESETS: DocumentTemplatePreset[] = [
  {
    id: "preset-executivo",
    name: "Executivo Premium",
    description: "Cabeçalho com faixa de contraste nobre, tipografia clássica, selo digital e linhas de aprovação formal.",
    archetype: "executivo",
    fontFamily: "sans",
    radius: "md",
    isDefault: true,
    colors: {
      primary: "#0f172a", // Slate 900
      secondary: "#334155", // Slate 700
      accent: "#0284c7", // Sky 600
      headerBg: "#0f172a",
      headerText: "#ffffff",
      highlightBg: "#f8fafc",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showHeaderBanner: true,
      headerAlignment: "between",
      showProductPhotos: true,
      showDigitalStamp: true,
      showSignatures: true,
      showPixQrCode: true,
      tableDensity: "comfortable",
      zebraTable: true,
    }
  },
  {
    id: "preset-modern-tech",
    name: "Modern Tech Clean",
    description: "Design contemporâneo com cartões arredondados, gradientes suaves, badges coloridas e QR Code PIX em destaque.",
    archetype: "moderno",
    fontFamily: "sans",
    radius: "lg",
    colors: {
      primary: "#4f46e5", // Indigo 600
      secondary: "#065f46", // Emerald 800
      accent: "#10b981", // Emerald 500
      headerBg: "#4f46e5",
      headerText: "#ffffff",
      highlightBg: "#eef2ff",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showHeaderBanner: true,
      headerAlignment: "between",
      showProductPhotos: true,
      showItemDiscount: true,
      showPixQrCode: true,
      tableDensity: "comfortable",
      zebraTable: false,
    }
  },
  {
    id: "preset-industrial",
    name: "Industrial & Engenharia",
    description: "Foco em especificações técnicas, NCM, códigos Protheus, alíquotas de IPI/ICMS e prazos por item.",
    archetype: "tecnico",
    fontFamily: "mono",
    radius: "sm",
    colors: {
      primary: "#1e293b", // Slate 800
      secondary: "#c2410c", // Orange 700
      accent: "#ea580c", // Orange 600
      headerBg: "#1e293b",
      headerText: "#f8fafc",
      highlightBg: "#fff7ed",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showHeaderBanner: false,
      headerAlignment: "between",
      showProductPhotos: false,
      showProductSku: true,
      showProductNcm: true,
      showItemTaxes: true,
      showTaxesBreakdown: true,
      tableDensity: "compact",
      zebraTable: true,
    }
  },
  {
    id: "preset-minimalista",
    name: "Minimalista Editorial",
    description: "Estética limpa no estilo suíço, sem cores pesadas, foco em tipografia nobre, espaço em branco e clareza.",
    archetype: "minimalista",
    fontFamily: "serif",
    radius: "none",
    colors: {
      primary: "#18181b", // Zinc 900
      secondary: "#71717a", // Zinc 500
      accent: "#27272a", // Zinc 800
      headerBg: "#ffffff",
      headerText: "#18181b",
      highlightBg: "#f4f4f5",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showHeaderBanner: false,
      headerAlignment: "left",
      showProductPhotos: true,
      showDocumentBadge: false,
      showDigitalStamp: false,
      tableDensity: "spacious",
      zebraTable: false,
    }
  },
  {
    id: "preset-classico",
    name: "Clássico Corporativo ERP",
    description: "Formato tradicional homologado para compras corporativas e licitações com divisão clara em linhas e tabelas.",
    archetype: "classico",
    fontFamily: "sans",
    radius: "none",
    colors: {
      primary: "#0369a1", // Sky 700
      secondary: "#0f172a", // Slate 900
      accent: "#0284c7", // Sky 600
      headerBg: "#f8fafc",
      headerText: "#0f172a",
      highlightBg: "#f0f9ff",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showHeaderBanner: false,
      headerAlignment: "between",
      showProductPhotos: false,
      showProductSku: true,
      showSignatures: true,
      tableDensity: "comfortable",
      zebraTable: true,
    }
  },
  {
    id: "preset-interativo-web",
    name: "Proposta Web Interativa (B2B)",
    description: "Modelo otimizado para visualização no navegador. Inclui botões de ação (Aprovar, WhatsApp) flutuantes no final do documento.",
    archetype: "moderno",
    fontFamily: "sans",
    radius: "lg",
    colors: {
      primary: "#6366f1", // Indigo 500
      secondary: "#0f172a", // Slate 900
      accent: "#4f46e5", // Indigo 600
      headerBg: "#6366f1",
      headerText: "#ffffff",
      highlightBg: "#eef2ff",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showInteractiveActions: true,
      interactiveActionsAlignment: "center",
      showApproveButton: true,
      showWhatsappButton: true,
      showHeaderBanner: true,
      headerAlignment: "between",
      showProductPhotos: true,
      tableDensity: "spacious",
      zebraTable: false,
    }
  },
  {
    id: "preset-simplificado-b2c",
    name: "Orçamento Simplificado B2C",
    description: "Direto ao ponto, ideal para clientes finais (varejo) e orçamentos curtos. Sem fotos, sem tabela densa, sem assinaturas.",
    archetype: "minimalista",
    fontFamily: "sans",
    radius: "md",
    colors: {
      primary: "#09090b", // Zinc 950
      secondary: "#71717a", // Zinc 500
      accent: "#18181b", // Zinc 900
      headerBg: "#09090b",
      headerText: "#ffffff",
      highlightBg: "#f4f4f5",
    },
    sections: {
      ...DEFAULT_DOCUMENT_SECTIONS,
      showInteractiveActions: true,
      interactiveActionsAlignment: "right",
      showApproveButton: true,
      showWhatsappButton: false,
      showHeaderBanner: true,
      headerAlignment: "left",
      showProductPhotos: false,
      showProductSku: false,
      showProductNcm: false,
      showItemDiscount: false,
      showItemTaxes: false,
      showItemDeliveryTime: false,
      showItemNotes: false,
      showGeneralNotes: false,
      showSignatures: false,
      showDigitalStamp: false,
      showCommercialConditions: false,
      tableDensity: "compact",
      zebraTable: true,
    }
  }
];

export const MOCK_QUOTE_PREVIEW_DATA: QuoteDocumentData = {
  numero: "ORC-2026-0842",
  tipo: "proposta",
  dataEmissao: new Date().toISOString(),
  dataValidade: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  status: "Em Análise",
  cliente: {
    nome: "Metalúrgica Paulista Indústria e Comércio S/A",
    razaoSocial: "Metalúrgica Paulista S/A",
    cnpjCpf: "45.123.890/0001-34",
    inscricaoEstadual: "112.456.789.001",
    email: "compras@metalurgicapaulista.com.br",
    telefone: "(11) 3456-7890",
    endereco: "Av. das Indústrias, 4.500 - Distrito Industrial",
    cidade: "Campinas",
    estado: "SP",
    cep: "13080-000",
    contatoNome: "Dr. Roberto Mendonça (Diretor de Suprimentos)",
  },
  vendedor: {
    nome: "Carlos Eduardo Andrade",
    email: "carlos.andrade@vendasprotheus.com.br",
    telefone: "(11) 98765-4321",
    departamento: "Vendas Corporativas & Projetos",
  },
  condicoes: {
    pagamento: "28/56/84 dias (Boleto Bancário / PIX)",
    prazoEntrega: "10 dias úteis",
    tipoFrete: "CIF",
    valorFrete: 0,
    validadeDias: 15,
  },
  itens: [
    {
      codigo: "PRD-SRV-901",
      descricao: "Servidor Rack Proliant G11 Intel Xeon 32-Core 128GB RAM",
      imagemUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=150&auto=format&fit=crop&q=80",
      quantidade: 2,
      unidade: "UN",
      precoUnitario: 14500.00,
      descontoPercentual: 5,
      subtotal: 27550.00,
      ncm: "8471.49.10",
      aliquotaImposto: 12,
      prazoItem: "Pronta Entrega",
      especificacao: "Configuração redundante Dual PSU 800W + Kit Trilhos 2U",
    },
    {
      codigo: "PRD-SW-48P",
      descricao: "Switch Gerenciável L3 48 Portas Gigabit PoE+ com 4x 10GbE SFP+",
      imagemUrl: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=150&auto=format&fit=crop&q=80",
      quantidade: 4,
      unidade: "UN",
      precoUnitario: 3850.00,
      descontoPercentual: 0,
      subtotal: 15400.00,
      ncm: "8517.62.59",
      aliquotaImposto: 10,
      prazoItem: "7 dias úteis",
      especificacao: "Suporte VLAN avançado, QoS empresarial e empilhamento",
    },
    {
      codigo: "SRV-INST-01",
      descricao: "Serviço Especializado de Instalação, Migração e Validação ERP",
      imagemUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=150&auto=format&fit=crop&q=80",
      quantidade: 1,
      unidade: "GL",
      precoUnitario: 4800.00,
      descontoPercentual: 10,
      subtotal: 4320.00,
      ncm: "0000.00.00",
      aliquotaImposto: 5,
      prazoItem: "Conforme cronograma",
      especificacao: "Homologação dos conectores Protheus SE1/SE2/SC5",
    }
  ],
  totais: {
    subtotalProdutos: 49550.00,
    descontoTotal: 2280.00,
    valorFrete: 0.00,
    valorImpostos: 5124.00,
    valorTotal: 47270.00,
    margemLucroPercentual: 31.5,
  },
  observacoes: "Faturamento direto via filial matriz SP. Instalação e parametrização dos módulos inclusos na proposta técnica anexa.",
  condicoesGerais: "Preços calculados com base na alíquota interestadual de ICMS. O aceite formal desta proposta autoriza a emissão imediata da Ordem de Faturamento.",
};
