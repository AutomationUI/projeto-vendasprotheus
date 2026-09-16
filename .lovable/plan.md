

# Sistema Vendas Protheus — Frontend

## Visão Geral
Recriar o frontend de um sistema de gestão de vendas inspirado no TOTVS Protheus, com dashboard analítico, gestão de pedidos, clientes e relatórios. Design moderno usando shadcn/ui, Tailwind CSS e animações com Framer Motion.

---

## 1. Autenticação
- Tela de login com e-mail e senha
- Layout limpo e profissional com branding "Vendas Protheus"
- Redirecionamento para o dashboard após login

## 2. Layout Principal
- **Sidebar** lateral com navegação (Dashboard, Pedidos, Clientes, Produtos, Relatórios, Configurações)
- **Header** com nome do usuário logado, notificações e botão de logout
- Layout responsivo com sidebar colapsável em mobile

## 3. Dashboard de Vendas
- **KPIs no topo**: Total de vendas, Pedidos do mês, Ticket médio, Meta atingida (%)
- **Gráfico de linha**: Evolução de vendas nos últimos 12 meses
- **Gráfico de barras**: Vendas por vendedor/região
- **Gráfico de pizza**: Distribuição por categoria de produto
- **Tabela**: Últimos pedidos recentes com status (Pendente, Aprovado, Faturado)

## 4. Gestão de Pedidos
- **Listagem** com tabela paginada, busca e filtros (status, data, vendedor)
- **Formulário de criação/edição** de pedido: cliente, produtos (com busca), quantidades, descontos, condição de pagamento
- **Visualização detalhada** do pedido com itens, totais e histórico de status

## 5. Cadastro de Clientes
- Listagem de clientes com busca por nome/CNPJ
- Formulário de cadastro: razão social, CNPJ, endereço, contato, condição de pagamento padrão
- Visualização do perfil do cliente com histórico de compras

## 6. Catálogo de Produtos
- Lista de produtos com filtros por categoria e busca
- Cards ou tabela com nome, código, preço, estoque disponível
- Detalhes do produto

## 7. Relatórios
- Relatório de vendas por período com filtros de data
- Relatório de comissões por vendedor
- Exportação visual (tabelas formatadas com totais)

## 8. Design e UX
- Tema profissional com cores sóbrias (estilo corporativo/ERP)
- Componentes shadcn/ui estilo "new-york"
- Animações suaves com Framer Motion nas transições de página e cards
- Feedback visual com toasts para ações (pedido criado, cliente salvo, etc.)
- Totalmente responsivo

