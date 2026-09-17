# Memória do Repositório - Projeto Vendas Protheus
Última atualização: 2026-09-16 (sessão de estabilização do Document Builder e flag isComposed)

## Histórico de Mudanças Recentes

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
