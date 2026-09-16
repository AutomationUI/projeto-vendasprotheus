export type DocumentLayoutArchetype = "moderno" | "classico" | "minimalista" | "executivo" | "tecnico";
export type DocumentFontFamily = "sans" | "serif" | "mono";
export type DocumentDensity = "compact" | "comfortable" | "spacious";
export type DocumentRadius = "none" | "sm" | "md" | "lg";
export type HeaderAlignment = "left" | "between" | "center" | "banner";

export interface DocumentColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  headerBg: string;
  headerText: string;
  highlightBg: string;
}

export interface DocumentCustomSections {
  // Cabeçalho
  showLogo: boolean;
  showHeaderBanner: boolean;
  headerAlignment: HeaderAlignment;
  showCompanySocial: boolean;
  showDocumentBadge: boolean;
  
  // Cliente & Contato
  showClientDetails: boolean;
  showClientAddress: boolean;
  showClientTaxId: boolean;
  showSellerContact: boolean;
  showDatesAndValidity: boolean;

  // Tabela de Produtos / Serviços
  showProductPhotos: boolean;
  showProductSku: boolean;
  showProductNcm: boolean;
  showItemDiscount: boolean;
  showItemTaxes: boolean;
  showItemDeliveryTime: boolean;
  showItemNotes: boolean;
  zebraTable: boolean;
  tableDensity: DocumentDensity;

  // Totais & Resumo
  showSubtotal: boolean;
  showFreight: boolean;
  showTaxesBreakdown: boolean;
  showMarginBadge: boolean;
  showGeneralDiscount: boolean;
  showTotalHighlight: boolean;

  // Condições Comerciais & Pagamento
  showCommercialConditions: boolean;
  commercialConditionsText: string;
  showDeliveryTime: boolean;
  deliveryTimeText: string;
  showWarranty: boolean;
  warrantyText: string;
  
  // PIX e Dados Bancários
  showBankDetails: boolean;
  bankDetailsText: string;
  showPixQrCode: boolean;
  pixKey: string;
  pixKeyType: "cnpj" | "email" | "telefone" | "aleatoria";
  pixBeneficiaryName: string;
  pixCity: string;

  // Observações & Aceite
  showGeneralNotes: boolean;
  showSignatures: boolean;
  signatureClientLabel: string;
  signatureSellerLabel: string;
  showDigitalStamp: boolean;
  termsOfAcceptance: string;

  // Rodapé
  showFooter: boolean;
  footerText: string;
  footerPageNumbers: boolean;
}

export interface DocumentTemplatePreset {
  id: string;
  name: string;
  description: string;
  archetype: DocumentLayoutArchetype;
  fontFamily: DocumentFontFamily;
  radius: DocumentRadius;
  colors: DocumentColorPalette;
  sections: DocumentCustomSections;
  blocks?: DocumentBlock[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── VISUAL DOCUMENT BUILDER TYPES ───

export type DocumentBlockType = 
  | "header" 
  | "client_info" 
  | "proposal_conditions" 
  | "products_table" 
  | "products_grid"
  | "totals_summary" 
  | "pix_payment" 
  | "bank_details" 
  | "commercial_terms" 
  | "notes" 
  | "signatures" 
  | "digital_stamp" 
  | "text" 
  | "heading" 
  | "image" 
  | "button" 
  | "card" 
  | "variables_grid"
  | "variables_inline"
  | "divider" 
  | "spacer" 
  | "custom_html" 
  | "footer";

export interface DocumentBlockStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number; // px: 0, 1, 2, 4
  borderRadius?: number; // px: 0, 4, 8, 12, 16
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  paddingTop?: number; // px
  paddingBottom?: number; // px
  paddingLeft?: number; // px
  paddingRight?: number; // px
  marginTop?: number; // px
  marginBottom?: number; // px
  textAlign?: "left" | "center" | "right" | "justify";
  fontSize?: number; // px (e.g. 12, 14, 16, 18, 24, 32)
  fontWeight?: "normal" | "medium" | "bold" | "black";
  fontFamily?: "sans" | "serif" | "mono";
  width?: "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";
  shadow?: "none" | "sm" | "md" | "lg";
  opacity?: number;
}

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  title?: string;
  content?: string; // Texto, Markdown ou HTML com tags {{...}}
  config?: Record<string, any>; // Configurações customizadas do bloco
  style?: DocumentBlockStyle;
  hidden?: boolean;
}

export interface QuoteDocumentData {
  numero: string | number;
  tipo?: "orcamento" | "pedido" | "proposta";
  dataEmissao: string;
  dataValidade: string;
  status?: string;
  cliente: {
    nome: string;
    razaoSocial?: string;
    cnpjCpf?: string;
    inscricaoEstadual?: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    contatoNome?: string;
  };
  vendedor: {
    nome: string;
    email?: string;
    telefone?: string;
    departamento?: string;
  };
  condicoes: {
    pagamento: string;
    prazoEntrega?: string;
    tipoFrete?: "CIF" | "FOB" | "A Combinar";
    valorFrete?: number;
    validadeDias?: number;
  };
  itens: Array<{
    codigo: string;
    descricao: string;
    imagemUrl?: string;
    quantidade: number;
    unidade?: string;
    precoUnitario: number;
    descontoPercentual?: number;
    subtotal: number;
    ncm?: string;
    aliquotaImposto?: number;
    prazoItem?: string;
    especificacao?: string;
  }>;
  totais: {
    subtotalProdutos: number;
    descontoTotal: number;
    valorFrete?: number;
    valorImpostos?: number;
    valorTotal: number;
    margemLucroPercentual?: number;
  };
  observacoes?: string;
  condicoesGerais?: string;
}
