-- ==============================================================================
-- SCHEMA SUPABASE: VENDAS PROTHEUS & CRM MULTIPLATAFORMA
-- Projeto: https://dhzfotrxrhyzfxufgakc.supabase.co
-- Data de Criação: 2026-09-04 (migração multitenant)
-- ==============================================================================

-- 1. EXTENSÕES ÚTEIS
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

-- 3. TABELA DE PERFIS & ASSOCIAÇÃO DE TENANT (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'representante', 'cliente', 'consultor')),
    ativo BOOLEAN DEFAULT true NOT NULL,
    telefone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'representante', 'cliente', 'consultor')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, profile_id)
);

-- 4. TABELA DE CLIENTES (CUSTOMERS) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.clientes (
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
    total_compras NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    ultima_compra TIMESTAMPTZ,
    erp_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, cnpj)
);

-- Índices otimizados: organization_id PRIMEIRA coluna em índice composto
CREATE INDEX IF NOT EXISTS idx_clientes_org_status ON public.clientes (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_clientes_org_cnpj ON public.clientes (organization_id, cnpj);

-- 3. TABELA DE PRODUTOS (PRODUCTS) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL UNIQUE,
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
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, codigo)
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_produtos_org_codigo ON public.produtos (organization_id, codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_org_categoria ON public.produtos (organization_id, categoria);

-- 3.1. TABELA DE SESSÕES DE UPLOAD TEMPORÁRIO DE IMAGENS (STAGE 1)
CREATE TABLE IF NOT EXISTS public.product_upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_upload_sessions_org_status ON public.product_upload_sessions (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_org_expires ON public.product_upload_sessions (organization_id, expires_at);

-- 3.2. TABELA DE METADADOS DE IMAGENS TEMPORÁRIAS (STAGE 1)
CREATE TABLE IF NOT EXISTS public.product_temp_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    upload_session_id UUID NOT NULL REFERENCES public.product_upload_sessions(id) ON DELETE CASCADE,
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

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_temp_images_org_session ON public.product_temp_images (organization_id, upload_session_id);
CREATE INDEX IF NOT EXISTS idx_temp_images_org_user ON public.product_temp_images (organization_id, user_id);

-- 3.3. TABELA DE IMAGENS DEFINITIVAS DE PRODUTOS (STAGE 2)
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

-- 4. TABELA DE PEDIDOS DE VENDA (ORDERS) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    numero TEXT NOT NULL UNIQUE,
    cliente TEXT NOT NULL,
    vendedor TEXT,
    data TEXT,
    valor NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pendente',
    condicao_pagamento TEXT,
    observacoes TEXT,
    itens JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, numero)
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_pedidos_org_numero ON public.pedidos (organization_id, numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_org_status ON public.pedidos (organization_id, status);

-- 5. TABELA DE ORÇAMENTOS (QUOTES) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.orcamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, numero)
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_orcamentos_org_numero ON public.orcamentos (organization_id, numero);
CREATE INDEX IF NOT EXISTS idx_orcamentos_org_status ON public.orcamentos (organization_id, status);

-- 6. TABELA DE APROVAÇÕES (APPROVALS) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.aprovacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_aprovacoes_org_status ON public.aprovacoes (organization_id, status);

-- 7. TABELA DE CRM & OPORTUNIDADES (CRM OPPORTUNITIES) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.oportunidades_crm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    contato TEXT,
    telefone TEXT,
    email TEXT,
    canal TEXT CHECK (canal IN ('whatsapp', 'email', 'telefone', 'portal', 'protheus')) NOT NULL,
    estagio TEXT CHECK (estagio IN ('lead', 'contato', 'proposta', 'negociacao', 'ganho', 'perdido')) DEFAULT 'lead' NOT NULL,
    valor NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    probabilidade INT DEFAULT 50 NOT NULL,
    responsavel_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    data_criacao TIMESTAMPTZ DEFAULT now() NOT NULL,
    previsao_fechamento DATE,
    proximo_passo TEXT,
    origem_descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_oportunidades_org_estagio ON public.oportunidades_crm (organization_id, estagio);
CREATE INDEX IF NOT EXISTS idx_oportunidades_org_cliente ON public.oportunidades_crm (organization_id, cliente_id);

-- 8. TABELA DE PRODUÇÃO E LOTES (MANUFACTURING BATCHES) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.producao_lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices otimizados: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_producao_lote_org_status ON public.producao_lotes (organization_id, status);

-- 9. TABELA DE USUÁRIOS E REPRESENTANTES COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
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

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_usuarios_org_email ON public.usuarios (organization_id, email);

-- 10. TABELA DE PERFIS CUSTOMIZADOS COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.perfis_customizados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    cor VARCHAR(50) DEFAULT 'blue',
    icone VARCHAR(50) DEFAULT 'shield',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_perfis_org_nome ON public.perfis_customizados (organization_id, nome);

-- 11. TABELA DE AUDITORIA E LOGS (AUDIT TRAIL) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    usuario TEXT NOT NULL,
    evento TEXT NOT NULL,
    descricao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    ip TEXT,
    data_hora TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_auditoria_org_data ON public.auditoria (organization_id, data_hora DESC);

-- 12. TABELA DE CONFIGURAÇÕES GERAIS DO SISTEMA COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_configuracoes_org ON public.configuracoes (organization_id);

-- 13. TABELA DE LOGS DE MENSAGERIA / DISPARO (DELIVERY LOGS) COM organization_id OBRIGATÓRIO
CREATE TABLE IF NOT EXISTS public.delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    destinatario TEXT NOT NULL,
    documento TEXT NOT NULL,
    status VARCHAR(50) NOT NULL,
    erro TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_delivery_logs_org_status ON public.delivery_logs (organization_id, status);

-- ==============================================================================
-- CRIAÇÃO DE ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_razao ON public.clientes(razao_social);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON public.produtos(codigo);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON public.product_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON public.product_upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON public.product_upload_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_temp_images_session ON public.product_temp_images(upload_session_id);
CREATE INDEX IF NOT EXISTS idx_temp_images_user ON public.product_temp_images(user_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_order ON public.product_images(product_id, sort_order);
-- Garantir no banco que um produto possua no máximo uma imagem com is_primary = true
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_images_single_primary ON public.product_images(product_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON public.pedidos(numero);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON public.pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON public.pedidos(cliente);
CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON public.orcamentos(numero);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estagio ON public.oportunidades_crm(estagio);
CREATE INDEX IF NOT EXISTS idx_oportunidades_canal ON public.oportunidades_crm(canal);
CREATE INDEX IF NOT EXISTS idx_producao_lote ON public.producao_lotes(lote);
CREATE INDEX IF NOT EXISTS idx_producao_status ON public.producao_lotes(status);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_auditoria_data ON public.auditoria(data_hora DESC);

-- ==============================================================================
-- POLÍTICAS DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- Permitir leitura e escrita para anon e authenticated no portal
-- ==============================================================================

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
ALTER TABLE public.product_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_temp_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Clientes
    DROP POLICY IF EXISTS "Public access clientes" ON public.clientes;
    CREATE POLICY "Public access clientes" ON public.clientes FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Produtos
    DROP POLICY IF EXISTS "Public access produtos" ON public.produtos;
    CREATE POLICY "Public access produtos" ON public.produtos FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Product Upload Sessions
    DROP POLICY IF EXISTS "Public access product_upload_sessions" ON public.product_upload_sessions;
    CREATE POLICY "Product upload sessions tenant isolation" ON public.product_upload_sessions FOR ALL TO authenticated USING (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    ) WITH CHECK (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    );

    -- Product Temp Images
    DROP POLICY IF EXISTS "Public access product_temp_images" ON public.product_temp_images;
    CREATE POLICY "Product temp images tenant isolation" ON public.product_temp_images FOR ALL TO authenticated USING (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    ) WITH CHECK (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    );

    -- Product Images (Definitivas)
    DROP POLICY IF EXISTS "Public access product_images" ON public.product_images;
    CREATE POLICY "Product images tenant isolation" ON public.product_images FOR ALL TO authenticated USING (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    ) WITH CHECK (
      organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid())
    );

    -- Pedidos
    DROP POLICY IF EXISTS "Public access pedidos" ON public.pedidos;
    CREATE POLICY "Public access pedidos" ON public.pedidos FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Orçamentos
    DROP POLICY IF EXISTS "Public access orcamentos" ON public.orcamentos;
    CREATE POLICY "Public access orcamentos" ON public.orcamentos FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Aprovações
    DROP POLICY IF EXISTS "Public access aprovacoes" ON public.aprovacoes;
    CREATE POLICY "Public access aprovacoes" ON public.aprovacoes FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- CRM Oportunidades
    DROP POLICY IF EXISTS "Public access oportunidades_crm" ON public.oportunidades_crm;
    CREATE POLICY "Public access oportunidades_crm" ON public.oportunidades_crm FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Produção Lotes
    DROP POLICY IF EXISTS "Public access producao_lotes" ON public.producao_lotes;
    CREATE POLICY "Public access producao_lotes" ON public.producao_lotes FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Usuários
    DROP POLICY IF EXISTS "Public access usuarios" ON public.usuarios;
    CREATE POLICY "Public access usuarios" ON public.usuarios FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Perfis
    DROP POLICY IF EXISTS "Public access perfis_customizados" ON public.perfis_customizados;
    CREATE POLICY "Public access perfis_customizados" ON public.perfis_customizados FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Auditoria
    DROP POLICY IF EXISTS "Public access auditoria" ON public.auditoria;
    CREATE POLICY "Public access auditoria" ON public.auditoria FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Configurações
    DROP POLICY IF EXISTS "Public access configuracoes" ON public.configuracoes;
    CREATE POLICY "Public access configuracoes" ON public.configuracoes FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );

    -- Delivery Logs
    DROP POLICY IF EXISTS "Public access delivery_logs" ON public.delivery_logs;
    CREATE POLICY "Public access delivery_logs" ON public.delivery_logs FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) );
