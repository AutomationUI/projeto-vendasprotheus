// ─── Supabase Governance Schema ────────────────────────────────────────────
// Schema completo para Commercial Governance & Rules Studio
// Inclui: organizations, representatives, portfolios, product_access, rules,
// policies, calculations, documents, goals, campaigns, knowledge_base
// Com RLS policies para isolamento multi-tenant e por representante.

export const SUPABASE_GOVERNANCE_SCHEMA = `-- ==============================================================================
-- SCHEMA GOVERNANÇA COMERCIAL: COMMERCIAL GOVERNANCE & RULES STUDIO
-- Tabelas com organization_id (tenant) + representative_id (scope) + RLS
-- ==============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS (Tenants / Multi-tenancy)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    endereco JSONB DEFAULT '{}'::jsonb,
    configuracoes JSONB DEFAULT '{}'::jsonb,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ORGANIZATION MEMBERS (Usuários vinculados a organizações com role)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'representante', 'cliente', 'consultor', 'super_admin')),
    representative_id UUID REFERENCES public.representatives(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- 3. REPRESENTATIVES (Ambientes isolados por representante)
CREATE TABLE IF NOT EXISTS public.representatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    regiao TEXT,
    segmentos TEXT[] DEFAULT '{}'::TEXT[],
    meta_mensal NUMERIC(15,2) DEFAULT 0,
    comissao NUMERIC(5,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, codigo)
);

-- 4. REPRESENTATIVE PORTFOLIOS (Carteira híbrida: cliente/região/segmento/produto)
CREATE TABLE IF NOT EXISTS public.representative_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL REFERENCES public.representatives(id) ON DELETE CASCADE,
    criteria JSONB NOT NULL DEFAULT '[]'::JSONB,
    -- Exemplo criteria: [{"type":"cliente","clienteId":"uuid"},{"type":"regiao","regiao":"SP"},{"type":"segmento","segmento":"Ceramica"}]
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. REPRESENTATIVE PRODUCT ACCESS (Produtos liberados/restritos por representante)
CREATE TABLE IF NOT EXISTS public.representative_product_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL REFERENCES public.representatives(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    liberado BOOLEAN DEFAULT true,
    preco_tabela NUMERIC(15,2),
    desconto_maximo NUMERIC(5,2),
    margem_minima NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, representative_id, produto_id)
);

-- 6. COMMERCIAL RULES (Regras estruturadas com versionamento)
CREATE TABLE IF NOT EXISTS public.commercial_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    expression JSONB NOT NULL DEFAULT '{"combinator":"and","conditions":[]}'::JSONB,
    actions JSONB NOT NULL DEFAULT '[]'::JSONB,
    priority INT DEFAULT 10,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','ativa','substituida','arquivada')),
    version INT DEFAULT 1,
    superseded_by UUID REFERENCES public.commercial_rules(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- 7. COMMISSION POLICIES (Políticas de comissão com regras vinculadas)
CREATE TABLE IF NOT EXISTS public.commission_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    comissao_base NUMERIC(5,2) NOT NULL DEFAULT 0,
    release_policy TEXT NOT NULL DEFAULT 'faturamento' CHECK (release_policy IN ('pedido','faturamento','recebimento')),
    rule_ids UUID[] DEFAULT '{}'::UUID[],
    version INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','ativa','substituida','arquivada')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- 8. COMMISSION CALCULATIONS (Cálculos determinísticos auditáveis)
CREATE TABLE IF NOT EXISTS public.commission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID NOT NULL REFERENCES public.representatives(id) ON DELETE CASCADE,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
    fatura_id UUID REFERENCES public.faturas(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
    valor_base NUMERIC(15,2) NOT NULL,
    margem NUMERIC(5,2),
    meta_atingimento NUMERIC(5,2),
    -- Auditoria determinística
    policy_id UUID NOT NULL REFERENCES public.commission_policies(id) ON DELETE RESTRICT,
    policy_version INT NOT NULL,
    applied_rule_ids UUID[] DEFAULT '{}'::UUID[],
    applied_rule_versions JSONB DEFAULT '{}'::JSONB,
    trace JSONB DEFAULT '[]'::JSONB,
    comissao_base_percentual NUMERIC(5,2) NOT NULL,
    bonus_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    comissao_final_percentual NUMERIC(5,2) NOT NULL,
    comissao_valor NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','prevista','em_validacao','aprovada','liberada','a_pagar','paga')),
    events JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. COMMISSION EVENTS (Histórico de mudanças de status)
CREATE TABLE IF NOT EXISTS public.commission_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calculation_id UUID NOT NULL REFERENCES public.commission_calculations(id) ON DELETE CASCADE,
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    observacao TEXT,
    data_hora TIMESTAMPTZ DEFAULT now()
);

-- 10. GOVERNANCE DOCUMENTS (Documentos com controle de acesso)
CREATE TABLE IF NOT EXISTS public.governance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'organizacao' CHECK (scope IN ('global','organizacao','representante','produto','campanha','regra','privado')),
    scope_ref_id UUID,
    access_policy TEXT NOT NULL DEFAULT 'publico' CHECK (access_policy IN ('publico','restrito','privado')),
    classification TEXT NOT NULL DEFAULT 'interno' CHECK (classification IN ('publico','interno','confidencial')),
    version INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicado','expirado','arquivado')),
    mime_type TEXT DEFAULT 'application/pdf',
    content_ref TEXT,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    connected_flow_ids UUID[] DEFAULT '{}'::UUID[],
    category_label TEXT,
    clauses_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. GOALS (Metas por representante ou globais)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    representative_id UUID REFERENCES public.representatives(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('valor_venda','volume','novos_clientes','margem_media')),
    objetivo NUMERIC(15,2) NOT NULL,
    atingido NUMERIC(15,2) DEFAULT 0,
    periodo_inicio DATE NOT NULL,
    periodo_fim DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. COMMERCIAL CAMPAIGNS (Campanhas comerciais)
CREATE TABLE IF NOT EXISTS public.commercial_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    descricao TEXT,
    produto_ids UUID[] DEFAULT '{}'::UUID[],
    rule_ids UUID[] DEFAULT '{}'::UUID[],
    ativo BOOLEAN DEFAULT true,
    inicio DATE NOT NULL,
    fim DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. KNOWLEDGE BASE (Base de conhecimento para IA)
CREATE TABLE IF NOT EXISTS public.knowledge_base_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'document' CHECK (type IN ('document','faq','policy','manual','template')),
    scope TEXT NOT NULL DEFAULT 'organizacao' CHECK (scope IN ('global','organizacao','representante','produto','campanha','regra','privado')),
    scope_ref_id UUID,
    access_policy TEXT NOT NULL DEFAULT 'publico' CHECK (access_policy IN ('publico','restrito','privado')),
    tags TEXT[] DEFAULT '{}'::TEXT[],
    embedding_version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. DECISION FLOWS (Fluxos visuais de decisão - Flow Studio)
CREATE TABLE IF NOT EXISTS public.decision_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]'::JSONB,
    edges JSONB NOT NULL DEFAULT '[]'::JSONB,
    version INT DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','ativa','substituida','arquivada')),
    superseded_by UUID REFERENCES public.decision_flows(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- 15. AUDIT LOG GOVERNANCE (Auditoria específica de governança)
CREATE TABLE IF NOT EXISTS public.governance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'representative', 'rule', 'policy', 'calculation', 'document', 'portfolio', 'product_access', 'goal', 'campaign', 'flow'
    entity_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change', 'version', 'calculate'
    before_data JSONB,
    after_data JSONB,
    context JSONB DEFAULT '{}'::JSONB,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_organizations_cnpj ON public.organizations(cnpj);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_representatives_org ON public.representatives(organization_id);
CREATE INDEX IF NOT EXISTS idx_representatives_user ON public.representatives(user_id);
CREATE INDEX IF NOT EXISTS idx_representative_portfolios_rep ON public.representative_portfolios(representative_id);
CREATE INDEX IF NOT EXISTS idx_representative_product_access_rep ON public.representative_product_access(representative_id);
CREATE INDEX IF NOT EXISTS idx_representative_product_access_prod ON public.representative_product_access(produto_id);
CREATE INDEX IF NOT EXISTS idx_commercial_rules_org ON public.commercial_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_commercial_rules_status ON public.commercial_rules(status);
CREATE INDEX IF NOT EXISTS idx_commission_policies_org ON public.commission_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_org ON public.commission_calculations(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_rep ON public.commission_calculations(representative_id);
CREATE INDEX IF NOT EXISTS idx_commission_calculations_status ON public.commission_calculations(status);
CREATE INDEX IF NOT EXISTS idx_governance_documents_org ON public.governance_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_governance_documents_scope ON public.governance_documents(scope, scope_ref_id);
CREATE INDEX IF NOT EXISTS idx_goals_org ON public.goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_rep ON public.goals(representative_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_org ON public.commercial_campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org ON public.knowledge_base_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_flows_org ON public.decision_flows(organization_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_org ON public.governance_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_governance_audit_entity ON public.governance_audit_log(entity_type, entity_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - ISOLAMENTO MULTI-TENANT
-- ==============================================================================

-- Função auxiliar para obter organization_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS SETOF uuid AS $$
    SELECT organization_id
    FROM public.organization_members
    WHERE user_id = auth.uid()
    AND ativo = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Função auxiliar para obter representative_id do usuário autenticado
CREATE OR REPLACE FUNCTION public.get_user_representative_ids()
RETURNS SETOF uuid AS $$
    SELECT r.id
    FROM public.representatives r
    JOIN public.organization_members om ON om.organization_id = r.organization_id
    WHERE om.user_id = auth.uid()
    AND om.ativo = true
    AND r.ativo = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Função para verificar se usuário é admin/super_admin da organização
CREATE OR REPLACE FUNCTION public.user_has_org_role(target_org_id UUID, required_roles TEXT[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE user_id = auth.uid()
        AND organization_id = target_org_id
        AND ativo = true
        AND role = ANY(required_roles)
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ==============================================================================
-- RLS POLICIES - ORGANIZATIONS
-- ==============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_select_own" ON public.organizations;
CREATE POLICY "org_select_own" ON public.organizations
    FOR SELECT TO authenticated
    USING (id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "org_admin_manage" ON public.organizations;
CREATE POLICY "org_admin_manage" ON public.organizations
    FOR ALL TO authenticated
    USING (public.user_has_org_role(id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - ORGANIZATION MEMBERS
-- ==============================================================================
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "om_select_own" ON public.organization_members;
CREATE POLICY "om_select_own" ON public.organization_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "om_admin_manage" ON public.organization_members;
CREATE POLICY "om_admin_manage" ON public.organization_members
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - REPRESENTATIVES
-- ==============================================================================
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rep_select_org" ON public.representatives;
CREATE POLICY "rep_select_org" ON public.representatives
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "rep_own_select" ON public.representatives;
CREATE POLICY "rep_own_select" ON public.representatives
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rep_admin_manage" ON public.representatives;
CREATE POLICY "rep_admin_manage" ON public.representatives
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - REPRESENTATIVE PORTFOLIOS
-- ==============================================================================
ALTER TABLE public.representative_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_select_org" ON public.representative_portfolios;
CREATE POLICY "portfolio_select_org" ON public.representative_portfolios
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "portfolio_own_select" ON public.representative_portfolios;
CREATE POLICY "portfolio_own_select" ON public.representative_portfolios
    FOR SELECT TO authenticated
    USING (representative_id IN (SELECT public.get_user_representative_ids()));

DROP POLICY IF EXISTS "portfolio_admin_manage" ON public.representative_portfolios;
CREATE POLICY "portfolio_admin_manage" ON public.representative_portfolios
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - REPRESENTATIVE PRODUCT ACCESS
-- ==============================================================================
ALTER TABLE public.representative_product_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_access_select_org" ON public.representative_product_access;
CREATE POLICY "product_access_select_org" ON public.representative_product_access
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "product_access_own_select" ON public.representative_product_access;
CREATE POLICY "product_access_own_select" ON public.representative_product_access
    FOR SELECT TO authenticated
    USING (representative_id IN (SELECT public.get_user_representative_ids()));

DROP POLICY IF EXISTS "product_access_admin_manage" ON public.representative_product_access;
CREATE POLICY "product_access_admin_manage" ON public.representative_product_access
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - COMMERCIAL RULES
-- ==============================================================================
ALTER TABLE public.commercial_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rule_select_org" ON public.commercial_rules;
CREATE POLICY "rule_select_org" ON public.commercial_rules
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "rule_admin_manage" ON public.commercial_rules;
CREATE POLICY "rule_admin_manage" ON public.commercial_rules
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - COMMISSION POLICIES
-- ==============================================================================
ALTER TABLE public.commission_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_select_org" ON public.commission_policies;
CREATE POLICY "policy_select_org" ON public.commission_policies
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "policy_admin_manage" ON public.commission_policies;
CREATE POLICY "policy_admin_manage" ON public.commission_policies
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - COMMISSION CALCULATIONS
-- ==============================================================================
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calc_select_org" ON public.commission_calculations;
CREATE POLICY "calc_select_org" ON public.commission_calculations
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "calc_own_select" ON public.commission_calculations;
CREATE POLICY "calc_own_select" ON public.commission_calculations
    FOR SELECT TO authenticated
    USING (representative_id IN (SELECT public.get_user_representative_ids()));

DROP POLICY IF EXISTS "calc_admin_manage" ON public.commission_calculations;
CREATE POLICY "calc_admin_manage" ON public.commission_calculations
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - COMMISSION EVENTS
-- ==============================================================================
ALTER TABLE public.commission_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_select_org" ON public.commission_events;
CREATE POLICY "event_select_org" ON public.commission_events
    FOR SELECT TO authenticated
    USING (calculation_id IN (
        SELECT id FROM public.commission_calculations
        WHERE organization_id IN (SELECT public.get_user_organization_ids())
    ));

-- ==============================================================================
-- RLS POLICIES - GOVERNANCE DOCUMENTS
-- ==============================================================================
ALTER TABLE public.governance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_select_org" ON public.governance_documents;
CREATE POLICY "doc_select_org" ON public.governance_documents
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Documentos privados: apenas proprietário
DROP POLICY IF EXISTS "doc_private_own" ON public.governance_documents;
CREATE POLICY "doc_private_own" ON public.governance_documents
    FOR SELECT TO authenticated
    USING (access_policy = 'privado' AND owner_id = auth.uid());

-- Documentos por representante: apenas do próprio representante ou admin
DROP POLICY IF EXISTS "doc_rep_scope" ON public.governance_documents;
CREATE POLICY "doc_rep_scope" ON public.governance_documents
    FOR SELECT TO authenticated
    USING (
        scope = 'representante' AND scope_ref_id IN (SELECT public.get_user_representative_ids())
        OR scope IN ('organizacao','global') AND organization_id IN (SELECT public.get_user_organization_ids())
    );

DROP POLICY IF EXISTS "doc_admin_manage" ON public.governance_documents;
CREATE POLICY "doc_admin_manage" ON public.governance_documents
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - GOALS
-- ==============================================================================
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goal_select_org" ON public.goals;
CREATE POLICY "goal_select_org" ON public.goals
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "goal_own_select" ON public.goals;
CREATE POLICY "goal_own_select" ON public.goals
    FOR SELECT TO authenticated
    USING (representative_id IN (SELECT public.get_user_representative_ids()) OR representative_id IS NULL);

DROP POLICY IF EXISTS "goal_admin_manage" ON public.goals;
CREATE POLICY "goal_admin_manage" ON public.goals
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - COMMERCIAL CAMPAIGNS
-- ==============================================================================
ALTER TABLE public.commercial_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_select_org" ON public.commercial_campaigns;
CREATE POLICY "campaign_select_org" ON public.commercial_campaigns
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "campaign_admin_manage" ON public.commercial_campaigns;
CREATE POLICY "campaign_admin_manage" ON public.commercial_campaigns
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - KNOWLEDGE BASE
-- ==============================================================================
ALTER TABLE public.knowledge_base_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_select_org" ON public.knowledge_base_items;
CREATE POLICY "kb_select_org" ON public.knowledge_base_items
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

-- Itens privados: apenas proprietário
DROP POLICY IF EXISTS "kb_private_own" ON public.knowledge_base_items;
CREATE POLICY "kb_private_own" ON public.knowledge_base_items
    FOR SELECT TO authenticated
    USING (access_policy = 'privado' AND owner_id = auth.uid());

-- Itens por representante
DROP POLICY IF EXISTS "kb_rep_scope" ON public.knowledge_base_items;
CREATE POLICY "kb_rep_scope" ON public.knowledge_base_items
    FOR SELECT TO authenticated
    USING (
        scope = 'representante' AND scope_ref_id IN (SELECT public.get_user_representative_ids())
        OR scope IN ('organizacao','global') AND organization_id IN (SELECT public.get_user_organization_ids())
    );

DROP POLICY IF EXISTS "kb_admin_manage" ON public.knowledge_base_items;
CREATE POLICY "kb_admin_manage" ON public.knowledge_base_items
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - DECISION FLOWS
-- ==============================================================================
ALTER TABLE public.decision_flows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "flow_select_org" ON public.decision_flows;
CREATE POLICY "flow_select_org" ON public.decision_flows
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "flow_admin_manage" ON public.decision_flows;
CREATE POLICY "flow_admin_manage" ON public.decision_flows
    FOR ALL TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin']));

-- ==============================================================================
-- RLS POLICIES - GOVERNANCE AUDIT LOG
-- ==============================================================================
ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_org" ON public.governance_audit_log;
CREATE POLICY "audit_select_org" ON public.governance_audit_log
    FOR SELECT TO authenticated
    USING (organization_id IN (SELECT public.get_user_organization_ids()));

DROP POLICY IF EXISTS "audit_admin_insert" ON public.governance_audit_log;
CREATE POLICY "audit_admin_insert" ON public.governance_audit_log
    FOR INSERT TO authenticated
    USING (public.user_has_org_role(organization_id, ARRAY['admin','super_admin','representante']));

-- ==============================================================================
-- TRIGGERS PARA UPDATED_AT AUTOMÁTICO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'organizations','organization_members','representatives',
            'representative_portfolios','representative_product_access',
            'commercial_rules','commission_policies','commission_calculations',
            'governance_documents','goals','commercial_campaigns',
            'knowledge_base_items','decision_flows','governance_audit_log'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON public.%s
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END $$;
`;