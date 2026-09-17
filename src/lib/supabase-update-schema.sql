-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO IDEMPOTENTE DO SUPABASE (Vendas Protheus)
-- Este script verifica e cria tabelas ausentes, e adiciona colunas faltantes
-- (como organization_id) em tabelas já existentes.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA DE ORGANIZAÇÕES (Tenants)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    nome TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'representante',
    ativo BOOLEAN DEFAULT true NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'representante',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, profile_id)
);

-- Função auxiliar para adicionar coluna se não existir
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table TEXT,
    p_column TEXT,
    p_type TEXT
) RETURNS VOID AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = p_table
          AND column_name = p_column
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table, p_column, p_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Assegurar tabelas base e coluna organization_id em todas as tabelas operacionais
-- CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf VARCHAR(2),
    endereco TEXT,
    condicao_pagamento TEXT DEFAULT '30 dias',
    total_compras NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    ultima_compra TIMESTAMPTZ,
    erp_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('clientes', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'Geral' NOT NULL,
    preco NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    custo NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    estoque NUMERIC(12,4) DEFAULT 0.0000 NOT NULL,
    estoque_minimo NUMERIC(12,4) DEFAULT 0.0000 NOT NULL,
    unidade VARCHAR(10) DEFAULT 'UN' NOT NULL,
    sugestoes JSONB DEFAULT '{}'::jsonb NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb NOT NULL,
    media_venda_mensal NUMERIC(15, 2) DEFAULT 0.00,
    erp_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('produtos', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    data TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('pedidos', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- ORÇAMENTOS
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    data TEXT,
    validade TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('orcamentos', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- APROVAÇÕES
CREATE TABLE IF NOT EXISTS public.aprovacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    motivo TEXT,
    data TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    observacao_aprovador TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('aprovacoes', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- OPORTUNIDADES CRM
CREATE TABLE IF NOT EXISTS public.oportunidades_crm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    canal TEXT,
    estagio TEXT DEFAULT 'lead' NOT NULL,
    valor NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    probabilidade INT DEFAULT 50 NOT NULL,
    responsavel_id UUID,
    data_criacao TIMESTAMPTZ DEFAULT now() NOT NULL,
    previsao_fechamento DATE,
    proximo_passo TEXT,
    origem_descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('oportunidades_crm', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- PRODUÇÃO LOTES
CREATE TABLE IF NOT EXISTS public.producao_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    lote TEXT NOT NULL,
    produto TEXT NOT NULL,
    tipo TEXT,
    granulacao TEXT,
    quantidade NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unidade VARCHAR(10) DEFAULT 'PÇ',
    status TEXT NOT NULL DEFAULT 'Mistura',
    inicio TEXT,
    previsao TEXT,
    operador TEXT,
    prioridade TEXT DEFAULT 'Média',
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('producao_lotes', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- USUÁRIOS
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'representante',
    ativo BOOLEAN DEFAULT true,
    avatar TEXT,
    telefone TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    custom_profile_id UUID,
    codigo TEXT,
    regiao TEXT,
    meta_mensal NUMERIC(15, 2) DEFAULT 0,
    comissao NUMERIC(5, 2) DEFAULT 0,
    carteira JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('usuarios', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- PERFIS CUSTOMIZADOS
CREATE TABLE IF NOT EXISTS public.perfis_customizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    cor VARCHAR(50) DEFAULT 'blue',
    icone VARCHAR(50) DEFAULT 'shield',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('perfis_customizados', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- AUDITORIA
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    usuario TEXT NOT NULL,
    evento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    ip TEXT,
    data_hora TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('auditoria', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- CONFIGURACOES
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('configuracoes', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- DELIVERY LOGS
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    destinatario TEXT NOT NULL,
    documento TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('delivery_logs', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- OMNICHANNEL THREADS
CREATE TABLE IF NOT EXISTS public.omnichannel_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    customer_identifier TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to UUID,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('omnichannel_threads', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- OMNICHANNEL MESSAGES
CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    external_message_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('omnichannel_messages', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- OMNICHANNEL NOTES
CREATE TABLE IF NOT EXISTS public.omnichannel_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('omnichannel_notes', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- OMNICHANNEL SLA
CREATE TABLE IF NOT EXISTS public.omnichannel_sla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
    priority TEXT NOT NULL,
    source TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_update_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    timeout_ms BIGINT NOT NULL,
    alerted BOOLEAN DEFAULT false NOT NULL,
    exceeded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('omnichannel_sla', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- FATURAS
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    vendedor TEXT,
    data_emissao TIMESTAMPTZ DEFAULT now() NOT NULL,
    data_vencimento TIMESTAMPTZ NOT NULL,
    valor_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    valor_pago NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'ABERTA',
    condicao_pagamento TEXT,
    observacoes TEXT,
    metodo_pagamento TEXT,
    referencia_externa TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('faturas', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- FATURA PARCELAS
CREATE TABLE IF NOT EXISTS public.fatura_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID REFERENCES public.faturas(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL,
    valor_parcela NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    data_vencimento TIMESTAMPTZ NOT NULL,
    data_pagamento TIMESTAMPTZ,
    status_status TEXT NOT NULL DEFAULT 'PENDENTE',
    juros NUMERIC(15, 2) DEFAULT 0.00,
    multa NUMERIC(15, 2) DEFAULT 0.00,
    desconto NUMERIC(15, 2) DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT add_column_if_not_exists('fatura_parcelas', 'organization_id', 'UUID REFERENCES public.organizations(id) ON DELETE CASCADE');

-- Limpeza da função auxiliar após execução
DROP FUNCTION IF EXISTS add_column_if_not_exists(TEXT, TEXT, TEXT);

-- FIM DA MIGRAÇÃO IDEMPOTENTE
