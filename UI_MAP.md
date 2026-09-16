# Mapeamento Completo da Interface e Arquitetura (UI_MAP.md)

Este documento apresenta o mapeamento completo e estruturado do projeto **projeto-vendasprotheus**, contemplando rotas frontend/backend, menus, APIs, testes existentes e configurações.

---

## 1. TODAS AS ROTAS

### 1.1. Rotas Frontend (React Router - `src/App.tsx`)
O projeto utiliza `HashRouter` com lazy loading, proteção de rotas privadas (`PrivateRoute`) e layout principal (`MainLayout`).

| Rota | Componente | Módulo / Permissão (`PrivateRoute`) | Descrição |
| :--- | :--- | :--- | :--- |
| `/login` | `LoginPage` | Pública | Tela de autenticação e seleção de perfil/demo |
| `/demo` | `DemoPage` | Pública | Demonstração interativa e walkthrough do sistema |
| `/aprovar/:id` | `PublicApprovalPage` | Pública | Aprovação pública de orçamentos via link externo |
| `/` | `Navigate` (Redireciona para `/dashboard`) | — | Redirecionamento padrão da raiz |
| `/dashboard` | `DashboardPage` | `dashboard` | Visão geral, KPIs e indicadores principais |
| `/clientes` | `ClientesPage` | `clientes` | Gestão de clientes e contas |
| `/produtos` | `ProdutosPage` | `produtos` | Catálogo de produtos, preços e imagens |
| `/orcamentos` | `OrcamentosPage` | `orcamentos` | Gestão de propostas e orçamentos comerciais |
| `/pedidos` | `PedidosPage` | `pedidos` | Gestão e acompanhamento de pedidos de venda |
| `/aprovacoes` | `AprovacoesPage` | `aprovacoes` | Rotina de aprovações comerciais e alçadas |
| `/integracao-erp` | `IntegracaoERPPage` | `integracao-erp` | Status e logs de integração com o Protheus ERP |
| `/integracao-bancaria` | `IntegracaoBancariaPage` | `relatorios` | Conciliação e integração bancária |
| `/relatorios` | `RelatoriosPage` | `relatorios` | Relatórios gerenciais e de vendas |
| `/financeiro` | `FinanceiroPage` | `relatorios` | Módulo financeiro e contas a receber/pagar |
| `/financeiro/receber` | `FinanceiroPage` | `relatorios` | Gestão de contas a receber |
| `/financeiro/pagar` | `FinanceiroPage` | `relatorios` | Gestão de contas a pagar |
| `/configuracoes` | `ConfiguracoesPage` | `configuracoes` | Configurações gerais e parâmetros da aplicação |
| `/auditoria` | `AuditoriaPage` | `auditoria` | Trilha de auditoria e logs de segurança |
| `/producao` | `ProducaoPage` | `producao` | Acompanhamento do PCP e ordens de produção |
| `/representantes` | `RepresentantesPage` | `representantes` | Gestão de representantes comerciais e carteiras |
| `/governance` | `GovernanceStudioPage` | `representantes` | Estúdio de governança, regras e comissões |
| `/crm-flow` | `FlowStudioPage` | `dashboard` | Estúdio de fluxos de CRM / Workflow visual |
| `/usuarios` | `UsuariosPage` | `usuarios` | Gestão de usuários, perfis e permissões RBAC |
| `*` | `NotFound` | Pública | Página 404 (Não encontrada) |

---

## 2. TODOS OS MENUS (`TopNavbar.tsx`)

A barra de navegação superior (`TopNavbar.tsx`) exibe os ícones horizontais principais organizados com menu dropdown contextual (`DropdownMenu`) limpo de redundâncias:

