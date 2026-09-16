# CLAUDE: Orientações para Claude Code

Este arquivo contém dicas específicas para o uso do Claude Code (CLI) neste projeto.

## Integração de Memória

Claude, ao iniciar:
1. Use `cat AI-START.md` para entender como começar.
2. Utilize os comandos de busca (grep, find) para localizar lógica espalhada.
3. Respeite o arquivo `.clauderules` se ele existir (atualmente as regras estão consolidadas em `AGENTS.md`).

## Comandos Úteis no Projeto
- `npm run dev`: Inicia o ambiente de desenvolvimento.
- `npm run build`: Valida o build de produção.
- `npm test`: Executa a suíte de testes unitários.
- `npx playwright test`: Executa os testes de interface (E2E).

## Documentação Centralizada
Toda a inteligência do projeto reside em:
- `memories/repo/`: Estrutura e definições permanentes.
- `memories/local/`: Contexto da sessão atual.
