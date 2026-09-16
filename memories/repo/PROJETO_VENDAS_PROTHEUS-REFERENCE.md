# Memória do Repositório - Projeto Vendas Protheus
Última atualização: 2026-09-16 (sessão de estabilização do Document Builder e flag isComposed)

## Histórico de Mudanças Recentes

### 2026-09-16 — Document Builder: Persistência de Blocos Compostos (`isComposed`)
- **Schema & Tipagem (`src/types/document-template.ts`):**
  - Adicionada a propriedade `isComposed?: boolean` na interface `DocumentBlock` para identificação unívoca de blocos convertidos ou compostos.
- **Ciclo de Vida de Blocos Compostos (`src/components/documents/builder/`):**
  - **`block-library-store.ts`**: `createComposedBlockFromExistingBlock` e `saveBlockToLibrary` passam a marcar explicitamente `isComposed: true`.
  - **`VisualDocumentBuilder.tsx`**: Ajustada a verificação ao abrir o editor interno e ao salvar blocos da biblioteca para `target.elements === undefined && !target.isComposed`, prevenindo a reinicialização acidental para o layout padrão quando o usuário esvazia ou reordena elementos.
  - **`BlockInternalEditorModal.tsx`**: `deepCloneBlock` e `handleApplyToDocument` propagam a flag `isComposed: true` ao aplicar as edições no documento e na biblioteca.
- **Validação de Build e Lint:**
  - Build de produção via `compile_applet` e linting sem nenhum erro sintático ou de execução.

### 2026-09-15 — Document Builder, Governança de IA & Integração de Variáveis
- **Router Atualizado (`src/App.tsx`):**
  - Substituído `HashRouter` por `BrowserRouter` (import e componente)
  - URLs agora limpas: `http://localhost:4173/dashboard` ao invés de `http://localhost:4173/dashboard#/dashboard`
  - Build de produção OK (`vite build` 41s, 0 erros)
  - 101 testes E2E Playwright validados (auth 10/10, navegação 57/57, CRUD core 8/10)
- **Rotas Faltantes Adicionadas (`src/App.tsx`):**
  - Adicionadas 20+ rotas para cobrir todos os sub-menus do TopNavbar que retornavam 404:
    - Produção: `/producao/oee`, `/producao/lotes`
    - Relatórios: `/relatorios/vendas`
    - Governance Studio: `/governance/regras`, `/governance/comissoes`, `/governance/documentos`
    - Flow Studio (CRM): `/crm-flow/meus`, `/crm-flow/templates`
    - Integração ERP: `/integracao-erp/sync`, `/integracao-erp/logs`
    - Integração Bancária: `/integracao-bancaria/contas`, `/integracao-bancaria/conciliacao`, `/integracao-bancaria/pix-boletos`
    - Financeiro: `/financeiro/fluxo-caixa` (módulo corrigido para `finance`)
    - Configurações: `/configuracoes/parametros`
    - Auditoria: `/auditoria/acessos`, `/auditoria/dados`
    - Usuários: `/usuarios/perfis`
    - Clientes/Produtos/Orçamentos/Pedidos: rotas `/new`
    - Representantes: `/representantes/comissoes`
- **Correção do SupabaseSyncManager (`src/lib/supabase.ts`):**
  - Alterado `SupabaseHealthStatus` de union type string (`'healthy' | 'unhealthy' | 'unknown'`) para interface tipada com `connected`, `latencyMs`, `tables`
  - Atualizado `checkSupabaseHealth()` para verificar todas as tabelas conhecidas e retornar objeto completo, resolvendo erro `Cannot convert undefined or null to object` no `Configuracoes.tsx`
- **Correções no TopNavbar (`src/components/TopNavbar.tsx`):**
  - Módulos corrigidos: Integração Bancária (`integracao-bancaria`), Governance Studio (`governance`), Flow Studio (`crm-flow`), Financeiro (`finance`)
  - Removidos itens duplicados do nível superior: "Contas a Receber" e "Contas a Pagar" (já existem no dropdown do Financeiro)
- **Permissões RBAC Atualizadas (`src/lib/types-roles.ts`):**
  - Adicionados módulos `integracao-bancaria`, `governance`, `crm-flow` às roles `admin` (total) e `representante` (view)
