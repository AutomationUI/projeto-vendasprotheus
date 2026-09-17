// ─── Automated Workflow & Normative Document Connection Engine ───────────────────
// Este motor conecta TODOS os fluxos visuais do Flow Studio aos documentos oficiais
// regulatórios usados no cálculo de comissões, políticas de vendas, alçadas comerciais,
// normas de crédito e governança corporativa de forma AUTOMÁTICA.
//
// Princípio de Governança:
// Nenhum cálculo de comissão ou aprovação de alçada ocorre sem rastreabilidade
// direta à cláusula do documento homologado correspondente.
//
//   DOCUMENTO REGULATÓRIO → CLÁUSULAS NORMATIVAS → MOTOR DE AUTO-CONEXÃO
//     → NÓS DO FLUXO VINCULADOS → EXECUÇÃO DETERMINÍSTICA AUDITÁVEL

import type { Node } from "reactflow";
import type { CRMNodeData, FlowTemplateMeta } from "@/types/crm-flow";

export interface NormativeClause {
  id: string;
  number: string;              // Ex: "Cláusula 4.2", "Artigo 4º"
  title: string;               // Ex: "Acelerador por Atingimento de Meta (>= 100%)"
  summary: string;             // Resumo executivo da regra
  fullText: string;            // Texto oficial da cláusula no documento
  formulaOrRule?: string;      // Ex: "Comissao = ValorLiquido * 0.05 + ValorLiquido * 0.025"
  erpImpact?: string;          // Ex: "Provisionamento no SE1/SE2 do Protheus ERP"
  targetNodeIds?: string[];    // IDs padrão dos nós que implementam esta cláusula
  matchingKeywords: string[];  // Palavras-chave usadas pelo motor de auto-conexão
}

export interface NormativeDocument {
  id: string;
  title: string;
  subtitle: string;
  category: "governance" | "comercial" | "finance" | "crm" | "erp" | "cs" | "pcp";
  categoryLabel: string;
  type: string;                // "Regulamento de Comissões", "Política de Vendas", etc.
  version: string;
  status: "vigente" | "homologado" | "em_revisao" | "arquivado";
  scope: "global" | "organizacao" | "representante";
  classification: "interno" | "confidencial" | "publico";
  effectiveDate: string;       // "2026-01-01"
  reviewDate?: string;
  description: string;
  erpTables: string[];
  regulatedFlows: string[];    // Flow IDs vinculados
  clauses: NormativeClause[];
  downloadUrl?: string;
  fileSize?: string;
}

