// ─── Role & Permission System Types ───

import { safeString } from "./utils";

export type UserRole = "admin" | "representante" | "cliente" | "consultor";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  representante: "Representante",
  cliente: "Cliente",
  consultor: "Consultor",
};

export function getRoleLabel(role: unknown): string {
  if (!role) return "";
  const key = safeString(role, "admin") as UserRole;
  return ROLE_LABELS[key] || safeString(role, "Usuário");
}

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acesso total a todos os módulos, configurações e relatórios do sistema",
  representante: "Acesso a clientes da carteira, criação de orçamentos e pedidos",
  cliente: "Acesso ao catálogo de produtos e acompanhamento de seus pedidos",
  consultor: "Acesso somente leitura a relatórios, clientes e catálogo",
};

export type ActionType = "view" | "create" | "edit" | "delete" | "approve";

export interface Permission {
  module: string;
  actions: ActionType[];
}

export interface CustomProfile {
  id: string;
  nome: string;
  descricao: string;
  permissions: Permission[];
  cor: string;
  icone?: string;
}

// ─── Financial Module Permissions ───

export type FinancialActionType =
  | "finance.read"
  | "finance.receivable.read"
  | "finance.receivable.create"
  | "finance.receivable.edit"
  | "finance.receivable.receive"
  | "finance.payable.read"
  | "finance.payable.create"
  | "finance.payable.edit"
  | "finance.credit.read"
  | "finance.credit.approve"
  | "finance.cashflow.read"
  | "finance.reconciliation.execute"
  | "finance.manual_entries.create";

export const FINANCE_MODULE: string = "finance";

export const FINANCE_PERMISSIONS: FinancialActionType[] = [
  "finance.read",
  "finance.receivable.read",
  "finance.receivable.create",
  "finance.receivable.edit",
  "finance.receivable.receive",
  "finance.payable.read",
  "finance.payable.create",
  "finance.payable.edit",
  "finance.credit.read",
  "finance.credit.approve",
  "finance.cashflow.read",
  "finance.reconciliation.execute",
  "finance.manual_entries.create",
];

// ─── Role Permissions with Financial Module ───

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { module: "dashboard", actions: ["view"] },
    { module: "clientes", actions: ["view", "create", "edit", "delete"] },
    { module: "produtos", actions: ["view", "create", "edit", "delete"] },
    { module: "orcamentos", actions: ["view", "create", "edit", "delete", "approve"] },
    { module: "pedidos", actions: ["view", "create", "edit", "delete", "approve"] },
    { module: "aprovacoes", actions: ["view", "approve"] },
    { module: "representantes", actions: ["view", "create", "edit", "delete"] },
    { module: "usuarios", actions: ["view", "create", "edit", "delete"] },
    { module: "relatorios", actions: ["view"] },
    { module: "configuracoes", actions: ["view", "edit"] },
    { module: "auditoria", actions: ["view"] },
    { module: "producao", actions: ["view", "edit"] },
    { module: "integracao-erp", actions: ["view", "edit"] },
    { module: "integracao-bancaria", actions: ["view", "edit"] },
    { module: "governance", actions: ["view", "create", "edit", "delete"] },
    { module: "crm-flow", actions: ["view", "create", "edit", "delete"] },
    { module: FINANCE_MODULE, actions: ["view", ...(FINANCE_PERMISSIONS as ActionType[])] },
  ],
  representante: [
    { module: "dashboard", actions: ["view"] },
    { module: "clientes", actions: ["view", "create", "edit"] },
    { module: "produtos", actions: ["view"] },
    { module: "orcamentos", actions: ["view", "create", "edit"] },
    { module: "pedidos", actions: ["view", "create"] },
    { module: "aprovacoes", actions: ["view"] },
    { module: "representantes", actions: ["view"] },
    { module: "relatorios", actions: ["view"] },
    { module: "producao", actions: ["view"] },
    { module: "integracao-bancaria", actions: ["view"] },
    { module: "governance", actions: ["view"] },
    { module: "crm-flow", actions: ["view"] },
    // Representantes têm acesso limitado financeiro
    { module: FINANCE_MODULE, actions: ["view", "finance.read", "finance.receivable.read", "finance.cashflow.read"] as ActionType[] },
  ],
  cliente: [
    { module: "dashboard", actions: ["view"] },
    { module: "producao", actions: ["view"] },
    // Cliente sem acesso financeiro direto
  ],
  consultor: [
    { module: "dashboard", actions: ["view"] },
    { module: "clientes", actions: ["view"] },
    { module: "produtos", actions: ["view"] },
    { module: "orcamentos", actions: ["view"] },
    { module: "pedidos", actions: ["view"] },
    { module: "relatorios", actions: ["view"] },
    { module: "producao", actions: ["view"] },
    // Consultor sem acesso financeiro direto
  ],
};

// ─── User ───

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  avatar?: string;
  telefone?: string;
  criadoEm: string;
  customPermissions?: Permission[];
  customProfileId?: string;
}

// ─── Representante ───

export interface Representante extends AppUser {
  role: "representante";
  codigo: string;
  regiao: string;
  metaMensal: number;
  comissao: number; // percentage
  carteira: CarteiraCliente[];
}

export interface CarteiraCliente {
  clienteId: string;
  razaoSocial: string;
  cnpj: string;
  cidade: string;
  uf: string;
  totalCompras: number;
  ultimaCompra: string;
  status: "Ativo" | "Inativo" | "Prospecto";
}