-- 14. TABELA DE FATURAS (INVOICES) COM organization_id OBRIGATÓRIO
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

-- Índice otimizado: organization_id PRIMEIRA coluna
CREATE INDEX IF NOT EXISTS idx_faturas_org_status ON public.faturas (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_faturas_org_cliente ON public.faturas (organization_id, cliente_id);
CREATE INDEX IF NOT EXISTS idx_faturas_numero ON public.faturas(numero);

-- 15. TABELA DE PARCELAS DE FATURA (INSTALLMENTS) COM organization_id OBRIGATÓRIO
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

-- Índices otimizados: organization_id PRIMEIRA coluna + fatura_id
CREATE INDEX IF NOT EXISTS idx_fatura_parcelas_org_fat ON public.fatura_parcelas (organization_id, fatura_id);
CREATE INDEX IF NOT EXISTS idx_fatura_parcelas_num_parcela ON public.fatura_parcelas (numero_parcela);
CREATE INDEX IF NOT EXISTS idx_fatura_parcelas_status ON public.fatura_parcelas (status_status);

-- Tipo enumerado para status da fatura
DO $$
BEGIN
    CREATE TYPE STATUS_FATURA AS ENUM ('ABERTA', 'PAGA', 'VENCIDA', 'CANCELADA', 'PARCIAL');
END $$;

-- Tipo enumerado para status da parcela
DO $$
BEGIN
    CREATE TYPE PARCELA_STATUS AS ENUM ('PENDENTE', 'PAGA', 'VENCIDA', 'DESCONTADA', 'IMPAGA');
END $$;

-- ==============================================================================
-- CARGA INICIAL DE DADOS (SEEDS)
-- ==============================================================================

-- Clientes Iniciais
INSERT INTO public.clientes (id, razao_social, cnpj, email, telefone, cidade, uf, endereco, condicao_pagamento, total_compras, ultima_compra)
VALUES 
('1', 'Tech Solutions Ltda', '12.345.678/0001-90', 'contato@techsolutions.com.br', '(11) 3456-7890', 'São Paulo', 'SP', 'Rua da Tecnologia, 100', '30/60/90', 285000, '2026-02-25'),
('2', 'Inovação Digital SA', '23.456.789/0001-01', 'compras@inovacaodigital.com.br', '(21) 2345-6789', 'Rio de Janeiro', 'RJ', 'Av. Digital, 500', 'À vista', 420000, '2026-02-24'),
('3', 'Comércio Global ME', '34.567.890/0001-12', 'vendas@comercioglobal.com.br', '(31) 3456-7890', 'Belo Horizonte', 'MG', 'Rua do Comércio, 250', '30 dias', 156000, '2026-02-23'),
('4', 'Startup Labs Ltda', '45.678.901/0001-23', 'admin@startuplabs.io', '(41) 2345-6789', 'Curitiba', 'PR', 'Rua Innovation, 75', '30/60', 89000, '2026-02-22'),
('5', 'DataCenter Brasil', '56.789.012/0001-34', 'procurement@datacenter.com.br', '(11) 4567-8901', 'Campinas', 'SP', 'Rod. dos Dados, 1000', '30/60/90/120', 720000, '2026-02-21'),
('6', 'Rede Varejo Express', '67.890.123/0001-45', 'compras@redevarejo.com.br', '(51) 3456-7890', 'Porto Alegre', 'RS', 'Av. Varejo, 800', '30 dias', 198000, '2026-02-20')
ON CONFLICT (id) DO NOTHING;

-- Produtos Iniciais
INSERT INTO public.produtos (id, codigo, nome, categoria, preco, custo, estoque, estoque_minimo, unidade, sugestoes, tags, media_venda_mensal)
VALUES 
('1', 'NB-015', 'Notebook Pro 15', 'Informática', 2800, 1800, 45, 10, 'UN', '["MW-001", "HD-EXT", "WC-HD"]'::jsonb, '["Mais Vendido"]'::jsonb, 120),
('2', 'MW-001', 'Mouse Wireless', 'Periféricos', 250, 80, 200, 50, 'UN', '["NB-015", "MN-274"]'::jsonb, '["Alta Margem"]'::jsonb, 350),
('3', 'SV-740', 'Servidor Dell R740', 'Eletrônicos', 15000, 9000, 8, 3, 'UN', '["SW-048", "ST-064", "UP-300"]'::jsonb, '["Premium"]'::jsonb, 5),
('4', 'SW-048', 'Switch 48 Portas', 'Eletrônicos', 3300, 2100, 15, 5, 'UN', '["SV-740", "UP-300"]'::jsonb, '[]'::jsonb, 25),
('5', 'MN-274', 'Monitor 27" 4K', 'Informática', 1750, 1100, 32, 10, 'UN', '["NB-015", "MW-001"]'::jsonb, '["Mais Vendido"]'::jsonb, 85),
('6', 'TC-MEC', 'Teclado Mecânico', 'Periféricos', 210, 65, 150, 30, 'UN', '["MW-001", "MN-274"]'::jsonb, '[]'::jsonb, 110),
('7', 'ST-064', 'Storage NAS 64TB', 'Eletrônicos', 42000, 28000, 4, 2, 'UN', '["SV-740", "UP-300"]'::jsonb, '["Premium"]'::jsonb, 2),
('8', 'UP-300', 'UPS 3000VA', 'Eletrônicos', 7600, 4500, 12, 5, 'UN', '["SV-740", "SW-048"]'::jsonb, '[]'::jsonb, 18),
('9', 'IL-001', 'Impressora Laser', 'Informática', 2050, 1300, 25, 8, 'UN', '["HD-EXT", "MW-001"]'::jsonb, '[]'::jsonb, 40),
('10', 'HD-EXT', 'HD Externo 2TB', 'Acessórios', 380, 190, 80, 20, 'UN', '["NB-015", "IL-001"]'::jsonb, '[]'::jsonb, 150),
('11', 'CB-USB', 'Cabo USB-C 2m', 'Acessórios', 45, 12, 500, 100, 'UN', '[]'::jsonb, '[]'::jsonb, 600),
('12', 'WC-HD', 'Webcam HD 1080p', 'Periféricos', 320, 140, 60, 15, 'UN', '["NB-015", "MN-274"]'::jsonb, '[]'::jsonb, 95)
ON CONFLICT (id) DO NOTHING;

-- Pedidos Iniciais
INSERT INTO public.pedidos (id, numero, cliente, vendedor, data, valor, status, condicao_pagamento, observacoes, itens)
VALUES 
('1', 'PV-2026-001', 'Tech Solutions Ltda', 'Carlos Silva', '2026-02-25', 15800.00, 'Pendente', '30/60/90', 'Pedido padrão', '[{"produto":"Notebook Pro 15","codigo":"NB-015","quantidade":5,"precoUnitario":2800,"desconto":5,"total":13300},{"produto":"Mouse Wireless","codigo":"MW-001","quantidade":10,"precoUnitario":250,"desconto":0,"total":2500}]'::jsonb),
('2', 'PV-2026-002', 'Inovação Digital SA', 'Maria Santos', '2026-02-24', 32400.00, 'Aprovado', 'À vista', '', '[{"produto":"Servidor Dell R740","codigo":"SV-740","quantidade":2,"precoUnitario":15000,"desconto":3,"total":29100},{"produto":"Switch 48 Portas","codigo":"SW-048","quantidade":1,"precoUnitario":3300,"desconto":0,"total":3300}]'::jsonb),
('3', 'PV-2026-003', 'Comércio Global ME', 'João Oliveira', '2026-02-23', 8750.00, 'Faturado', '30 dias', '', '[{"produto":"Monitor 27\" 4K","codigo":"MN-274","quantidade":5,"precoUnitario":1750,"desconto":0,"total":8750}]'::jsonb),
('4', 'PV-2026-004', 'Startup Labs Ltda', 'Ana Costa', '2026-02-22', 4200.00, 'Cancelado', '30/60', '', '[{"produto":"Teclado Mecânico","codigo":"TC-MEC","quantidade":20,"precoUnitario":210,"desconto":0,"total":4200}]'::jsonb),
('5', 'PV-2026-005', 'DataCenter Brasil', 'Carlos Silva', '2026-02-21', 95000.00, 'Aprovado', '30/60/90/120', '', '[{"produto":"Storage NAS 64TB","codigo":"ST-064","quantidade":2,"precoUnitario":42000,"desconto":5,"total":79800},{"produto":"UPS 3000VA","codigo":"UP-300","quantidade":2,"precoUnitario":7600,"desconto":0,"total":15200}]'::jsonb),
('6', 'PV-2026-006', 'Rede Varejo Express', 'Maria Santos', '2026-02-20', 12300.00, 'Faturado', '30 dias', '', '[{"produto":"Impressora Laser","codigo":"IL-001","quantidade":6,"precoUnitario":2050,"desconto":0,"total":12300}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Orçamentos Iniciais
INSERT INTO public.orcamentos (id, numero, cliente, vendedor, data, validade, valor, status, condicao_pagamento, observacoes, itens)
VALUES 
('1', 'ORC-2026-001', 'Tech Solutions Ltda', 'Carlos Silva', '2026-02-20', '2026-03-22', 28000.00, 'Enviado', '30/60/90', 'Cliente solicitou urgência na entrega.', '[{"produto":"Notebook Pro 15","codigo":"NB-015","quantidade":10,"precoUnitario":2800,"desconto":0,"total":28000}]'::jsonb),
('2', 'ORC-2026-002', 'Inovação Digital SA', 'Maria Santos', '2026-02-18', '2026-03-20', 48300.00, 'Aprovado', 'À vista', '', '[{"produto":"Servidor Dell R740","codigo":"SV-740","quantidade":3,"precoUnitario":15000,"desconto":2,"total":44100},{"produto":"Switch 48 Portas","codigo":"SW-048","quantidade":1,"precoUnitario":3300,"desconto":0,"total":3300},{"produto":"UPS 3000VA","codigo":"UP-300","quantidade":1,"precoUnitario":7600,"desconto":100,"total":900}]'::jsonb),
('3', 'ORC-2026-003', 'Comércio Global ME', 'João Oliveira', '2026-02-15', '2026-03-17', 12250.00, 'Rascunho', '30 dias', 'Aguardando confirmação do gerente.', '[{"produto":"Monitor 27\" 4K","codigo":"MN-274","quantidade":7,"precoUnitario":1750,"desconto":0,"total":12250}]'::jsonb),
('4', 'ORC-2026-004', 'Startup Labs Ltda', 'Ana Costa', '2026-02-10', '2026-03-12', 6400.00, 'Recusado', '30/60', 'Cliente optou por outro fornecedor.', '[{"produto":"Webcam HD 1080p","codigo":"WC-HD","quantidade":20,"precoUnitario":320,"desconto":0,"total":6400}]'::jsonb),
('5', 'ORC-2026-005', 'DataCenter Brasil', 'Carlos Silva', '2026-01-25', '2026-02-24', 84000.00, 'Expirado', '30/60/90/120', 'Prazo de validade expirado sem resposta.', '[{"produto":"Storage NAS 64TB","codigo":"ST-064","quantidade":2,"precoUnitario":42000,"desconto":0,"total":84000}]'::jsonb),
('6', 'ORC-2026-006', 'Rede Varejo Express', 'Maria Santos', '2026-02-22', '2026-03-24', 18450.00, 'Enviado', '30 dias', '', '[{"produto":"Impressora Laser","codigo":"IL-001","quantidade":6,"precoUnitario":2050,"desconto":0,"total":12300},{"produto":"Teclado Mecânico","codigo":"TC-MEC","quantidade":15,"precoUnitario":210,"desconto":0,"total":3150},{"produto":"Mouse Wireless","codigo":"MW-001","quantidade":12,"precoUnitario":250,"desconto":0,"total":3000}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Oportunidades CRM Iniciais
INSERT INTO public.oportunidades_crm (id, titulo, cliente, contato, telefone, email, canal, estagio, valor, probabilidade, vendedor, data_criacao, previsao_fechamento, proximo_passo, origem_descricao)
VALUES 
('opp-1', 'Renovação Servidores Rack + Switch 48P', 'DataCenter Brasil', 'Roberto Mendes', '(11) 98765-4321', 'roberto@datacenter.com.br', 'protheus', 'negociacao', 95000, 85, 'Carlos Silva', '2026-02-21', '2026-03-05', 'Aprovação de alçada de desconto no Protheus', 'TOTVS Protheus (Base Ativa)'),
('opp-2', 'Lote 15 Notebooks Pro 15 corporativos', 'Tech Solutions Ltda', 'Camila Duarte', '(11) 99123-4567', 'camila@techsolutions.com.br', 'whatsapp', 'proposta', 42000, 70, 'Maria Santos', '2026-02-23', '2026-03-08', 'Aguardando retorno do envio da proposta em PDF via WhatsApp', 'WhatsApp Business API'),
('opp-3', 'Lote Impressoras Laser e Leitores Código', 'Inovação Digital SA', 'Felipe Azevedo', '(21) 98111-2233', 'felipe@inovacaodigital.com.br', 'ecommerce', 'qualificacao', 28500, 55, 'João Oliveira', '2026-02-24', '2026-03-12', 'Apresentar condição de parcelamento B2B', 'Shopify B2B Marketplace'),
('opp-4', 'Upgrade de Storage NAS 64TB + NoBreaks', 'Startup Labs Ltda', 'Larissa Bueno', '(41) 98888-9900', 'larissa@startuplabs.io', 'web', 'lead', 18400, 40, 'Ana Costa', '2026-02-25', '2026-03-15', 'Agendar demonstração técnica online', 'Portal Comercial Web'),
('opp-5', 'Fornecimento Trimestral de Periféricos e Acessórios', 'Rede Varejo Express', 'Gustavo Rocha', '(51) 99777-6655', 'gustavo@redevarejo.com.br', 'whatsapp', 'ganho', 54000, 100, 'Carlos Silva', '2026-02-19', '2026-02-28', 'Pedido de venda faturado e entregue', 'WhatsApp Lead Inbound'),
('opp-6', 'Novo Parque de Monitores 27 4K para Design', 'Comércio Global ME', 'Marcos Paulo', '(31) 98444-5566', 'marcos@comercioglobal.com.br', 'indicacao', 'qualificacao', 24500, 60, 'João Oliveira', '2026-02-22', '2026-03-10', 'Enviar cotação com prazo especial de frete', 'Indicação de Parceiro')
ON CONFLICT (id) DO NOTHING;

-- Lotes de Produção Iniciais
INSERT INTO public.producao_lotes (id, lote, produto, tipo, granulacao, quantidade, unidade, status, inicio, previsao, operador, prioridade, observacoes)
VALUES
('1', 'LOT-2026-0101', 'Rebolo Reto 300x50x127', 'Rebolo', 'A46', 120, 'PÇ', 'Mistura', '2026-02-25', '2026-03-02', 'José Ferreira', 'Alta', 'Lote urgente'),
('2', 'LOT-2026-0102', 'Disco de Corte 12"', 'Disco de Corte', 'A30', 500, 'PÇ', 'Prensado', '2026-02-23', '2026-02-28', 'Marcos Lima', 'Alta', ''),
('3', 'LOT-2026-0103', 'Rebolo Copo 150x65x32', 'Rebolo', 'A60', 80, 'PÇ', 'Aguardando Queima', '2026-02-22', '2026-02-27', 'Carlos Souza', 'Média', ''),
('4', 'LOT-2026-0104', 'Disco de Desbaste 7"', 'Disco de Desbaste', 'A24', 1000, 'PÇ', 'Em Queima', '2026-02-21', '2026-02-26', 'Rafael Alves', 'Alta', ''),
('5', 'LOT-2026-0105', 'Rebolo Reto 200x25x76', 'Rebolo', 'A80', 200, 'PÇ', 'Queimado', '2026-02-20', '2026-02-25', 'José Ferreira', 'Média', ''),
('6', 'LOT-2026-0106', 'Disco Flap 4.5"', 'Disco Flap', 'A40', 2000, 'PÇ', 'Secagem', '2026-02-24', '2026-03-01', 'Marcos Lima', 'Baixa', ''),
('7', 'LOT-2026-0107', 'Rebolo Copo 100x50x20', 'Rebolo', 'A36', 150, 'PÇ', 'Moldagem', '2026-02-25', '2026-03-03', 'Carlos Souza', 'Média', ''),
('8', 'LOT-2026-0108', 'Disco de Corte 14"', 'Disco de Corte', 'A24', 300, 'PÇ', 'Inspeção', '2026-02-18', '2026-02-24', 'Rafael Alves', 'Alta', ''),
('9', 'LOT-2026-0109', 'Rebolo Reto 250x32x76', 'Rebolo', 'A100', 60, 'PÇ', 'Acabamento', '2026-02-19', '2026-02-25', 'José Ferreira', 'Baixa', ''),
('10', 'LOT-2026-0110', 'Disco de Desbaste 9"', 'Disco de Desbaste', 'A16', 800, 'PÇ', 'Expedição', '2026-02-17', '2026-02-23', 'Marcos Lima', 'Alta', '')
ON CONFLICT (id) DO NOTHING;

-- Usuários Iniciais
INSERT INTO public.usuarios (id, nome, email, role, ativo, telefone, criado_em, codigo, regiao, meta_mensal, comissao)
VALUES
('u1', 'Admin Sistema', 'admin@vendas.com', 'admin', true, '(11) 9999-0001', '2025-01-10', 'ADM-001', 'Geral', 0, 0),
('u2', 'Carlos Silva', 'carlos@vendas.com', 'representante', true, '(11) 9999-0002', '2025-03-15', 'REP-001', 'SP Capital', 150000, 5),
('u3', 'Maria Santos', 'maria@vendas.com', 'representante', true, '(21) 9999-0003', '2025-04-20', 'REP-002', 'RJ / ES', 120000, 5),
('u4', 'João Oliveira', 'joao@vendas.com', 'representante', true, '(31) 9999-0004', '2025-05-10', 'REP-003', 'MG / GO', 100000, 4.5),
('u5', 'Ana Costa', 'ana@vendas.com', 'representante', false, '(41) 9999-0005', '2025-06-01', 'REP-004', 'PR / SC', 80000, 4)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- GOVERNANÇA COMERCIAL (Commercial Governance & Rules Studio)
-- Isolamento por organization_id + representative_id (aplicado via RLS no backend).
-- ==============================================================================

-- Ambientes de representantes (escopo isolado)
CREATE TABLE IF NOT EXISTS public.representative_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL,
    codigo TEXT,
    regiao TEXT,
    segmentos JSONB DEFAULT '[]'::jsonb,
    ativo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, representative_id)
);

CREATE INDEX IF NOT EXISTS idx_rep_scopes_org ON public.representative_scopes (organization_id);

-- Carteiras (critérios híbridos: cliente / região / segmento / produto)
CREATE TABLE IF NOT EXISTS public.representative_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL,
    criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rep_portfolios_org ON public.representative_portfolios (organization_id, representative_id);

-- Acesso liberado/restringido a produtos por representante
CREATE TABLE IF NOT EXISTS public.representative_product_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    liberado BOOLEAN DEFAULT true NOT NULL,
    preco_tabela NUMERIC(15,2),
    desconto_maximo NUMERIC(5,2),
    margem_minima NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, representative_id, produto_id)
);

