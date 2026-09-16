import { type ProductImage } from "@/types/product-images";

// Mock data for Vendas Protheus

export const salesMonthly = [
  { month: "Mar", vendas: 42000 },
  { month: "Abr", vendas: 38500 },
  { month: "Mai", vendas: 51200 },
  { month: "Jun", vendas: 46800 },
  { month: "Jul", vendas: 53100 },
  { month: "Ago", vendas: 49700 },
  { month: "Set", vendas: 58300 },
  { month: "Out", vendas: 55400 },
  { month: "Nov", vendas: 62100 },
  { month: "Dez", vendas: 71500 },
  { month: "Jan", vendas: 48200 },
  { month: "Fev", vendas: 54900 },
];

export const salesByRegion = [
  { regiao: "SP", vendas: 185000 },
  { regiao: "RJ", vendas: 124000 },
  { regiao: "MG", vendas: 98000 },
  { regiao: "PR", vendas: 76000 },
  { regiao: "RS", vendas: 68000 },
];

export const salesByCategory = [
  { categoria: "Eletrônicos", valor: 180000, fill: "hsl(var(--chart-1))" },
  { categoria: "Informática", valor: 145000, fill: "hsl(var(--chart-2))" },
  { categoria: "Periféricos", valor: 92000, fill: "hsl(var(--chart-3))" },
  { categoria: "Acessórios", valor: 65000, fill: "hsl(var(--chart-4))" },
  { categoria: "Outros", valor: 38000, fill: "hsl(var(--chart-5))" },
];

export type OrderStatus = "Pendente" | "Aprovado" | "Faturado" | "Cancelado" | "Aprovar";

export interface Order {
  id: string;
  numero: string;
  cliente: string;
  vendedor: string;
  data: string;
  valor: number;
  status: OrderStatus;
  itens: OrderItem[];
  condicaoPagamento: string;
  observacoes?: string;
}

export interface OrderItem {
  produto: string;
  codigo: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
}

export const recentOrders: Order[] = [
  {
    id: "1",
    numero: "PV-2026-001",
    cliente: "Tech Solutions Ltda",
    vendedor: "Carlos Silva",
    data: "2026-02-25",
    valor: 15800.0,
    status: "Aprovar",
    condicaoPagamento: "30/60/90",
    itens: [
      { produto: "Notebook Pro 15", codigo: "NB-015", quantidade: 5, precoUnitario: 2800, desconto: 12, total: 12320 },
      { produto: "Mouse Wireless", codigo: "MW-001", quantidade: 10, precoUnitario: 250, desconto: 0, total: 2500 },
    ],
  },
  {
    id: "2",
    numero: "PV-2026-002",
    cliente: "Inovação Digital SA",
    vendedor: "Maria Santos",
    data: "2026-02-24",
    valor: 32400.0,
    status: "Aprovado",
    condicaoPagamento: "À vista",
    itens: [
      { produto: "Servidor Dell R740", codigo: "SV-740", quantidade: 2, precoUnitario: 15000, desconto: 3, total: 29100 },
      { produto: "Switch 48 Portas", codigo: "SW-048", quantidade: 1, precoUnitario: 3300, desconto: 0, total: 3300 },
    ],
  },
  {
    id: "3",
    numero: "PV-2026-003",
    cliente: "Comércio Global ME",
    vendedor: "João Oliveira",
    data: "2026-02-23",
    valor: 8750.0,
    status: "Faturado",
    condicaoPagamento: "30 dias",
    itens: [
      { produto: "Monitor 27\" 4K", codigo: "MN-274", quantidade: 5, precoUnitario: 1750, desconto: 0, total: 8750 },
    ],
  },
  {
    id: "4",
    numero: "PV-2026-004",
    cliente: "Startup Labs Ltda",
    vendedor: "Ana Costa",
    data: "2026-02-22",
    valor: 4200.0,
    status: "Cancelado",
    condicaoPagamento: "30/60",
    itens: [
      { produto: "Teclado Mecânico", codigo: "TC-MEC", quantidade: 20, precoUnitario: 210, desconto: 0, total: 4200 },
    ],
  },
  {
    id: "5",
    numero: "PV-2026-005",
    cliente: "DataCenter Brasil",
    vendedor: "Carlos Silva",
    data: "2026-02-21",
    valor: 95000.0,
    status: "Aprovar",
    condicaoPagamento: "30/60/90/120",
    itens: [
      { produto: "Storage NAS 64TB", codigo: "ST-064", quantidade: 2, precoUnitario: 42000, desconto: 5, total: 79800 },
      { produto: "UPS 3000VA", codigo: "UP-300", quantidade: 2, precoUnitario: 7600, desconto: 0, total: 15200 },
    ],
  },
  {
    id: "6",
    numero: "PV-2026-006",
    cliente: "Rede Varejo Express",
    vendedor: "Maria Santos",
    data: "2026-02-20",
    valor: 12300.0,
    status: "Faturado",
    condicaoPagamento: "30 dias",
    itens: [
      { produto: "Impressora Laser", codigo: "IL-001", quantidade: 6, precoUnitario: 2050, desconto: 0, total: 12300 },
    ],
  },
];

