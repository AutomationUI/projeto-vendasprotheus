# APP BLUEPRINT V1 — PLANO DE ARQUITETURA HUB OMNICHANNEL, CRM & COMERCIAL (SUPABASE EDITION)

## 1. Visão Geral e Posicionamento
O sistema evoluirá de um portal focado estritamente em "Vendas Protheus" para um **Hub Empresarial Omnichannel + CRM + Inteligência Comercial + Faturamento** robusto, moderno, escalável e de alta performance. 

O **Supabase (PostgreSQL)** passa a ser o motor de banco de dados transacional, autenticação segura e segurança a nível de linha (RLS) definitivo. A integração com ERPs (como o TOTVS Protheus) é desacoplada através de adaptadores plugáveis, permitindo que o Hub funcione de forma standalone, híbrida ou integrada.

---

## 2. Pilares de Arquitetura

### A. Multitenancy Rígido no PostgreSQL
Toda e qualquer tabela (exceto tabelas estáticas de sistema) conterá uma referência obrigatória para isolamento de clientes:
```sql
organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
```
O isolamento é blindado via **Row Level Security (RLS)** nas políticas nativas do PostgreSQL.

### B. Desacoplamento do ERP (Provider Pattern)
Atualmente, o sistema possui acoplamento forte com o Protheus (ex: `IntegracaoERPPage`, tabelas como `SA1`, `SB1`).
* **Nova Abordagem:** O core do banco de dados representará entidades puras (ex: `clientes`, `produtos`, `pedidos`).
* **Conectores:** Criaremos adaptadores no backend Express que traduzem dados de fontes externas (como Protheus REST API, SAP Business One, planilhas) para as tabelas padronizadas do Hub.

### C. Segurança e RBAC Híbrido (Supabase + Custom Claims)
* **Autenticação:** Baseada no Supabase Auth (`auth.users`).
* **Autorização:** Vinculação de usuários aos perfis (`admin`, `representante`, `consultor`, `cliente`) através de uma tabela de junção `public.organization_members` que especifica o `role` e o `organization_id`.
* **Políticas RLS:** Filtram dados baseando-se no `auth.uid()`, resolvendo dinamicamente a `organization_id` ativa do usuário em cada transação.

---

## 3. Modelo de Dados Unificado (Supabase DDL)

Abaixo está o mapeamento conceitual das tabelas principais com suporte a Multitenancy, RLS e Auditoria:

```sql
-- 1. Organizações (Tenants)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Perfis de Usuários & Associação de Tenant (RBAC)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'representante', 'cliente', 'consultor')),
    ativo BOOLEAN DEFAULT true NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'representante', 'cliente', 'consultor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, profile_id)
);

-- 3. Clientes (Isolamento Rígido)
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf VARCHAR(2),
    endereco TEXT,
    condicao_pagamento TEXT DEFAULT '30 dias',
    total_compras NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    ultima_compra TIMESTAMP WITH TIME ZONE,
    erp_id TEXT, -- ID ou código no Protheus/ERP para fins de sincronização
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, cnpj)
);

-- 4. Catálogo de Produtos
CREATE TABLE public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'Geral' NOT NULL,
    preco NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    custo NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    estoque NUMERIC(12,4) DEFAULT 0.0000 NOT NULL,
    estoque_minimo NUMERIC(12,4) DEFAULT 0.0000 NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN' NOT NULL,
    sugestoes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    media_venda_mensal NUMERIC(15,2) DEFAULT 0.00,
    erp_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, codigo)
);

-- 5. CRM Oportunidades
CREATE TABLE public.oportunidades_crm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    canal TEXT CHECK (canal IN ('whatsapp', 'email', 'telefone', 'portal', 'protheus')) NOT NULL,
    estagio TEXT CHECK (estagio IN ('lead', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido')) DEFAULT 'lead' NOT NULL,
    valor NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    probabilidade INT DEFAULT 50 NOT NULL,
    responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    previsao_fechamento DATE,
    proximo_passo TEXT,
    origem_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Orçamentos Comercial (Quotes)
CREATE TABLE public.orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    vendedor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    validade DATE,
    valor_total NUMERIC(15,2) DEFAULT 0.00 NOT NULL,
    status TEXT CHECK (status IN ('Rascunho', 'Enviado', 'Aprovado', 'Recusado', 'Pendente de Aprovação', 'Cancelado')) DEFAULT 'Rascunho' NOT NULL,
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, numero)
);
```

---

## 4. Políticas de RLS (Row Level Security)

Para garantir o isolamento absoluto dos Tenants sem quebrar consultas globais complexas, implementaremos políticas de RLS baseadas em uma função auxiliar que extrai o tenant ativo do JWT:

```sql
-- Função para obter o organization_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid AS $$
    SELECT organization_id 
    FROM public.organization_members 
    WHERE profile_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Ativação de RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política RLS para Clientes
CREATE POLICY select_clientes_policy ON public.clientes
    FOR SELECT
    USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY insert_clientes_policy ON public.clientes
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY update_clientes_policy ON public.clientes
    FOR UPDATE
    USING (organization_id IN (SELECT public.get_user_organizations()))
    WITH CHECK (organization_id IN (SELECT public.get_user_organizations()));
```

---

## 5. Módulos & Estratégia de Evolução

### 1. Central de Omnichannel (Aba / Mensageria / Chats)
* **Objetivo:** Capturar leads e pedidos diretamente de conversas no WhatsApp (via Meta Cloud API) ou canais digitais.
* **Backend:** Expansão da rota `/api/messaging` para persistir interações no Supabase na tabela de `interacoes_mensageria` integrada ao CRM.

### 2. CRM Pipeline & Funil de Vendas
* **Objetivo:** Controlar leads de ponta a ponta sem dependência de ERP.
* **Frontend:** Interface com Kanban arrastável completo persistindo na tabela `oportunidades_crm`.
* **Métricas:** Taxas de conversão por estágio e volume financeiro do funil.

### 3. Faturamento standalone & Impostos Comerciais
* **Objetivo:** Adicionar motor local de simulação de faturamento e impostos (IPI, ICMS, ST, ISS) ao emitir orçamentos.
* **Standalone:** Permite o fechamento comercial mesmo se a API Protheus estiver offline.

### 4. Co-piloto de IA com Gemini (Server-side API)
* **Objetivo:** Geração automática de propostas personalizadas, resumos de negociação e análise de satisfação do cliente baseada no histórico de interações.
* **Arquitetura:** Middleware Express consumindo `@google/genai` com a chave protegida no servidor.

---

## 6. Plano de Migração Incremental (Zero Downtime)

1. **Fase 1: Preparação do Supabase**
   * Criação do schema, triggers, e funções PostgreSQL.
   * Carga inicial dos Tenants padrão baseados nas organizações de demonstração.
2. **Fase 2: Autenticação Dupla (Ponte)**
   * Integração do Supabase Auth no `/src/pages/Login.tsx` de forma amigável e gradual.
3. **Fase 3: Mapeamento de Fallback (Offline-first)**
   * Manutenção do LocalDB como cache reativo robusto, empurrando as atualizações para o Supabase em background de forma assíncrona.
4. **Fase 4: Rota de Sincronização do Conector ERP**
   * Refatoração da central de monitoramento ERP `/src/pages/IntegracaoERP.tsx` para atualizar o banco central Supabase e sincronizar as pontes.