// ─── Catálogo Mestre de Documentos Normativos ──────────────────────────────
export const NORMATIVE_DOCUMENTS_CATALOG: NormativeDocument[] = [
  // 1. Regulamento Geral de Comissionamento 2026
  {
    id: "doc-comissao-2026",
    title: "Regulamento Geral de Comissionamento 2026.pdf",
    subtitle: "Regras oficiais de cálculo de comissões, aceleradores de meta, retenção e provisões ERP",
    category: "governance",
    categoryLabel: "Governança & Comissões",
    type: "Regulamento de Comissões",
    version: "v4.0",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-01",
    fileSize: "2.4 MB",
    description: "Documento estatutário que rege a apuração de comissões de vendas, aceleradores de metas, regras de bônus e retenções por inadimplência.",
    erpTables: ["SE1 - Contas a Receber", "SE2 - Contas a Pagar", "SA3 - Vendedores", "SF2 - Notas Fiscais Saída"],
    regulatedFlows: ["commission-engine", "customer-loyalty"],
    clauses: [
      {
        id: "COM-3.1",
        number: "Cláusula 3.1",
        title: "Fato Gerador da Comissão Comercial",
        summary: "A comissão torna-se devida e calculada imediatamente após o faturamento oficial do pedido e emissão da respectiva Nota Fiscal de Saída (SF2) integrada ao Protheus.",
        fullText: "A comissão mercantil do representante comercial torna-se devida e passível de apuração no momento da liquidação ou emissão da Nota Fiscal Eletrônica no TOTVS Protheus, refletindo no módulo financeiro SE1 sob a rubrica de comissão provisionada.",
        erpImpact: "Gatilho automático no Protheus SF2/SE1 após emissão da NF",
        targetNodeIds: ["com-1"],
        matchingKeywords: ["faturamento", "pedido", "nota fiscal", "nf", "se1", "sf2", "gatilho"]
      },
      {
        id: "COM-4.1",
        number: "Cláusula 4.1",
        title: "Alíquota Base de Representação Comercial (5,0%)",
        summary: "A alíquota contratual base para representação mercantil é fixada em 5,0% (cinco por cento) sobre a receita líquida faturada.",
        fullText: "A remuneração básica do parceiro mercantil corresponderá a 5,0% (cinco por cento) calculada sobre a base de cálculo líquida, correspondente ao valor bruto da operação deduzido de impostos não-cumulativos e abatimentos concedidos.",
        formulaOrRule: "ComissaoBase = ValorLiquido * 0.05",
        erpImpact: "Base de cálculo rateada por item de pedido (SC6)",
        targetNodeIds: ["com-3-std", "com-3-bonus"],
        matchingKeywords: ["aliquota base", "5%", "5.0%", "comissao padrao", "aliquota padrao"]
      },
      {
        id: "COM-4.2",
        number: "Cláusula 4.2",
        title: "Acelerador por Atingimento de Meta Mensal (>= 100%)",
        summary: "Caso o representante atinja ou supere 100% da cota mensal, recebe bônus de 2,5%, totalizando 7,5% de comissão sobre os pedidos do período.",
        fullText: "Farão jus a um acelerador extraordinário de 2,5% (dois vírgula cinco pontos percentuais) os representantes comerciais que encerrarem o ciclo mensal com índice de atingimento da meta contratual igual ou superior a 100% (cem por cento).",
        formulaOrRule: "ComissaoFinal = (ValorLiquido * 0.05) + (ValorLiquido * 0.025)",
        erpImpact: "Acréscimo de rubrica de bonificação no Protheus SE2",
        targetNodeIds: ["com-2", "com-3-bonus"],
        matchingKeywords: ["meta atingida", "acelerador", "bonus", "atingimento de meta", ">= 100%", "7.5%"]
      },
      {
        id: "COM-5.1",
        number: "Cláusula 5.1",
        title: "Alíquota de Manutenção para Meta Não Atingida (4,0%)",
        summary: "Na hipótese de não atingimento da cota mensal (< 100%), aplica-se a alíquota de sustentação regulamentar de 4,0%.",
        fullText: "Não tendo sido alcançado o piso de 100% da meta mensal contratada, a remuneração das vendas será computada pela alíquota de manutenção estipulada em 4,0% (quatro por cento), sem o cômputo de adicionais.",
        formulaOrRule: "Comissao = ValorLiquido * 0.04",
        erpImpact: "Cálculo padrão sem bonificação no Protheus",
        targetNodeIds: ["com-3-std"],
        matchingKeywords: ["aliquota padrao", "4%", "4.0%", "meta nao atingida", "< 100%"]
      },
      {
        id: "COM-5.3",
        number: "Cláusula 5.3",
        title: "Retenção Cautelar por Inadimplência da Carteira",
        summary: "Representantes com índice de inadimplência da carteira acima de 3,0% terão seus pagamentos retidos cautelarmente até renegociação.",
        fullText: "Fica assegurado à empresa o direito de retenção temporária da liquidação das comissões sempre que o índice consolidado de títulos vencidos e não pagos da carteira do parceiro ultrapassar 3,0% (três por cento) do saldo a receber total.",
        formulaOrRule: "Se Inadimplencia > 3.0% Então ReterPagamento = Verdadeiro",
        erpImpact: "Bloqueio do título no Protheus SE2 (Campo E2_SALDO travado)",
        targetNodeIds: ["com-5-se1-provision"],
        matchingKeywords: ["inadimplencia", "retencao", "carteira", "bloqueio pagamento"]
      },
      {
        id: "COM-6.1",
        number: "Cláusula 6.1",
        title: "Provisionamento e Liquidação Automática no Protheus ERP",
        summary: "A liquidação de comissões gera automaticamente os títulos de despesa mercantil na tabela SE2 do Protheus.",
        fullText: "O valor final apurado pelo motor determinístico é transmitido via barramento de integração REST para a tabela SE2 do TOTVS Protheus, atribuindo a natureza financeira 'COMISSOES DE REPRESENTACAO' para quitação na folha do dia 15.",
        erpImpact: "Inclusão de registro financeiro SE2 com empresa 01, filial 0101",
        targetNodeIds: ["com-5-se1-provision"],
        matchingKeywords: ["se1", "se2", "provisionar", "pagamento no erp", "protheus"]
      },
      {
        id: "COM-7.0",
        number: "Cláusula 7.0",
        title: "Auditabilidade e Imutabilidade do Extrato de Comissões",
        summary: "Cada cálculo de comissão gera um hash de integridade imutável registrado no módulo de governança comercial.",
        fullText: "É vedada qualquer alteração retroativa ou manual nos montantes comissionados sem registro formal de versão de regra e aprovação do Comitê de Governança Comercial, assegurando determinismo e rastreabilidade total.",
        erpImpact: "Armazenamento do trace auditável no Governance Studio",
        targetNodeIds: ["com-4-audit"],
        matchingKeywords: ["auditoria", "extrato", "determinismo", "imutavel", "governance studio"]
      }
    ]
  },

  // 2. Manual de Diretrizes de Preço, Margem e Desconto v3.2
  {
    id: "doc-diretrizes-preco-v3",
    title: "Manual de Diretrizes de Preço e Desconto v3.2.pdf",
    subtitle: "Regras de alçada para concessão de descontos, margem mínima de contribuição e governança",
    category: "governance",
    categoryLabel: "Governança & Comissões",
    type: "Política de Preços & Descontos",
    version: "v3.2",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-15",
    fileSize: "1.8 MB",
    description: "Normatiza as alçadas de autonomia e os limites estatutários para concessão de descontos comerciais por representantes, gerentes e diretoria.",
    erpTables: ["SC5 - Pedidos de Venda", "SC6 - Itens de Pedido", "DA0 - Tabela de Preços", "DA1 - Itens Tabela de Preços"],
    regulatedFlows: ["discount-approval", "sla-quotes"],
    clauses: [
      {
        id: "DIR-1.0",
        number: "Artigo 1º",
        title: "Submissão de Pedidos com Preço Fora da Tabela",
        summary: "Qualquer proposta contendo desconto fora da tabela vigente (DA0) entra em esteira automática de validação de alçadas.",
        fullText: "Toda proposta comercial confeccionada por representante comercial contendo preço unitário inferior ao preço cadastrado na tabela de preços Protheus (DA0/DA1) será automaticamente retida para auditoria sistêmica de alçada antes da liberação do pedido.",
        erpImpact: "Pedido gravado com status Bloqueado por Regra Comercial no Protheus SC5",
        targetNodeIds: ["disc-1"],
        matchingKeywords: ["submissao", "pedido com desconto", "proposta", "desconto personalizado"]
      },
      {
        id: "DIR-2.0",
        number: "Artigo 2º",
        title: "Desconto Balcão Autorizado (até 5,0%)",
        summary: "Descontos de até 5,0% possuem aprovação sistêmica imediata sem intervenção de gerência.",
        fullText: "O representante comercial possui autonomia para concessão de desconto comercial de até 5,0% (cinco por cento) sem necessidade de parecer prévio, desde que a margem mínima de 25% seja respeitada.",
        formulaOrRule: "Desconto <= 5.0% E Margem >= 25.0% -> AprovacaoAutomatica",
        erpImpact: "Liberação do pedido SC5 para faturamento automático",
        targetNodeIds: ["disc-auto-app"],
        matchingKeywords: ["desconto automatico", "ate 5%", "<= 5%", "aprovacao automatica", "balcao"]
      },
      {
        id: "DIR-3.0",
        number: "Artigo 3º",
        title: "Alçada da Gerência Comercial Regional (5,1% a 15,0%)",
        summary: "Descontos entre 5,1% e 15,0% exigem parecer e aprovação formal do Gerente Regional em até 4 horas.",
        fullText: "Descontos superiores a 5,0% e limitados a 15,0% (quinze por cento) dependem de prévia e expressa autorização do Gerente Comercial Regional da respectiva praça comercial, com SLA de resposta de 4 horas úteis.",
        formulaOrRule: "5.0% < Desconto <= 15.0% -> RequerAprovacaoGerente",
        erpImpact: "Fila de pendência no módulo Aprovadores CRM",
        targetNodeIds: ["disc-3-ger"],
        matchingKeywords: ["gerente regional", "gerencia comercial", "aprovacao gerente", "5 a 15%"]
      },
      {
        id: "DIR-4.0",
        number: "Artigo 4º",
        title: "Alçada Estatutária de Diretoria Comercial (> 15,0%)",
        summary: "Descontos superiores a 15,0% competem exclusivamente à Diretoria Comercial com análise de margem de contribuição.",
        fullText: "A concessão de descontos superiores a 15,0% (quinze por cento) configura alçada especial estatutária, cabendo única e privativamente à Diretoria Comercial a deliberação, condicionada à preservação da margem de contribuição líquida.",
        formulaOrRule: "Desconto > 15.0% -> RequerAprovacaoDiretoria",
        erpImpact: "Notificação urgente via WhatsApp e Slack da Diretoria",
        targetNodeIds: ["disc-2", "disc-4-esc-dir"],
        matchingKeywords: ["diretoria comercial", "alcada diretoria", "> 15%", "desconto > 15%", "diretoria"]
      },
      {
        id: "DIR-5.0",
        number: "Artigo 5º",
        title: "Auditoria Obrigatória de Margem Mínima (>= 25,0%)",
        summary: "Para concessão de qualquer alçada acima de 15%, a margem líquida de contribuição deve ser igual ou superior a 25,0%.",
        fullText: "A deliberação favorável da Diretoria Comercial pressupõe que o Markup e a margem líquida de contribuição da operação permaneçam em patamar igual ou superior a 25,0% (vinte e cinco por cento).",
        formulaOrRule: "MargemContribuicao >= 25.0%",
        erpImpact: "Cálculo determinístico com base no custo de reposição Protheus SB1/SB2",
        targetNodeIds: ["disc-3-dir"],
        matchingKeywords: ["margem minima", "margem de contribuicao", ">= 25%", "markup"]
      },
      {
        id: "DIR-8.0",
        number: "Artigo 8º",
        title: "Bloqueio Sumário de Margem Crítica (< 5,0%)",
        summary: "Operações com margem inferior a 5,0% são sumariamente vetadas pelo sistema para proteger a rentabilidade.",
        fullText: "Fica expressamente vedada a aprovação de qualquer operação comercial cuja margem de contribuição líquida resulte inferior a 5,0% (cinco por cento), sendo a proposta sumariamente cancelada pelo sistema com emissão de parecer de risco.",
        formulaOrRule: "Se Margem < 5.0% Então BloqueioSumario = Verdadeiro",
        erpImpact: "Cancelamento do pedido no Protheus SC5 (Status Rejeitado)",
        targetNodeIds: ["disc-5-block-margin"],
        matchingKeywords: ["bloqueio margem", "margem critica", "veto", "< 5%", "bloquear"]
      },
      {
        id: "DIR-10.0",
        number: "Artigo 10º",
        title: "Comunicação Formal de Parecer ao Representante",
        summary: "O representante emitente é notificado via WhatsApp e sistema com o parecer e justificativa formal da alçada.",
        fullText: "Concluída a deliberação na esteira de alçadas, o sistema despachará notificação ao representante responsável detalhando o percentual aprovado, vigência e eventuais contrapartidas exigidas.",
        erpImpact: "Registro de notificação no CRM e mensagem transacional",
        targetNodeIds: ["disc-notify-rep"],
        matchingKeywords: ["notificar", "notificacao representante", "parecer", "whatsapp"]
      }
    ]
  },

  // 3. Política Corporativa de Crédito, Risco e Cobrança Preventiva
  {
    id: "doc-credito-cobranca-2026",
    title: "Política Corporativa de Crédito, Risco e Cobrança Preventiva 2026.pdf",
    subtitle: "Régua preventiva de cobrança D-3 a D+15, análise Serasa e suspensão de crédito",
    category: "finance",
    categoryLabel: "Financeiro & Crédito",
    type: "Política de Crédito & Cobrança",
    version: "v2.1",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-02-01",
    fileSize: "2.1 MB",
    description: "Determina os procedimentos e réguas de cobrança amigável e contenciosa, emissão de boletos/PIX e bloqueio cadastral de inadimplentes.",
    erpTables: ["SE1 - Contas a Receber", "SA1 - Clientes", "SE5 - Movimentação Bancária"],
    regulatedFlows: ["credit-billing"],
    clauses: [
      {
        id: "CRE-1.0",
        number: "Regra C-1",
        title: "Régua Preventiva de Vencimento D-3 (Aviso Amigável e PIX Copia e Cola)",
        summary: "Três dias antes do vencimento do título, o cliente recebe lembrete no WhatsApp com código de barras e chave PIX.",
        fullText: "Com antecedência de 3 (três) dias corridos da data de vencimento registrada no Protheus SE1, o sistema expedirá mensagem de cortesia ao responsável financeiro com dados para quitação instantânea via PIX e código de barras.",
        erpImpact: "Verificação diária dos títulos com vencimento em D+3 na tabela SE1",
        targetNodeIds: ["bill-1", "bill-2", "bill-3-pix"],
        matchingKeywords: ["d-3", "lembrete", "vencimento", "pix", "cobranca preventiva"]
      },
      {
        id: "CRE-2.0",
        number: "Regra C-2",
        title: "Carência de Tolerância e Re-notificação D+2",
        summary: "Após 2 dias de atraso, reenvia notificação com cálculo automático de juros legais e multa Protheus.",
        fullText: "Decorrido o prazo de 2 (dois) dias sem baixa do título na tabela SE5, nova comunicação é disparada ao cliente com o valor corrigido conforme as taxas cadastradas no parâmetro MV_JUROS do Protheus.",
        erpImpact: "Atualização do saldo devedor com acréscimos na tabela SE1",
        targetNodeIds: ["bill-4-d2-alert"],
        matchingKeywords: ["d+2", "atraso", "juros", "renotificacao"]
      },
      {
        id: "CRE-3.0",
        number: "Regra C-3",
        title: "Suspensão Automática de Limite e Bloqueio de Pedidos (D+5)",
        summary: "Atingidos 5 dias de inadimplência, o limite de crédito do cliente é travado no Protheus SA1.",
        fullText: "Ao quinto dia útil de atraso consecutivo, o cadastro do sacado é classificado com status 'BLOQUEIO DE CRÉDITO' no TOTVS Protheus (A1_RISCO = 'E'), suspendendo a aprovação de quaisquer novos pedidos de venda.",
        erpImpact: "Alteração do campo A1_MSBLQL e A1_RISCO no cadastro SA1",
        targetNodeIds: ["bill-5-block-credit"],
        matchingKeywords: ["d+5", "bloqueio de credito", "suspensao", "limite de credito", "risco"]
      },
      {
        id: "CRE-4.0",
        number: "Regra C-4",
        title: "Encaminhamento para Protesto Cartorário e Negativação (D+15)",
        summary: "Com 15 dias de atraso, o título é encaminhado para instrução de protesto bancário e negativação Serasa.",
        fullText: "Transcorridos 15 (quinze) dias do vencimento sem adimplemento, a cobrança é transferida para o departamento jurídico com geração de arquivo CNAB de instrução de protesto em cartório.",
        erpImpact: "Geração de registro de instrução bancária CNAB 400/240",
        targetNodeIds: ["bill-6-serasa-protest"],
        matchingKeywords: ["d+15", "protesto", "serasa", "cobranca juridica"]
      }
    ]
  },

  // 4. POP-COM-01: Roteamento e Qualificação de Leads Enterprise & Inside
  {
    id: "doc-pop-leads-2026",
    title: "POP-COM-01: Roteamento e Qualificação de Contas Enterprise & Inside.pdf",
    subtitle: "Critérios de segmentação por faturamento, distribuição de leads e SLA de primeiro contato",
    category: "crm",
    categoryLabel: "Comercial & CRM",
    type: "Procedimento Operacional Padrão",
    version: "v2.4",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-10",
    fileSize: "1.5 MB",
    description: "Define a taxonomia de qualificação de leads, alocação para carteiras de grandes contas (Enterprise) ou time de vendas internas (Inside Sales).",
    erpTables: ["SA1 - Clientes", "SZ1 - CRM Leads"],
    regulatedFlows: ["lead-routing"],
    clauses: [
      {
        id: "LEA-1.0",
        number: "Seção 1.2",
        title: "Critério de Enquadramento no Tier Enterprise (Receita >= R$ 50M)",
        summary: "Empresas com faturamento anual presumido a partir de R$ 50 milhões são classificadas como Contas Estratégicas.",
        fullText: "Considera-se oportunidade Enterprise qualquer organização com receita operacional bruta anual estimada igual ou superior a R$ 50.000.000,00 (cinquenta milhões de reais), demandando atendimento sênior e proposta técnica customizada.",
        formulaOrRule: "FaturamentoAnual >= 50000000 -> Classificacao = 'Enterprise'",
        erpImpact: "Marcação de segmento Estratégico no cadastro SA1 do Protheus",
        targetNodeIds: ["lead-1", "lead-2", "lead-3-enterprise"],
        matchingKeywords: ["enterprise", "faturamento anual", "50000000", ">= 50 milhoes", "receita"]
      },
      {
        id: "LEA-2.0",
        number: "Seção 2.1",
        title: "Atribuição a Key Accounts Sênior e Sincronismo no ERP",
        summary: "Leads Enterprise são designados a executivos sêniores e inseridos preliminarmente na base Protheus.",
        fullText: "A qualificação Enterprise aciona o registro automático do prospect na tabela de clientes SA1 do Protheus e aloca a oportunidade na carteira de um Key Account Manager sênior.",
        erpImpact: "Inclusão prévia de registro SA1 no Protheus",
        targetNodeIds: ["lead-3-enterprise", "lead-6-protheus"],
        matchingKeywords: ["key accounts", "atribuir", "sa1", "clientes", "protheus"]
      },
      {
        id: "LEA-3.0",
        number: "Seção 3.0",
        title: "Direcionamento para Inside Sales e SLA de 15 Minutos",
        summary: "Leads de faturamento inferior a R$ 50M são atribuídos ao time de vendas internas com SLA de contato em 15 minutos.",
        fullText: "Contas de perfil Small & Mid Business são direcionadas à esteira de Inside Sales, exigindo o primeiro contato por discador ou mensagem em até 15 minutos após a submissão no portal.",
        erpImpact: "Registro de SLA no módulo CRM",
        targetNodeIds: ["lead-3-inside", "lead-5-slack-inside"],
        matchingKeywords: ["inside sales", "sla 15min", "vendas internas", "slack"]
      }
    ]
  },

  // 4b. POP-COM-01-PREMIUM: Roteamento Inteligente de Leads com AI Scoring & Omnichannel
  {
    id: "doc-pop-leads-premium-2026",
    title: "POP-COM-01-PREMIUM: Roteamento Inteligente de Leads com AI Scoring & Omnichannel.pdf",
    subtitle: "Lead Scoring multi-dimensional, enriquecimento automático, roteamento omnicanal, SLA dinâmico, A/B testing e nurturing",
    category: "crm",
    categoryLabel: "Comercial & CRM",
    type: "Procedimento Operacional Padrão Premium",
    version: "v1.0",
    status: "vigente",
    scope: "global",
    classification: "confidencial",
    effectiveDate: "2026-09-17",
    fileSize: "4.2 MB",
    description: "Especificação enterprise para roteamento inteligente de leads com scoring AI (firmográfico + comportamental + intenção + fit tecnológico + timing), enriquecimento via Clearbit/Apollo/LinkedIn, roteamento omnicanal (WhatsApp/Slack/E-mail/Teams/Telefone), SLA dinâmico por tier, A/B testing de rotas, sequências de nurturing multi-canal e sincronismo bidirecional com Protheus.",
    erpTables: ["SA1 - Clientes", "SZ1 - CRM Leads", "SZ2 - Lead Scoring", "SZ3 - Lead Activities", "SZ4 - Nurturing Sequences"],
    regulatedFlows: ["lead-routing-premium"],
    clauses: [
      {
        id: "LEA-P-1.0",
        number: "Seção 1.1",
        title: "Captura Omnichannel e Deduplicação Inteligente",
        summary: "Leads capturados de múltiplos canais (Web, HubSpot, Salesforce, Pipedrive, Facebook, LinkedIn, Chatbot, WhatsApp, Eventos, CSV) com deduplicação por email+empresa.",
        fullText: "O sistema deve aceitar leads via webhooks padronizados de todas as fontes integradas. A deduplicação utiliza chave composta email+company_name normalizado, mantendo o lead mais rico (maior score ou mais dados enriquecidos).",
        erpImpact: "Registro unificado na tabela SZ1 do Protheus",
        targetNodeIds: ["premium-1"],
        matchingKeywords: ["omnichannel", "webhook", "hubspot", "salesforce", "pipedrive", "deduplicacao", "chatbot", "whatsapp", "linkedin"]
      },
      {
        id: "LEA-P-2.0",
        number: "Seção 2.1",
        title: "Enriquecimento Automático Multi-Provider",
        summary: "Enriquecimento paralelo via Clearbit, Apollo.io, LinkedIn Sales Navigator e BuiltWith com cache de 24h e fallback manual.",
        fullText: "Ao receber novo lead, o sistema dispara enriquecimento assíncrono em todos os providers configurados. Campos alvo: tamanho da empresa, receita anual, stack tecnológico, localização, indústria, telefone direto, URL LinkedIn, cargo do contato, tópicos de intenção, concorrentes avaliados. Resultados mesclados com prioridade: Clearbit > Apollo > LinkedIn > BuiltWith.",
        formulaOrRule: "Enrichment = Merge(Clearbit, Apollo, LinkedIn, BuiltWith) com prioridade definida",
        erpImpact: "Campos enriquecidos gravados nas tabelas SZ1/SZ2 do Protheus",
        targetNodeIds: ["premium-2-enrich"],
        matchingKeywords: ["enriquecimento", "clearbit", "apollo", "linkedin", "builtwith", "firmografico", "intencao", "tecnologias"]
      },
      {
        id: "LEA-P-3.0",
        number: "Seção 3.2",
        title: "Lead Scoring Multi-dimensional com Modelo ML",
        summary: "Score 0-100 combinando: Firmográfico 30%, Comportamental 25%, Intenção 25%, Fit Tecnológico 10%, Timing/Orçamento 10%. Modelo retreinado semanalmente.",
        fullText: "O motor de scoring calcula cinco dimensões ponderadas: (1) Firmográfico - receita, funcionários, indústria, localização; (2) Comportamental - páginas visitadas, tempo no site, downloads, abertura de e-mails, submissões; (3) Intenção - palavras-chave pesquisadas, comparação com concorrentes, visita à página de preços, solicitação de demo; (4) Fit Tecnológico - compatibilidade de stack, complexidade de migração; (5) Timing - orçamento confirmado, prazo de decisão, autoridade do contato. Score final = Σ(dimensão × peso). Modelo v2.3.1 retreinado semanalmente com dados de conversão.",
        formulaOrRule: "Score = Firmografico*0.30 + Comportamental*0.25 + Intencao*0.25 + FitTech*0.10 + Timing*0.10",
        erpImpact: "Score gravado na tabela SZ2 do Protheus com versionamento de modelo",
        targetNodeIds: ["premium-3-score"],
        matchingKeywords: ["lead scoring", "ai", "machine learning", "firmografico", "comportamental", "intencao", "fit tecnologico", "timing", "modelo"]
      },
      {
        id: "LEA-P-4.0",
        number: "Seção 4.1",
        title: "Classificação em 4 Tiers com SLA Diferenciado",
        summary: "Tier A (≥85): Key Accounts, SLA 15min. Tier B (65-84): Inside Sales, SLA 1h. Tier C (40-64): Nurturing 45 dias. Tier D (<40): Archive com monitoramento.",
        fullText: "A classificação por score define o fluxo de atendimento: Tier A (Enterprise) - Key Account Sênior com Account Plan, battlecard, WhatsApp executivo, Slack #war-room, agendamento Calendly/Chili Piper, nurturing executivo mensal. Tier B (Mid-Market) - Inside Sales com roteamento least-loaded, discovery 30min, WhatsApp com link discador, Slack #inside-sales-team, sequência pós-discovery. Tier C (Nurturing) - Sequência multi-canal 8 toques/45 dias (e-mail drip, LinkedIn Ads, WhatsApp opt-in, web push, retargeting programático) com A/B testing ativo. Tier D (Archive) - Monitoramento passivo com retargeting Google/Meta/LinkedIn, re-score mensal, alertas de mudança de cargo/funding.",
        erpImpact: "Tier gravado no campo customizado SZ1_TIER do Protheus",
        targetNodeIds: ["premium-4-tier-a", "premium-4-tier-b", "premium-4-tier-c", "premium-4-tier-d"],
        matchingKeywords: ["tier", "classificacao", "sla", "key account", "inside sales", "nurturing", "archive", "monitoramento"]
      },
      {
        id: "LEA-P-5.0",
        number: "Seção 5.1",
        title: "Roteamento Omnichannel por Tier",
        summary: "WhatsApp Business API (executivo/inside), Slack (war-room/team), E-mail (drip/proposta), LinkedIn Matched Audiences, Calendly/Chili Piper, Web Push, SMS.",
        fullText: "Cada tier ativa canais específicos: Tier A - WhatsApp executivo com NDA digital + Calendly + Slack #war-room-enterprise com botões interativos. Tier B - WhatsApp inside sales com link discador Aircall + Slack #inside-sales-team com timer SLA. Tier C - E-mail drip educativo (5 toques) + LinkedIn Matched Audiences (carousel/video/ROI) + Retargeting programático (Google/Meta/LinkedIn/DV360) + Web Push. Tier D - Webhook analytics para Data Lake (Mixpanel/Amplitude) + Audiences de retargeting + Alertas de job change/funding.",
        erpImpact: "Logs de canal gravados na tabela SZ3 do Protheus",
        targetNodeIds: ["premium-6-whatsapp-exec", "premium-6-whatsapp-inside", "premium-6-email-drip", "premium-7-slack-war", "premium-7-slack-team", "premium-7-linkedin-ads", "premium-8-calendar", "premium-8-sequence-b", "premium-8-retargeting", "premium-6-webhook-analytics"],
        matchingKeywords: ["whatsapp", "slack", "email", "linkedin", "calendly", "chili piper", "aircall", "retargeting", "webhook", "analytics"]
      },
      {
        id: "LEA-P-6.0",
        number: "Seção 6.3",
        title: "Sincronismo Bidirecional Protheus (SA1/SZ1/SZ2/SZ3/SZ4)",
        summary: "Criação/atualização em tempo real no Protheus com webhook de retorno para atualização de score e atividades.",
        fullText: "O fluxo premium mantém sincronismo bidirecional: (1) Lead enriquecido e scoreado gravado nas tabelas SA1 (cliente), SZ1 (lead), SZ2 (score), SZ3 (atividades), SZ4 (sequências de nurturing). (2) Webhook de retorno /webhook/protheus/lead-update recebe atualizações do ERP (mudança de status, nova atividade, pedido criado) e re-calcula score em tempo real. (3) Job agendado de re-score a cada 30 dias ou por eventos gatilho (nova atividade, mudança de cargo, funding, mudança de stack).",
        formulaOrRule: "SyncBidirecional = (CRM -> Protheus: SA1/SZ1/SZ2/SZ3/SZ4) + (Protheus -> CRM: webhook + job 30d)",
        erpImpact: "Tabelas SA1, SZ1, SZ2, SZ3, SZ4 atualizadas em tempo real via REST Protheus",
        targetNodeIds: ["premium-9-protheus", "premium-9-score-recheck"],
        matchingKeywords: ["protheus", "bidirecional", "sincronismo", "sa1", "sz1", "sz2", "sz3", "sz4", "webhook", "re-score"]
      },
      {
        id: "LEA-P-7.0",
        number: "Seção 7.1",
        title: "Nurturing Sequences: Executive Briefing & Technical Deep-dive",
        summary: "Tier A recebe Executive Briefing mensal personalizado. Tier B recebe Technical Deep-dive pós-discovery com sandbox e security docs.",
        fullText: "Sequências de nutrição premium diferenciadas por tier: Tier A - Executive Briefing mensal com insights de mercado, benchmark setorial, roadmap de produto, personalizado por indústria/concorrentes/tech-stack. Tier B - Technical Deep-dive com convite a workshop técnico, acesso a sandbox, documentação de API, security questionnaire. Ambas com tracking de abertura, cliques, tempo de leitura e conversão para próxima etapa.",
        erpImpact: "Engajamento gravado na tabela SZ4 do Protheus",
        targetNodeIds: ["premium-10-nurture-a", "premium-10-nurture-b"],
        matchingKeywords: ["nurturing", "executive briefing", "technical deep-dive", "sandbox", "security", "workshop", "roadmap"]
      },
      {
        id: "LEA-P-8.0",
        number: "Seção 8.0",
        title: "A/B Testing Contínuo de Rotas e Criativos",
        summary: "Testes A/B ativos em nurturing sequences (variant A vs B), criativos LinkedIn, subject lines e-mail, templates WhatsApp.",
        fullText: "O sistema executa testes A/B contínuos: (1) Nurturing sequences - variant A (controle) vs B (tratamento) com divisão 50/50, métrica primária taxa de resposta/reply. (2) LinkedIn Ads - carousel vs video vs ROI calculator. (3) E-mail - subject lines, horários, personalização. (4) WhatsApp - templates curtos vs longos, com vs sem NDA link. Resultados alimentam retreinamento do modelo de scoring.",
        erpImpact: "Resultados de teste gravados para Governance Studio e retreinamento ML",
        targetNodeIds: ["premium-5-nurture-sequence", "premium-7-linkedin-ads", "premium-6-email-drip", "premium-6-whatsapp-exec", "premium-6-whatsapp-inside"],
        matchingKeywords: ["ab testing", "a/b test", "variant", "controle", "tratamento", "metrica", "retrain"]
      }
    ]
  },

  // 5. Manual de Integração REST e Mensageria TOTVS Protheus ERP
  {
    id: "doc-manual-protheus-erp",
    title: "Manual de Integração REST e Mensageria TOTVS Protheus ERP.pdf",
    subtitle: "Especificações de barramento, idempotência de pedidos, contingência e retry",
    category: "erp",
    categoryLabel: "ERP TOTVS & Integrações",
    type: "Manual Técnico de Integração",
    version: "v5.1",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-05",
    fileSize: "3.2 MB",
    description: "Normatiza as rotas REST do ERP Protheus, padrões de cabeçalho, tolerâncias a timeout e barramento com fila de contingência Dead Letter Queue.",
    erpTables: ["SC5 - Pedidos de Venda", "SC6 - Itens de Pedido", "SA1 - Clientes", "SB1 - Produtos"],
    regulatedFlows: ["protheus-sync"],
    clauses: [
      {
        id: "ERP-1.0",
        number: "Capítulo 2",
        title: "Validação de Idempotência e Hash de Unicidade do Pedido",
        summary: "Todo pedido submetido deve possuir chave de idempotência para impedir duplicidade de faturamento.",
        fullText: "O barramento de integração exige que cada requisição de inclusão no endpoint /api/v1/salesorders possua o cabeçalho 'X-Idempotency-Key' composto pela concatenação do ID da cotação, CNPJ do cliente e timestamp de submissão.",
        erpImpact: "Validação de chave única na tabela SC5",
        targetNodeIds: ["sync-1", "sync-2"],
        matchingKeywords: ["idempotencia", "unicidade", "duplicidade", "sc5", "pedidos"]
      },
      {
        id: "ERP-2.0",
        number: "Capítulo 4",
        title: "Tolerância a Timeout (5000ms) e Fallback para Fila Kafka",
        summary: "Falhas de comunicação ou latência superior a 5000ms desviam a mensagem para fila de contingência segura.",
        fullText: "Em caso de indisponibilidade da API Protheus REST ou tempo de resposta excedendo o limiar de 5000ms, o payload é preservado na fila de contingência (Dead Letter Queue) com 3 retentativas exponenciais.",
        erpImpact: "Preservação da integridade transacional sem perda de pedidos",
        targetNodeIds: ["sync-3-timeout", "sync-4-dead-letter", "sync-5-retry-buffer"],
        matchingKeywords: ["timeout", "latencia", "5000ms", "dead letter", "kafka", "retry"]
      }
    ]
  },

  // 6. Regulamento do Programa Fidelidade, Cashback e Retenção B2B
  {
    id: "doc-fidelidade-retencao-2026",
    title: "Regulamento do Programa Fidelidade, Cashback e Retenção B2B.pdf",
    subtitle: "Concessão de créditos de cashback em recompras, bonificação de frete e prazos",
    category: "cs",
    categoryLabel: "Pós-Venda & CS",
    type: "Regulamento Comercial",
    version: "v1.8",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-02-15",
    fileSize: "1.4 MB",
    description: "Estabelece os parâmetros de fidelização de clientes da carteira com cashback creditado em até 45 dias da última compra.",
    erpTables: ["SA1 - Clientes", "SC5 - Pedidos de Venda"],
    regulatedFlows: ["customer-loyalty"],
    clauses: [
      {
        id: "FID-1.0",
        number: "Artigo 2º",
        title: "Janela de Recompra Bonificada (Ciclo de 45 Dias)",
        summary: "Clientes que realizam novos pedidos em até 45 dias da última fatura qualificam para bonificação.",
        fullText: "Os clientes ativos que emitirem nova ordem de fornecimento dentro do intervalo de até 45 (quarenta e cinco) dias corridos da fatura anterior serão classificados como 'Clientes Fidelidade A'.",
        erpImpact: "Concessão de desconto financeiro na tabela SE1",
        targetNodeIds: ["loyalty-1", "loyalty-2"],
        matchingKeywords: ["recompra", "fidelidade", "45 dias", "ciclo"]
      },
      {
        id: "FID-3.0",
        number: "Artigo 4º",
        title: "Crédito de Cashback de 3,0% para Próximo Faturamento",
        summary: "Concede crédito de 3% sobre o volume da compra para abatimento no próximo pedido.",
        fullText: "Atingido o critério de recorrência, o sistema provisiona crédito de 3,0% (três por cento) do valor total líquido para abatimento automático na próxima fatura comercial.",
        formulaOrRule: "Cashback = ValorLiquido * 0.03",
        erpImpact: "Registro de crédito em conta corrente mercantil Protheus",
        targetNodeIds: ["loyalty-3-cashback"],
        matchingKeywords: ["cashback", "3%", "credito", "recompra bonificada"]
      }
    ]
  },

  // 7. Norma Corporativa de SLA e Validade de Propostas Comerciais
  {
    id: "doc-sla-cotacoes-2026",
    title: "Norma Corporativa de SLA e Validade de Propostas Comerciais.pdf",
    subtitle: "Validade máxima de cotações, regras de prorrogação e disparo de ofertas relâmpago",
    category: "crm",
    categoryLabel: "Comercial & CRM",
    type: "Norma Comercial",
    version: "v2.0",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-20",
    fileSize: "1.2 MB",
    description: "Determina o prazo padrão de 7 dias para expiração de orçamentos e cotações, com disparo de follow-ups automatizados.",
    erpTables: ["SCJ - Orçamentos de Venda", "SCK - Itens do Orçamento"],
    regulatedFlows: ["sla-quotes"],
    clauses: [
      {
        id: "SLA-1.0",
        number: "Diretriz 1.0",
        title: "Prazo Regulamentar de Validade da Cotação (7 Dias Úteis)",
        summary: "Propostas comerciais possuem validade de 7 dias úteis a contar da emissão pelo representante.",
        fullText: "As cotações de preços emitidas pelo sistema CRM terão prazo de validade estrito de 7 (sete) dias úteis, expirando os valores orçados após esse período em virtude de variações de custo de insumos.",
        erpImpact: "Expiração do status do orçamento na tabela SCJ do Protheus",
        targetNodeIds: ["sla-1", "sla-2"],
        matchingKeywords: ["validade", "7 dias", "cotacao", "orcamento", "sla"]
      },
      {
        id: "SLA-2.0",
        number: "Diretriz 2.4",
        title: "Oferta Relâmpago de Conversão (+3,0% de Desconto em D-1 da Expiração)",
        summary: "Um dia antes de expirar a cotação, o sistema oferece +3% de desconto condicionado ao fechamento imediato.",
        fullText: "Constatando-se a ausência de fechamento a 24 horas da expiração da proposta, o sistema está autorizado a ofertar condição especial com bonificação extraordinária de até 3,0% para conversão imediata.",
        formulaOrRule: "DescontoFinal = DescontoAtual + 3.0%",
        erpImpact: "Atualização transitória da tabela SCK com flag de aceite expresso",
        targetNodeIds: ["sla-3-urgencia-whatsapp"],
        matchingKeywords: ["oferta relampago", "desconto 3%", "fechamento", "urgencia"]
      }
    ]
  },

  // 8. Diretriz Operacional de Reativação de Clientes Inativos (Churn)
  {
    id: "doc-churn-recovery-2026",
    title: "Diretriz Operacional de Reativação de Clientes Inativos.pdf",
    subtitle: "Identificação de inatividade de 60 dias, incentivos de frete CIF e retenção de contas",
    category: "cs",
    categoryLabel: "Pós-Venda & CS",
    type: "Diretriz Comercial",
    version: "v1.5",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-02-10",
    fileSize: "1.3 MB",
    description: "Procedimentos comerciais para reengajamento de contas da carteira sem compras há mais de 60 dias corridos.",
    erpTables: ["SA1 - Clientes", "SC5 - Pedidos de Venda"],
    regulatedFlows: ["churn-recovery"],
    clauses: [
      {
        id: "CHU-1.0",
        number: "Critério 1.0",
        title: "Classificação de Cliente Inativo (Período sem Compras >= 60 Dias)",
        summary: "Contas sem emissão de pedidos há mais de 60 dias acionam alarme de risco de churn no CRM.",
        fullText: "Será considerado em situação de inatividade o cliente cadastrado que completar 60 (sessenta) dias ininterruptos sem registro de novas ordens de faturamento no Protheus.",
        erpImpact: "Sinalização no painel de carteira do representante comercial",
        targetNodeIds: ["churn-1", "churn-2"],
        matchingKeywords: ["inativo", "churn", "60 dias", "recuperacao"]
      },
      {
        id: "CHU-2.0",
        number: "Critério 2.1",
        title: "Concessão Extraordinária de Frete CIF Bonificado na Reativação",
        summary: "A primeira compra de reativação conta com frete por conta da empresa (CIF) até o limite contratual.",
        fullText: "Como incentivo de reativação comercial, a primeira fatura decorrente da campanha terá a cláusula de frete convertida para CIF, assumindo a empresa os custos de transporte rodoviário.",
        erpImpact: "Marcação do campo C5_TPFRETE = 'C' no Protheus SC5",
        targetNodeIds: ["churn-3-frete-cif"],
        matchingKeywords: ["frete cif", "bonificacao", "reativacao", "cif"]
      }
    ]
  },

  // 9. Matriz de Escalação e Notificações Críticas Multi-Canal
  {
    id: "doc-omnichannel-alerts-2026",
    title: "Matriz de Escalação e Notificações Críticas Multi-Canal.pdf",
    subtitle: "Protocolos de severidade INFO, WARNING e CRITICAL, canais WhatsApp, Slack, SMS e VoIP",
    category: "governance",
    categoryLabel: "Governança & Comissões",
    type: "Matriz de Comunicação",
    version: "v3.0",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-01-30",
    fileSize: "1.7 MB",
    description: "Define a taxonomia de severidade para eventos operacionais e a matriz de despacho em múltiplos canais de comunicação.",
    erpTables: ["SZ1 - Logs de Auditoria", "SA3 - Vendedores"],
    regulatedFlows: ["omnichannel-alerts"],
    clauses: [
      {
        id: "ALE-1.0",
        number: "Protocolo Nível 1",
        title: "Alertas Informativos de Rotina (INFO)",
        summary: "Notificações de acompanhamento despachadas via Push Notification e E-mail comercial.",
        fullText: "Eventos operacionais de severidade informativa (INFO) serão encaminhados preferencialmente por push no aplicativo do representante e sumário eletrônico por e-mail.",
        erpImpact: "Log registrado no repositório de eventos",
        targetNodeIds: ["alert-1", "alert-2", "alert-3-info"],
        matchingKeywords: ["info", "notificacao", "push", "email"]
      },
      {
        id: "ALE-2.0",
        number: "Protocolo Nível 2",
        title: "Alertas de Risco Operacional ou Margem (WARNING)",
        summary: "Notificações que demandam atenção imediata disparadas no WhatsApp Business e canais do Slack.",
        fullText: "Inconsistências de margem, cancelamentos inesperados ou pedidos em retenção acionam alerta direto no WhatsApp do gestor da conta e postagem automatizada no canal #alertas-vendas.",
        erpImpact: "Despacho via webhook Protheus",
        targetNodeIds: ["alert-3-warning"],
        matchingKeywords: ["warning", "risco", "whatsapp", "slack"]
      },
      {
        id: "ALE-3.0",
        number: "Protocolo Nível 3",
        title: "Incidentes Críticos e Parada de Faturamento (CRITICAL)",
        summary: "Eventos impeditivos de faturamento que acionam SMS de emergência e escalação à Diretoria.",
        fullText: "Falhas de integração ERP, tentativas de fraude cadastral ou desvios de alçada não-autorizados geram despacho instantâneo de SMS emergencial e chamada VoIP para o Diretor Responsável.",
        erpImpact: "Travamento de filas de emissão no Protheus",
        targetNodeIds: ["alert-3-critical", "alert-4-sms-exec"],
        matchingKeywords: ["critical", "urgencia", "sms", "diretoria", "incidente"]
      }
    ]
  },

  // 10. Instrução de Trabalho Fabril: Rastreabilidade PCP e Chão de Fábrica
  {
    id: "doc-pcp-producao-2026",
    title: "Instrução de Trabalho Fabril: Rastreabilidade PCP e Chão de Fábrica.pdf",
    subtitle: "Apontamento de ordens SC2 Protheus, inspeção de qualidade CQ e liberação de expedição",
    category: "pcp",
    categoryLabel: "Engenharia & PCP",
    type: "Instrução de Trabalho",
    version: "v4.2",
    status: "vigente",
    scope: "global",
    classification: "interno",
    effectiveDate: "2026-02-05",
    fileSize: "2.8 MB",
    description: "Normatiza as etapas de liberação de pedidos da carteira comercial para a linha de manufatura e controle de qualidade.",
    erpTables: ["SC2 - Ordens de Produção", "SH6 - Apontamentos de Produção", "SB1 - Produtos"],
    regulatedFlows: ["pcp-production"],
    clauses: [
      {
        id: "PCP-1.0",
        number: "IT-01",
        title: "Abertura e Sequenciamento de Ordem de Produção (SC2 Protheus)",
        summary: "Pedidos liberados pela esteira de alçadas geram automaticamente OP de manufatura no ERP.",
        fullText: "Todo pedido de venda com aprovação de margem e crédito validado gera a abertura imediata de Ordem de Produção na tabela SC2 do TOTVS Protheus, reservando o empenho de matéria-prima.",
        erpImpact: "Geração de registro na tabela SC2 e reserva de estoque SB2",
        targetNodeIds: ["pcp-1", "pcp-2-generate-op"],
        matchingKeywords: ["pcp", "ordem de producao", "sc2", "manufatura", "apontamento"]
      },
      {
        id: "PCP-2.0",
        number: "IT-04",
        title: "Protocolo de Inspeção de Controle de Qualidade (CQ)",
        summary: "Peças concluídas passam por auditoria metrológica antes do faturamento e cálculo de comissão.",
        fullText: "Nenhum lote fabricado poderá ser transferido para o armazém de produtos acabados sem a validação do laudo metrológico e carimbo digital do Controle de Qualidade (CQ).",
        erpImpact: "Alteração de status do produto para Liberado no Protheus",
        targetNodeIds: ["pcp-3-qc-inspect", "pcp-4-pass-stock", "pcp-5-fail-scrap"],
        matchingKeywords: ["cq", "controle de qualidade", "inspecao", "laudo", "qualidade"]
      }
    ]
  }
];

