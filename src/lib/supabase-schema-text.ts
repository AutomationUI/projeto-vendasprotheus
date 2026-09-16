// Exported SQL script string for in-app display and copy
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- SCHEMA SUPABASE: VENDAS PROTHEUS & CRM MULTIPLATAFORMA
-- Projeto: https://dhzfotrxrhyzfxufgakc.supabase.co
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id TEXT PRIMARY KEY,
    razao_social TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cidade TEXT,
    uf VARCHAR(2),
    endereco TEXT,
    condicao_pagamento TEXT,
    total_compras NUMERIC(15, 2) DEFAULT 0,
    ultima_compra TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT,
    preco NUMERIC(15, 2) NOT NULL DEFAULT 0,
    custo NUMERIC(15, 2) DEFAULT 0,
    estoque NUMERIC(15, 2) DEFAULT 0,
    estoque_minimo NUMERIC(15, 2) DEFAULT 0,
    unidade VARCHAR(10) DEFAULT 'UN',
    sugestoes JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    media_venda_mensal NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.1. SESSÕES DE UPLOAD TEMPORÁRIO (ESTÁGIO 1)
CREATE TABLE IF NOT EXISTS public.product_upload_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 2.2. METADADOS DE IMAGENS TEMPORÁRIAS (ESTÁGIO 1)
CREATE TABLE IF NOT EXISTS public.product_temp_images (
    id TEXT PRIMARY KEY,
    upload_session_id TEXT NOT NULL REFERENCES public.product_upload_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    bucket_id TEXT NOT NULL DEFAULT 'product-images-temp',
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'CAMERA', 'ERP', 'ECOMMERCE', 'MARKETPLACE', 'API', 'INTERNAL')),
    status TEXT NOT NULL DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING', 'UPLOADED', 'REMOVED', 'PROMOTING', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3. IMAGENS DEFINITIVAS DE PRODUTOS (ESTÁGIO 2)
CREATE TABLE IF NOT EXISTS public.product_images (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    bucket_id TEXT NOT NULL DEFAULT 'product-images',
    storage_path TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'CAMERA', 'ERP', 'ECOMMERCE', 'MARKETPLACE', 'API', 'INTERNAL')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE PEDIDOS DE VENDA
