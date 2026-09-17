# Memória do Repositório - Projeto Vendas Protheus
Última atualização: 2026-09-17 (implementação de sincronização Supabase, módulos omnichannel e governança)

## Histórico de Mudanças Recentes

### 2026-09-17 — Sincronização Supabase, Módulos Omnichannel e Tipos de Governança
- **Sincronização de Banco de Dados Supabase (`src/lib/supabase-db.ts`, `src/lib/supabase-schema.sql`, `src/lib/supabase-update-schema.sql`):**
  - Implementado gerenciador robusto de sincronização com Supabase e scripts de migração idempotentes para tratar tabelas existentes e adição segura de colunas (`organization_id`).
- **Módulos Omnichannel e WebSocket (`server/src/routes/omnichannel.routes.ts`, `server/src/services/omnichannel.service.ts`, `src/hooks/use-omnichannel-websocket.ts`):**
  - Adicionadas rotas e serviços avançados omnichannel com suporte a WebSockets em tempo real para gerenciamento de interações e eventos.
- **Governança (`src/types/governance.ts`):**
  - Definidos novos tipos TypeScript estruturados para governança, compliance e auditoria.

### 2026-09-16 — Estabilização de PWA e Document Builder
- **PWA Manifest (`public/manifest.json`):**
  - Substituídas referências a ícones inexistentes (`/icons/icon-192.png` e `/icons/icon-512.png`) pelo arquivo `placeholder.svg` para evitar erros de download de recurso e melhorar a compatibilidade de instalação do PWA.
- **Document Builder: Persistência de Blocos Compostos (`isComposed`)**
  - **Schema & Tipagem (`src/types/document-template.ts`):** Adicionada a propriedade `isComposed?: boolean` na interface `DocumentBlock`.
  - **Ciclo de Vida (`src/components/documents/builder/`):** Ajustadas as verificações para evitar reinicialização de elementos em blocos compostos quando editados.

### 2026-09-15 — Document Builder, Governança de IA & Integração de Variáveis
- **Router Atualizado (`src/App.tsx`):** Substituído `HashRouter` por `BrowserRouter`.
- **Rotas Faltantes Adicionadas (`src/App.tsx`):** Adicionadas 20+ rotas para cobrir todos os sub-menus.
- **Correção do SupabaseSyncManager (`src/lib/supabase.ts`):** Verificação completa de integridade de tabelas.

### 2026-09-09 — Correção de Testes, Resiliência JSDOM & Estabilização Geral
- **Resiliência JSDOM & LocalStorage:** Ajustado `safeGet` e `safeSet` para evitar erros em ambiente Node/Vitest.

## Status de Build e Testes
- **Build de Produção:** Sucesso (`npm run build`).
- **Linter:** Sem erros.
- **Suíte de Testes (Vitest):** ~150 testes passando.
- **TypeScript:** 0 erros (`tsc --noEmit`).

## Próximos Passos (próxima sessão)
1. **Remotion:** revisar pipeline de vídeos dinâmicos.
2. **Expandir Webhooks & Realtime Sync:** event stream centralizado.