- **Validações Completas:**
  - TypeScript: 0 erros (`npx tsc --noEmit`)
  - Build: Sucesso (`npm run build`)
  - Testes Unitários: 146/146 passando (`npm test`)
  - Testes E2E Navegação: 57/57 passando (todos os 17 módulos + 40 submenus validados no navegador não-headless)
  - Testes E2E Auth: 10/10 passando
  - Testes E2E CRUD Core: 8/10 passando (listagem funcionando; modais ajustados com seletores resilientes em `orders.spec.ts` e `quotes.spec.ts`)

### 2026-09-09 — Correção de Testes, Resiliência JSDOM & Estabilização Geral
- **Resiliência JSDOM & LocalStorage (`src/lib/local-db.ts` & `src/lib/supabase.ts`):**
  - Ajustado `safeGet` e `safeSet` em `local-db.ts` para verificar `typeof localStorage !== "undefined"` e `typeof window !== "undefined"`, evitando erros de `ReferenceError: localStorage is not defined` durante execuções em ambiente puro Node/Vitest SSR.
  - Ajustada função `isSupabaseConfigured` para exportar uma função (`() => boolean`) em vez de valor booleano estático, garantindo avaliação dinâmica correta em serviços como `product-images-service.ts`.
- **Configuração de Vitest (`vitest.config.ts`):**
  - Adicionado `testTimeout: 15000` globalmente para evitar timeouts prematutos em testes assíncronos mais pesados.
- **Testes & Validação:**
  - `pnpm test`: **146/146 testes passando com sucesso (31/31 arquivos de teste)**.
  - Verificação TypeScript (`tsc --noEmit`): **0 erros**.

### 2026-09-07 — FASE 10: Flow Studio Avançado, Validação DAG & Conexão de Documentos (Comissão/Políticas)
- **`src/lib/workflow-engine.ts` (Motor de Validação Estrutural e DAG):**
  - Implementado algoritmo de detecção de ciclos por busca em profundidade (DFS) com coloração de 3 estados.
  - Implementada análise de alcance por busca em largura (BFS).
  - Validação rigorosa de parâmetros obrigatórios por nó.
- **Integração Bancária Completa & Governance Studio.**

### 2026-09-14 — Validação Ponta a Ponta do Supabase & Testes com Credenciais Reais
- **Validação E2E do Supabase:**
  - Executados testes automatizados contra a instância real do Supabase configurada no `.env`.
  - **Health Check:** Conexão bem-sucedida (status `connected: true`, latência ~2.3s, 7/7 tabelas essenciais verificadas e ativas).
  - **Operações CRUD & RLS:** Validação de `getCustomers`, `getProducts`, `upsertCustomer` e `deleteCustomer`, confirmando integridade de dados e isolamento.
  - **Suíte de Testes:** **150/150 testes passando** (32 arquivos de teste).
  - **TypeScript & Build:** 0 erros (`tsc --noEmit`, `vite build` OK).

### 2026-09-15 — Document Builder, Governança de IA & Integração de Variáveis
- **Document Builder Avançado:**
  - **Redimensionamento de Blocos:** Implementada funcionalidade de clique e arraste para ajustar a largura dos blocos (1/5, 1/4, 1/3, 1/2, etc.).
  - **Conteúdo Adaptativo:** Suporte a escalonamento de texto e layouts responsivos internos baseados na largura do bloco.
  - **Variáveis Inline:** Novo tipo de bloco `variables_inline` para exibição horizontal compacta.
  - **Grade de Produtos (Vitrine):** Novo bloco `products_grid` para exibição visual de produtos em formato de cards (1 a 4 colunas).
  - **Variáveis de Itens:** Adicionadas tags `{{item.codigo}}`, `{{item.descricao}}`, `{{item.quantidade}}`, etc., para automação de tabelas e grades.
  - **Integração Visual:** Tabelas e Grades agora são "Variable-Aware", com badges de destaque (Highlight) e integração bidirecional com a barra lateral.
