# Vendas Protheus — Hub Comercial Omnichannel, CRM & Flow Studio Integrado

> **Plataforma corporativa de CRM, gestão comercial, automação de fluxos com Flow Studio, acompanhamento de produção industrial cerâmica/abrasivos, integração bancária multbanco e sincronização com TOTVS Protheus ERP.**

---

## 📌 Sumário
- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Flow Studio & Motor de Workflows DAG](#-flow-studio--motor-de-workflows-dag)
- [Conexão com Documentos, Políticas e Comissões](#-conexão-com-documentos-políticas-e-comissões)
- [Integração Bancária (CNAB, PIX, Boletos & Conciliação)](#-integração-bancária-cnab-pix-boletos--conciliação)
- [Módulo Financeiro & Gestão de Títulos](#-módulo-financeiro--gestão-de-títulos)
- [Governance Studio & Motor de Comissões](#-governance-studio--motor-de-comissões)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Segurança & Controle de Acesso (RBAC)](#-segurança--controle-de-acesso-rbac)
- [Instalação e Execução](#-instalação-e-execução)
- [Testes e Qualidade](#-testes-e-qualidade)

---

## 🚀 Visão Geral

O **Vendas Protheus** é um ecossistema corporativo completo desenhado para transformar a força de vendas, o atendimento omnichannel e o controle operacional de indústrias e distribuidoras (com especialização nos segmentos de manufatura, cerâmica e abrasivos).

A solução une a agilidade de um **CRM moderno** e o poder de um **motor visual de automação de processos (Flow Studio)** à segurança do ERP **TOTVS Protheus**, operando em arquitetura resiliente **online e offline-first**.

---

## ✨ Funcionalidades Principais

### 1. 📊 Dashboard Executivo & Inteligência Comercial
- Indicadores em tempo real de faturamento mensal, ticket médio, meta do período e taxa de conversão alimentados diretamente pela camada de serviços financeiros.
- Gráficos analíticos de evolução de vendas, volume de pedidos e fluxo de caixa (Recharts).
- Ranking dos produtos mais vendidos e acompanhamento de metas da equipe comercial.

### 2. 📇 CRM & Funil de Vendas (Kanban)
- Gestão visual de oportunidades distribuídas por estágios: *Prospecção, Qualificação, Proposta, Negociação e Fechamento*.
- Cartões interativos com valores, probabilidades de fechamento e tags de prioridade.
- Integração nativa com canais de comunicação digitais (WhatsApp, Telefone, E-mail e Portal).

### 3. 📝 Orçamentos & Portal Público de Aprovação
- Elaboração ágil de propostas comerciais com cálculo automático de impostos (ICMS, IPI, ST), frete e condições de pagamento.
- **Portal de Aprovação Digital**: Geração instantânea de link público seguro para o cliente revisar, assinar digitalmente e aprovar ou recusar a proposta comercial pelo navegador.
- Envio omnichannel integrado via **WhatsApp** e **E-mail**.
- Geração e impressão de propostas em PDF corporativo de alta definição.
- **Conversão em 1 clique**: Transformação direta de orçamento aprovado em Pedido de Venda oficial.

### 4. 🛒 Gestão de Pedidos de Venda
- Controle de ciclo de vida completo: *Pendente, Em Aprovação, Aprovado, Faturado e Cancelado*.
- Rastreamento e sincronização direta com as tabelas de pedidos de venda (`SC5`/`SC6`) do TOTVS Protheus.

### 5. ⚖️ Central de Alçadas & Governança Comercial
- Validação automática de alçadas comerciais:
  - **Desconto Excessivo**: Identificação de propostas acima do limite parametrizado por cargo (>10%).
  - **Alçada de Valor**: Exigência de chancela gerencial para pedidos de grande porte (>R$ 50.000).
- Painel para gestores com histórico de justificativas, auditoria e aprovação/rejeição síncrona.

### 6. 🏭 Acompanhamento de Produção Cerâmica & Abrasivos
- Monitoramento dos estágios produtivos industriais de fábrica:
  1. *Mistura & Preparação de Massa*
  2. *Prensagem / Conformação*
  3. *Queima em Fornos Industriais* (com telemetria de temperatura em tempo real)
  4. *Usinagem & Retífica*
  5. *Controle de Qualidade (CQ)*
  6. *Embalagem & Expedição*
- Rastreamento por lote e Ordem de Produção (OP) com indicadores de OEE (Eficiência Global dos Equipamentos).

### 7. 📦 Catálogo Técnico & Galeria Multimídia de Produtos
- Cadastro técnico detalhado (dimensões, grana, liga, dureza e aplicação industrial).
- Gerenciador multimídia com suporte a upload, recorte de fotos, galeria lightbox e **captura ao vivo via câmera/webcam**.

---

## ⚡ Flow Studio & Motor de Workflows DAG

O **Flow Studio** (`/flow-studio`) disponibiliza uma interface visual baseada em nós e arestas (ReactFlow) para modelagem, simulação e execução de regras de negócio:

### 10 Templates Corporativos Homologados
1. **Roteamento Inteligente de Leads**: Distribuição balanceada por região, score e carteira de representantes.
2. **Alçada de Aprovação de Desconto**: Verificação em cascata (Vendedor, Gerente, Diretor) conectada à Política Comercial.
3. **Motor de Comissões Escalonadas**: Cálculo baseado em margem de contribuição, meta atingida e aceleradores de campanha.
4. **Sincronização Bidirecional Protheus**: Conectores para tabelas `SA1`, `SB1`, `SC5` e `SE4` com tratamento de concorrência.
5. **Análise de Risco & Crédito**: Avaliação de histórico financeiro, títulos em atraso e limite disponível.
6. **Fidelização & Pós-Venda**: Triggers automáticos pós-faturamento e recompra programada.
7. **SLA & Validade de Propostas**: Acompanhamento de expiração e reativação comercial.
8. **Recuperação de Churn**: Alertas preditivos de inatividade e esteira de retenção.
9. **Alertas Omnichannel**: Notificações automáticas via WhatsApp e e-mail para clientes e equipes.
10. **PCP & Rastreamento Industrial**: Transições de lote, validação de queima e liberação de CQ.

### Motor de Validação Estrutural e DAG (`src/lib/workflow-engine.ts`)
- **Detecção de Ciclos (DFS)**: Algoritmo com coloração de vértices para identificar e isolar dependências circulares e loops infinitos.
- **Análise de Alcance (BFS)**: Varredura a partir dos nós de gatilho (`triggerNode`) para sinalizar nós órfãos ou inalcançáveis.
- **Validação de Parâmetros**: Checagem de tópicos de gatilho, expressões de condição, regras de validadores e endpoints de conectores.
- **Auto-Fix em 1 Clique**: Quebra de ciclos, limpeza de nós inalcançáveis e preenchimento de parâmetros obrigatórios.
- **Bloqueio Pré-Salvar / Pré-Exportar**: Modal que bloqueia o salvamento de fluxos com inconsistências graves sem consentimento explícito de "Rascunho".
- **Destaque Visual no Canvas**: Halos luminosos (glowing) em nós com pendências e traçado animado em arestas problemáticas.

---

## 📄 Conexão com Documentos, Políticas e Comissões

Os fluxos do Flow Studio estão conectados às normas e manuais corporativos da organização:

- **Política Comercial & Tabela de Preços (`DOC-POL-001`)**:
  - Define as regras de desconto máximo admitido, prazos de pagamento e critérios de alçadas gerenciais.
  - Conectada aos fluxos `discount-approval` e `sla-quotes`.
- **Regulamento de Comissionamento e Metas (`DOC-COM-002`)**:
  - Especifica as faixas de comissão, regras de bonificação por margem e campanhas ativas.
  - Conectada ao fluxo `commission-engine` e ao motor determinístico de cálculo.
- **Manual de Concessão de Crédito e Cobrança (`DOC-CRED-003`)**:
  - Rege os parâmetros de análise de risco e prazos para bloqueio comercial.
  - Conectada ao fluxo `credit-billing`.
- **Normas de Conectores e Sincronização ERP (`DOC-PROT-004`)**:
  - Especifica o mapeamento de campos e regras de envio/recebimento para tabelas TOTVS Protheus.
  - Conectada ao fluxo `protheus-sync`.

---

## 🏦 Integração Bancária (CNAB, PIX, Boletos & Conciliação)

A Central de Integração Bancária (`/integracao-bancaria`) provê controle financeiro automatizado com instituições financeiras:

- **Arquivos CNAB 240 e 400**:
  - Geração de arquivos de **Remessa** para registro de títulos e instruções de cobrança.
  - Processamento de arquivos de **Retorno** com baixa automática e conciliação de liquidações.
- **Cobranças PIX Dinâmico**:
  - Geração de QR Code dinâmico renderizado na tela e linha Copia-e-Cola com expiração parametrizada.
- **Boletos Bancários Registrados**:
  - Emissão, consulta de status e vinculação com os títulos do Contas a Receber.
- **Conciliação Bancária Automatizada**:
  - Cruzamento e batimento entre extrato bancário importado e duplicatas registradas.
- **Webhooks Bancários em Tempo Real**:
  - Painel de monitoramento de callbacks e notificações com histórico de payloads e status de processamento (Itaú, Bradesco, BB, Santander, Inter, Sicoob).

---

## 💰 Módulo Financeiro & Gestão de Títulos

A tela de **Financeiro** (`/financeiro`) opera sobre persistência em nuvem e modelo resiliente offline-first:
- Gestão de títulos a receber (FAT/DUP) e a pagar.
- Liquidação total ou parcial com cálculo proporcional de juros e multas.
- Análise de envelhecimento de carteira (*Aging List*): a vencer, 1-30 dias, 31-60 dias, 61-90 dias e +90 dias.
- Projeção de fluxo de caixa gerencial de 6 meses.
- 13 permissões financeiras granulares baseadas em RBAC.

---

## 🏛️ Governance Studio & Motor de Comissões

O **Governance Studio** (`/governance`) concentra as diretrizes estratégicas da corporação:
- **Gestão de Representantes e Carteiras**: Associação híbrida por região, segmento, cliente ou produto.
- **Motor Determinístico de Comissões (`commission-engine.ts`)**: Avaliação estrita e auditável de regras comerciais com rastreamento completo (*trace*), sem dependência de decisões opacas de inteligência artificial.
- **Central de Documentos de Governança**: Gestão de manuais normativos com controle de versão e políticas de acesso por perfil.
- **Campanhas e Metas**: Parametrização de metas por período e aceleradores de vendas.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React SPA)                          │
│                                                                         │
│  ┌──────────────────────┐  ┌────────────────────┐  ┌─────────────────┐ │
│  │   Pages & Dashboards │  │    Flow Studio     │  │ Remotion Videos │ │
│  └──────────┬───────────┘  └─────────┬──────────┘  └────────┬────────┘ │
│             │                        │                      │           │
│  ┌──────────▼────────────────────────▼──────────────────────▼────────┐  │
│  │                     State & Hooks Layer                           │  │
│  │     useAuth (RBAC) • TanStack Query • Workflow Engine (DAG)       │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                      │
│  ┌───────────────────────────────▼───────────────────────────────────┐  │
│  │                Data Synchronization Layer                         │  │
│  │  ┌──────────────────────────────┐   ┌───────────────────────────┐ │  │
│  │  │ LocalDB (Offline-First Store)│◄─►│ SupabaseSyncManager (WS)  │ │  │
│  │  └──────────────────────────────┘   └─────────────┬─────────────┘ │  │
└──────────────────────────────────────────────────────┼──────────────────┘
                                                       │
                           ┌───────────────────────────┴────────────────┐
                           ▼                                            ▼
┌──────────────────────────────────────────┐ ┌────────────────────────────┐
│          BACKEND API (Node.js/Express)   │ │     SUPABASE POSTGRESQL    │
│                                          │ │                            │
│ ┌──────────────────────────────────────┐ │ │  • Persistent Storage      │
│ │ Routes: /quotes, /orders, /banking   │ │ │  • Realtime Subscriptions  │
│ └──────────────────┬───────────────────┘ │ │  • Row Level Security      │
│                    │                     │ └────────────────────────────┘
│ ┌──────────────────▼───────────────────┐ │
│ │ Services: Protheus REST, Banking API │ │
│ └──────────────────┬───────────────────┘ │
│                    │                     │
└────────────────────┼─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│             TOTVS PROTHEUS ERP           │
│   (SA1, SB1, SC5, SC6, SE4, REST APIs)   │
└──────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia |
| :--- | :--- |
| **Front-end** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Lucide Icons, Framer Motion |
| **Workflows & Canvas** | ReactFlow, Motor de Validação DAG (DFS/BFS), Topological Sorter |
| **Gráficos & Visualização** | Recharts, Canvas Confetti |
| **Back-end** | Node.js, Express, TypeScript, Zod, Pino Logger |
| **Banco de Dados** | Supabase (PostgreSQL), LocalDB com fallback resiliente offline-first |
| **Operações Bancárias** | CNAB 240/400 Parser & Generator, PIX QR Code Engine, Boletos, Webhook Processor |
| **Vídeo Dinâmico** | Remotion |
| **Integrações Externas** | TOTVS Protheus REST API, WhatsApp Business API (Meta/Twilio), Nodemailer |
| **Testes & Qualidade** | Vitest, Testing Library, Playwright E2E, ESLint |

---

## 📁 Estrutura do Projeto

```
├── .env.example                 # Declaração das variáveis de ambiente necessárias
├── memories/                    # Memórias técnicas e arquiteturais do repositório
│   └── repo/
│       ├── APP-HUB-ARCHITECTURE.md
│       ├── PROJETO_VENDAS_PROTHEUS-REFERENCE.md
│       └── WORKFLOW-DOCS-INTEGRATION.md
├── public/                      # Assets estáticos, ícones e manifests
├── remotion/                    # Vídeos corporativos programáticos
├── server/                      # Backend Express & APIs REST
│   └── src/
│       ├── controllers/         # Controladores (Quotes, Financial, Governance, etc.)
│       ├── middleware/          # Autenticação e validação
│       ├── routes/              # Endpoints (/api/v1/...)
│       └── services/            # Serviços de integração (ERP, WhatsApp, Banco)
├── src/                         # Frontend React
│   ├── components/              # Componentes de UI e módulos
│   │   ├── banking/             # CNAB, PIX, Boletos e Conciliação Bancária
│   │   ├── crm/                 # Funil de vendas, Kanban e canais
│   │   ├── document-layouts/    # Layouts de impressão e PDF de propostas
│   │   ├── financial/           # Modais de títulos e liquidação
│   │   ├── orders/              # Formulários e visualizadores de pedidos
│   │   ├── products/            # Catálogo e captura via câmera
│   │   └── ui/                  # Componentes do design system (shadcn/ui)
│   ├── data/                    # Templates de fluxos e catálogo de conectores
│   ├── hooks/                   # Hooks customizados (useAuth, useToast, etc.)
│   ├── lib/                     # Camada de serviços, validação e persistência
│   │   ├── api/                 # Clientes de API (banking, governance, financial)
│   │   ├── commission-engine.ts # Motor determinístico de cálculo de comissões
│   │   ├── document-access.ts   # Controle de acesso a documentos
│   │   ├── local-db.ts          # Banco de dados local reativo
│   │   ├── supabase-db.ts       # Conexão e sincronização Supabase
│   │   └── workflow-engine.ts   # Motor de validação DAG, ciclos e auto-fix
│   ├── pages/                   # Telas da aplicação
│   │   ├── Dashboard.tsx        # KPIs e visão executiva consolidada
│   │   ├── FlowStudio.tsx       # Modelagem e execução visual de workflows
│   │   ├── GovernanceStudio.tsx # Governança comercial, regras e comissões
│   │   ├── IntegracaoBancaria.tsx # Painel multbanco CNAB/PIX/Conciliação
│   │   ├── Financeiro.tsx       # Títulos, aging e liquidações
│   │   ├── Orcamentos.tsx       # Emissão e portal de aprovação digital
│   │   ├── Pedidos.tsx          # Gestão de pedidos e status ERP
│   │   ├── Aprovacoes.tsx       # Central de alçadas comerciais
│   │   ├── Producao.tsx         # Acompanhamento industrial e fornos
│   │   ├── Clientes.tsx         # Carteira e limite de crédito
│   │   ├── Produtos.tsx         # Catálogo com fotos e especificações
│   │   └── IntegracaoERP.tsx    # Sincronizador TOTVS Protheus
│   └── test/                    # Suíte de testes unitários e de integração
├── package.json
├── readme.md                    # Documentação do projeto (este arquivo)
└── vite.config.ts               # Configuração do Vite e plugins
```

---

## 🔒 Segurança & Controle de Acesso (RBAC)

O sistema possui controle de acesso por papéis (*Role-Based Access Control*) com isolamento de dados por organização e representante:

| Perfil de Usuário | Responsabilidades e Permissões |
| :--- | :--- |
| **Administrador** | Acesso irrestrito a todos os módulos, parametrizações globais, auditoria e Flow Studio. |
| **Diretor Comercial** | Aprovação de alçadas globais, visão completa de faturamento, metas e relatórios executivos. |
| **Gerente de Vendas** | Gestão de equipe, aprovação de alçadas intermediárias e reatribuição de oportunidades. |
| **Vendedor Interno** | Criação de propostas, pedidos e gestão da sua respectiva carteira de clientes. |
| **Representante Externo** | Acesso ao ambiente "Meu Ambiente", emissão de propostas, consulta de catálogo e extrato de comissões. |
| **Financeiro** | Gestão de títulos, liberação de crédito, conciliação bancária, CNAB e faturamento. |
| **Supervisor de Produção** | Apontamento de chão de fábrica, controle de lotes, queima em fornos e inspeção de CQ. |

---

## 💻 Instalação e Execução

### Pré-requisitos
- Node.js 18 ou superior
- npm ou bun

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone <URL_DO_REPOSITORIO>
   cd vendas-protheus
   ```

2. **Instalar Dependências:**
   ```bash
   npm install
   ```

3. **Configurar o Ambiente:**
   Copie o arquivo `.env.example` para `.env` e preencha as credenciais:
   ```bash
   cp .env.example .env
   ```

4. **Executar em Modo de Desenvolvimento:**
   ```bash
   npm run dev
   ```
   *O servidor iniciará em `http://localhost:3000` servindo simultaneamente a API Express e a aplicação React Vite.*

5. **Gerar Build de Produção:**
   ```bash
   npm run build
   ```

---

## 🧪 Testes e Qualidade

- **Executar Linter (ESLint):**
  ```bash
  npm run lint
  ```
- **Executar Testes Unitários (Vitest):**
  ```bash
  npm test
  ```
- **Executar Testes End-to-End (Playwright):**
  ```bash
  npx playwright test
  ```

---

## 📄 Licença
Propriedade privada — Desenvolvido para a plataforma corporativa **Vendas Protheus & Hub Omnichannel**.