CREATE INDEX IF NOT EXISTS idx_rep_product_access_org ON public.representative_product_access (organization_id, representative_id);

-- Regras comerciais (expressões estruturadas) + versionamento
CREATE TABLE IF NOT EXISTS public.commercial_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    expression JSONB NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    priority INT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','ativa','substituida','arquivada')),
    version INT DEFAULT 1 NOT NULL,
    parent_id UUID,
    superseded_by UUID,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commercial_rules_org ON public.commercial_rules (organization_id, status);

-- Políticas de comissão (motor determinístico)
CREATE TABLE IF NOT EXISTS public.commission_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    comissao_base NUMERIC(5,2) NOT NULL DEFAULT 0,
    release_policy TEXT NOT NULL DEFAULT 'pedido' CHECK (release_policy IN ('pedido','faturamento','recebimento')),
    rule_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    version INT DEFAULT 1 NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','ativa','substituida','arquivada')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commission_policies_org ON public.commission_policies (organization_id);

-- Cálculos de comissão (auditável: vincula versão de regra/política + trace)
CREATE TABLE IF NOT EXISTS public.commission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL,
    pedido_id UUID,
    orcamento_id UUID,
    fatura_id UUID,
    cliente_id UUID,
    valor_base NUMERIC(15,2) NOT NULL DEFAULT 0,
    margem NUMERIC(5,2),
    meta_atingimento NUMERIC(5,2),
    policy_id UUID NOT NULL,
    policy_version INT NOT NULL,
    applied_rule_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    applied_rule_versions JSONB NOT NULL DEFAULT '{}'::jsonb,
    trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    comissao_base_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    bonus_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    comissao_final_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    comissao_valor NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'prevista' CHECK (status IN ('rascunho','prevista','em_validacao','aprovada','liberada','a_pagar','paga')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_commission_calc_org ON public.commission_calculations (organization_id, representative_id);

-- Eventos do ciclo de vida da comissão (auditoria)
CREATE TABLE IF NOT EXISTS public.commission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comissao_id UUID NOT NULL REFERENCES public.commission_calculations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    responsavel TEXT,
    observacao TEXT,
    data_hora TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Documentos de governança com escopo e política de acesso
CREATE TABLE IF NOT EXISTS public.governance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'organizacao' CHECK (scope IN ('global','organizacao','representante','produto','campanha','regra','privado')),
    scope_ref_id UUID,
    access_policy TEXT NOT NULL DEFAULT 'publico' CHECK (access_policy IN ('publico','restrito','privado')),
    classification TEXT NOT NULL DEFAULT 'interno' CHECK (classification IN ('publico','interno','confidencial')),
    version INT DEFAULT 1 NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','expirado','arquivado')),
    mime_type TEXT,
    content_ref TEXT,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Metas e Campanhas
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID,
    tipo TEXT NOT NULL DEFAULT 'valor_venda' CHECK (tipo IN ('valor_venda','volume','novos_clientes','margem_media')),
    objetivo NUMERIC(15,2) NOT NULL DEFAULT 0,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    atingido NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.commercial_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    descricao TEXT,
    produto_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    regras_vinculadas JSONB NOT NULL DEFAULT '[]'::jsonb,
    ativo BOOLEAN DEFAULT true NOT NULL,
    inicio TIMESTAMPTZ NOT NULL,
    fim TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ─── RLS para as tabelas de governança (isolamento por organização) ─────
ALTER TABLE public.representative_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representative_product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['representative_scopes','representative_portfolios','representative_product_access','commercial_rules','commission_policies','commission_calculations','commission_events','governance_documents','goals','commercial_campaigns']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'governance_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) ) WITH CHECK ( organization_id = (SELECT organization_id FROM public.organization_members WHERE profile_id = auth.uid()) )', 'governance_' || t, t);
  END LOOP;
END $$;
