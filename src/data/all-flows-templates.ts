import { Node, Edge } from "reactflow";
import { CRMNodeData, FlowTemplateMeta } from "@/types/crm-flow";
import { autoConnectFlow } from "@/lib/flow-document-connector";

// Lead Scoring Function for Premium Template
function calculateLeadScore(input: Record<string, any>): number {
  // Firmográfico (30%)
  const revenue = Number(input.faturamentoAnual) || 0;
  const firmografico = Math.min(100, (revenue / 200000000) * 100); // Max 200M = 100

  // Comportamental (25%)
  const pages = Number(input.pagesVisitadas) || 0;
  const timeOnSite = Number(input.tempoNoSite) || 0;
  const downloads = Number(input.downloadsWhitepaper) || 0;
  const comportamental = Math.min(100, (pages * 3) + (timeOnSite / 10) + (downloads * 15));

  // Intenção (25%)
  let intencao = 0;
  if (input.origemLead?.includes?.("Demo")) intencao += 40;
  if (input.budgetConfirmado) intencao += 30;
  if (input.prazoDecisao && Number(input.prazoDecisao.replace(/\D/g, "")) <= 60) intencao += 20;
  if (input.concorrenteAtual && input.concorrenteAtual !== "Nenhum") intencao += 10;

  // Fit Tecnológico (10%)
  let fitTech = 50; // base
  if (input.tecnologiaAtual?.includes?.("Salesforce") || input.tecnologiaAtual?.includes?.("HubSpot")) fitTech += 25;
  if (!input.tecnologiaAtual?.includes?.("Legacy")) fitTech += 25;

  // Timing/Orçamento (10%)
  let timing = 0;
  if (input.budgetConfirmado) timing += 50;
  const prazo = Number(input.prazoDecisao?.replace(/\D/g, "")) || 999;
  if (prazo <= 30) timing += 30;
  else if (prazo <= 60) timing += 20;
  else if (prazo <= 90) timing += 10;
  if (input.cargoContato?.match?.(/(CTO|CEO|VP|Diretor|Head|Gerente)/i)) timing += 20;

  const score = Math.round(
    firmografico * 0.30 +
    comportamental * 0.25 +
    intencao * 0.25 +
    fitTech * 0.10 +
    timing * 0.10
  );

  return Math.min(100, Math.max(0, score));
}

export interface FullFlowTemplate {
  meta: FlowTemplateMeta;
  nodes: Node<CRMNodeData>[];
  edges: Edge[];
}

