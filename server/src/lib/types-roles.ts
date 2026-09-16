// ─── Facade de tipos compartilhados (reuso do domínio) ───────────────────
// Reutiliza os tipos puros de roles/usuários do frontend. As entidades de
// dados (Customer, Product, Order, Quote, CrmOpportunity) são redefinidas
// aqui para o backend (idênticas às do frontend) evitando dependência do
// alias `@/` e de módulos específicos do cliente.
export * from "../../../src/lib/types-roles";

// ─── Entidades de dados (backend) ────────────────────────────────────────
export type OrderStatus = "Pendente" | "Aprovado" | "Faturado" | "Cancelado" | "Aprovar";
export type QuoteStatus = "Rascunho" | "Enviado" | "Aprovado" | "Recusado" | "Expirado";

export interface OrderItem {
  produto: string;
  codigo: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
}

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
  organization_id?: string;
}

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
  organization_id?: string;
}

export interface Product {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  preco: number;
  custo: number;
  estoque: number;
  estoqueMinimo: number;
  unidade: string;
  sugestoes?: string[];
  tags?: string[];
  mediaVendaMensal?: number;
  organization_id?: string;
}

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
  organization_id?: string;
}

export interface CrmOpportunity {
  id: string;
  titulo: string;
  cliente: string;
  contato?: string;
  telefone?: string;
  email?: string;
  canal: string;
  estagio: string;
  valor: number;
  probabilidade: number;
  vendedor: string;
  dataCriacao: string;
  previsaoFechamento: string;
  proximoPasso: string;
  origemDescricao?: string;
  organization_id?: string;
}