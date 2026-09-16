# AI-START: Protocolo de Inicialização de Assistência

Este arquivo é o ponto de entrada para qualquer IA ou Agente que for atuar neste projeto. Ele garante que o assistente compreenda o contexto completo antes de sugerir ou realizar alterações.

## Passo 1: Carregar Memórias

Antes de qualquer ação, o assistente **DEVE** ler:
1. `memories/repo/PROJETO_VENDAS_PROTHEUS-REFERENCE.md`: Conhecimento estrutural e permanente.
2. `memories/local/PROJETO_VENDAS_PROTHEUS-REFERENCE.md`: Estado atual e tarefas em andamento.

## Passo 2: Compreender as Regras do Jogo

Leia e respeite as diretrizes em:
- `AGENTS.md`: Regras de conduta para agentes de IA.
- `CLAUDE.md`: (Se aplicável) Instruções específicas para Claude Code.
- `.ai/`: Processos de desenvolvimento detalhados.

## Passo 3: Verificar o Contexto Atual

O assistente deve:
1. Analisar o `package.json` para entender dependências e scripts.
2. Verificar a estrutura de diretórios atual.
3. Se houver dúvidas, perguntar ao usuário ou realizar buscas no repositório.

## Passo 4: Não Altere sem Entender

**REGRA DE OURO**: Nunca modifique código funcional antes de ter certeza do impacto na arquitetura e no estado atual documentado nas memórias.

---

## Resumo Rápido do Projeto
- **Nome**: Vendas Protheus (CRM & Gestão)
- **Stack**: React (Vite) + Express + TypeScript + Tailwind
- **DB**: Supabase + Local Fallback
- **Arquitetura**: Provider Pattern para ERP
- **Status**: Estável, em expansão de funcionalidades avançadas.