| # | Título | Rota | Ícone (`Lucide`) | Módulo RBAC | Submenus / Ações no Dropdown |
|---|---|---|---|---|---|
| 1 | **Dashboard** | `/dashboard` | `LayoutDashboard` | `dashboard` | Painel Executivo, Métricas Comerciais |
| 2 | **Clientes** | `/clientes` | `Users` | `clientes` | Lista de Clientes, Novo Cliente |
| 3 | **Produtos** | `/produtos` | `Tag` | `produtos` | Catálogo de Produtos, Novo Produto, Alerta de Estoque Baixo |
| 4 | **Orçamentos** | `/orcamentos` | `FileText` | `orcamentos` | Lista de Orçamentos, Novo Orçamento, Aguardando Resposta |
| 5 | **Pedidos** | `/pedidos` | `ShoppingCart` | `pedidos` | Todos os Pedidos, Novo Pedido, Aguardando Liberação, Pedidos Faturados, Converter de Orçamento |
| 6 | **Aprovações** | `/aprovacoes` | `CheckSquare` | `aprovacoes` | Fila de Aprovações, Pendências de Alçada, Histórico de Decisões |
| 7 | **Integração ERP** | `/integracao-erp` | `Link2` | `integracao-erp` | Monitor Protheus ERP, Status de Sincronização, Logs de Comunicação |
| 8 | **Integração Bancária** | `/integracao-bancaria` | `Landmark` | `relatorios` | Painel Bancário, Contas Correntes, Conciliação Bancária, PIX / Boletos |
| 9 | **Produção** | `/producao` | `Factory` | `producao` | Ordens de Produção (OP), Lotes em Andamento, Lotes Atrasados, OEE & Eficiência |
| 10| **Representantes** | `/representantes` | `Briefcase` | `representantes` | Painel Força de Vendas, Carteira de Contas, Metas & Performance, Extrato de Comissões |
| 11| **Governance Studio** | `/governance` | `Scale` | `representantes` | Matriz de Governança, Regras Comerciais, Políticas de Comissão, Normas & Documentos |
| 12| **Flow Studio (CRM)** | `/crm-flow` | `GitBranch` | `dashboard` | Editor de Workflows, Fluxos Ativos, Modelos de Fluxo |
| 13| **Relatórios** | `/relatorios` | `BarChart3` | `relatorios` | Central Analítica, Vendas e Conversão, Desempenho Financeiro, Indicadores Operacionais |
| 14| **Financeiro** | `/financeiro` | `DollarSign` | `relatorios` | Visão Financeira, Contas a Receber, Contas a Pagar, Fluxo de Caixa, Análise de Crédito, Cobrança Comercial, Conciliação Contábil |
| 15| **Configurações** | `/configuracoes` | `Settings` | `configuracoes` | Parâmetros do Sistema, Regras de Venda, Parâmetros Protheus ERP, Segurança & 2FA, Documentos & Marca |
| 16| **Auditoria** | `/auditoria` | `Shield` | `auditoria` | Trilha de Auditoria, Logs de Acesso, Alterações de Dados |
| 17| **Usuários** | `/usuarios` | `UserCog` | `usuarios` | Gestão de Usuários, Novo Usuário, Perfis & Permissões |

*Nota adicional no topo/rodapé da barra:*
- **Busca rápida:** Atalho `Ctrl+K` (`/search`)
- **Notificações:** Sino de alertas (`/notifications`)
- **Menu do Usuário:** Perfil, Configurações e Botão Sair (`/login`)

---

## 3. TODAS AS APIS (Endpoints Backend Express - `server/src/app.ts`)

O backend Node.js/Express expõe os seguintes prefixos de rotas sob `/api/v1` e `/api`:

### 3.1. Clientes (`/api/v1/customers`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/customers` - Listar clientes
- `GET /api/v1/customers/:id` - Obter cliente por ID
- `POST /api/v1/customers` - Criar novo cliente
- `PATCH /api/v1/customers/:id` - Atualizar cliente
- `DELETE /api/v1/customers/:id` - Excluir cliente
- `GET /api/v1/customers/cnpj/:cnpj` - Buscar cliente por CNPJ

### 3.2. Produtos (`/api/v1/products`) - *Requer API Key + Proxy Protheus*
- `GET /api/v1/products` - Listar produtos
- `GET /api/v1/products/:id` - Obter produto por ID
- `POST /api/v1/products` - Criar produto
- `PATCH /api/v1/products/:id` - Atualizar produto (PUT no Protheus)
- `DELETE /api/v1/products/:id` - Excluir produto

### 3.3. Pedidos (`/api/v1/orders`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/orders` - Listar pedidos (suporta filtro por `?status=...`)
- `GET /api/v1/orders/:id` - Obter pedido por ID
- `POST /api/v1/orders` - Criar pedido
- `PATCH /api/v1/orders/:id` - Atualizar pedido
- `DELETE /api/v1/orders/:id` - Excluir pedido
- `POST /api/v1/orders/from-quote` - Converter orçamento em pedido

### 3.4. Orçamentos (`/api/v1/quotes`) - *CRUD Proxy Protheus + Rotas Públicas de Aprovação*
- `GET /api/v1/quotes` - Listar orçamentos
- `POST /api/v1/quotes` - Criar orçamento
- `GET /api/v1/quotes/:id` - Obter orçamento por ID
- `PATCH /api/v1/quotes/:id` - Atualizar orçamento (PUT no Protheus)
- `DELETE /api/v1/quotes/:id` - Excluir orçamento
- `POST /api/v1/quotes/:id/approve` - Aprovar orçamento (Público, validado via Zod)
- `POST /api/v1/quotes/:id/reject` - Rejeitar orçamento (Público, validado via Zod)
- `GET /api/v1/quotes/:id/status` - Consultar status de aprovação