CREATE TABLE IF NOT EXISTS public.pedidos (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    data TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE ORÇAMENTOS
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL UNIQUE,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    data TEXT,
    validade TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA DE APROVAÇÕES
CREATE TABLE IF NOT EXISTS public.aprovacoes (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    motivo TEXT,
    data TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente',
    observacao_aprovador TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA DE CRM & OPORTUNIDADES
CREATE TABLE IF NOT EXISTS public.oportunidades_crm (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    cliente TEXT NOT NULL,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    canal TEXT NOT NULL DEFAULT 'protheus',
    estagio TEXT NOT NULL DEFAULT 'lead',
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    probabilidade NUMERIC(5, 2) DEFAULT 50,
    vendedor TEXT,
    data_criacao TEXT,
    previsao_fechamento TEXT,
    proximo_passo TEXT,
    origem_descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA DE PRODUÇÃO E LOTES
CREATE TABLE IF NOT EXISTS public.producao_lotes (
    id TEXT PRIMARY KEY,
    lote TEXT NOT NULL UNIQUE,
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELA DE USUÁRIOS E REPRESENTANTES
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'representante',
    ativo BOOLEAN DEFAULT true,
    avatar TEXT,
    telefone TEXT,
    criado_em TEXT,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    custom_profile_id TEXT,
    codigo TEXT,
    regiao TEXT,
    meta_mensal NUMERIC(15, 2) DEFAULT 0,
    comissao NUMERIC(5, 2) DEFAULT 0,
    carteira JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABELA DE PERFIS CUSTOMIZADOS
CREATE TABLE IF NOT EXISTS public.perfis_customizados (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    cor VARCHAR(50) DEFAULT 'blue',
    icone VARCHAR(50) DEFAULT 'shield',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. TABELA DE AUDITORIA E LOGS
CREATE TABLE IF NOT EXISTS public.auditoria (
    id TEXT PRIMARY KEY,
    usuario TEXT NOT NULL,
    evento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    ip TEXT,
    data_hora TIMESTAMPTZ DEFAULT now()
);

-- 11. TABELA DE CONFIGURAÇÕES GERAIS
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id TEXT PRIMARY KEY DEFAULT 'default',
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. TABELA DE LOGS DE MENSAGERIA / DISPARO
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id TEXT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    destinatario TEXT NOT NULL,
    documento TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero);
CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON public.orcamentos(numero);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estagio ON public.oportunidades_crm(estagio);
CREATE INDEX IF NOT EXISTS idx_producao_lote ON public.producao_lotes(lote);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON public.auditoria(data_hora DESC);

-- POLÍTICAS RLS (Row Level Security)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidades_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_customizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access clientes" ON public.clientes;
    CREATE POLICY "Public access clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access produtos" ON public.produtos;
    CREATE POLICY "Public access produtos" ON public.produtos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access pedidos" ON public.pedidos;
    CREATE POLICY "Public access pedidos" ON public.pedidos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access orcamentos" ON public.orcamentos;
    CREATE POLICY "Public access orcamentos" ON public.orcamentos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access aprovacoes" ON public.aprovacoes;
    CREATE POLICY "Public access aprovacoes" ON public.aprovacoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access oportunidades_crm" ON public.oportunidades_crm;
    CREATE POLICY "Public access oportunidades_crm" ON public.oportunidades_crm FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access producao_lotes" ON public.producao_lotes;
    CREATE POLICY "Public access producao_lotes" ON public.producao_lotes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access usuarios" ON public.usuarios;
    CREATE POLICY "Public access usuarios" ON public.usuarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access perfis_customizados" ON public.perfis_customizados;
    CREATE POLICY "Public access perfis_customizados" ON public.perfis_customizados FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access auditoria" ON public.auditoria;
    CREATE POLICY "Public access auditoria" ON public.auditoria FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access configuracoes" ON public.configuracoes;
    CREATE POLICY "Public access configuracoes" ON public.configuracoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access delivery_logs" ON public.delivery_logs;
    CREATE POLICY "Public access delivery_logs" ON public.delivery_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
END $$;
-- 14. TABELA DE FATURAS (INVOICES)
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL UNIQUE,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    vendedor TEXT,
    data_emissao TIMESTAMPTZ DEFAULT now() NOT NULL,
    data_vencimento TIMESTAMPTZ NOT NULL,
    valor_total NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    valor_pago NUMERIC(15, 2) DEFAULT 0.00 DEFAULT 0.00,
    status STATUS_FATURA NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA', 'PARCIAL')),
    condicao_pagamento TEXT,
    observacoes TEXT,
    metodo_pagamento TEXT,
    referencia_externa TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 15. TABELA DE PARCELAS DE FATURA (INSTALLMENTS)
CREATE TABLE IF NOT EXISTS public.fatura_parcelas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fatura_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero_parcela INT NOT NULL,
    valor_parcela NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    data_vencimento TIMESTAMPTZ NOT NULL,
    data_pagamento TIMESTAMPTZ,
    status_status PARCELA_STATUS NOT NULL DEFAULT 'PENDENTE' CHECK (status_status IN ('PENDENTE', 'PAGA', 'VENCIDA', 'DESCONTADA', 'IMPAGA')),
    juros NUMERIC(15, 2) DEFAULT 0.00,
    multa NUMERIC(15, 2) DEFAULT 0.00,
    desconto NUMERIC(15, 2) DEFAULT 0.00,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tipos enumerados
STATUS_FATURA: 'ABERTA' | 'PAGA' | 'VENCIDA' | 'CANCELADA' | 'PARCIAL';
PARCELA_STATUS: 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'DESCONTADA' | 'IMPAGA';

`;