export interface Customer {
  id: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  telefone: string;
  cidade: string;
  uf: string;
  endereco: string;
  condicaoPagamento: string;
  totalCompras: number;
  ultimaCompra: string;
}

export const customers: Customer[] = [
  { id: "1", razaoSocial: "Tech Solutions Ltda", cnpj: "12.345.678/0001-90", email: "contato@techsolutions.com.br", telefone: "(11) 3456-7890", cidade: "São Paulo", uf: "SP", endereco: "Rua da Tecnologia, 100", condicaoPagamento: "30/60/90", totalCompras: 285000, ultimaCompra: "2026-02-25" },
  { id: "2", razaoSocial: "Inovação Digital SA", cnpj: "23.456.789/0001-01", email: "compras@inovacaodigital.com.br", telefone: "(21) 2345-6789", cidade: "Rio de Janeiro", uf: "RJ", endereco: "Av. Digital, 500", condicaoPagamento: "À vista", totalCompras: 420000, ultimaCompra: "2026-02-24" },
  { id: "3", razaoSocial: "Comércio Global ME", cnpj: "34.567.890/0001-12", email: "vendas@comercioglobal.com.br", telefone: "(31) 3456-7890", cidade: "Belo Horizonte", uf: "MG", endereco: "Rua do Comércio, 250", condicaoPagamento: "30 dias", totalCompras: 156000, ultimaCompra: "2026-02-23" },
  { id: "4", razaoSocial: "Startup Labs Ltda", cnpj: "45.678.901/0001-23", email: "admin@startuplabs.io", telefone: "(41) 2345-6789", cidade: "Curitiba", uf: "PR", endereco: "Rua Innovation, 75", condicaoPagamento: "30/60", totalCompras: 89000, ultimaCompra: "2026-02-22" },
  { id: "5", razaoSocial: "DataCenter Brasil", cnpj: "56.789.012/0001-34", email: "procurement@datacenter.com.br", telefone: "(11) 4567-8901", cidade: "Campinas", uf: "SP", endereco: "Rod. dos Dados, 1000", condicaoPagamento: "30/60/90/120", totalCompras: 720000, ultimaCompra: "2026-02-21" },
  { id: "6", razaoSocial: "Rede Varejo Express", cnpj: "67.890.123/0001-45", email: "compras@redevarejo.com.br", telefone: "(51) 3456-7890", cidade: "Porto Alegre", uf: "RS", endereco: "Av. Varejo, 800", condicaoPagamento: "30 dias", totalCompras: 198000, ultimaCompra: "2026-02-20" },
];

export interface Product {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  preco: number;
  custo: number; // Added for margin analysis
  estoque: number;
  estoqueMinimo: number;
  unidade: string;
  sugestoes?: string[]; // Added for upsell
  tags?: string[]; // Best Seller, etc.
  mediaVendaMensal?: number;
  images?: ProductImage[];
  primaryImageUrl?: string;
}

