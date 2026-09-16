# Memória Local - Projeto Vendas Protheus
Última atualização: 2026-09-15

## Estado Atual
O projeto está em fase avançada de desenvolvimento, com foco recente na melhoria da experiência do usuário no Document Builder (Editor de Orçamentos/Propostas).

### Atividades Recentes (Sessão Atual)
- **Document Builder**: Redimensionamento por arraste, variáveis inline, grade de produtos (vitrine) e integração total de variáveis nos itens da tabela concluídos.
- **Otimização de Performance**: 
  - Memoização do `BlockRenderer` para evitar re-renders globais.
  - Centralização do `TooltipProvider` para reduzir overhead de memória e CPU com centenas de instâncias de tooltips.
  - Implementação de `requestAnimationFrame` na lógica de redimensionamento por arraste para maior fluidez.
- **Diagnóstico e Validação de Sincronização GitHub**:
  - Removido arquivo duplicado com case-conflict (`readme.md` vs `README.md`) e arquivos temporários que causavam falha de árvore na API do GitHub.
  - Criado script de validação e diagnóstico avançado (`scripts/validate-github-sync.ts` e `scripts/diagnose-github.ts`).
  - **Validação Concluída com Sucesso**: Executado teste contra `AutomationUI/projeto-vendasprotheus` com o Classic PAT (`repo`, `workflow`, `project`), confirmando permissões completas de `push: true`, `pull: true`, `admin: true` e cota de 5.000 requisições/h liberada.
  - Adicionados comandos `npm run validate:github-sync` e `npm run diagnose:github` no `package.json`.
- **Governança**: Estrutura de arquivos `AI-START.md`, `AGENTS.md`, `CLAUDE.md` e pasta `.ai/` configurada e validada.
- **Memória**: Sincronização entre `repo` e `local` estabelecida.

## Problemas Conhecidos / Pendências
- **Exportação para GitHub**: Relatos de erro "Rate exceeded" ou "Internal error" durante a exportação. Identificado como limitação externa (GitHub API limits) e não erro de código.
- **Remotion**: Necessário revisar o pipeline de vídeos dinâmicos.
- **Webhooks & Realtime Sync**: Pendente expansão conforme planejado na Fase 10+.

## Próximos Passos
1. **Revisão Remotion**: Validar a geração de vídeos dinâmicos com os dados do Protheus.
2. **Realtime Sync**: Implementar o event stream centralizado para sincronização em tempo real entre ERP e App.
3. **Validação E2E**: Atualizar suíte de testes para cobrir as novas funcionalidades de redimensionamento, variáveis inline e grade de produtos.

## Observações de Ambiente
- Servidor Express: Ativo na porta 3000.
- Supabase: Conectado e validado.
- Build: Passando com sucesso.
