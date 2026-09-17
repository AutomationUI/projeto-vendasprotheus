-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO CORRETIVO E IDEMPOTENTE (Vendas Protheus)
-- Corrige incompatibilidades de tipo (UUID vs TEXT) e adiciona colunas faltantes
-- Execute no SQL Editor do Supabase Dashboard
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função auxiliar para garantir tipo de coluna e foreign key com segurança
CREATE OR REPLACE FUNCTION ensure_column_and_fk(
    p_table TEXT,
    p_column TEXT,
    p_type TEXT,
    p_ref_table TEXT,
    p_ref_column TEXT
) RETURNS VOID AS $$
BEGIN
    -- 1. Se a coluna não existe, cria
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
    ) THEN
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', p_table, p_column, p_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 1. Organizações (UUID nativo do Supabase Auth)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Clientes (id TEXT para aceitar IDs legados/textuais como '1', '2', etc.)
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
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
SELECT ensure_column_and_fk('clientes', 'organization_id', 'UUID', 'organizations', 'id');

-- 3. Omnichannel Threads (customer_id TEXT compatível com clientes.id TEXT)
CREATE TABLE IF NOT EXISTS public.omnichannel_threads (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
    customer_identifier TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    assigned_to TEXT,
    started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT ensure_column_and_fk('omnichannel_threads', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('omnichannel_threads', 'customer_id', 'TEXT', 'clientes', 'id');

-- 4. Omnichannel Messages
CREATE TABLE IF NOT EXISTS public.omnichannel_messages (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    external_message_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT ensure_column_and_fk('omnichannel_messages', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('omnichannel_messages', 'thread_id', 'TEXT', 'omnichannel_threads', 'id');

-- 5. Omnichannel Notes
CREATE TABLE IF NOT EXISTS public.omnichannel_notes (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT ensure_column_and_fk('omnichannel_notes', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('omnichannel_notes', 'thread_id', 'TEXT', 'omnichannel_threads', 'id');

-- 6. Omnichannel SLA
CREATE TABLE IF NOT EXISTS public.omnichannel_sla (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES public.omnichannel_threads(id) ON DELETE CASCADE,
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
SELECT ensure_column_and_fk('omnichannel_sla', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('omnichannel_sla', 'thread_id', 'TEXT', 'omnichannel_threads', 'id');

-- 7. Faturas
CREATE TABLE IF NOT EXISTS public.faturas (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    cliente_id TEXT REFERENCES public.clientes(id) ON DELETE CASCADE,
    vendedor TEXT,
    data_emissao TIMESTAMPTZ DEFAULT now() NOT NULL,
    data_vencimento TIMESTAMPTZ DEFAULT now() NOT NULL,
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
SELECT ensure_column_and_fk('faturas', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('faturas', 'cliente_id', 'TEXT', 'clientes', 'id');

-- 8. Fatura Parcelas
CREATE TABLE IF NOT EXISTS public.fatura_parcelas (
    id TEXT PRIMARY KEY,
    fatura_id TEXT REFERENCES public.faturas(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL,
    valor_parcela NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    data_vencimento TIMESTAMPTZ DEFAULT now() NOT NULL,
    data_pagamento TIMESTAMPTZ,
    status_status TEXT NOT NULL DEFAULT 'PENDENTE',
    juros NUMERIC(15, 2) DEFAULT 0.00,
    multa NUMERIC(15, 2) DEFAULT 0.00,
    desconto NUMERIC(15, 2) DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
SELECT ensure_column_and_fk('fatura_parcelas', 'organization_id', 'UUID', 'organizations', 'id');
SELECT ensure_column_and_fk('fatura_parcelas', 'fatura_id', 'TEXT', 'faturas', 'id');

-- Limpeza
DROP FUNCTION IF EXISTS ensure_column_and_fk(TEXT, TEXT, TEXT, TEXT, TEXT);