export const products: Product[] = [
  { id: "1", codigo: "NB-015", nome: "Notebook Pro 15", categoria: "Informática", preco: 2800, custo: 1800, estoque: 45, estoqueMinimo: 10, unidade: "UN", sugestoes: ["MW-001", "HD-EXT", "WC-HD"], tags: ["Mais Vendido"], mediaVendaMensal: 120 },
  { id: "2", codigo: "MW-001", nome: "Mouse Wireless", categoria: "Periféricos", preco: 250, custo: 80, estoque: 200, estoqueMinimo: 50, unidade: "UN", sugestoes: ["NB-015", "MN-274"], tags: ["Alta Margem"], mediaVendaMensal: 350 },
  { id: "3", codigo: "SV-740", nome: "Servidor Dell R740", categoria: "Eletrônicos", preco: 15000, custo: 9000, estoque: 8, estoqueMinimo: 3, unidade: "UN", sugestoes: ["SW-048", "ST-064", "UP-300"], tags: ["Premium"], mediaVendaMensal: 5 },
  { id: "4", codigo: "SW-048", nome: "Switch 48 Portas", categoria: "Eletrônicos", preco: 3300, custo: 2100, estoque: 15, estoqueMinimo: 5, unidade: "UN", sugestoes: ["SV-740", "UP-300"], mediaVendaMensal: 25 },
  { id: "5", codigo: "MN-274", nome: "Monitor 27\" 4K", categoria: "Informática", preco: 1750, custo: 1100, estoque: 32, estoqueMinimo: 10, unidade: "UN", sugestoes: ["NB-015", "MW-001"], tags: ["Mais Vendido"], mediaVendaMensal: 85 },
  { id: "6", codigo: "TC-MEC", nome: "Teclado Mecânico", categoria: "Periféricos", preco: 210, custo: 65, estoque: 150, estoqueMinimo: 30, unidade: "UN", sugestoes: ["MW-001", "MN-274"], mediaVendaMensal: 110 },
  { id: "7", codigo: "ST-064", nome: "Storage NAS 64TB", categoria: "Eletrônicos", preco: 42000, custo: 28000, estoque: 4, estoqueMinimo: 2, unidade: "UN", sugestoes: ["SV-740", "UP-300"], tags: ["Premium"], mediaVendaMensal: 2 },
  { id: "8", codigo: "UP-300", nome: "UPS 3000VA", categoria: "Eletrônicos", preco: 7600, custo: 4500, estoque: 12, estoqueMinimo: 5, unidade: "UN", sugestoes: ["SV-740", "SW-048"], mediaVendaMensal: 18 },
  { id: "9", codigo: "IL-001", nome: "Impressora Laser", categoria: "Informática", preco: 2050, custo: 1300, estoque: 25, estoqueMinimo: 8, unidade: "UN", sugestoes: ["HD-EXT", "MW-001"], mediaVendaMensal: 40 },
  { id: "10", codigo: "HD-EXT", nome: "HD Externo 2TB", categoria: "Acessórios", preco: 380, custo: 190, estoque: 80, estoqueMinimo: 20, unidade: "UN", sugestoes: ["NB-015", "IL-001"], mediaVendaMensal: 150 },
  { id: "11", codigo: "CB-USB", nome: "Cabo USB-C 2m", categoria: "Acessórios", preco: 45, custo: 12, estoque: 500, estoqueMinimo: 100, unidade: "UN", mediaVendaMensal: 600 },
  { id: "12", codigo: "WC-HD", nome: "Webcam HD 1080p", categoria: "Periféricos", preco: 320, custo: 140, estoque: 60, estoqueMinimo: 15, unidade: "UN", sugestoes: ["NB-015", "MN-274"], mediaVendaMensal: 95 },
];

// Orçamentos
export type QuoteStatus = "Rascunho" | "Enviado" | "Aprovado" | "Recusado" | "Expirado";

export interface Quote {
  id: string;
  numero: string;
  cliente: string;
  vendedor: string;
  data: string;
  validade: string;
  valor: number;
  status: QuoteStatus;
  itens: OrderItem[];
  condicaoPagamento: string;
  observacoes: string;
}