### 3.5. Financeiro (`/api/v1/financial`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/financial/titles` - Listar títulos financeiros
- `POST /api/v1/financial/titles` - Criar título
- `GET /api/v1/financial/metrics` - Obter métricas financeiras
- `GET /api/v1/financial/cash-flow` - Obter fluxo de caixa
- `POST /api/v1/financial/titles/:id/settle` - Baixar/quitar título
- `GET /api/v1/financial/credit-analysis` - Análise de crédito de clientes
- `PATCH /api/v1/financial/credit-analysis/:clienteId` - Atualizar análise de crédito
- `GET /api/v1/financial/collections` - Gestão de cobranças
- `POST /api/v1/financial/collections` - Adicionar registro de cobrança
- `GET /api/v1/financial/reconciliations` - Conciliações bancárias
- `POST /api/v1/financial/reconciliations/:id/match` - Conciliar transação

### 3.6. Governança (`/api/v1/governance`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/governance/representatives` - Listar representantes
- `POST /api/v1/governance/representatives` - Salvar representante
- `GET /api/v1/governance/portfolios` - Listar carteiras
- `POST /api/v1/governance/portfolios` - Salvar carteira
- `GET /api/v1/governance/product-access` - Acessos a produtos
- `POST /api/v1/governance/product-access` - Salvar acesso a produtos
- `GET /api/v1/governance/rules` - Regras comerciais
- `POST /api/v1/governance/rules` - Salvar regra comercial
- `POST /api/v1/governance/rules/:id/status` - Alterar status da regra
- `POST /api/v1/governance/rules/:id/versions` - Criar versão da regra
- `GET /api/v1/governance/policies` - Políticas de comissão
- `POST /api/v1/governance/policies` - Salvar política de comissão
- `POST /api/v1/governance/commissions/calculate` - Calcular comissões
- `GET /api/v1/governance/commissions` - Listar cálculos de comissão
- `GET /api/v1/governance/documents` - Documentos de governança
- `POST /api/v1/governance/documents` - Salvar documento
- `GET /api/v1/governance/goals` - Metas
- `POST /api/v1/governance/goals` - Salvar meta
- `GET /api/v1/governance/campaigns` - Campanhas
- `POST /api/v1/governance/campaigns` - Salvar campanha

### 3.7. Comissões (`/api/v1/commissions`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/commissions` - Listar cálculos de comissão
- `POST /api/v1/commissions/calculate` - Calcular comissões
- `POST /api/v1/commissions/:id/status` - Atualizar status do cálculo de comissão

### 3.8. Fluxos / Workflow (`/api/v1/flows`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/flows` - Listar fluxos da organização
- `GET /api/v1/flows/:id` - Obter fluxo por ID
- `POST /api/v1/flows` - Criar fluxo customizado
- `PUT /api/v1/flows/:id` - Atualizar fluxo (nós/edges)
- `DELETE /api/v1/flows/:id` - Remover fluxo
- `POST /api/v1/flows/:id/duplicate` - Duplicar fluxo
- `PATCH /api/v1/flows/:id/status` - Alterar status do fluxo

### 3.9. Omnichannel & Event Hub (`/api/v1/omnichannel`)
- `POST /api/v1/omnichannel/events` - Disparar eventos no Event Hub unificado
- `POST /api/v1/omnichannel/whatsapp/webhook` - Webhook WhatsApp Cloud API
- `POST /api/v1/omnichannel/email/webhook` - Webhook E-mail
- `POST /api/v1/omnichannel/webchat/webhook` - Webhook Webchat
- `GET /api/v1/omnichannel/thread/:threadId` - Obter thread de atendimento
- `GET /api/v1/omnichannel/customer/:customerId/threads` - Listar threads do cliente
- `PATCH /api/v1/omnichannel/thread/:threadId/sla` - Atualizar status SLA da thread
- `POST /api/v1/omnichannel/thread/:threadId/notes` - Adicionar nota interna à thread

### 3.10. Mensageria (`/api/v1/messaging`) - *Requer API Key*
- `POST /api/v1/messaging/send-email` - Enviar e-mail
- `POST /api/v1/messaging/send-whatsapp` - Enviar WhatsApp
- `POST /api/v1/messaging/test-email` - Testar conexão de e-mail (SMTP)
- `POST /api/v1/messaging/test-whatsapp` - Testar conexão WhatsApp
- `GET /api/v1/messaging/delivery-log` - Obter logs de entrega
- `GET /api/v1/messaging/delivery-log/:quoteId` - Obter logs por orçamento
- `GET /api/v1/messaging/settings` - Obter configurações de mensageria

### 3.11. Faturas (`/api/v1/fatura`) - *Requer API Key + X-Organization-Id*
- `GET /api/v1/fatura` - Listar faturas (filtra por `?status=...`)
- `GET /api/v1/fatura/:id` - Obter fatura por ID
- `POST /api/v1/fatura` - Criar fatura
- `POST /api/v1/fatura/:id/pagamento` - Registrar pagamento de fatura
- `POST /api/v1/fatura/:id/parcelas` - Gerar parcelas para a fatura
- `GET /api/v1/fatura/:id/parcelas` - Listar parcelas da fatura