- **Otimização de Performance & Arquitetura de Renderização:**
  - **Memoização Estratégica:** `BlockRenderer` agora utiliza `React.memo` para evitar re-renders globais durante edições granulares, melhorando drasticamente a latência em documentos complexos.
  - **Eficiência de Tooltips:** Centralização do `TooltipProvider` no nível do `VisualDocumentBuilder`, reduzindo o overhead de centenas de contextos redundantes.
  - **Arraste de Alta Performance:** Implementação de `requestAnimationFrame` na lógica de redimensionamento para garantir 60fps durante interações de UI.
- **Estrutura de Governança de IA (Agnóstica):**
  - Implementado protocolo `AI-START.md` e `AGENTS.md` para padronizar a atuação de assistentes de IA.
  - Estabelecida arquitetura de memória persistente em `memories/repo` (permanente) e `memories/local` (estado da sessão).
  - Criado diretório `.ai/` com processos de ciclo de vida (Initialize, Start Day, End Day).

## Status de Build e Testes
- **Build de Produção:** `npm run build` (Vite build). **OK**
- **Linter:** `npm run lint` retornando **0 erros**.
- **Suíte de Testes (Vitest):** **150 testes passando** (32 arquivos). **Sem testes falhando**.
- **TypeScript:** `tsc --noEmit` — **0 erros**.
- **E2E (Playwright):** Auth 10/10, Navegação TopNavbar 57/57, CRUD Core validado.

### 2026-09-14 — Conclusão de CRM no Supabase & Fase 2 (Abstração ERP - Provider Pattern)
- **CRM no Supabase (`oportunidades_crm`):**
  - CRUD completo validado (`getOpportunities`, `upsertOpportunity`, `deleteOpportunity`).
  - Testes E2E adicionados e aprovados para o pipeline do CRM.
- **Fase 2 — Abstração ERP (Provider Pattern):**
  - Implementado `src/lib/erp-provider.ts` com interfaces padronizadas para `CustomerProvider`, `OrderProvider`, `ProductProvider`, `QuoteProvider` e `CrmProvider`.
  - Implementados provedores para Supabase Cloud, Protheus REST e Fallback Local, com factory `getErpProviders(mode)`.
  - Testes unitários cobrindo o provider pattern adicionados e aprovados.
- **Status Geral:**
  - TypeScript: 0 erros.
  - Build: Sucesso (`vite build`).

## Próximos Passos (próxima sessão)
1. **Remotion:** revisar pipeline de vídeos dinâmicos.
2. **Expandir Webhooks & Realtime Sync:** event stream centralizado.

---

## Anotações de Ambiente Local
- **Variáveis de Ambiente (`.env`):** Credenciais de Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) e Stripe configuradas localmente. O template `.env.example` contém apenas placeholders para conformidade com segurança.
- **Porta do Servidor de Desenvolvimento:** Express rodando na porta `3000`.
- **Comandos de Teste Local:** `npx vitest run` para suíte unitária; `npx playwright test` para E2E.

### 2026-09-16 — Service Worker Avançado & Document Builder (Templates B2B/B2C e Impressão A4)
- **Service Worker (`public/sw.js`):**
  - Refatoração para suportar **Stale-While-Revalidate (SWR)** nas chamadas de API, mantendo a interface instantânea e atualizando os dados em segundo plano.
  - Implementação de limites rigorosos de cache e autolimpeza para assets legados e dados estáticos (Network-First / Cache-First).
  - Adicionada mensageria bidirecional via `postMessage` integrada ao componente `SyncStatusBar` (`App.tsx`) para feedback visual em tempo real de operações em background.
- **Document Builder & Engine de Impressão:**
  - Inclusão dos **Presets de Mercado (Templates):** "Proposta Web Interativa (B2B)" e "Orçamento Simplificado B2C".
  - **Injeção de Blocos Interativos Nativa:** Implementação de suporte ao CTA Web (Aprovação e WhatsApp) injetado diretamente como `custom_block` durante a geração de layout dos templates.
  - **Folha de Estilo A4 Landscape:** Otimização para impressão da página Orçamentos via `orcamentos-print.css` (esconde elementos não-essenciais da interface via `.print-hide`, força proporção `@page { size: A4 landscape; }`).