// ─── Mock Data ───

export const MOCK_USERS: AppUser[] = [
  { id: "u1", nome: "Admin Sistema", email: "admin@vendas.com", role: "admin", ativo: true, telefone: "(11) 9999-0001", criadoEm: "2025-01-10" },
  { id: "u2", nome: "Carlos Silva", email: "carlos@vendas.com", role: "representante", ativo: true, telefone: "(11) 9999-0002", criadoEm: "2025-03-15" },
  { id: "u3", nome: "Maria Santos", email: "maria@vendas.com", role: "representante", ativo: true, telefone: "(21) 9999-0003", criadoEm: "2025-04-20" },
  { id: "u4", nome: "Joao Oliveira", email: "joao@vendas.com", role: "representante", ativo: true, telefone: "(31) 9999-0004", criadoEm: "2025-05-10" },
  { id: "u5", nome: "Ana Costa", email: "ana@vendas.com", role: "representante", ativo: false, telefone: "(41) 9999-0005", criadoEm: "2025-06-01" },
  { id: "u6", nome: "Tech Solutions Ltda", email: "contato@techsolutions.com.br", role: "cliente", ativo: true, telefone: "(11) 3456-7890", criadoEm: "2025-08-01" },
  { id: "u7", nome: "Inovacao Digital SA", email: "compras@inovacaodigital.com.br", role: "cliente", ativo: true, telefone: "(21) 2345-6789", criadoEm: "2025-08-15" },
  { id: "u8", nome: "Consultor Externo", email: "consultor@parceiro.com", role: "consultor", ativo: true, telefone: "(11) 8888-0001", criadoEm: "2025-09-01" },
  { id: "u9", nome: "Fernanda Lopes", email: "fernanda@parceiro.com", role: "consultor", ativo: true, telefone: "(11) 8888-0002", criadoEm: "2025-10-05" },
  { id: "u10", nome: "Ricardo Mendes", email: "ricardo@parceiro.com", role: "consultor", ativo: false, telefone: "(21) 8888-0003", criadoEm: "2025-11-12" },
];

export const MOCK_REPRESENTANTES: Representante[] = [
  {
    id: "u2", nome: "Carlos Silva", email: "carlos@vendas.com", role: "representante", ativo: true,
    telefone: "(11) 9999-0002", criadoEm: "2025-03-15", codigo: "REP-001", regiao: "SP Capital",
    metaMensal: 150000, comissao: 5,
    carteira: [
      { clienteId: "1", razaoSocial: "Tech Solutions Ltda", cnpj: "12.345.678/0001-90", cidade: "São Paulo", uf: "SP", totalCompras: 285000, ultimaCompra: "2026-02-25", status: "Ativo" },
      { clienteId: "5", razaoSocial: "DataCenter Brasil", cnpj: "56.789.012/0001-34", cidade: "Campinas", uf: "SP", totalCompras: 720000, ultimaCompra: "2026-02-21", status: "Ativo" },
      { clienteId: "c3", razaoSocial: "Industria ABC ME", cnpj: "78.901.234/0001-56", cidade: "Guarulhos", uf: "SP", totalCompras: 45000, ultimaCompra: "2026-01-15", status: "Prospecto" },
    ],
  },
  {
    id: "u3", nome: "Maria Santos", email: "maria@vendas.com", role: "representante", ativo: true,
    telefone: "(21) 9999-0003", criadoEm: "2025-04-20", codigo: "REP-002", regiao: "RJ / ES",
    metaMensal: 120000, comissao: 5,
    carteira: [
      { clienteId: "2", razaoSocial: "Inovacao Digital SA", cnpj: "23.456.789/0001-01", cidade: "Rio de Janeiro", uf: "RJ", totalCompras: 420000, ultimaCompra: "2026-02-24", status: "Ativo" },
      { clienteId: "6", razaoSocial: "Rede Varejo Express", cnpj: "67.890.123/0001-45", cidade: "Porto Alegre", uf: "RS", totalCompras: 198000, ultimaCompra: "2026-02-20", status: "Ativo" },
    ],
  },
  {
    id: "u4", nome: "Joao Oliveira", email: "joao@vendas.com", role: "representante", ativo: true,
    telefone: "(31) 9999-0004", criadoEm: "2025-05-10", codigo: "REP-003", regiao: "MG / GO",
    metaMensal: 100000, comissao: 4.5,
    carteira: [
      { clienteId: "3", razaoSocial: "Comercio Global ME", cnpj: "34.567.890/0001-12", cidade: "Belo Horizonte", uf: "MG", totalCompras: 156000, ultimaCompra: "2026-02-23", status: "Ativo" },
    ],
  },
  {
    id: "u5", nome: "Ana Costa", email: "ana@vendas.com", role: "representante", ativo: false,
    telefone: "(41) 9999-0005", criadoEm: "2025-06-01", codigo: "REP-004", regiao: "PR / SC",
    metaMensal: 80000, comissao: 4,
    carteira: [
      { clienteId: "4", razaoSocial: "Startup Labs Ltda", cnpj: "45.678.901/0001-23", cidade: "Curitiba", uf: "PR", totalCompras: 89000, ultimaCompra: "2026-02-22", status: "Inativo" },
    ],
  },
];