const RAW_FLOW_TEMPLATES: Record<string, FullFlowTemplate> = {
  // ─── 1. Qualificação & Roteamento de Leads ──────────────────────────
  "lead-routing": {
    meta: {
      id: "lead-routing",
      name: "Qualificação & Roteamento de Leads",
      category: "crm",
      categoryLabel: "Comercial & CRM",
      description: "Direciona novos leads automaticamente com base no faturamento presumido, segmento e engajamento institucional.",
      status: "Produção",
      version: "v2.4",
      tags: ["Leads", "Enterprise", "Inside Sales", "Roteamento"],
      erpTables: ["SA1 - Clientes", "SZ1 - CRM Leads"],
      nodesCount: 6,
      simDefaultInputs: {
        nomeEmpresa: "Acme Industrial S/A",
        faturamentoAnual: 65000000,
        segmento: "Indústria Pesada",
        emailContato: "comercial@acmeindustrial.com.br"
      },
      calculateSimPath: (input) => {
        if (input.faturamentoAnual >= 50000000) {
          return ["lead-1", "lead-2", "lead-3-enterprise", "lead-4-mail-exec", "lead-6-protheus"];
        } else {
          return ["lead-1", "lead-2", "lead-3-inside", "lead-5-slack-inside"];
        }
      }
    },
    nodes: [
      {
        id: "lead-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Entrada de Novo Lead",
          type: "trigger",
          icon: "zap",
          description: "Disparado quando um novo lead se cadastra via Landing Page, API ou formulário de cotação.",
          config: { source: "Portal Web & Hubspot API" }
        }
      },
      {
        id: "lead-2",
        type: "conditionNode",
        position: { x: 260, y: 170 },
        data: {
          label: "Classificação Enterprise (Receita)",
          type: "condition",
          icon: "fork",
          description: "Verifica se o faturamento anual presumido da empresa candidata qualifica como Tier Enterprise.",
          config: { field: "Faturamento Anual", operator: ">=", value: "R$ 50.000.000" }
        }
      },
      {
        id: "lead-3-enterprise",
        type: "actionNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Atribuir Key Accounts Sênior",
          type: "action",
          icon: "user-plus",
          description: "Vincula a oportunidade à carteira de Grandes Contas e notifica o Gerente de Contas Estratégico.",
          config: { 
            assigneeGroup: "Key Accounts Sênior",
            protheusSyncEnabled: true,
            protheusTable: "SA1 - Clientes",
            protheusOperation: "incluir",
            protheusCompanyCode: "01",
            protheusBranchCode: "0101",
            protheusTriggerEvent: "AposGravar"
          }
        }
      },
      {
        id: "lead-3-inside",
        type: "actionNode",
        position: { x: 440, y: 360 },
        data: {
          label: "Direcionar Inside Sales",
          type: "action",
          icon: "user-plus",
          description: "Associa a oportunidade à equipe de vendas internas para primeiro contato por ligação em até 15min.",
          config: { assigneeGroup: "Inside Sales Team" }
        }
      },
      {
        id: "lead-4-mail-exec",
        type: "actionNode",
        position: { x: 80, y: 520 },
        data: {
          label: "E-mail Executivo Personalizado",
          type: "action",
          icon: "mail",
          description: "Dispara apresentação técnica institucional e proposta de NDA com cases do segmento do cliente.",
          config: { emailTemplate: "Apresentação Enterprise Q3" }
        }
      },
      {
        id: "lead-5-slack-inside",
        type: "actionNode",
        position: { x: 440, y: 520 },
        data: {
          label: "Alerta Slack Vendas Rápidas",
          type: "action",
          icon: "bell",
          description: "Notifica canal #leads-inside com dados de contato e link direto para o discador VoIP.",
          config: { slackChannel: "#vendas-leads-novos" }
        }
      },
      {
        id: "lead-6-protheus",
        type: "actionNode",
        position: { x: 80, y: 680 },
        data: {
          label: "Provisionar Cadastro Protheus",
          type: "action",
          icon: "database",
          description: "Gera pré-cadastro no Protheus (SA1) com status de prospecção e bloqueio de faturamento inicial.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SA1 - Clientes",
            protheusOperation: "incluir",
            protheusCompanyCode: "01",
            protheusBranchCode: "0101"
          }
        }
      }
    ],
    edges: [
      { id: "lead-e1", source: "lead-1", target: "lead-2" },
      { id: "lead-e2", source: "lead-2", target: "lead-3-enterprise", sourceHandle: "true", label: "Sim" },
      { id: "lead-e3", source: "lead-2", target: "lead-3-inside", sourceHandle: "false", label: "Não" },
      { id: "lead-e4", source: "lead-3-enterprise", target: "lead-4-mail-exec" },
      { id: "lead-e5", source: "lead-3-inside", target: "lead-5-slack-inside" },
      { id: "lead-e6", source: "lead-4-mail-exec", target: "lead-6-protheus" }
    ]
  },

  // ─── 2. Aprovação de Descontos & Alçadas Comerciais ─────────────────
  "discount-approval": {
    meta: {
      id: "discount-approval",
      name: "Aprovação de Descontos & Alçadas Comerciais",
      category: "governance",
      categoryLabel: "Governança & Comissões",
      description: "Esteira de auditoria de margem e aprovação hierárquica para pedidos com concessão de descontos fora da tabela.",
      status: "Produção",
      version: "v3.1",
      tags: ["Alçadas", "Margem", "Desconto", "Diretoria"],
      erpTables: ["SC5 - Pedidos de Venda", "SA3 - Vendedores"],
      nodesCount: 7,
      simDefaultInputs: {
        descontoPercentual: 18,
        margemContribuicao: 28,
        valorTotalPedido: 145000,
        representante: "Carlos Mendes (Representante SP)"
      },
      calculateSimPath: (input) => {
        if (input.descontoPercentual <= 5) {
          return ["disc-1", "disc-2", "disc-auto-app", "disc-notify-rep"];
        } else if (input.descontoPercentual > 15) {
          if (input.margemContribuicao >= 25) {
            return ["disc-1", "disc-2", "disc-3-dir", "disc-4-esc-dir", "disc-notify-rep"];
          } else {
            return ["disc-1", "disc-2", "disc-3-dir", "disc-5-block-margin"];
          }
        } else {
          return ["disc-1", "disc-2", "disc-3-ger", "disc-notify-rep"];
        }
      }
    },
    nodes: [
      {
        id: "disc-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Submissão de Pedido com Desconto",
          type: "trigger",
          icon: "flame",
          description: "Representante finaliza cotação aplicando desconto personalizado nos itens da proposta.",
          config: { source: "Módulo de Pedidos CRM" }
        }
      },
      {
        id: "disc-2",
        type: "conditionNode",
        position: { x: 260, y: 170 },
        data: {
          label: "Alçada de Diretoria (> 15% Desconto)",
          type: "condition",
          icon: "fork",
          description: "Verifica se o desconto médio ultrapassa o limite de 15%, exigindo aprovação estatutária.",
          config: { field: "Desconto Total %", operator: ">", value: "15%" }
        }
      },
      {
        id: "disc-3-dir",
        type: "conditionNode",
        position: { x: 80, y: 350 },
        data: {
          label: "Auditoria de Margem Mínima",
          type: "condition",
          icon: "fork",
          description: "Avalia se o Markup e a margem de contribuição líquida permanecem acima de 25%.",
          config: { field: "Margem de Contribuição", operator: ">=", value: "25%" }
        }
      },
      {
        id: "disc-3-ger",
        type: "actionNode",
        position: { x: 440, y: 350 },
        data: {
          label: "Aprovação Gerente Regional",
          type: "action",
          icon: "shield",
          description: "Encaminha solicitação para a fila de deliberação do Gerente Regional com prazo de 4h.",
          config: { assigneeGroup: "Gerência Comercial Regional" }
        }
      },
      {
        id: "disc-4-esc-dir",
        type: "actionNode",
        position: { x: 20, y: 530 },
        data: {
          label: "Escalar para Diretoria Comercial",
          type: "action",
          icon: "warning",
          description: "Dispara aviso no WhatsApp e e-mail do Diretor Comercial com resumo de margem e justificativa.",
          config: { 
            assigneeGroup: "Diretoria Comercial",
            slackChannel: "#aprovacoes-diretoria",
            whatsappTemplate: "Alerta de Alçada Especial" 
          }
        }
      },
      {
        id: "disc-5-block-margin",
        type: "validatorNode",
        position: { x: 200, y: 530 },
        data: {
          label: "Bloquear por Margem Crítica",
          type: "validator",
          icon: "lock",
          description: "Trava automaticamente o pedido no sistema devido à inviabilidade financeira da operação.",
          config: { validationRule: "Margem líquida abaixo do piso estatutário de 25%" }
        }
      },
      {
        id: "disc-auto-app",
        type: "actionNode",
        position: { x: 440, y: 530 },
        data: {
          label: "Auto-Aprovação Liberada",
          type: "action",
          icon: "check",
          description: "Aprova automaticamente o pedido sem necessidade de intervenção humana.",
          config: { actionOutcome: "Aprovado Dentro da Alçada Base" }
        }
      },
      {
        id: "disc-notify-rep",
        type: "actionNode",
        position: { x: 260, y: 700 },
        data: {
          label: "Notificar Representante & ERP",
          type: "action",
          icon: "bell",
          description: "Dispara notificação push para o representante e atualiza status de alçada no ERP.",
          config: { 
            protheusSyncEnabled: true,
            protheusTable: "SC5 - Pedidos de Venda",
            protheusOperation: "alterar"
          }
        }
      }
    ],
    edges: [
      { id: "disc-e1", source: "disc-1", target: "disc-2" },
      { id: "disc-e2", source: "disc-2", target: "disc-3-dir", sourceHandle: "true", label: "Sim" },
      { id: "disc-e3", source: "disc-2", target: "disc-3-ger", sourceHandle: "false", label: "Não" },
      { id: "disc-e4", source: "disc-3-dir", target: "disc-4-esc-dir", sourceHandle: "true", label: "Margem OK" },
      { id: "disc-e5", source: "disc-3-dir", target: "disc-5-block-margin", sourceHandle: "false", label: "Margem Baixa" },
      { id: "disc-e6", source: "disc-4-esc-dir", target: "disc-notify-rep" },
      { id: "disc-e7", source: "disc-3-ger", target: "disc-notify-rep" }
    ]
  },

  // ─── 3. Cálculo, Bônus & Retenção de Comissões ──────────────────────
  "commission-engine": {
    meta: {
      id: "commission-engine",
      name: "Cálculo, Bônus & Retenção de Comissões",
      category: "governance",
      categoryLabel: "Governança & Comissões",
      description: "Motor determinístico de cálculo de comissões com acelerador por meta mensal, bônus de produto foco e retenção de inadimplência.",
      status: "Produção",
      version: "v4.0",
      tags: ["Comissões", "Bônus", "Metas", "Financeiro"],
      erpTables: ["SE1 - Contas a Receber", "SA3 - Vendedores"],
      nodesCount: 6,
      simDefaultInputs: {
        atingimentoMeta: 115,
        faturamentoMensal: 380000,
        produtoFocoPresente: true,
        inadimplenciaCarteira: 1.8
      },
      calculateSimPath: (input) => {
        if (input.atingimentoMeta >= 100) {
          return ["com-1", "com-2", "com-3-bonus", "com-5-se1-provision"];
        } else {
          return ["com-1", "com-2", "com-3-std", "com-5-se1-provision"];
        }
      }
    },
    nodes: [
      {
        id: "com-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Faturamento de Pedido (NF Emitida)",
          type: "trigger",
          icon: "database",
          description: "Gatilho disparado no momento da confirmação de liquidação ou emissão da Nota Fiscal no Protheus.",
          config: { 
            source: "TOTVS Protheus SE1/SF2",
            protheusSyncEnabled: true,
            protheusTable: "SE1 - Contas a Receber",
            protheusTriggerEvent: "AposGravar"
          }
        }
      },
      {
        id: "com-2",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Meta Mensal Atingida (>= 100%)",
          type: "condition",
          icon: "fork",
          description: "Verifica se a cota individual de vendas do mês corrente foi 100% cumprida pelo representante.",
          config: { field: "Atingimento de Meta", operator: ">=", value: "100%" }
        }
      },
      {
        id: "com-3-bonus",
        type: "operationNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Aplicar Alíquota + Bônus Accelerator",
          type: "operation",
          icon: "calc",
          description: "Calcula Alíquota Base (5.0%) + Bônus de Superação de Meta (+2.5%) e acréscimo de mix de produto foco.",
          config: { formula: "Comissao = (ValorLiquido * 0.05) + (ValorLiquido * 0.025)" }
        }
      },
      {
        id: "com-3-std",
        type: "operationNode",
        position: { x: 440, y: 360 },
        data: {
          label: "Aplicar Alíquota Padrão (4.0%)",
          type: "operation",
          icon: "calc",
          description: "Calcula comissão base padrão sem os bônus de aceleração de metas.",
          config: { formula: "Comissao = ValorLiquido * 0.04" }
        }
      },
      {
        id: "com-4-audit",
        type: "actionNode",
        position: { x: 260, y: 530 },
        data: {
          label: "Gerar Extrato de Auditoria Determinística",
          type: "action",
          icon: "file",
          description: "Cria registro imutável com timestamp, versão de regra aplicada e hash de integridade.",
          config: { actionOutcome: "Log Imutável Gravado no Governance Studio" }
        }
      },
      {
        id: "com-5-se1-provision",
        type: "actionNode",
        position: { x: 260, y: 690 },
        data: {
          label: "Provisionar Pagamento no ERP",
          type: "action",
          icon: "database",
          description: "Registra o título de comissão a pagar no módulo financeiro (SE2/SE1) do Protheus.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SE1 - Contas a Receber",
            protheusOperation: "incluir",
            protheusCompanyCode: "01",
            protheusBranchCode: "0101"
          }
        }
      }
    ],
    edges: [
      { id: "com-e1", source: "com-1", target: "com-2" },
      { id: "com-e2", source: "com-2", target: "com-3-bonus", sourceHandle: "true", label: "Sim" },
      { id: "com-e3", source: "com-2", target: "com-3-std", sourceHandle: "false", label: "Não" },
      { id: "com-e4", source: "com-3-bonus", target: "com-4-audit" },
      { id: "com-e5", source: "com-3-std", target: "com-4-audit" },
      { id: "com-e6", source: "com-4-audit", target: "com-5-se1-provision" }
    ]
  },

  // ─── 4. Sincronização Bidirecional TOTVS Protheus ERP ────────────────
  "protheus-sync": {
    meta: {
      id: "protheus-sync",
      name: "Sincronização Bidirecional TOTVS Protheus ERP",
      category: "erp",
      categoryLabel: "ERP TOTVS & Integrações",
      description: "Integração em tempo real com TOTVS Protheus via MSExecAuto, ADVPL ExecBlocks, Webhooks e tratamento de contingência.",
      status: "Produção",
      version: "v5.2",
      tags: ["Protheus", "MSExecAuto", "ADVPL", "REST API", "SC5", "SA1"],
      erpTables: ["SC5 - Pedidos de Venda", "SC6 - Itens Pedido", "SA1 - Clientes", "SE1 - Financeiro"],
      nodesCount: 7,
      simDefaultInputs: {
        tabelaAlvo: "SC5 - Pedidos de Venda",
        modoExecucao: "MSExecAuto",
        statusCNPJ: "Ativo / Regular",
        ambienteERP: "Produção 0101"
      },
      calculateSimPath: (input) => {
        if (input.statusCNPJ === "Ativo / Regular") {
          return ["prot-1", "prot-2-val", "prot-3-cond", "prot-4-msexec", "prot-6-advpl", "prot-7-ack"];
        } else {
          return ["prot-1", "prot-2-val", "prot-5-reject"];
        }
      }
    },
    nodes: [
      {
        id: "prot-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Webhook Event / Alteração CRM",
          type: "trigger",
          icon: "send",
          description: "Disparado quando um pedido é finalizado no CRM ou um cliente é alterado no portal.",
          config: { 
            source: "API Gateway REST CRM",
            protheusSyncEnabled: true,
            protheusTable: "SC5 - Pedidos de Venda"
          }
        }
      },
      {
        id: "prot-2-val",
        type: "validatorNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Validação Schema Fiscal & CNPJ",
          type: "validator",
          icon: "shield",
          description: "Verifica integridade dos campos obrigatórios (CGC/CNPJ, Inscrição Estadual, CFOP e Condição de Pagamento).",
          config: { validationRule: "Schema JSON Protheus v12.1.2410 e CNPJ Ativo na Receita" }
        }
      },
      {
        id: "prot-3-cond",
        type: "conditionNode",
        position: { x: 260, y: 350 },
        data: {
          label: "Tipo de Registro == 'SC5 Pedido'",
          type: "condition",
          icon: "fork",
          description: "Roteia a mensagem para a rotina de Pedido de Venda (MATA410) ou Cadastro de Clientes (MATA030).",
          config: { field: "Tabela Protheus", operator: "==", value: "SC5" }
        }
      },
      {
        id: "prot-4-msexec",
        type: "actionNode",
        position: { x: 80, y: 520 },
        data: {
          label: "Executar MSExecAuto (MATA410)",
          type: "action",
          icon: "database",
          description: "Dispara rotina automática de inclusão de cabeçalho (SC5) e itens de venda (SC6) com lock transacional.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SC5 - Pedidos de Venda",
            protheusOperation: "incluir",
            protheusCompanyCode: "01",
            protheusBranchCode: "0101"
          }
        }
      },
      {
        id: "prot-5-reject",
        type: "actionNode",
        position: { x: 440, y: 520 },
        data: {
          label: "Registrar Log Erro & Rejeição",
          type: "action",
          icon: "warning",
          description: "Armazena mensagem de erro na tabela de integração SZ1 e notifica suporte técnico via Slack.",
          config: { slackChannel: "#erp-erros-integracao" }
        }
      },
      {
        id: "prot-6-advpl",
        type: "actionNode",
        position: { x: 80, y: 680 },
        data: {
          label: "ExecBlock ADVPL: U_NOTIF_EXPED",
          type: "action",
          icon: "send",
          description: "Invoca função personalizada no Protheus para reserva de lote no WMS e alocação de estoque.",
          config: {
            protheusSyncEnabled: true,
            protheusOperation: "execblock",
            protheusExecBlock: "U_NOTIF_EXPED"
          }
        }
      },
      {
        id: "prot-7-ack",
        type: "actionNode",
        position: { x: 80, y: 840 },
        data: {
          label: "Retorno de Confirmação (ACK)",
          type: "action",
          icon: "check",
          description: "Grava o número oficial do Pedido Protheus (C5_NUM) de volta na oportunidade do CRM.",
          config: { actionOutcome: "C5_NUM gravado com sucesso no CRM" }
        }
      }
    ],
    edges: [
      { id: "prot-e1", source: "prot-1", target: "prot-2-val" },
      { id: "prot-e2", source: "prot-2-val", target: "prot-3-cond" },
      { id: "prot-e3", source: "prot-3-cond", target: "prot-4-msexec", sourceHandle: "true", label: "SC5 Pedido" },
      { id: "prot-e4", source: "prot-3-cond", target: "prot-5-reject", sourceHandle: "false", label: "Erro Schema" },
      { id: "prot-e5", source: "prot-4-msexec", target: "prot-6-advpl" },
      { id: "prot-e6", source: "prot-6-advpl", target: "prot-7-ack" }
    ]
  },

  // ─── 5. Esteira de Análise de Crédito & Faturamento ─────────────────
  "credit-billing": {
    meta: {
      id: "credit-billing",
      name: "Esteira de Análise de Crédito & Faturamento",
      category: "finance",
      categoryLabel: "Financeiro & Crédito",
      description: "Validação automática de limite de crédito no ERP, consulta de restrições Serasa e liberação para faturamento.",
      status: "Produção",
      version: "v2.8",
      tags: ["Crédito", "Faturamento", "Serasa", "Financeiro", "Risco"],
      erpTables: ["SA1 - Clientes", "SE1 - Financeiro", "SC5 - Pedidos"],
      nodesCount: 7,
      simDefaultInputs: {
        valorPedido: 85000,
        limiteDisponivel: 120000,
        scoreSerasa: 780,
        diasAtrasoMedio: 0
      },
      calculateSimPath: (input) => {
        if (input.limiteDisponivel >= input.valorPedido) {
          if (input.scoreSerasa >= 700) {
            return ["cred-1", "cred-2-limit", "cred-3-score", "cred-4-release", "cred-6-danfe"];
          } else {
            return ["cred-1", "cred-2-limit", "cred-3-score", "cred-5-manual-review"];
          }
        } else {
          return ["cred-1", "cred-2-limit", "cred-5-block-limit"];
        }
      }
    },
    nodes: [
      {
        id: "cred-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Pedido Aprovado Comercial",
          type: "trigger",
          icon: "database",
          description: "Entrada na fila financeira para validação de crédito e liberação de faturamento.",
          config: { source: "CRM Pedidos" }
        }
      },
      {
        id: "cred-2-limit",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Limite Disponível >= Valor Pedido",
          type: "condition",
          icon: "fork",
          description: "Consulta o saldo do limite de crédito cadastrado no SA1 Protheus abatendo títulos a vencer no SE1.",
          config: { field: "Limite de Crédito Disponível", operator: ">=", value: "Valor do Pedido" }
        }
      },
      {
        id: "cred-3-score",
        type: "conditionNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Score Serasa / Boa Vista >= 700",
          type: "condition",
          icon: "fork",
          description: "Consulta bureau de crédito externo via API em tempo real para verificar pendências ativas.",
          config: { field: "Score de Crédito Serasa", operator: ">=", value: "700" }
        }
      },
      {
        id: "cred-4-release",
        type: "actionNode",
        position: { x: 20, y: 530 },
        data: {
          label: "Liberar Pedido para Faturamento",
          type: "action",
          icon: "check",
          description: "Remove trava de crédito no Protheus e envia para a esteira de expedição e PCP.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SC5 - Pedidos de Venda",
            protheusOperation: "alterar"
          }
        }
      },
      {
        id: "cred-5-manual-review",
        type: "actionNode",
        position: { x: 200, y: 530 },
        data: {
          label: "Encaminhar Comitê de Crédito",
          type: "action",
          icon: "warning",
          description: "Envia dossiê financeiro para análise manual do Comitê de Risco e Crédito.",
          config: { assigneeGroup: "Comitê de Crédito e Risco" }
        }
      },
      {
        id: "cred-5-block-limit",
        type: "validatorNode",
        position: { x: 440, y: 360 },
        data: {
          label: "Bloquear por Limite Excedido",
          type: "validator",
          icon: "lock",
          description: "Exige pagamento antecipado (PIX) ou quitação de duplicatas vencidas no SE1.",
          config: { validationRule: "Saldo de limite de crédito insuficiente" }
        }
      },
      {
        id: "cred-6-danfe",
        type: "actionNode",
        position: { x: 20, y: 690 },
        data: {
          label: "Emitir NF-e & Notificar WhatsApp",
          type: "action",
          icon: "whatsapp",
          description: "Dispara DANFE em PDF e código de rastreio para o contato de faturamento do cliente.",
          config: { whatsappTemplate: "Aviso de Faturamento & DANFE" }
        }
      }
    ],
    edges: [
      { id: "cred-e1", source: "cred-1", target: "cred-2-limit" },
      { id: "cred-e2", source: "cred-2-limit", target: "cred-3-score", sourceHandle: "true", label: "Limite OK" },
      { id: "cred-e3", source: "cred-2-limit", target: "cred-5-block-limit", sourceHandle: "false", label: "Sem Limite" },
      { id: "cred-e4", source: "cred-3-score", target: "cred-4-release", sourceHandle: "true", label: "Baixo Risco" },
      { id: "cred-e5", source: "cred-3-score", target: "cred-5-manual-review", sourceHandle: "false", label: "Médio/Alto Risco" },
      { id: "cred-e6", source: "cred-4-release", target: "cred-6-danfe" }
    ]
  },

  // ─── 5b. Fluxo Financeiro: Projeção de Fluxo de Caixa & Tesouraria ───
  "cashflow-projection": {
    meta: {
      id: "cashflow-projection",
      name: "Gestão de Fluxo de Caixa Projetado & Tesouraria",
      category: "finance",
      categoryLabel: "Financeiro & Tesouraria",
      description: "Projeção orçamentária de entradas e saídas a 30/60/90 dias com simulador de cenários e gatilhos de antecipação de recebíveis.",
      status: "Produção",
      version: "v2.1",
      tags: ["Fluxo de Caixa", "DFC", "Tesouraria", "Projeção", "SE1/SE2"],
      erpTables: ["SE1 - Receber", "SE2 - Pagar", "SE5 - Movimentos Bancários"],
      nodesCount: 6,
      simDefaultInputs: {
        saldoAtual: 350000,
        entradas30Dias: 980000,
        saidas30Dias: 1100000,
        taxaInadimplenciaSimulada: 3
      },
      calculateSimPath: (input) => {
        const saldoProjetado = input.saldoAtual + (input.entradas30Dias * (1 - input.taxaInadimplenciaSimulada / 100)) - input.saidas30Dias;
        if (saldoProjetado < 200000) {
          return ["cf-1", "cf-2-risk", "cf-3-alert", "cf-4-anticipate", "cf-6-protheus"];
        } else {
          return ["cf-1", "cf-2-risk", "cf-5-ok", "cf-6-protheus"];
        }
      }
    },
    nodes: [
      {
        id: "cf-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Lançamento Financeiro Integrado (SE1/SE2)",
          type: "trigger",
          icon: "database",
          description: "Monitora novos vencimentos e previsões orçamentárias sincronizadas do ERP TOTVS Protheus.",
          config: { source: "Protheus SE1/SE2 Data Engine" }
        }
      },
      {
        id: "cf-2-risk",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Saldo Projetado 30 Dias < R$ 200k?",
          type: "condition",
          icon: "fork",
          description: "Calcula a margem de cobertura de caixa projetada ponderada pela taxa histórica de inadimplência.",
          config: { field: "Saldo Projetado Net 30d", operator: "<", value: "200000" }
        }
      },
      {
        id: "cf-3-alert",
        type: "actionNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Emitir Alerta de Descompasso de Tesouraria",
          type: "action",
          icon: "warning",
          description: "Notifica diretoria financeira e gerência sobre necessidade de realocação de capital de giro.",
          config: { assigneeGroup: "Diretoria Financeira" }
        }
      },
      {
        id: "cf-4-anticipate",
        type: "actionNode",
        position: { x: 80, y: 530 },
        data: {
          label: "Simular Antecipação de Duplicatas SE1",
          type: "action",
          icon: "trendingUp",
          description: "Identifica duplicatas de primeira linha para desconto bancário automático com menor taxa de WACC.",
          config: { operation: "Desconto Duplicatas SE1" }
        }
      },
      {
        id: "cf-5-ok",
        type: "actionNode",
        position: { x: 440, y: 360 },
        data: {
          label: "Manter Projeção em Zona de Segurança",
          type: "action",
          icon: "check",
          description: "Registra conformidade do fluxo de caixa sem necessidade de intervenção de tesouraria.",
          config: { status: "Conforme" }
        }
      },
      {
        id: "cf-6-protheus",
        type: "actionNode",
        position: { x: 260, y: 700 },
        data: {
          label: "Atualizar DFC Gerencial no Protheus",
          type: "action",
          icon: "refresh",
          description: "Sincroniza o quadro de disponibilidade financeira com o módulo de Tesouraria SE5 do Protheus.",
          config: { protheusTable: "SE5 - Movimentos", protheusSyncEnabled: true }
        }
      }
    ],
    edges: [
      { id: "cf-e1", source: "cf-1", target: "cf-2-risk" },
      { id: "cf-e2", source: "cf-2-risk", target: "cf-3-alert", sourceHandle: "true", label: "Risco de Caixa" },
      { id: "cf-e3", source: "cf-2-risk", target: "cf-5-ok", sourceHandle: "false", label: "Caixa Saudável" },
      { id: "cf-e4", source: "cf-3-alert", target: "cf-4-anticipate" },
      { id: "cf-e5", source: "cf-4-anticipate", target: "cf-6-protheus" },
      { id: "cf-e6", source: "cf-5-ok", target: "cf-6-protheus" }
    ]
  },

  // ─── 5c. Fluxo Financeiro: Régua de Cobrança Automática SE1 ───
  "receivables-collection": {
    meta: {
      id: "receivables-collection",
      name: "Régua de Cobrança Automática & Renegociação SE1",
      category: "finance",
      categoryLabel: "Financeiro & Cobrança",
      description: "Execução automatizada da régua de cobrança comercial com disparo de mensagens WhatsApp, PIX dinâmico e bloqueio Protheus SA1.",
      status: "Produção",
      version: "v3.0",
      tags: ["Cobrança", "SE1", "Inadimplência", "PIX", "Protheus"],
      erpTables: ["SE1 - Contas a Receber", "SA1 - Cadastro de Clientes"],
      nodesCount: 6,
      simDefaultInputs: {
        diasAtraso: 7,
        valorTitulo: 45000,
        scoreCliente: 620
      },
      calculateSimPath: (input) => {
        if (input.diasAtraso <= 5) {
          return ["cob-1", "cob-2-days", "cob-3-friendly"];
        } else if (input.diasAtraso <= 15) {
          return ["cob-1", "cob-2-days", "cob-4-discount"];
        } else {
          return ["cob-1", "cob-2-days", "cob-5-block"];
        }
      }
    },
    nodes: [
      {
        id: "cob-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Título SE1 Vencido (D+1)",
          type: "trigger",
          icon: "clock",
          description: "Gatilho automático disparado diariamente no fechamento do movimento bancário no Protheus.",
          config: { source: "Protheus SE1 Inadimplência Engine" }
        }
      },
      {
        id: "cob-2-days",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Avaliar Faixa de Atraso (Dias)",
          type: "condition",
          icon: "fork",
          description: "Classifica a cobrança em Leve (D+1 a D+5), Moderada (D+6 a D+15) ou Crítica (> D+15).",
          config: { field: "Dias de Atraso Título", operator: "range", value: "D+1 a D+30" }
        }
      },
      {
        id: "cob-3-friendly",
        type: "actionNode",
        position: { x: 40, y: 360 },
        data: {
          label: "Enviar Lembrete Amigável WhatsApp + PIX",
          type: "action",
          icon: "whatsapp",
          description: "Dispara mensagem amigável com código copia-e-cola PIX com isenção de multa até D+3.",
          config: { channel: "WhatsApp API", template: "Lembrete Amigável" }
        }
      },
      {
        id: "cob-4-discount",
        type: "actionNode",
        position: { x: 260, y: 360 },
        data: {
          label: "Oferta de Acordo com Isenção de Encargos",
          type: "action",
          icon: "dollarSign",
          description: "Envia proposta de quitação imediata com 50% de desconto nos juros moratórios.",
          config: { maxDiscountJuros: 50 }
        }
      },
      {
        id: "cob-5-block",
        type: "validatorNode",
        position: { x: 480, y: 360 },
        data: {
          label: "Bloquear Comercial no SA1 Protheus",
          type: "validator",
          icon: "lock",
          description: "Aplica trava de faturamento no cadastro de clientes SA1 impedindo emissão de novos pedidos.",
          config: { protheusTable: "SA1 - Clientes", protheusField: "A1_MSBLQL = 1" }
        }
      }
    ],
    edges: [
      { id: "cob-e1", source: "cob-1", target: "cob-2-days" },
      { id: "cob-e2", source: "cob-2-days", target: "cob-3-friendly", sourceHandle: "true", label: "Atraso Leve (1-5d)" },
      { id: "cob-e3", source: "cob-2-days", target: "cob-4-discount", label: "Moderado (6-15d)" },
      { id: "cob-e4", source: "cob-2-days", target: "cob-5-block", sourceHandle: "false", label: "Crítico (>15d)" }
    ]
  },

  // ─── 6. Fidelização & Jornada Pós-Venda CS ─────────────────────────
  "customer-loyalty": {
    meta: {
      id: "customer-loyalty",
      name: "Fidelização & Jornada Pós-Venda (NPS & CS)",
      category: "cs",
      categoryLabel: "Pós-Venda & CS",
      description: "Mapeia a jornada de sucesso pós-fechamento, engajando clientes novos com NPS e escalonamento de detratores.",
      status: "Produção",
      version: "v1.9",
      tags: ["CS", "NPS", "Onboarding", "Detratores", "Retenção"],
      nodesCount: 6,
      simDefaultInputs: {
        notaNPS: 9,
        tempoUsoDias: 14,
        clienteNome: "Metalúrgica Progresso Ltda"
      },
      calculateSimPath: (input) => {
        if (input.notaNPS < 7) {
          return ["loyalty-1", "loyalty-2", "loyalty-3-delay", "loyalty-4-nps", "loyalty-5-escalate"];
        } else {
          return ["loyalty-1", "loyalty-2", "loyalty-3-delay", "loyalty-4-nps", "loyalty-5-success"];
        }
      }
    },
    nodes: [
      {
        id: "loyalty-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Pedido Entregue (Closed Won)",
          type: "trigger",
          icon: "database",
          description: "Disparado instantaneamente no CRM quando a entrega é confirmada pela transportadora.",
          config: { source: "CRM Pipe Comercial" }
        }
      },
      {
        id: "loyalty-2",
        type: "actionNode",
        position: { x: 260, y: 170 },
        data: {
          label: "E-mail de Onboarding & Manuais",
          type: "action",
          icon: "mail",
          description: "Envia o material de boas-vindas, certificados de qualidade e agenda de alinhamento técnico.",
          config: { emailTemplate: "Sucesso do Cliente Onboarding" }
        }
      },
      {
        id: "loyalty-3-delay",
        type: "operationNode",
        position: { x: 260, y: 320 },
        data: {
          label: "Aguardar 14 Dias de Operação",
          type: "operation",
          icon: "clock",
          description: "Pausa temporária no fluxo para permitir que o cliente utilize o produto antes da avaliação.",
          config: { delayDays: 14 }
        }
      },
      {
        id: "loyalty-4-nps",
        type: "conditionNode",
        position: { x: 260, y: 470 },
        data: {
          label: "Resposta da Pesquisa NPS (< 7)",
          type: "condition",
          icon: "fork",
          description: "Dispara pesquisa de satisfação e analisa se o cliente respondeu como Detrator.",
          config: { field: "Nota NPS", operator: "<", value: "7" }
        }
      },
      {
        id: "loyalty-5-escalate",
        type: "actionNode",
        position: { x: 80, y: 640 },
        data: {
          label: "Escalar Alerta de Detrator CS",
          type: "action",
          icon: "warning",
          description: "Alerta vermelho enviado para o Diretor de CS com abertura de chamado prioritário de retenção.",
          config: { slackChannel: "#alerta-cs-detratores" }
        }
      },
      {
        id: "loyalty-5-success",
        type: "actionNode",
        position: { x: 440, y: 640 },
        data: {
          label: "Solicitar Case & Review",
          type: "action",
          icon: "mail",
          description: "Envia convite para o cliente publicar depoimento e oferece cupom de recompra prioritária.",
          config: { emailTemplate: "Engajamento NPS Promotores" }
        }
      }
    ],
    edges: [
      { id: "loyalty-e1", source: "loyalty-1", target: "loyalty-2" },
      { id: "loyalty-e2", source: "loyalty-2", target: "loyalty-3-delay" },
      { id: "loyalty-e3", source: "loyalty-3-delay", target: "loyalty-4-nps" },
      { id: "loyalty-e4", source: "loyalty-4-nps", target: "loyalty-5-escalate", sourceHandle: "true", label: "Detrator (<7)" },
      { id: "loyalty-e5", source: "loyalty-4-nps", target: "loyalty-5-success", sourceHandle: "false", label: "Promotor (>=7)" }
    ]
  },

  // ─── 7. SLA de Cotações & Pedidos Urgentes ──────────────────────────
  "sla-quotes": {
    meta: {
      id: "sla-quotes",
      name: "SLA de Cotações & Pedidos Urgentes",
      category: "crm",
      categoryLabel: "Comercial & CRM",
      description: "Monitoramento de tempo de resposta para cotações prioritárias com escalonamento automático de estouro de SLA.",
      status: "Produção",
      version: "v1.5",
      tags: ["SLA", "Cotações", "Urgente", "WhatsApp", "Escalonamento"],
      nodesCount: 6,
      simDefaultInputs: {
        prioridade: "URGENTE",
        tempoRespostaMinutos: 150, // 2h30 > 120min (SLA estourado)
        valorCotacao: 95000
      },
      calculateSimPath: (input) => {
        if (input.prioridade === "URGENTE") {
          if (input.tempoRespostaMinutos > 120) {
            return ["sla-1", "sla-2-prio", "sla-3-timer", "sla-4-check-time", "sla-5-breach"];
          } else {
            return ["sla-1", "sla-2-prio", "sla-3-timer", "sla-4-check-time", "sla-5-ok"];
          }
        } else {
          return ["sla-1", "sla-2-prio", "sla-5-std"];
        }
      }
    },
    nodes: [
      {
        id: "sla-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Cotação Criada pelo Vendedor",
          type: "trigger",
          icon: "file",
          description: "Disparo no momento em que uma nova cotação é salva no CRM com status 'Em Elaboração'.",
          config: { source: "Módulo de Orçamentos" }
        }
      },
      {
        id: "sla-2-prio",
        type: "conditionNode",
        position: { x: 260, y: 170 },
        data: {
          label: "Prioridade == 'URGENTE / SPOT'",
          type: "condition",
          icon: "fork",
          description: "Verifica se a cotação foi sinalizada com tag de urgência ou cliente crítico.",
          config: { field: "Prioridade Cotação", operator: "==", value: "URGENTE" }
        }
      },
      {
        id: "sla-3-timer",
        type: "operationNode",
        position: { x: 80, y: 340 },
        data: {
          label: "Contador SLA Máximo: 2 Horas",
          type: "operation",
          icon: "clock",
          description: "Cronômetro regressivo com alertas intermediários aos 60 e 90 minutos.",
          config: { delayHours: 2 }
        }
      },
      {
        id: "sla-4-check-time",
        type: "conditionNode",
        position: { x: 80, y: 490 },
        data: {
          label: "Cotação Respondida < 2 Horas?",
          type: "condition",
          icon: "fork",
          description: "Verifica se o engenheiro de aplicação enviou os preços antes do encerramento do prazo de SLA.",
          config: { field: "Tempo Resposta", operator: "<=", value: "120 min" }
        }
      },
      {
        id: "sla-5-breach",
        type: "actionNode",
        position: { x: 20, y: 670 },
        data: {
          label: "Escalar Gerência & Reatribuir",
          type: "action",
          icon: "warning",
          description: "Alerta de estouro de SLA no WhatsApp do Gerente e transferência automática da cotação.",
          config: { 
            slackChannel: "#alerta-sla-vendas",
            whatsappTemplate: "Estouro de SLA de Cotação"
          }
        }
      },
      {
        id: "sla-5-ok",
        type: "actionNode",
        position: { x: 200, y: 670 },
        data: {
          label: "Disparar Proposta Formalizada",
          type: "action",
          icon: "mail",
          description: "Envia PDF da proposta comercial com link para assinatura digital e aceite online.",
          config: { emailTemplate: "Envio de Proposta Comercial" }
        }
      },
      {
        id: "sla-5-std",
        type: "actionNode",
        position: { x: 440, y: 340 },
        data: {
          label: "Fila Padrão (SLA 24h)",
          type: "action",
          icon: "clock",
          description: "Insere a cotação na fila convencional de engenharia com prazo de atendimento de 24 horas úteis.",
          config: { assigneeGroup: "Engenharia de Vendas Padrão" }
        }
      }
    ],
    edges: [
      { id: "sla-e1", source: "sla-1", target: "sla-2-prio" },
      { id: "sla-e2", source: "sla-2-prio", target: "sla-3-timer", sourceHandle: "true", label: "Urgente" },
      { id: "sla-e3", source: "sla-2-prio", target: "sla-5-std", sourceHandle: "false", label: "Padrão" },
      { id: "sla-e4", source: "sla-3-timer", target: "sla-4-check-time" },
      { id: "sla-e5", source: "sla-4-check-time", target: "sla-5-breach", sourceHandle: "false", label: "Estourado" },
      { id: "sla-e6", source: "sla-4-check-time", target: "sla-5-ok", sourceHandle: "true", label: "Dentro SLA" }
    ]
  },

  // ─── 8. Recuperação de Churn & Carteira Inativa ─────────────────────
  "churn-recovery": {
    meta: {
      id: "churn-recovery",
      name: "Recuperação de Churn & Carteira Inativa",
      category: "crm",
      categoryLabel: "Comercial & CRM",
      description: "Identificação automática de contas inativas há mais de 60 dias e ativação de campanhas de reengajamento e visitas.",
      status: "Produção",
      version: "v2.1",
      tags: ["Churn", "Reativação", "Inativos", "LTV", "Retenção"],
      erpTables: ["SA1 - Clientes", "SC5 - Pedidos de Venda"],
      nodesCount: 6,
      simDefaultInputs: {
        diasSemComprar: 75,
        ltvHistorico: 180000,
        segmentoCliente: "Usinagem Industrial"
      },
      calculateSimPath: (input) => {
        if (input.ltvHistorico >= 100000) {
          return ["churn-1", "churn-2-ltv", "churn-3-vip", "churn-5-crm-task"];
        } else {
          return ["churn-1", "churn-2-ltv", "churn-3-std", "churn-5-crm-task"];
        }
      }
    },
    nodes: [
      {
        id: "churn-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Inatividade > 60 Dias Sem Pedidos",
          type: "trigger",
          icon: "flame",
          description: "Robô de monitoramento detecta ausência de pedidos de clientes da carteira ativa.",
          config: { source: "Rotina Agendada Noturna" }
        }
      },
      {
        id: "churn-2-ltv",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "LTV Histórico >= R$ 100.000 (VIP)",
          type: "condition",
          icon: "fork",
          description: "Diferencia contas estratégicas de alto valor acumulado para abordagem presencial.",
          config: { field: "LTV Total", operator: ">=", value: "R$ 100.000" }
        }
      },
      {
        id: "churn-3-vip",
        type: "actionNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Agendar Visita Key Account",
          type: "action",
          icon: "user-plus",
          description: "Gera tarefa prioritária na agenda do Key Account com cupom de desconto especial de reativação.",
          config: { assigneeGroup: "Key Accounts Sênior" }
        }
      },
      {
        id: "churn-3-std",
        type: "actionNode",
        position: { x: 440, y: 360 },
        data: {
          label: "Cadência Reativação Automática",
          type: "action",
          icon: "mail",
          description: "Dispara sequência multicanal (E-mail + WhatsApp) com catálogo de novidades e condições especiais.",
          config: { 
            emailTemplate: "Campanha Sentimos Sua Falta",
            whatsappTemplate: "Oferta Exclusiva Reativação"
          }
        }
      },
      {
        id: "churn-5-crm-task",
        type: "actionNode",
        position: { x: 260, y: 540 },
        data: {
          label: "Atualizar Status Carteira no CRM",
          type: "action",
          icon: "database",
          description: "Altera status do cliente de 'Ativo' para 'Em Recuperação' e monitora reengajamento por 30 dias.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SA1 - Clientes",
            protheusOperation: "alterar"
          }
        }
      }
    ],
    edges: [
      { id: "churn-e1", source: "churn-1", target: "churn-2-ltv" },
      { id: "churn-e2", source: "churn-2-ltv", target: "churn-3-vip", sourceHandle: "true", label: "VIP (LTV alto)" },
      { id: "churn-e3", source: "churn-2-ltv", target: "churn-3-std", sourceHandle: "false", label: "Padrão" },
      { id: "churn-e4", source: "churn-3-vip", target: "churn-5-crm-task" },
      { id: "churn-e5", source: "churn-3-std", target: "churn-5-crm-task" }
    ]
  },

  // ─── 9. Notificações & Escalonamento Omnichannel ─────────────────────
  "omnichannel-alerts": {
    meta: {
      id: "omnichannel-alerts",
      name: "Notificações & Escalonamento Omnichannel",
      category: "erp",
      categoryLabel: "ERP TOTVS & Integrações",
      description: "Roteamento inteligente de alertas críticos corporativos via WhatsApp Oficial, Slack, E-mail e Push Mobile.",
      status: "Produção",
      version: "v3.0",
      tags: ["Omnichannel", "WhatsApp", "Slack", "Alertas", "Push"],
      nodesCount: 6,
      simDefaultInputs: {
        tipoEvento: "Bloqueio Fiscal / Ruptura Estoque",
        severidade: "CRÍTICO",
        unidadeFabril: "Matriz Joinville SC"
      },
      calculateSimPath: (input) => {
        if (input.severidade === "CRÍTICO") {
          return ["omni-1", "omni-2-sev", "omni-3-whatsapp", "omni-4-slack", "omni-6-audit"];
        } else {
          return ["omni-1", "omni-2-sev", "omni-5-email", "omni-6-audit"];
        }
      }
    },
    nodes: [
      {
        id: "omni-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Evento Crítico do Sistema",
          type: "trigger",
          icon: "warning",
          description: "Disparado por erro de integração Protheus, cancelamento de pedido ou ruptura de estoque.",
          config: { source: "Monitoring Watchdog" }
        }
      },
      {
        id: "omni-2-sev",
        type: "conditionNode",
        position: { x: 260, y: 180 },
        data: {
          label: "Severidade == 'CRÍTICO'",
          type: "condition",
          icon: "fork",
          description: "Verifica se a ocorrência gera impacto financeiro imediato ou paralisação de linha.",
          config: { field: "Severidade", operator: "==", value: "CRÍTICO" }
        }
      },
      {
        id: "omni-3-whatsapp",
        type: "actionNode",
        position: { x: 80, y: 360 },
        data: {
          label: "Disparo WhatsApp Gestor de Plantão",
          type: "action",
          icon: "whatsapp",
          description: "Envia mensagem instantânea via API Oficial do WhatsApp para o celular do diretor responsável.",
          config: { whatsappTemplate: "Alerta Crítico Imediato" }
        }
      },
      {
        id: "omni-4-slack",
        type: "actionNode",
        position: { x: 80, y: 520 },
        data: {
          label: "Aviso Canal Slack #war-room",
          type: "action",
          icon: "bell",
          description: "Publica payload no canal de incidentes com botão para tomada de decisão em 1 clique.",
          config: { slackChannel: "#incidentes-criticos" }
        }
      },
      {
        id: "omni-5-email",
        type: "actionNode",
        position: { x: 440, y: 360 },
        data: {
          label: "E-mail Informativo Padrão",
          type: "action",
          icon: "mail",
          description: "Envia boletim resumido para os líderes de equipe.",
          config: { emailTemplate: "Boletim Diário Operacional" }
        }
      },
      {
        id: "omni-6-audit",
        type: "actionNode",
        position: { x: 260, y: 680 },
        data: {
          label: "Registro em Trilha de Auditoria",
          type: "action",
          icon: "file",
          description: "Registra histórico imutável na base de governança com tempo de entrega e confirmação de leitura.",
          config: { actionOutcome: "Gravado em Log de Governança" }
        }
      }
    ],
    edges: [
      { id: "omni-e1", source: "omni-1", target: "omni-2-sev" },
      { id: "omni-e2", source: "omni-2-sev", target: "omni-3-whatsapp", sourceHandle: "true", label: "Crítico" },
      { id: "omni-e3", source: "omni-2-sev", target: "omni-5-email", sourceHandle: "false", label: "Informativo" },
      { id: "omni-e4", source: "omni-3-whatsapp", target: "omni-4-slack" },
      { id: "omni-e5", source: "omni-4-slack", target: "omni-6-audit" },
      { id: "omni-e6", source: "omni-5-email", target: "omni-6-audit" }
    ]
  },

  // ─── 10. Engenharia & Produção Sob Medida PCP (SC2) ─────────────────
  "pcp-production": {
    meta: {
      id: "pcp-production",
      name: "Engenharia & Produção Sob Medida (PCP / SC2)",
      category: "pcp",
      categoryLabel: "Engenharia & PCP",
      description: "Fluxo de liberação de pedidos customizados com validação de desenho técnico, abertura de OP (SC2) e requisição de matérias-primas.",
      status: "Produção",
      version: "v1.7",
      tags: ["PCP", "Engenharia", "SC2", "Ordem de Produção", "Protheus"],
      erpTables: ["SC2 - Ordens de Produção", "SB1 - Produtos", "SG1 - Estruturas"],
      nodesCount: 6,
      simDefaultInputs: {
        itemCustomizado: true,
        estoqueMateriaPrima: true,
        desenhoTecnicoAprovado: true,
        prazoProducaoDias: 12
      },
      calculateSimPath: (input) => {
        if (input.estoqueMateriaPrima) {
          return ["pcp-1", "pcp-2-draw", "pcp-3-stock", "pcp-4-op-gen", "pcp-6-sync-crm"];
        } else {
          return ["pcp-1", "pcp-2-draw", "pcp-3-stock", "pcp-5-sc1-buy"];
        }
      }
    },
    nodes: [
      {
        id: "pcp-1",
        type: "triggerNode",
        position: { x: 260, y: 30 },
        data: {
          label: "Pedido com Item Sob Medida",
          type: "trigger",
          icon: "database",
          description: "Disparado quando o pedido aprovado contém itens com código de projeto especial ou desenho técnico.",
          config: { source: "CRM Pedidos Customizados" }
        }
      },
      {
        id: "pcp-2-draw",
        type: "validatorNode",
        position: { x: 260, y: 170 },
        data: {
          label: "Validação Desenho Técnico & CAD",
          type: "validator",
          icon: "shield",
          description: "Verifica se o arquivo CAD 3D/PDF de especificações foi anexado e chancelado pela Engenharia de Aplicação.",
          config: { validationRule: "Arquivo de desenho técnico homologado" }
        }
      },
      {
        id: "pcp-3-stock",
        type: "conditionNode",
        position: { x: 260, y: 340 },
        data: {
          label: "Matéria-Prima Disponível no Estoque?",
          type: "condition",
          icon: "fork",
          description: "Consulta o saldo físico e empenhos da matéria-prima no Protheus (SB2).",
          config: { field: "Estoque de Insumos", operator: "==", value: "Disponível" }
        }
      },
      {
        id: "pcp-4-op-gen",
        type: "actionNode",
        position: { x: 80, y: 520 },
        data: {
          label: "Gerar Ordem de Produção (SC2)",
          type: "action",
          icon: "database",
          description: "Cria a OP no módulo de PCP do Protheus com roteiro de fabricação e apontamento de centro de custos.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SC2 - Ordens de Produção",
            protheusOperation: "incluir",
            protheusCompanyCode: "01",
            protheusBranchCode: "0101"
          }
        }
      },
      {
        id: "pcp-5-sc1-buy",
        type: "actionNode",
        position: { x: 440, y: 520 },
        data: {
          label: "Gerar Solicitação de Compras (SC1)",
          type: "action",
          icon: "warning",
          description: "Gera requisição de compra urgente para o Departamento de Suprimentos com prazo crítico.",
          config: {
            protheusSyncEnabled: true,
            protheusTable: "SC1 - Solicitacao de Compras",
            protheusOperation: "incluir"
          }
        }
      },
      {
        id: "pcp-6-sync-crm",
        type: "actionNode",
        position: { x: 80, y: 680 },
        data: {
          label: "Atualizar Prazo de Entrega no CRM",
          type: "action",
          icon: "bell",
          description: "Notifica o representante comercial com o número da OP e a data prevista de conclusão do lote.",
          config: { actionOutcome: "Cronograma de Produção Sincronizado" }
        }
      }
    ],
    edges: [
      { id: "pcp-e1", source: "pcp-1", target: "pcp-2-draw" },
      { id: "pcp-e2", source: "pcp-2-draw", target: "pcp-3-stock" },
      { id: "pcp-e3", source: "pcp-3-stock", target: "pcp-4-op-gen", sourceHandle: "true", label: "Estoque OK" },
      { id: "pcp-e4", source: "pcp-3-stock", target: "pcp-5-sc1-buy", sourceHandle: "false", label: "Sem Insumo" },
      { id: "pcp-e5", source: "pcp-4-op-gen", target: "pcp-6-sync-crm" }
    ]
  },

  // ─── 11. Roteamento Inteligente de Leads PREMIUM (Enterprise) ───────────
  "lead-routing-premium": {
    meta: {
      id: "lead-routing-premium",
      name: "Roteamento Inteligente de Leads PREMIUM",
      category: "crm",
      categoryLabel: "Comercial & CRM",
      description: "Enterprise-grade lead routing com scoring multi-dimensional (firmográfico + comportamental + intenção), enriquecimento automático via Clearbit/Apollo, roteamento omnicanal (WhatsApp/Slack/E-mail/Teams/Telefone), SLA dinâmico por tier, A/B testing de rotas, nurturing sequences e analytics em tempo real.",
      status: "Premium",
      version: "v1.0",
      tags: ["Leads", "Enterprise", "Premium", "AI Scoring", "Omnichannel", "A/B Testing", "Enrichment", "Nurturing"],
      erpTables: ["SA1 - Clientes", "SZ1 - CRM Leads", "SZ2 - Lead Scoring", "SZ3 - Lead Activities", "SZ4 - Nurturing Sequences"],
      nodesCount: 18,
      simDefaultInputs: {
        nomeEmpresa: "TechFlow Analytics S/A",
        faturamentoAnual: 120000000,
        segmento: "SaaS B2B",
        emailContato: "cto@techflow.com.br",
        telefoneContato: "+55 11 99999-8888",
        cargoContato: "CTO",
        origemLead: "Inbound - Demo Request",
        pagesVisitadas: 12,
        tempoNoSite: 420,
        downloadsWhitepaper: 3,
        tecnologiaAtual: "Salesforce + HubSpot",
        concorrenteAtual: "Nenhum",
        budgetConfirmado: true,
        prazoDecisao: "30 dias"
      },
      calculateSimPath: (input) => {
        const score = calculateLeadScore(input);
        if (score >= 85) {
          return ["premium-1", "premium-2-enrich", "premium-3-score", "premium-4-tier-a", "premium-5-key-account", "premium-6-whatsapp-exec", "premium-7-slack-war", "premium-8-calendar", "premium-9-protheus", "premium-10-nurture-a"];
        } else if (score >= 65) {
          return ["premium-1", "premium-2-enrich", "premium-3-score", "premium-4-tier-b", "premium-5-inside-sales", "premium-6-whatsapp-inside", "premium-7-slack-team", "premium-8-sequence-b", "premium-9-protheus", "premium-10-nurture-b"];
        } else if (score >= 40) {
          return ["premium-1", "premium-2-enrich", "premium-3-score", "premium-4-tier-c", "premium-5-nurture-sequence", "premium-6-email-drip", "premium-7-linkedin-ads", "premium-8-retargeting", "premium-9-score-recheck"];
        } else {
          return ["premium-1", "premium-2-enrich", "premium-3-score", "premium-4-tier-d", "premium-5-archive", "premium-6-webhook-analytics"];
        }
      }
    },
    nodes: [
      {
        id: "premium-1",
        type: "triggerNode",
        position: { x: 260, y: 20 },
        data: {
          label: "Entrada de Novo Lead (Multi-canal)",
          type: "trigger",
          icon: "zap",
          description: "Captura leads de formulários web, API HubSpot/Salesforce/Pipedrive, chatbot, WhatsApp Business, eventos, indicações e importação CSV.",
          config: {
            source: "Omnichannel Lead Capture API",
            webhookEndpoints: ["/webhook/hubspot", "/webhook/salesforce", "/webhook/pipedrive", "/webhook/facebook", "/webhook/linkedin", "/webhook/chatbot"],
            dedupKey: "email+company"
          }
        }
      },
      {
        id: "premium-2-enrich",
        type: "actionNode",
        position: { x: 260, y: 160 },
        data: {
          label: "Enriquecimento Automático (Clearbit/Apollo/LinkedIn)",
          type: "action",
          icon: "database",
          description: "Busca dados firmográficos (tamanho, receita, tecnologias, localização), dados de contato (telefone direto, LinkedIn, cargo), intenção (tópicos pesquisados, concorrentes avaliados) e tecnologias instaladas.",
          config: {
            enrichmentProviders: ["Clearbit", "Apollo.io", "LinkedIn Sales Navigator", "BuiltWith"],
            enrichFields: ["companySize", "annualRevenue", "technologies", "location", "industry", "directPhone", "linkedinUrl", "jobTitle", "intentTopics", "competitors"],
            cacheTtlHours: 24,
            fallbackToManual: true
          }
        }
      },
      {
        id: "premium-3-score",
        type: "operationNode",
        position: { x: 260, y: 300 },
        data: {
          label: "Lead Scoring Multi-dimensional (AI)",
          type: "operation",
          icon: "calc",
          description: "Calcula score 0-100 combinando: Firmográfico (30%), Comportamental (25%), Intenção (25%), Fit Tecnológico (10%), Timing/Orçamento (10%). Modelo ML retreinado semanalmente.",
          config: {
            formula: "Score = (Firmografico*0.30) + (Comportamental*0.25) + (Intencao*0.25) + (FitTech*0.10) + (Timing*0.10)",
            firmograficoWeights: { revenue: 0.4, employees: 0.3, industry: 0.2, location: 0.1 },
            comportamentalWeights: { pagesVisited: 0.3, timeOnSite: 0.2, downloads: 0.2, emailOpens: 0.15, formSubmits: 0.15 },
            intencaoWeights: { keywords: 0.4, competitorComparison: 0.3, pricingPage: 0.2, demoRequest: 0.1 },
            fitTechWeights: { compatibleStack: 0.6, migrationComplexity: 0.4 },
            timingWeights: { budgetConfirmed: 0.5, decisionTimeline: 0.3, authority: 0.2 },
            modelVersion: "v2.3.1",
            lastRetrained: "2026-09-15"
          }
        }
      },
      {
        id: "premium-4-tier-a",
        type: "conditionNode",
        position: { x: 80, y: 440 },
        data: {
          label: "Tier A (Score ≥ 85) - Enterprise",
          type: "condition",
          icon: "fork",
          description: "Leads qualificados para abordagem direta de Key Accounts com SLA de 15 minutos.",
          config: { field: "Lead Score", operator: ">=", value: "85" }
        }
      },
      {
        id: "premium-4-tier-b",
        type: "conditionNode",
        position: { x: 260, y: 440 },
        data: {
          label: "Tier B (Score 65-84) - Mid-Market",
          type: "condition",
          icon: "fork",
          description: "Leads para Inside Sales com SLA de 1 hora.",
          config: { field: "Lead Score", operator: "range", value: "65-84" }
        }
      },
      {
        id: "premium-4-tier-c",
        type: "conditionNode",
        position: { x: 440, y: 440 },
        data: {
          label: "Tier C (Score 40-64) - Nurturing",
          type: "condition",
          icon: "fork",
          description: "Leads que entram em sequência de nutrição automatizada multi-canal.",
          config: { field: "Lead Score", operator: "range", value: "40-64" }
        }
      },
      {
        id: "premium-4-tier-d",
        type: "conditionNode",
        position: { x: 620, y: 440 },
        data: {
          label: "Tier D (Score < 40) - Archive/Monitor",
          type: "condition",
          icon: "fork",
          description: "Leads de baixo fit: arquivados com monitoramento passivo via retargeting.",
          config: { field: "Lead Score", operator: "<", value: "40" }
        }
      },
      {
        id: "premium-5-key-account",
        type: "actionNode",
        position: { x: 80, y: 580 },
        data: {
          label: "Atribuir Key Account Sênior + Account Plan",
          type: "action",
          icon: "user-plus",
          description: "Vincula ao Key Account designado, gera Account Plan automático com stakeholders, estratégia de entrada e competitive battlecard.",
          config: {
            assigneeGroup: "Key Accounts Sênior",
            generateAccountPlan: true,
            battlecardTemplate: "Enterprise vs Competitors",
            stakeholderMapping: true,
            protheusSyncEnabled: true,
            protheusTable: "SA1 - Clientes",
            protheusOperation: "incluir"
          }
        }
      },
      {
        id: "premium-5-inside-sales",
        type: "actionNode",
        position: { x: 260, y: 580 },
        data: {
          label: "Direcionar Inside Sales (SLA 1h)",
          type: "action",
          icon: "user-plus",
          description: "Atribui ao Inside Sales disponível com menor carga, agenda call de discovery e envia briefing enriquecido.",
          config: {
            assigneeGroup: "Inside Sales Team",
            routingLogic: "least-loaded-round-robin",
            autoScheduleDiscovery: true,
            discoveryDurationMin: 30,
            briefingTemplate: "Enriched Lead Brief"
          }
        }
      },
      {
        id: "premium-5-nurture-sequence",
        type: "actionNode",
        position: { x: 440, y: 580 },
        data: {
          label: "Iniciar Nurturing Sequence Multi-canal",
          type: "action",
          icon: "mail",
          description: "Insere na sequência de nutrição: E-mail Drip (5 toques), LinkedIn Ads (retargeting), WhatsApp opt-in, Web Push.",
          config: {
            sequenceId: "nurture-mid-market-v3",
            channels: ["email", "linkedin", "whatsapp", "web-push"],
            touchpoints: 8,
            durationDays: 45,
            abTestEnabled: true,
            variantControl: "A"
          }
        }
      },
      {
        id: "premium-5-archive",
        type: "actionNode",
        position: { x: 620, y: 580 },
        data: {
          label: "Arquivar com Monitoramento Passivo",
          type: "action",
          icon: "archive",
          description: "Move para lista de monitoramento passivo: retargeting programático, alerta de mudança de cargo/empresa, re-score mensal.",
          config: {
            monitoringEnabled: true,
            retargetingAudiences: ["Google Ads", "LinkedIn", "Meta"],
            reScoreFrequencyDays: 30,
            alertOnJobChange: true,
            alertOnFunding: true
          }
        }
      },
      {
        id: "premium-6-whatsapp-exec",
        type: "actionNode",
        position: { x: 80, y: 720 },
        data: {
          label: "WhatsApp Executivo Personalizado",
          type: "action",
          icon: "whatsapp",
          description: "Envia mensagem via WhatsApp Business API para o decisor com case do segmento, link de agenda Calendly e NDA digital.",
          config: {
            template: "Executive Outreach Premium",
            calendarLink: "calendly.com/key-accounts/demo",
            ndaDigital: true,
            trackOpens: true
          }
        }
      },
      {
        id: "premium-6-whatsapp-inside",
        type: "actionNode",
        position: { x: 260, y: 720 },
        data: {
          label: "WhatsApp Inside Sales + Link Discador",
          type: "action",
          icon: "whatsapp",
          description: "Envia mensagem com link direto para discador VoIP (Aircall/CloudTalk) e resumo do lead enriquecido.",
          config: {
            template: "Inside Sales Quick Connect",
            dialerLink: "app.aircall.io/lead/{{leadId}}",
            includeEnrichmentSummary: true
          }
        }
      },
      {
        id: "premium-6-email-drip",
        type: "actionNode",
        position: { x: 440, y: 720 },
        data: {
          label: "E-mail Drip: Educação + Prova Social",
          type: "action",
          icon: "mail",
          description: "Sequência de 5 e-mails: 1) Artigo técnico, 2) Case study similar, 3) ROI calculator, 4) Webinar convite, 5) Consulta gratuita.",
          config: {
            sequence: "nurture-education-v2",
            personalizationTokens: ["firstName", "company", "industry", "painPoint", "competitor"]
          }
        }
      },
      {
        id: "premium-6-webhook-analytics",
        type: "actionNode",
        position: { x: 620, y: 720 },
        data: {
          label: "Webhook Analytics: Lead Archived",
          type: "action",
          icon: "activity",
          description: "Envia evento para Data Lake / Mixpanel / Amplitude para análise de funil de aquisição e otimização de canais.",
          config: {
            webhookUrl: "https://analytics.company.com/events/lead-archived",
            payload: "full-lead-profile+score-breakdown"
          }
        }
      },
      {
        id: "premium-7-slack-war",
        type: "actionNode",
        position: { x: 80, y: 860 },
        data: {
          label: "Alerta Slack #war-room-enterprise",
          type: "action",
          icon: "bell",
          description: "Notifica canal de guerra com @channel, botões de ação (Aceitar/Delegar/Agendar) e link para Account Plan.",
          config: {
            slackChannel: "#war-room-enterprise",
            interactiveButtons: ["Aceitar Lead", "Delegar", "Agendar Call"],
            includeAccountPlanLink: true
          }
        }
      },
      {
        id: "premium-7-slack-team",
        type: "actionNode",
        position: { x: 260, y: 860 },
        data: {
          label: "Alerta Slack #inside-sales-team",
          type: "action",
          icon: "bell",
          description: "Notifica equipe Inside Sales com @here, cards interativos e métricas de SLA em tempo real.",
          config: {
            slackChannel: "#inside-sales-team",
            interactiveButtons: ["Aceitar", "Reagendar", "Passar Adiante"],
            showSlaTimer: true
          }
        }
      },
      {
        id: "premium-7-linkedin-ads",
        type: "actionNode",
        position: { x: 440, y: 860 },
        data: {
          label: "LinkedIn Matched Audiences Retargeting",
          type: "action",
          icon: "linkedin",
          description: "Adiciona lead à lista de matched audiences no LinkedIn para campanhas de retargeting com criativos dinâmicos por segmento.",
          config: {
            audienceName: "Nurturing Mid-Market {{segment}}",
            creativeTemplates: ["Carousel Cases", "Video Demo", "ROI Calculator"],
            bidStrategy: "max-delivery"
          }
        }
      },
      {
        id: "premium-8-calendar",
        type: "actionNode",
        position: { x: 80, y: 1000 },
        data: {
          label: "Agendamento Inteligente (Calendly/Chili Piper)",
          type: "action",
          icon: "calendar",
          description: "Detecta fuso horário, oferece slots do Key Account, confirma via WhatsApp/E-mail e cria evento no CRM + Google Calendar/Outlook.",
          config: {
            schedulingTool: "Chili Piper",
            timezoneDetection: true,
            autoConfirmWhatsApp: true,
            crmSync: true,
            bufferMinutes: 15
          }
        }
      },
      {
        id: "premium-8-sequence-b",
        type: "actionNode",
        position: { x: 260, y: 1000 },
        data: {
          label: "Sequência B: Discovery + Proposta",
          type: "action",
          icon: "mail",
          description: "Após call de discovery: envia proposta personalizada com ROI calculator, trial access e agendamento de demo técnica.",
          config: {
            sequence: "post-discovery-proposal-v1",
            includeRoiCalculator: true,
            trialAccessLink: "trial.company.com/{{leadId}}",
            technicalDemoScheduling: true
          }
        }
      },
      {
        id: "premium-8-retargeting",
        type: "actionNode",
        position: { x: 440, y: 1000 },
        data: {
          label: "Retargeting Programático Multi-canal",
          type: "action",
          icon: "target",
          description: "Ativa campanhas no Google Display, Meta, LinkedIn, Programmatic (DV360) com criativos dinâmicos baseados em páginas visitadas.",
          config: {
            platforms: ["Google Display", "Meta", "LinkedIn", "DV360"],
            dynamicCreatives: true,
            frequencyCap: 3,
            lookalikeExpansion: true
          }
        }
      },
      {
        id: "premium-9-protheus",
        type: "actionNode",
        position: { x: 80, y: 1140 },
        data: {
          label: "Provisionar no Protheus (SA1/SZ1) + Sync Bidirecional",
          type: "action",
          icon: "database",
          description: "Cria/atualiza cliente no SA1, lead no SZ1, scoring no SZ2, atividades no SZ3. Webhook de volta atualiza score em tempo real.",
          config: {
            protheusSyncEnabled: true,
            tables: ["SA1 - Clientes", "SZ1 - CRM Leads", "SZ2 - Lead Scoring", "SZ3 - Lead Activities"],
            bidirectional: true,
            webhookReturn: "/webhook/protheus/lead-update"
          }
        }
      },
      {
        id: "premium-9-score-recheck",
        type: "actionNode",
        position: { x: 440, y: 1140 },
        data: {
          label: "Agendar Re-score em 30 Dias",
          type: "action",
          icon: "refresh",
          description: "Agenda job assíncrono para re-calcular score com novos dados comportamentais e firmográficos atualizados.",
          config: {
            scheduleInDays: 30,
            triggerOn: ["new-activity", "job-change", "funding-event", "tech-stack-change"],
            webhook: "/api/v1/leads/{{leadId}}/rescore"
          }
        }
      },
      {
        id: "premium-10-nurture-a",
        type: "actionNode",
        position: { x: 80, y: 1280 },
        data: {
          label: "Nurturing Executivo: Executive Briefing",
          type: "action",
          icon: "file",
          description: "Envia Executive Briefing mensal personalizado com insights de mercado, benchmark do setor e roadmap de produto.",
          config: {
            sequence: "executive-briefing-monthly",
            frequency: "monthly",
            personalization: "industry+competitors+tech-stack"
          }
        }
      },
      {
        id: "premium-10-nurture-b",
        type: "actionNode",
        position: { x: 260, y: 1280 },
        data: {
          label: "Nurturing Pós-Discovery: Technical Deep-dive",
          type: "action",
          icon: "cpu",
          description: "Convida para Technical Workshop, envia documentação de API, sandbox access e security questionnaire.",
          config: {
            sequence: "technical-deep-dive",
            workshopInvite: true,
            sandboxAccess: true,
            securityDocs: true
          }
        }
      }
    ],
    edges: [
      { id: "premium-e1", source: "premium-1", target: "premium-2-enrich" },
      { id: "premium-e2", source: "premium-2-enrich", target: "premium-3-score" },
      { id: "premium-e3", source: "premium-3-score", target: "premium-4-tier-a", sourceHandle: "tier-a", label: "Score ≥ 85" },
      { id: "premium-e4", source: "premium-3-score", target: "premium-4-tier-b", sourceHandle: "tier-b", label: "Score 65-84" },
      { id: "premium-e5", source: "premium-3-score", target: "premium-4-tier-c", sourceHandle: "tier-c", label: "Score 40-64" },
      { id: "premium-e6", source: "premium-3-score", target: "premium-4-tier-d", sourceHandle: "tier-d", label: "Score < 40" },

      // Tier A path
      { id: "premium-e7", source: "premium-4-tier-a", target: "premium-5-key-account" },
      { id: "premium-e8", source: "premium-5-key-account", target: "premium-6-whatsapp-exec" },
      { id: "premium-e9", source: "premium-6-whatsapp-exec", target: "premium-7-slack-war" },
      { id: "premium-e10", source: "premium-7-slack-war", target: "premium-8-calendar" },
      { id: "premium-e11", source: "premium-8-calendar", target: "premium-9-protheus" },
      { id: "premium-e12", source: "premium-9-protheus", target: "premium-10-nurture-a" },

      // Tier B path
      { id: "premium-e13", source: "premium-4-tier-b", target: "premium-5-inside-sales" },
      { id: "premium-e14", source: "premium-5-inside-sales", target: "premium-6-whatsapp-inside" },
      { id: "premium-e15", source: "premium-6-whatsapp-inside", target: "premium-7-slack-team" },
      { id: "premium-e16", source: "premium-7-slack-team", target: "premium-8-sequence-b" },
      { id: "premium-e17", source: "premium-8-sequence-b", target: "premium-9-protheus" },
      { id: "premium-e18", source: "premium-9-protheus", target: "premium-10-nurture-b" },

      // Tier C path
      { id: "premium-e19", source: "premium-4-tier-c", target: "premium-5-nurture-sequence" },
      { id: "premium-e20", source: "premium-5-nurture-sequence", target: "premium-6-email-drip" },
      { id: "premium-e21", source: "premium-6-email-drip", target: "premium-7-linkedin-ads" },
      { id: "premium-e22", source: "premium-7-linkedin-ads", target: "premium-8-retargeting" },
      { id: "premium-e23", source: "premium-8-retargeting", target: "premium-9-score-recheck" },

      // Tier D path
      { id: "premium-e24", source: "premium-4-tier-d", target: "premium-5-archive" },
      { id: "premium-e25", source: "premium-5-archive", target: "premium-6-webhook-analytics" }
    ]
  }
};

// Auto-conecta todos os templates de fluxo aos documentos normativos e regulamentos oficiais
export const ALL_FLOW_TEMPLATES: Record<string, FullFlowTemplate> = Object.keys(RAW_FLOW_TEMPLATES).reduce(
  (acc, key) => {
    const template = RAW_FLOW_TEMPLATES[key];
    const { updatedMeta, updatedNodes } = autoConnectFlow(key, template.meta, template.nodes);
    acc[key] = {
      ...template,
      meta: updatedMeta,
      nodes: updatedNodes,
    };
    return acc;
  },
  {} as Record<string, FullFlowTemplate>
);

