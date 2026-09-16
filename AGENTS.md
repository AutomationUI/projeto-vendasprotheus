# AGENTS: Regras Gerais para Agentes de IA

Este documento estabelece o comportamento esperado de qualquer agente de IA (Claude, Gemini, Cursor, etc.) ao interagir com este repositório.

## Princípios Fundamentais

1. **Análise Antes da Ação**: Nunca escreva código sem antes ler os arquivos relacionados e entender a lógica existente.
2. **Preservação de Funcionalidade**: Alterações não devem quebrar funcionalidades existentes. Use testes (`npm test`) para validar.
3. **Respeito à Arquitetura**: Siga o padrão de Provedores (Provider Pattern) e a separação clara entre Frontend e Backend.
4. **Tratamento de Erros**: Implemente tratamento de erros robusto, especialmente em chamadas de API e interações com o banco de dados.
5. **Segurança**: Nunca exponha chaves de API no código. Use variáveis de ambiente via `.env.example`.
6. **Documentação**: Mantenha as memórias (`memories/`) atualizadas após mudanças significativas.

## Regras Técnicas

- **Tipagem**: Use TypeScript de forma rigorosa. Evite `any`.
- **Estilização**: Use exclusivamente Tailwind CSS. Siga os padrões de design "Anti-Slop" definidos nas instruções do sistema.
- **Componentização**: Mantenha componentes pequenos, modulares e reutilizáveis.
- **Comunicação**: Seja conciso e técnico. Foque em resultados funcionais.

## Fluxo de Trabalho Sugerido

1. Ler `AI-START.md`.
2. Analisar a tarefa solicitada.
3. Pesquisar o código relevante.
4. Propor a alteração (se complexa) ou implementar diretamente.
5. Validar com `lint` e `build`.
6. Atualizar a `memories/local` se houver progresso ou novos problemas.