### 3.12. Imagens de Produtos (`/api/v1/product-images`) - *Requer API Key*
- `POST /api/v1/product-images/sessions` - Criar sessão de upload temporário (Stage 1)
- `DELETE /api/v1/product-images/sessions/:sessionId` - Cancelar sessão de upload
- `POST /api/v1/product-images/promote` - Promover imagens temporárias a definitivas (Stage 2)
- `GET /api/v1/product-images/serve/:productId/:imageId` - Servir arquivo de imagem
- `POST /api/v1/product-images/cleanup-expired` - Rotina de limpeza de sessões expiradas

### 3.13. Saúde do Sistema (`/api/health`, `/api/ready`, `/api/v1/health`, etc.) - *Público*
- `GET /api/health` - Verificação básica de status e uptime
- `GET /api/ready` - Verificação detalhada de prontidão (Protheus, SMTP, WhatsApp)

---

## 4. TESTES EXISTENTES

### 4.1. Testes Unitários e de Integração (Vitest - `src/test/`)
O projeto possui uma suíte abrangente de testes unitários com Vitest utilizando ambiente `jsdom`:
- **Serviços & Lógica de Domínio:**
  - `src/test/governance-service.test.ts`
  - `src/test/governance-frontend-service.test.ts`
  - `src/test/commission-engine.test.ts`
  - `src/test/decision-flows.test.ts`
  - `src/test/workflow-validation.test.ts`
  - `src/test/approvals-routine.test.ts`
  - `src/test/document-access.test.ts`
  - `src/test/data-scope.test.ts`
- **Hooks & Stores:**
  - `src/test/use-auth.test.tsx`
  - `src/test/user-store.test.ts`
  - `src/test/permissions-store.test.ts`
  - `src/test/audit-store.test.ts`
  - `src/test/use-debounce.test.ts`
- **Componentes & Telas (Tabs & Modals):**
  - `src/test/error-boundary.test.tsx`
  - `src/test/logout-dialog.test.tsx`
  - `src/test/status-badge.test.tsx`
  - `src/test/tabs/dashboard.test.tsx`
  - `src/test/tabs/clientes.test.tsx`
  - `src/test/tabs/produtos.test.tsx`
  - `src/test/tabs/orcamentos.test.tsx`
  - `src/test/tabs/pedidos.test.tsx`
  - `src/test/tabs/aprovacoes.test.tsx`
  - `src/test/tabs/integracao-erp.test.tsx`
  - `src/test/tabs/producao.test.tsx`
  - `src/test/tabs/representantes.test.tsx`
  - `src/test/tabs/relatorios.test.tsx`
  - `src/test/tabs/configuracoes.test.tsx`
  - `src/test/tabs/auditoria.test.tsx`
  - `src/test/tabs/usuarios.test.tsx`
  - `src/test/tabs/login-demo.test.tsx`

### 4.2. Testes End-to-End (Playwright E2E - `e2e/`)
Testes automatizados de fluxo ponta a ponta com Playwright:
- `e2e/auth.spec.ts` - Testes de login e autenticação
- `e2e/orders.spec.ts` - Fluxo de pedidos de venda
- `e2e/quotes.spec.ts` - Fluxo de orçamentos e aprovações
- `e2e/menu-lateral.spec.ts` - Validação de navegação e menus
- `e2e/inspect-dom.spec.ts` - Inspeção de elementos e estrutura DOM

---

## 5. CONFIGURAÇÕES DE TESTE

### 5.1. Vitest (`vitest.config.ts`)
Configurado com suporte ao React (SWC), ambiente jsdom e cobertura de código v8:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/hooks/**", "src/lib/**"],
      exclude: ["src/lib/mock-data.ts", "src/lib/mock-production.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### 5.2. Playwright (`playwright.config.ts`)
Configurado para rodar E2E localmente e em CI com servidor web embutido (`vite preview` na porta 4173):
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx vite preview --port 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.3. Utilitários de Teste (`src/test/test-utils.tsx`)
Fornece wrappers de contexto essenciais (`QueryClientProvider`, `TooltipProvider`, `AuthProvider`, `MemoryRouter`) para renderizar componentes isoladamente em testes unitários/integração:
```typescript
import React, { type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
  initialRoute?: string;
}

export function TestProviders({ children, initialRoute = "/" }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialRoute]}>
            {children}
          </MemoryRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialRoute?: string }
) {
  const { initialRoute = "/", ...renderOptions } = options || {};
  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders initialRoute={initialRoute}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}
```
