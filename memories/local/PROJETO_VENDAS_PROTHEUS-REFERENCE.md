# Memória Local - Projeto Vendas Protheus
Última atualização: 2026-09-16

## Estado Atual
O projeto está em fase avançada de desenvolvimento, com foco recente na melhoria da experiência do usuário e estabilidade dos blocos no Document Builder (Editor de Orçamentos/Propostas).

### Atividades Recentes (Sessão Atual)

- **Service Worker & Caching**:
  - Implementada a estratégia avançada **Stale-While-Revalidate (SWR)** no `public/sw.js` para garantir atualização em background sem bloquear a UI.
  - Otimizado cache local limitando o tamanho (ex: maxItems 50) e removendo chaves antigas.
  - Adicionado suporte a mensageria bidirecional via `postMessage` para notificar a UI de fetch e conclusão das sincronizações de background.
  - Criado o componente global `SyncStatusBar` injetado no `App.tsx` para feedback visual em tempo real (toast animado) durante operações do Service Worker.
- **Biblioteca de Blocos Reutilizáveis (Correções UX/Persistência)**:
  - Resolvido crash silencioso ao salvar "Novo Bloco Composto" sem alterar o nome (agora `getUniqueBlockName` atribui nome com sufixo "Cópia" automaticamente para evitar violações na base).
  - Vínculo bidirecional implantado (Blocos agora recebem o `libraryBlockId` assim que salvos, permitindo que as próximas atualizações sobrescrevam o modelo original na Biblioteca instantaneamente).
  - Ajuste no botão "Duplicar Modelo": agora exige confirmação modal e sugere nome único de validação prévia.
- **Templates Dinâmicos & Engine de Impressão**:
  - Adicionados dois novos modelos de mercado: `Proposta Web Interativa (B2B)` (com CTA flutuante na tela web) e `Orçamento Simplificado B2C` (limpo e direto).
  - CTAs Web (Aprovar / WhatsApp) desenhados na abstração nativa como `custom_block` para injetar botões interativos abaixo dos subtotais.
  - Desenvolvido stylesheet `orcamentos-print.css` exclusivo para conversão A4 Landscape de relatórios no módulo de Orçamentos, acionável via novo botão "Imprimir Relatório".

- **Document Builder - Fix & Persistência de Blocos Compostos (`isComposed`)**:
  - **Identificação Unívoca**: Adicionado o campo `isComposed?: boolean` na interface `DocumentBlock` (`src/types/document-template.ts`).
  - **Prevenção de Reset de Elementos**: Atualizadas as verificações em `VisualDocumentBuilder.tsx` (`handleOpenInternalEditor` e `handleSaveBlockToLibraryDirectly`) para `target.elements === undefined && !target.isComposed`. Isso evita a reinicialização dos elementos internos para o padrão caso o usuário altere ou remova elementos de um bloco composto.
  - **Propagação no Fluxo de Dados**: Atualizadas as funções em `block-library-store.ts` (`createComposedBlockFromExistingBlock`, `saveBlockToLibrary`) e `BlockInternalEditorModal.tsx` (`deepCloneBlock`, `handleApplyToDocument`) para fixar `isComposed: true` e preservar personalizações no documento e na biblioteca.
  - **Validação de Build e Lint**: Aplicação compilada com sucesso (`compile_applet`) e linter zerado para erros (`lint_applet`).
- **Document Builder - Redimensionamento 2D Completo (Largura e Comprimento/Altura) com Guias Magnéticas (Snapping) e Ajuste Automático dos Itens Internos**:
  - **Redimensionamento Bidirecional Completo**: Adicionadas 8 alças interativas no bloco selecionado (topo, base, esquerda, direita e os 4 cantos diagonais), permitindo alterar tanto a **Largura** (15% a 100%) quanto o **Comprimento / Altura** (30px a 1600px) simultaneamente ou individualmente.
  - **Auto-Ajuste Responsivo dos Itens Internos ("Todos")**:
    - Todos os blocos do construtor (`client_info`, `products_table`, `products_grid`, `totals_summary`, `pix_payment`, `bank_details`, `commercial_terms`, `notes`, `signatures`, `card`, `image`, `heading`, `text`, `variables_grid`, etc.) agora herdam layout Flexbox e preenchem `h-full flex-1 flex-col` automaticamente.
    - O conteúdo interno estende-se e equilibra seu espaçamento e alinhamento verticalmente e horizontalmente, garantindo que nenhum item fique sobreposto, cortado ou fora de proporção ao esticar ou encolher a caixa.
    - Imagens ajustam seu tamanho (`minHeight` e `height: 100%`) preservando o enquadramento responsivo (`objectFit`).
    - Tabelas e grids adaptam o número de colunas, altura de linhas e scrollbars customizadas sem distorção visual.
  - **Guias de Alinhamento Magnéticas (Snapping Guides)**: Snapping automático com linhas visuais de guia (largura percentual compatível com blocos vizinhos e altura em pixels sincronizada), com badge em tempo real destacando encaixe magnético.
  - **Indicador Flutuante 2D**: Exibição em tempo real de `Largura: X% • Comprimento: Ypx` com feedback tátil de cursores (`ns-resize`, `ew-resize`, `nwse-resize`, `nesw-resize`).
- **Otimização de Performance**: 
  - Memoização do `BlockRenderer` para evitar re-renders globais.
  - Centralização do `TooltipProvider` para reduzir overhead de memória e CPU com centenas de instâncias de tooltips.
  - Implementação de `requestAnimationFrame` na lógica de redimensionamento por arraste para maior fluidez.
- **Diagnóstico e Sincronização GitHub Concluída**:
  - Removido arquivo duplicado com case-conflict (`readme.md` vs `README.md`) e arquivos temporários que causavam falha de árvore na API do GitHub.
  - Criado script de validação e diagnóstico avançado (`scripts/validate-github-sync.ts` e `scripts/diagnose-github.ts`).
  - **Push Realizado com Sucesso**: Repositório sincronizado diretamente via Git CLI com `https://github.com/AutomationUI/projeto-vendasprotheus.git` no branch `main`.
  - Adicionados comandos `npm run validate:github-sync` e `npm run diagnose:github` no `package.json`.
- **Governança**: Estrutura de arquivos `AI-START.md`, `AGENTS.md`, `CLAUDE.md` e pasta `.ai/` configurada e validada.
- **Memória**: Sincronização entre `repo` e `local` estabelecida.

## Problemas Conhecidos / Pendências
- **Exportação nativa via UI AI Studio**: O popup de exportação do AI Studio pode apresentar "Internal error" quando o repositório já existe no GitHub ou aguarda autorização OAuth na organização AutomationUI. O envio direto via Git CLI contorna essa limitação com êxito.
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
