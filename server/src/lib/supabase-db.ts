import { supabase } from "./supabase.js";

export const supabaseDb = {
  supabase,

  async getCustomers() {
    try {
      const { data, error } = await supabase.from("clientes").select("*").order("razao_social");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        razaoSocial: row.razao_social || "",
        cnpj: row.cnpj || "",
        email: row.email || "",
        telefone: row.telefone || "",
        cidade: row.cidade || "",
        uf: row.uf || "",
        endereco: row.endereco || "",
        condicaoPagamento: row.condicao_pagamento || "30 dias",
        totalCompras: Number(row.total_compras || 0),
        ultimaCompra: row.ultima_compra || "",
        ativo: row.ativo !== false,
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar clientes:", err);
      return [];
    }
  },

  async getProducts() {
    try {
      const { data, error } = await supabase.from("produtos").select("*").order("nome");
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        codigo: row.codigo || "",
        nome: row.nome || "",
        categoria: row.categoria || "Geral",
        preco: Number(row.preco || 0),
        custo: Number(row.custo || 0),
        estoque: Number(row.estoque || 0),
        estoqueMinimo: Number(row.estoque_minimo || 0),
        unidade: row.unidade || "UN",
        sugestoes: Array.isArray(row.sugestoes) ? row.sugestoes : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
        mediaVendaMensal: Number(row.media_venda_mensal || 0),
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar produtos:", err);
      return [];
    }
  },

  async getOrders() {
    try {
      const { data, error } = await supabase.from("pedidos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        numero: row.numero || "",
        cliente: row.cliente || "",
        vendedor: row.vendedor || "",
        data: row.data || "",
        valor: Number(row.valor || 0),
        status: row.status || "Pendente",
        condicaoPagamento: row.condicao_pagamento || "30 dias",
        observacoes: row.observacoes || "",
        itens: Array.isArray(row.itens) ? row.itens : [],
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar pedidos:", err);
      return [];
    }
  },

  async getQuotes() {
    try {
      const { data, error } = await supabase.from("orcamentos").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        numero: row.numero || "",
        cliente: row.cliente || "",
        vendedor: row.vendedor || "",
        data: row.data || "",
        validade: row.validade || "",
        valor: Number(row.valor || 0),
        status: row.status || "Rascunho",
        condicaoPagamento: row.condicao_pagamento || "30 dias",
        observacoes: row.observacoes || "",
        itens: Array.isArray(row.itens) ? row.itens : [],
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar orçamentos:", err);
      return [];
    }
  },

  async getOpportunities() {
    try {
      const { data, error } = await supabase.from("oportunidades_crm").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        titulo: row.titulo || "",
        cliente: row.cliente || "",
        contato: row.contato || "",
        telefone: row.telefone || "",
        email: row.email || "",
        canal: row.canal || "protheus",
        estagio: row.estagio || "lead",
        valor: Number(row.valor || 0),
        probabilidade: Number(row.probabilidade || 50),
        vendedor: row.vendedor || "",
        dataCriacao: row.data_criacao || "",
        previsaoFechamento: row.previsao_fechamento || "",
        proximoPasso: row.proximo_passo || "",
        origemDescricao: row.origem_descricao || "",
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar oportunidades:", err);
      return [];
    }
  },

  async getBatches() {
    try {
      const { data, error } = await supabase.from("producao_lotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        organization_id: row.organization_id,
        numeroLote: row.numero_lote || "",
        produtoId: row.produto_id || "",
        produtoNome: row.produto_nome || "",
        quantidade: Number(row.quantidade || 0),
        status: row.status || "Planejado",
        dataInicio: row.data_inicio || "",
        previsaoTermino: row.previsao_termino || "",
        responsavel: row.responsavel || "",
      }));
    } catch (err) {
      console.warn("[Server Supabase] Erro ao carregar lotes de produção:", err);
      return [];
    }
  },
};