export const quotes: Quote[] = [
  {
    id: "1", numero: "ORC-2026-001", cliente: "Tech Solutions Ltda", vendedor: "Carlos Silva",
    data: "2026-02-20", validade: "2026-03-22", valor: 28000, status: "Enviado",
    condicaoPagamento: "30/60/90", observacoes: "Cliente solicitou urgência na entrega.",
    itens: [
      { produto: "Notebook Pro 15", codigo: "NB-015", quantidade: 10, precoUnitario: 2800, desconto: 0, total: 28000 },
    ],
  },
  {
    id: "2", numero: "ORC-2026-002", cliente: "Inovação Digital SA", vendedor: "Maria Santos",
    data: "2026-02-18", validade: "2026-03-20", valor: 48300, status: "Aprovado",
    condicaoPagamento: "À vista", observacoes: "",
    itens: [
      { produto: "Servidor Dell R740", codigo: "SV-740", quantidade: 3, precoUnitario: 15000, desconto: 2, total: 44100 },
      { produto: "Switch 48 Portas", codigo: "SW-048", quantidade: 1, precoUnitario: 3300, desconto: 0, total: 3300 },
      { produto: "UPS 3000VA", codigo: "UP-300", quantidade: 1, precoUnitario: 7600, desconto: 100, total: 900 },
    ],
  },
  {
    id: "3", numero: "ORC-2026-003", cliente: "Comércio Global ME", vendedor: "João Oliveira",
    data: "2026-02-15", validade: "2026-03-17", valor: 12250, status: "Rascunho",
    condicaoPagamento: "30 dias", observacoes: "Aguardando confirmação do gerente.",
    itens: [
      { produto: "Monitor 27\" 4K", codigo: "MN-274", quantidade: 7, precoUnitario: 1750, desconto: 0, total: 12250 },
    ],
  },
  {
    id: "4", numero: "ORC-2026-004", cliente: "Startup Labs Ltda", vendedor: "Ana Costa",
    data: "2026-02-10", validade: "2026-03-12", valor: 6400, status: "Recusado",
    condicaoPagamento: "30/60", observacoes: "Cliente optou por outro fornecedor.",
    itens: [
      { produto: "Webcam HD 1080p", codigo: "WC-HD", quantidade: 20, precoUnitario: 320, desconto: 0, total: 6400 },
    ],
  },
  {
    id: "5", numero: "ORC-2026-005", cliente: "DataCenter Brasil", vendedor: "Carlos Silva",
    data: "2026-01-25", validade: "2026-02-24", valor: 84000, status: "Expirado",
    condicaoPagamento: "30/60/90/120", observacoes: "Prazo de validade expirado sem resposta.",
    itens: [
      { produto: "Storage NAS 64TB", codigo: "ST-064", quantidade: 2, precoUnitario: 42000, desconto: 0, total: 84000 },
    ],
  },
  {
    id: "6", numero: "ORC-2026-006", cliente: "Rede Varejo Express", vendedor: "Maria Santos",
    data: "2026-02-22", validade: "2026-03-24", valor: 18450, status: "Enviado",
    condicaoPagamento: "30 dias", observacoes: "",
    itens: [
      { produto: "Impressora Laser", codigo: "IL-001", quantidade: 6, precoUnitario: 2050, desconto: 0, total: 12300 },
      { produto: "Teclado Mecânico", codigo: "TC-MEC", quantidade: 15, precoUnitario: 210, desconto: 0, total: 3150 },
      { produto: "Mouse Wireless", codigo: "MW-001", quantidade: 12, precoUnitario: 250, desconto: 0, total: 3000 },
    ],
  },
];

export type ApprovalStatus = "Pendente" | "Aprovado" | "Rejeitado";
export type ApprovalType   = "Pedido" | "Orçamento";

export interface ApprovalItem {
  id: string;
  tipo: ApprovalType;
  numero: string;
  cliente: string;
  vendedor: string;
  valor: number;
  motivo: string;
  data: string;
  status: ApprovalStatus;
  observacaoAprovador: string;
}

export const initialApprovals: ApprovalItem[] = [
  { id: "1", tipo: "Pedido",     numero: "PV-2026-001",  cliente: "Tech Solutions Ltda",  vendedor: "Carlos Silva",  valor: 15800, motivo: "Desconto acima de 10%",             data: "2026-02-25", status: "Pendente",  observacaoAprovador: "" },
  { id: "2", tipo: "Orçamento",  numero: "ORC-2026-002", cliente: "Inovação Digital SA",   vendedor: "Maria Santos",  valor: 48300, motivo: "Valor acima de R$ 50.000",          data: "2026-02-24", status: "Pendente",  observacaoAprovador: "" },
  { id: "3", tipo: "Pedido",     numero: "PV-2026-005",  cliente: "DataCenter Brasil",     vendedor: "Carlos Silva",  valor: 95000, motivo: "Condição especial de pagamento",    data: "2026-02-23", status: "Pendente",  observacaoAprovador: "" },
  { id: "4", tipo: "Orçamento",  numero: "ORC-2026-003", cliente: "Comércio Global ME",    vendedor: "João Oliveira", valor: 12250, motivo: "Desconto acima de 10%",             data: "2026-02-22", status: "Pendente",  observacaoAprovador: "" },
  { id: "5", tipo: "Pedido",     numero: "PV-2026-002",  cliente: "Inovação Digital SA",   vendedor: "Maria Santos",  valor: 32400, motivo: "Cliente novo — primeira compra",   data: "2026-02-20", status: "Aprovado",  observacaoAprovador: "Aprovado conforme política." },
  { id: "6", tipo: "Orçamento",  numero: "ORC-2026-004", cliente: "Startup Labs Ltda",     vendedor: "Ana Costa",     valor: 6400,  motivo: "Prazo de entrega fora do padrão",  data: "2026-02-19", status: "Rejeitado", observacaoAprovador: "Prazo inviável, renegociar." },
  { id: "7", tipo: "Pedido",     numero: "PV-2026-003",  cliente: "Comércio Global ME",    vendedor: "João Oliveira", valor: 8750,  motivo: "Valor acima de R$ 50.000",          data: "2026-02-18", status: "Aprovado",  observacaoAprovador: "" },
];