// ─── Motor de Auto-Conexão de Fluxos e Documentos ─────────────────────────

export interface FlowAutoConnectionResult {
  flowId: string;
  flowName: string;
  connectedDocuments: NormativeDocument[];
  boundNodesCount: number;
  totalNodesCount: number;
  complianceRate: number; // 0 a 100
  clauseBindings: Array<{
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    documentId: string;
    documentTitle: string;
    clauseNumber: string;
    clauseTitle: string;
    summary: string;
    formulaOrRule?: string;
  }>;
  autoSyncedAt: string;
}

/**
 * Conecta AUTOMATICAMENTE um fluxo aos seus documentos normativos e cláusulas,
 * analisando ID do fluxo, categoria, tags, tabelas ERP e conteúdo de cada nó.
 */
export function autoConnectFlow(
  flowId: string,
  meta: FlowTemplateMeta,
  nodes: Node<CRMNodeData>[]
): {
  updatedMeta: FlowTemplateMeta;
  updatedNodes: Node<CRMNodeData>[];
  connectionResult: FlowAutoConnectionResult;
} {
  const now = new Date().toISOString();

  // 1. Identificar documentos aplicáveis ao fluxo
  const matchedDocs = NORMATIVE_DOCUMENTS_CATALOG.filter((doc) => {
    // Por ID direto
    if (doc.regulatedFlows.includes(flowId)) return true;

    // Por categoria
    if (doc.category === meta.category) return true;

    // Por tabelas ERP em comum
    const hasCommonErp = (meta.erpTables || []).some((table) =>
      doc.erpTables.some((docTable) => docTable.slice(0, 3) === table.slice(0, 3))
    );
    if (hasCommonErp) return true;

    // Por tags comerciais (ex: "Comissões", "Alçadas", "Margem")
    const metaTagsLower = (meta.tags || []).map((t) => t.toLowerCase());
    const docTagsLower = (doc.description + " " + doc.title).toLowerCase();
    if (metaTagsLower.some((tag) => docTagsLower.includes(tag))) return true;

    return false;
  });

  // Garantir que pelo menos o documento principal do domínio esteja presente
  if (matchedDocs.length === 0) {
    // Fallback inteligente para o regulamento de comissões ou manual de diretrizes
    if (meta.category === "governance" || meta.category === "crm") {
      matchedDocs.push(NORMATIVE_DOCUMENTS_CATALOG[0]); // Comissões
      matchedDocs.push(NORMATIVE_DOCUMENTS_CATALOG[1]); // Diretrizes de Preço
    } else {
      matchedDocs.push(NORMATIVE_DOCUMENTS_CATALOG[0]);
    }
  }

  // 2. Mapear cláusulas para cada nó do fluxo
  const clauseBindings: FlowAutoConnectionResult["clauseBindings"] = [];

  const updatedNodes = nodes.map((node) => {
    // Procurar a melhor cláusula correspondente
    let bestClause: NormativeClause | null = null;
    let bestDoc: NormativeDocument | null = null;
    let highestScore = 0;

    const nodeText = [
      node.data.label,
      node.data.description,
      node.data.config.field,
      node.data.config.operator,
      node.data.config.value,
      node.data.config.formula,
      node.data.config.source,
      node.data.config.validationRule,
      node.data.config.assigneeGroup,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    for (const doc of matchedDocs) {
      for (const clause of doc.clauses) {
        let score = 0;

        // Se o nó está na lista alvo da cláusula
        if (clause.targetNodeIds?.includes(node.id)) {
          score += 100;
        }

        // Correspondência de palavras-chave
        for (const kw of clause.matchingKeywords) {
          if (nodeText.includes(kw.toLowerCase())) {
            score += 25;
          }
        }

        // Se o nó tiver fórmula e a cláusula também
        if (node.data.config.formula && clause.formulaOrRule) {
          score += 40;
        }

        if (score > highestScore) {
          highestScore = score;
          bestClause = clause;
          bestDoc = doc;
        }
      }
    }

    // Se nenhuma cláusula super específica teve pontuação alta, usar a primeira cláusula relevante do documento mestre
    if (!bestClause && matchedDocs[0]?.clauses[0]) {
      bestDoc = matchedDocs[0];
      bestClause = matchedDocs[0].clauses[0];
    }

    if (bestClause && bestDoc) {
      clauseBindings.push({
        nodeId: node.id,
        nodeLabel: node.data.label,
        nodeType: node.data.type,
        documentId: bestDoc.id,
        documentTitle: bestDoc.title,
        clauseNumber: bestClause.number,
        clauseTitle: bestClause.title,
        summary: bestClause.summary,
        formulaOrRule: bestClause.formulaOrRule,
      });

      return {
        ...node,
        data: {
          ...node.data,
          config: {
            ...node.data.config,
            connectedDocumentId: bestDoc.id,
            connectedDocumentTitle: bestDoc.title,
            connectedClauseId: bestClause.id,
            connectedClauseNumber: bestClause.number,
            connectedClauseTitle: bestClause.title,
            complianceRule: bestClause.summary,
            autoLinkedAt: now,
          },
        },
      };
    }

    return node;
  });

  // 3. Atualizar metadados do fluxo
  const updatedMeta: FlowTemplateMeta = {
    ...meta,
    connectedDocuments: matchedDocs.map((doc) => ({
      documentId: doc.id,
      title: doc.title,
      category: doc.categoryLabel,
      version: doc.version,
      scope: doc.scope,
      isAutoConnected: true,
      primaryClauses: doc.clauses.map((c) => `${c.number} - ${c.title}`).slice(0, 4),
      connectedAt: now,
    })),
    complianceRate: 100,
    lastDocumentSync: now,
  };

  const connectionResult: FlowAutoConnectionResult = {
    flowId,
    flowName: meta.name,
    connectedDocuments: matchedDocs,
    boundNodesCount: clauseBindings.length,
    totalNodesCount: nodes.length,
    complianceRate: nodes.length > 0 ? Math.round((clauseBindings.length / nodes.length) * 100) : 100,
    clauseBindings,
    autoSyncedAt: now,
  };

  return { updatedMeta, updatedNodes, connectionResult };
}

/**
 * Retorna todos os documentos normativos conectados a um fluxo específico
 */
export function getDocumentsForFlow(flowId: string): NormativeDocument[] {
  const directMatches = NORMATIVE_DOCUMENTS_CATALOG.filter((doc) =>
    doc.regulatedFlows.includes(flowId)
  );
  if (directMatches.length > 0) return directMatches;

  // Se não houver direto, encontrar pela categoria comum
  return NORMATIVE_DOCUMENTS_CATALOG.slice(0, 2);
}

/**
 * Retorna todos os fluxos regulamentados por um documento específico
 */
export function getFlowsForDocument(documentId: string): string[] {
  const doc = NORMATIVE_DOCUMENTS_CATALOG.find((d) => d.id === documentId);
  return doc?.regulatedFlows || [];
}

/**
 * Busca cláusulas normativas por texto ou query
 */
export function searchNormativeClauses(
  query: string
): Array<{ document: NormativeDocument; clause: NormativeClause }> {
  const q = query.toLowerCase().trim();
  const results: Array<{ document: NormativeDocument; clause: NormativeClause }> = [];

  for (const doc of NORMATIVE_DOCUMENTS_CATALOG) {
    for (const clause of doc.clauses) {
      if (
        clause.number.toLowerCase().includes(q) ||
        clause.title.toLowerCase().includes(q) ||
        clause.summary.toLowerCase().includes(q) ||
        clause.fullText.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q)
      ) {
        results.push({ document: doc, clause });
      }
    }
  }

  return results;
}
