# ARQUITETURA DE INTEGRAÇÃO: FLOWS & DOCUMENTOS INSTITUCIONAIS (POLÍTICAS & COMISSÕES)

## 1. Visão Geral
No ecossistema **Vendas Protheus & Hub Omnichannel**, os fluxos de trabalho visuais modelados no **Flow Studio** não são apenas diagramas abstratos: eles representam a execução viva e auditável das normas corporativas e manuais vigentes da organização.

Cada fluxo empresarial possui conexões automáticas e explícitas com a **Base de Documentos de Governança** (`GovernanceDocument` / `KnowledgeDocument`), garantindo rastreabilidade legal, conformidade com políticas de desconto e transparência no cálculo de comissões.

---

## 2. Matriz de Vinculação entre Flows e Documentos Oficiais

| Código do Flow | Nome do Fluxo | Documentos Conectados | Tipo de Vínculo |
| :--- | :--- | :--- | :--- |
| `commission-engine` | Motor de Comissões Escalonadas | `DOC-COM-002` (Regulamento de Comissionamento e Metas) | Avaliação de faixas percentuais, regras de aceleração e comissões por margem líquida |
| `discount-approval` | Alçadas de Desconto e Margem | `DOC-POL-001` (Política Comercial & Alçadas de Preço) | Parâmetros de desconto máximo por perfil (Vendedor 5%, Gerente 10%, Diretor >10%) |
| `credit-billing` | Análise de Risco & Limite de Crédito | `DOC-CRED-003` (Manual de Concessão de Crédito e Cobrança) | Bloqueio de pedidos com títulos em atraso >30 dias ou limite extrapolado |
| `protheus-sync` | Sincronização Bidirecional Protheus | `DOC-PROT-004` (Normas de Conectores ERP e Tabelas SA1/SB1/SC5) | Validação de schemas e endpoints REST Protheus |
| `sla-quotes` | SLA e Validade de Propostas Comerciais | `DOC-POL-001` (Política Comercial - Prazo de Aceite) | Prazo padrão de 15 dias para expiração de orçamentos e renegociação |
| `pcp-production` | Gestão de PCP & Rastreamento Industrial | `DOC-IND-005` (Manual de Rastreabilidade e CQ Cerâmico) | Rastreamento por lote, ordem de produção e telemetria de queima |

---

## 3. Conexão Automática na Execução do Workflow

### A. Validação de Regras de Comissionamento (`commission-engine.ts`)
O motor determinístico de comissões avalia as regras da organização sem decisões opacas:
1. **Identificação do Documento Base**: Todo cálculo referencia a versão ativa da `CommissionPolicy` vinculada ao documento `DOC-COM-002`.
2. **Avaliação por Expressões**: Condições como `valor_pedido >= 50000` e `margem >= 0.25` são checadas linha a linha.
3. **Trilha de Auditoria (Trace)**: O resultado registra quais artigos e regras do documento foram aplicados, gerando transparência total para o Representante Comercial e para a Controladoria.

### B. Alçadas e Governança Comercial (`discount-approval`)
1. Quando um orçamento ou pedido ultrapassa o limite da alçada do vendedor (ex: desconto superior a 10%), o nó validador do fluxo ativa a exigência de aprovação gerencial conforme estipulado na cláusula 4.2 da **Política Comercial (`DOC-POL-001`)**.
2. O sistema registra o link direto da documentação nos metadados do pedido para rápida consulta do aprovador na tela de **Alçadas & Aprovações** (`/aprovacoes`).

### C. Conexão com a Base de Conhecimento e IA Copilot (`knowledge-base.ts`)
- Os documentos associados aos fluxos alimentam a base de consulta do Copilot Protheus e do assistente virtual comercial.
- Qualquer alteração nos documentos institucionais dispara notificações e versionamento, alertando administradores para atualizar ou revalidar os fluxos afetados no **Flow Studio**.

---

## 4. Motor de Integridade e Validação DAG (`workflow-engine.ts`)

Para garantir que os fluxos conectados a documentos institucionais não contenham erros lógicos:
1. **Detecção de Loops (DFS)**: Garante que o cálculo de comissões e o roteamento de alçadas não entrem em ciclos infinitos de aprovação.
2. **Varredura de Nós Órfãos (BFS)**: Garante que nenhuma regra ou cálculo fique desconectado da árvore de execução originada no gatilho (`triggerNode`).
3. **Bloqueio Pré-Salvar / Pré-Exportar**: O sistema exige a correção de inconsistências ou o salvamento explícito em modalidade de *Rascunho*, preservando a integridade dos ambientes produtivos.
4. **Auto-Correção em 1 Clique**: Eliminação automática de loops, remoção de nós inalcançáveis e preenchimento de parâmetros obrigatórios padrão.
