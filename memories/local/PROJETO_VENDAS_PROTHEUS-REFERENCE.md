# Memória Local - Projeto Vendas Protheus
Última atualização: 2026-09-17

## Estado Atual
O projeto está em fase avançada de desenvolvimento com forte evolução na integração com Supabase, módulos omnichannel e governança. Recentemente, foram implementados:
- Sincronização completa com Supabase (`src/lib/supabase-db.ts`, `src/lib/supabase-schema.sql`).
- Script de migração idempotente (`src/lib/supabase-update-schema.sql`) para tratamento seguro de tabelas e colunas (`organization_id`).
- Módulos e rotas omnichannel com hook WebSocket dedicado (`src/hooks/use-omnichannel-websocket.ts`, `server/src/services/omnichannel.service.ts`).
- Tipos de governança estruturados (`src/types/governance.ts`).

### Atividades Recentes (Sessão Atual)
- **Sincronização e Migração Supabase**:
  - Consolidação dos scripts SQL de atualização de schema e sincronização de dados.
- **Validação de Integridade**:
  - `npx tsc --noEmit`: **0 erros**.
  - `npm run build`: Sucesso.

## Problemas Conhecidos / Pendências
- **Atraso na Liberação de Portas**: O sistema operacional por vezes demora a liberar a porta 3000 (`TimeWait`), exigindo finalização manual de processos ou breve espera entre reinicializações do servidor.
- **Remotion**: Necessário revisar o pipeline de vídeos dinâmicos.
- **Webhooks & Realtime Sync**: Expansão contínua baseada no novo módulo omnichannel e Supabase sync.

## Próximos Passos
1. **Realtime Sync & Webhooks**: Consolidar o event stream centralizado com Supabase e WebSockets no módulo omnichannel.
2. **Testes E2E (Playwright)**: Executar e validar a suíte de testes de interface.
3. **Refinamento de Testes Unitários**: Ajustar mocks de autenticação (`use-auth`) e governança.

## Observações de Ambiente
- Supabase: **Credenciais precisam ser recriadas** (usuários e schema). Executar `supabase-update-schema.sql` no SQL Editor do Supabase Dashboard.
- Build: Passando com sucesso em todas as etapas.
- Servidor Dev: Rodando em `http://localhost:3000` (Backend + Frontend via Vite middleware).
- Auth Mode: Mock (`VITE_USE_MOCK=true`) para desenvolvimento/testes.