// ─── CRM Multiplataforma / Pipeline de Vendas ────────────────

export type CrmChannel = "whatsapp" | "protheus" | "ecommerce" | "web" | "indicacao";
export type CrmStage = "lead" | "qualificacao" | "proposta" | "negociacao" | "ganho" | "perdido";

export interface CrmOpportunity {
  id: string;
  titulo: string;
  cliente: string;
  contato?: string;
  telefone?: string;
  email?: string;
  canal: CrmChannel;
  estagio: CrmStage;
  valor: number;
  probabilidade: number; // 0 a 100
  vendedor: string;
  dataCriacao: string;
  previsaoFechamento: string;
  proximoPasso: string;
  origemDescricao?: string;
}

export const initialOpportunities: CrmOpportunity[] = [
  {
    id: "opp-1",
    titulo: "Renovação Servidores Rack + Switch 48P",
    cliente: "DataCenter Brasil",
    contato: "Roberto Mendes",
    telefone: "(11) 98765-4321",
    email: "roberto@datacenter.com.br",
    canal: "protheus",
    estagio: "negociacao",
    valor: 95000,
    probabilidade: 85,
    vendedor: "Carlos Silva",
    dataCriacao: "2026-02-21",
    previsaoFechamento: "2026-03-05",
    proximoPasso: "Aprovação de alçada de desconto no Protheus",
    origemDescricao: "TOTVS Protheus (Base Ativa)",
  },
  {
    id: "opp-2",
    titulo: "Lote 15 Notebooks Pro 15 corporativos",
    cliente: "Tech Solutions Ltda",
    contato: "Camila Duarte",
    telefone: "(11) 99123-4567",
    email: "camila@techsolutions.com.br",
    canal: "whatsapp",
    estagio: "proposta",
    valor: 42000,
    probabilidade: 70,
    vendedor: "Maria Santos",
    dataCriacao: "2026-02-23",
    previsaoFechamento: "2026-03-08",
    proximoPasso: "Aguardando retorno do envio da proposta em PDF via WhatsApp",
    origemDescricao: "WhatsApp Business API",
  },
  {
    id: "opp-3",
    titulo: "Lote Impressoras Laser e Leitores Código",
    cliente: "Inovação Digital SA",
    contato: "Felipe Azevedo",
    telefone: "(21) 98111-2233",
    email: "felipe@inovacaodigital.com.br",
    canal: "ecommerce",
    estagio: "qualificacao",
    valor: 28500,
    probabilidade: 55,
    vendedor: "João Oliveira",
    dataCriacao: "2026-02-24",
    previsaoFechamento: "2026-03-12",
    proximoPasso: "Apresentar condição de parcelamento B2B",
    origemDescricao: "Shopify B2B Marketplace",
  },
  {
    id: "opp-4",
    titulo: "Upgrade de Storage NAS 64TB + NoBreaks",
    cliente: "Startup Labs Ltda",
    contato: "Larissa Bueno",
    telefone: "(41) 98888-9900",
    email: "larissa@startuplabs.io",
    canal: "web",
    estagio: "lead",
    valor: 18400,
    probabilidade: 40,
    vendedor: "Ana Costa",
    dataCriacao: "2026-02-25",
    previsaoFechamento: "2026-03-15",
    proximoPasso: "Agendar demonstração técnica online",
    origemDescricao: "Portal Comercial Web",
  },
  {
    id: "opp-5",
    titulo: "Fornecimento Trimestral de Periféricos e Acessórios",
    cliente: "Rede Varejo Express",
    contato: "Gustavo Rocha",
    telefone: "(51) 99777-6655",
    email: "gustavo@redevarejo.com.br",
    canal: "whatsapp",
    estagio: "ganho",
    valor: 54000,
    probabilidade: 100,
    vendedor: "Carlos Silva",
    dataCriacao: "2026-02-19",
    previsaoFechamento: "2026-02-28",
    proximoPasso: "Pedido de venda faturado e entregue",
    origemDescricao: "WhatsApp Lead Inbound",
  },
  {
    id: "opp-6",
    titulo: "Novo Parque de Monitores 27 4K para Design",
    cliente: "Comércio Global ME",
    contato: "Marcos Paulo",
    telefone: "(31) 98444-5566",
    email: "marcos@comercioglobal.com.br",
    canal: "indicacao",
    estagio: "qualificacao",
    valor: 24500,
    probabilidade: 60,
    vendedor: "João Oliveira",
    dataCriacao: "2026-02-22",
    previsaoFechamento: "2026-03-10",
    proximoPasso: "Enviar cotação com prazo especial de frete",
    origemDescricao: "Indicação de Parceiro",
  },
];

