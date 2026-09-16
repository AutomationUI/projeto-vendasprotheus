import { ConnectorItem } from "@/types/connectors";

export const CONNECTORS_CATALOG: ConnectorItem[] = [
  // 1. TOTVS Protheus REST API Gateway
  {
    id: "totvs-protheus-rest",
    name: "TOTVS Protheus REST Gateway",
    vendor: "TOTVS S.A.",
    category: "erp",
    categoryLabel: "ERP & Núcleo Operacional",
    description: "Conector nativo RESTful para leitura e gravação nas tabelas padrão e customizadas do Protheus (SC5, SC6, SA1, SB1, SE1, SF2).",
    icon: "cpu",
    version: "v12.1.2410",
    protocol: "REST",
    status: "online",
    authType: "OAuth2",
    baseUrl: "https://erp.empresa.com.br:8084/rest/api/v1",
    latencyMs: 28,
    uptimePercent: 99.98,
    successRatePercent: 99.85,
    totalCallsToday: 48290,
    lastSyncTime: "Há 1 minuto",
    isOfficialTotvs: true,
    protheusTables: ["SC5 - Pedidos de Venda", "SC6 - Itens do Pedido", "SA1 - Clientes", "SB1 - Produtos", "SE1 - Contas a Receber", "SF2 - Notas Fiscais"],
    endpoints: [
      {
        id: "post-order",
        method: "POST",
        path: "/salesorders",
        description: "Inclusão de Pedido de Venda via MSExecAuto (MATA410)",
        sampleRequestPayload: {
          empresa: "01",
          filial: "0101",
          cliente: "001245",
          loja: "01",
          tipo: "N",
          condPagto: "030",
          itens: [
            { produto: "VALV-IND-01", qtd: 10, precoUnit: 450.00, tes: "501" }
          ]
        },
        sampleResponsePayload: {
          status: "SUCCESS",
          numeroPedido: "PED-2024-9842",
          statusERP: "Liberado para Faturamento",
          timestamp: "2026-09-06T18:00:00Z"
        }
      },
      {
        id: "get-credit",
        method: "GET",
        path: "/customers/{cnpj}/credit-limit",
        description: "Consulta de Saldo e Limite de Crédito Financeiro do Cliente",
        sampleResponsePayload: {
          cnpj: "12.345.678/0001-90",
          limiteCredito: 250000.00,
          saldoUtilizado: 84320.00,
          saldoDisponivel: 165680.00,
          risco: "A",
          vencidos: 0
        }
      },
      {
        id: "get-stock",
        method: "GET",
        path: "/stock/availability?sku={sku}",
        description: "Verificação de Saldo Físico e Disponível em Estoque (SB2)"
      }
    ],
    configFields: [
      { key: "clientId", label: "Client ID (TOTVS RAC / OAuth)", type: "text", value: "crm_totvs_prod_client" },
      { key: "clientSecret", label: "Client Secret", type: "password", value: "••••••••••••••••" },
      { key: "companyCode", label: "Empresa Protheus", type: "text", value: "01" },
      { key: "branchCode", label: "Filial Protheus", type: "text", value: "0101" },
      { key: "timeoutSec", label: "Timeout de Resposta (Segundos)", type: "number", value: "30" }
    ],
    documentationUrl: "https://tdn.totvs.com/display/public/PROT/REST+Protheus"
  },

  // 2. TOTVS Protheus ADVPL ExecBlock & RPC
  {
    id: "totvs-advpl-rpc",
    name: "TOTVS ADVPL ExecBlock & MSExecAuto",
    vendor: "TOTVS S.A.",
    category: "erp",
    categoryLabel: "ERP & Núcleo Operacional",
    description: "Execução direta de rotinas automáticas compiladas em ADVPL (MATA410, MATA030, FINA040, MATA650) com validação de semáforo.",
    icon: "database",
    version: "v12.1.2410",
    protocol: "ADVPL_RPC",
    status: "online",
    authType: "BearerToken",
    baseUrl: "tcp://protheus-appserver:1234/rpc",
    latencyMs: 14,
    uptimePercent: 99.99,
    successRatePercent: 99.92,
    totalCallsToday: 32150,
    lastSyncTime: "Há 30 segundos",
    isOfficialTotvs: true,
    protheusTables: ["SC2 - Ordens de Produção", "SZ1 - CRM Leads", "SE2 - Contas a Pagar", "SZ3 - Comissões"],
    endpoints: [
      {
        id: "exec-u_calc_comissao",
        method: "EXEC_BLOCK",
        path: "U_CALC_COMISSAO(cCodVend, dDataDe, dDataAte)",
        description: "Executa rotina compilada de rateio e aceleração de comissões comerciais",
        sampleRequestPayload: {
          funcaoAdvpl: "U_CALC_COMISSAO",
          parametros: ["000104", "20260901", "20260930"]
        },
        sampleResponsePayload: {
          retorno: true,
          totalComissao: 14350.80,
          bonusAtingido: true,
          statusGravacao: "SE1_TITULO_PROVISIONADO"
        }
      },
      {
        id: "exec-mata650",
        method: "EXEC_BLOCK",
        path: "MSExecAuto({|x,y| MATA650(x,y)}, aCab, nOpc)",
        description: "Inclusão automática de Ordem de Produção PCP no Protheus (SC2)"
      }
    ],
    configFields: [
      { key: "appServerHost", label: "AppServer Host / IP", type: "text", value: "192.168.1.50" },
      { key: "appServerPort", label: "Porta TCP AppServer", type: "number", value: "1234" },
      { key: "environment", label: "Ambiente (Environment)", type: "text", value: "PRODUCAO_01" }
    ]
  },

  // 3. WhatsApp Business Cloud API (Meta)
  {
    id: "whatsapp-business-api",
    name: "WhatsApp Business Cloud API",
    vendor: "Meta / WhatsApp",
    category: "messaging",
    categoryLabel: "Mensageria & Comunicação",
    description: "Disparo oficial de mensagens HSM transacionais com botões interativos, notificações de aprovação para diretoria e tracking de entrega.",
    icon: "whatsapp",
    version: "v19.0",
    protocol: "REST",
    status: "online",
    authType: "BearerToken",
    baseUrl: "https://graph.facebook.com/v19.0",
    latencyMs: 85,
    uptimePercent: 99.95,
    successRatePercent: 99.6,
    totalCallsToday: 12400,
    lastSyncTime: "Há 4 minutos",
    endpoints: [
      {
        id: "send-template",
        method: "POST",
        path: "/{phone_number_id}/messages",
        description: "Envia template de aprovação de cotação ou aviso de faturamento com botões",
        sampleRequestPayload: {
          messaging_product: "whatsapp",
          to: "5511999998888",
          type: "template",
          template: {
            name: "aprovacao_urgente_desconto_v2",
            language: { code: "pt_BR" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Acme Industrial S/A" },
                  { type: "text", text: "18.5%" },
                  { type: "text", text: "R$ 145.000,00" }
                ]
              }
            ]
          }
        },
        sampleResponsePayload: {
          messages: [{ id: "wamid.HBgLMzUyOT...==" }]
        }
      }
    ],
    configFields: [
      { key: "phoneNumberId", label: "WhatsApp Phone Number ID", type: "text", value: "109823475928374" },
      { key: "accessToken", label: "Meta System User Permanent Token", type: "password", value: "••••••••••••••••" },
      { key: "wabaId", label: "WABA Account ID", type: "text", value: "982374982374928" }
    ]
  },

  // 4. Serasa Experian & Boa Vista (Bureau de Crédito)
  {
    id: "serasa-experian",
    name: "Serasa Experian Bureau de Crédito",
    vendor: "Experian Corp.",
    category: "finance_credit",
    categoryLabel: "Crédito, Risco & Financeiro",
    description: "Consulta cadastral e comportamental de CNPJ em tempo real com Score de Crédito, Probabilidade de Inadimplência, Protestos e Limite Recomendado.",
    icon: "shield",
    version: "v3.2",
    protocol: "REST",
    status: "online",
    authType: "BasicAuth",
    baseUrl: "https://api.serasaexperian.com.br/credito/v3",
    latencyMs: 140,
    uptimePercent: 99.85,
    successRatePercent: 99.4,
    totalCallsToday: 3450,
    lastSyncTime: "Há 10 minutos",
    endpoints: [
      {
        id: "get-cnpj-score",
        method: "POST",
        path: "/consultas/cnpj",
        description: "Consulta de Score, Protestos e Dívidas Vencidas",
        sampleRequestPayload: {
          cnpj: "00.123.456/0001-78",
          modalidade: "RELATORIO_COMPLETO_RISCO"
        },
        sampleResponsePayload: {
          scoreCredito: 840,
          faixaRisco: "Baixo Risco (Faixa A)",
          limiteSugerido: 350000.00,
          protestosAtivos: 0,
          acoesJudiciais: 0,
          statusReceitaFederal: "ATIVA"
        }
      }
    ],
    configFields: [
      { key: "username", label: "Usuário Serasa Connect", type: "text", value: "empresa_serasa_usr" },
      { key: "password", label: "Senha da API", type: "password", value: "••••••••••••••••" },
      { key: "minScoreThreshold", label: "Score Mínimo para Auto-Liberação", type: "number", value: "700" }
    ]
  },

  // 5. Supabase Cloud / PostgreSQL CDC
  {
    id: "supabase-cloud-db",
    name: "Supabase Cloud / PostgreSQL CDC",
    vendor: "Supabase Inc.",
    category: "analytics_storage",
    categoryLabel: "Banco de Dados & Storage",
    description: "Banco relacional escalável com Change Data Capture (CDC), Row-Level Security, sincronização em tempo real e Webhooks de eventos comerciais.",
    icon: "database",
    version: "v2.39",
    protocol: "CDC_STREAM",
    status: "online",
    authType: "ApiKey",
    baseUrl: "https://dwiekdrydilizc2apf6tzo.supabase.co",
    latencyMs: 19,
    uptimePercent: 99.99,
    successRatePercent: 99.95,
    totalCallsToday: 78100,
    lastSyncTime: "Tempo Real (Streaming)",
    endpoints: [
      {
        id: "rest-select",
        method: "GET",
        path: "/rest/v1/protheus_sync_queue",
        description: "Consulta fila de eventos pendentes de sincronização"
      },
      {
        id: "rpc-exec",
        method: "POST",
        path: "/rest/v1/rpc/consolidar_comissoes_mensais",
        description: "Executa Stored Procedure de consolidação financeira"
      }
    ],
    configFields: [
      { key: "supabaseUrl", label: "Supabase URL", type: "text", value: "https://dwiekdrydilizc2apf6tzo.supabase.co" },
      { key: "serviceRoleKey", label: "Service Role Secret Key", type: "password", value: "••••••••••••••••" }
    ]
  },

  // 6. Slack & Microsoft Teams Webhook Gateway
  {
    id: "slack-teams-gateway",
    name: "Slack & Microsoft Teams Gateway",
    vendor: "Slack Technologies / Microsoft",
    category: "messaging",
    categoryLabel: "Mensageria & Comunicação",
    description: "Notificações ricas em canais de governança com blocos interativos para aprovação ou rejeição de alçadas em 1 clique.",
    icon: "bell",
    version: "v2.0",
    protocol: "WEBHOOK",
    status: "online",
    authType: "HMAC_SHA256",
    baseUrl: "https://hooks.slack.com/services/T00/B00/XXXX",
    latencyMs: 42,
    uptimePercent: 99.98,
    successRatePercent: 99.9,
    totalCallsToday: 8900,
    lastSyncTime: "Há 2 minutos",
    endpoints: [
      {
        id: "post-approval-card",
        method: "POST",
        path: "/workflows/approvals",
        description: "Publica card interativo de aprovação com botões [Aprovar] e [Rejeitar]",
        sampleRequestPayload: {
          channel: "#comercial-diretoria",
          text: "🚨 Cotação Requer Aprovação de Alçada",
          blocks: [
            {
              type: "section",
              text: { type: "mrkdwn", text: "*Cliente:* Indústria Metalúrgica do Sul\n*Valor:* R$ 890.000,00\n*Margem:* 21.4% (Abaixo de 25%)" }
            }
          ]
        }
      }
    ],
    configFields: [
      { key: "webhookUrl", label: "Incoming Webhook URL", type: "text", value: "https://hooks.slack.com/services/..." },
      { key: "defaultChannel", label: "Canal Padrão de Alertas", type: "text", value: "#comercial-aprovacoes" }
    ]
  },

  // 7. Banco Inter / Itaú / Santander PIX & Boleto API
  {
    id: "open-banking-pix",
    name: "Open Banking PIX & Boletos API",
    vendor: "Banco Inter / Febraban",
    category: "finance_credit",
    categoryLabel: "Crédito, Risco & Financeiro",
    description: "Emissão instantânea de cobranças PIX Dinâmico com QR Code, Split de Pagamento de Comissões e Baixa Automática de Títulos no Protheus (SE1).",
    icon: "calc",
    version: "v2.1",
    protocol: "REST",
    status: "online",
    authType: "ClientCert_mTLS",
    baseUrl: "https://cdpj.partners.bancointer.com.br",
    latencyMs: 95,
    uptimePercent: 99.94,
    successRatePercent: 99.7,
    totalCallsToday: 5120,
    lastSyncTime: "Há 8 minutos",
    endpoints: [
      {
        id: "post-pix-charge",
        method: "POST",
        path: "/pix/v2/cobv",
        description: "Gera cobrança com vencimento e QR Code dinâmico com conciliação Protheus",
        sampleRequestPayload: {
          calendario: { dataDeVencimento: "2026-09-30", validadeAposVencimento: 30 },
          devedor: { cnpj: "12345678000199", nome: "Cliente Exemplo S/A" },
          valor: { original: "15420.50" },
          chave: "financeiro@empresa.com.br",
          solicitacaoPagador: "Fatura NF 4892 Protheus"
        }
      }
    ],
    configFields: [
      { key: "clientId", label: "Client ID Bancário", type: "text", value: "inter_banking_prod_app" },
      { key: "pixKey", label: "Chave PIX Recebedora", type: "text", value: "financeiro@empresa.com.br" },
      { key: "certPath", label: "Certificado Digital mTLS (.pfx / .pem)", type: "text", value: "/certs/banco_inter_cert.pem" }
    ]
  },

  // 8. SendGrid & AWS SES Transacional
  {
    id: "sendgrid-ses-mailer",
    name: "SendGrid / AWS SES Mailer",
    vendor: "Twilio SendGrid",
    category: "messaging",
    categoryLabel: "Mensageria & Comunicação",
    description: "Serviço de envio de e-mails de alta entregabilidade para envio de orçamentos em PDF, contratos comerciais e DANFE/XML de faturamento.",
    icon: "mail",
    version: "v3",
    protocol: "REST",
    status: "online",
    authType: "BearerToken",
    baseUrl: "https://api.sendgrid.com/v3",
    latencyMs: 65,
    uptimePercent: 99.99,
    successRatePercent: 99.8,
    totalCallsToday: 18450,
    lastSyncTime: "Há 1 minuto",
    endpoints: [
      {
        id: "post-mail-send",
        method: "POST",
        path: "/mail/send",
        description: "Disparo de e-mail com anexo de proposta comercial e tracking de abertura"
      }
    ],
    configFields: [
      { key: "apiKey", label: "SendGrid API Key", type: "password", value: "••••••••••••••••" },
      { key: "fromEmail", label: "E-mail Remetente", type: "text", value: "comercial@empresa.com.br" },
      { key: "fromName", label: "Nome do Remetente", type: "text", value: "Departamento Comercial" }
    ]
  },

  // 9. DocuSign & Clicksign (Assinatura Digital)
  {
    id: "docusign-clicksign",
    name: "DocuSign / ClickSign Assinatura Digital",
    vendor: "DocuSign Inc.",
    category: "security_docs",
    categoryLabel: "Segurança & Documentos",
    description: "Coleta e auditoria de assinaturas digitais com validade jurídica (ICP-Brasil) para contratos de fornecimento e termos de garantia.",
    icon: "file",
    version: "v2.1",
    protocol: "REST",
    status: "online",
    authType: "OAuth2",
    baseUrl: "https://api.docusign.net/restapi/v2.1",
    latencyMs: 110,
    uptimePercent: 99.92,
    successRatePercent: 99.5,
    totalCallsToday: 940,
    lastSyncTime: "Há 15 minutos",
    endpoints: [
      {
        id: "post-envelope",
        method: "POST",
        path: "/accounts/{accountId}/envelopes",
        description: "Cria e envia envelope para assinatura dos diretores"
      }
    ],
    configFields: [
      { key: "integrationKey", label: "Integration Key (Client ID)", type: "text", value: "docusign_ik_889234" },
      { key: "secretKey", label: "Secret Key", type: "password", value: "••••••••••••••••" }
    ]
  },

  // 10. RD Station & HubSpot Inbound CRM
  {
    id: "rd-hubspot-marketing",
    name: "RD Station & HubSpot Inbound Bridge",
    vendor: "RD Station / HubSpot",
    category: "crm_marketing",
    categoryLabel: "CRM & Marketing Inbound",
    description: "Captura automática de leads gerados em campanhas de marketing, cálculo de Lead Scoring e conversão imediata em oportunidade comercial.",
    icon: "flame",
    version: "v2.0",
    protocol: "REST",
    status: "online",
    authType: "OAuth2",
    baseUrl: "https://api.rd.services/platform",
    latencyMs: 78,
    uptimePercent: 99.96,
    successRatePercent: 99.75,
    totalCallsToday: 14200,
    lastSyncTime: "Há 6 minutos",
    endpoints: [
      {
        id: "post-conversion",
        method: "POST",
        path: "/conversions",
        description: "Registra evento de conversão e dispara fluxo de nutrição"
      }
    ],
    configFields: [
      { key: "clientId", label: "Client ID RD Station", type: "text", value: "rd_station_crm_app" },
      { key: "clientSecret", label: "Client Secret", type: "password", value: "••••••••••••••••" }
    ]
  },

  // 11. AWS S3 & Google Cloud Storage
  {
    id: "s3-cloud-storage",
    name: "AWS S3 / Google Cloud Object Storage",
    vendor: "Amazon Web Services",
    category: "analytics_storage",
    categoryLabel: "Banco de Dados & Storage",
    description: "Repositório corporativo para guarda segura de arquivos de desenho técnico CAD (DWG, STEP), relatórios de inspeção e orçamentos em PDF.",
    icon: "database",
    version: "v4",
    protocol: "REST",
    status: "online",
    authType: "ApiKey",
    baseUrl: "https://s3.sa-east-1.amazonaws.com/empresa-crm-bucket",
    latencyMs: 35,
    uptimePercent: 99.999,
    successRatePercent: 99.98,
    totalCallsToday: 26300,
    lastSyncTime: "Há 1 minuto",
    endpoints: [
      {
        id: "put-object",
        method: "PUT",
        path: "/propostas/{id}/proposta.pdf",
        description: "Upload de arquivo com geração de URL pré-assinada de 24 horas"
      }
    ],
    configFields: [
      { key: "bucketName", label: "Nome do Bucket S3", type: "text", value: "empresa-crm-arquivos-prod" },
      { key: "region", label: "Região AWS", type: "text", value: "sa-east-1" },
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", value: "AKIAIOSFODNN7EXAMPLE" },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "password", value: "••••••••••••••••" }
    ]
  },

  // 12. Power BI & Looker Studio Analytics Bridge
  {
    id: "powerbi-analytics",
    name: "Power BI & Looker Studio Embedded",
    vendor: "Microsoft Corp.",
    category: "analytics_storage",
    categoryLabel: "Banco de Dados & Storage",
    description: "Alimentação de cubos OLAP, telemetria de conversão do funil, projeção de atingimento de metas e dashboards executivos em tempo real.",
    icon: "sparkles",
    version: "v1.0",
    protocol: "REST",
    status: "online",
    authType: "OAuth2",
    baseUrl: "https://api.powerbi.com/v1.0/myorg",
    latencyMs: 120,
    uptimePercent: 99.9,
    successRatePercent: 99.6,
    totalCallsToday: 4200,
    lastSyncTime: "Há 20 minutos",
    endpoints: [
      {
        id: "post-dataset-rows",
        method: "POST",
        path: "/datasets/{datasetId}/tables/{tableName}/rows",
        description: "Push streaming de métricas comerciais minuto a minuto"
      }
    ],
    configFields: [
      { key: "tenantId", label: "Azure AD Tenant ID", type: "text", value: "389247-abcd-4f56-8901-abcdef123456" },
      { key: "workspaceId", label: "Power BI Workspace ID", type: "text", value: "889345-defa-4123-bcde-567890abcdef" }
    ]
  },

  // 13. Apache Kafka & RabbitMQ Event Bus
  {
    id: "kafka-rabbitmq-bus",
    name: "Apache Kafka & RabbitMQ Event Bus",
    vendor: "Apache Foundation",
    category: "event_bus",
    categoryLabel: "Filas de Mensageria & Eventos",
    description: "Barramento assíncrono distribuído para processamento de alto volume com garantia de entrega (Exactly-Once) e desacoplamento de microsserviços.",
    icon: "zap",
    version: "v3.6",
    protocol: "AMQP_KAFKA",
    status: "online",
    authType: "BasicAuth",
    baseUrl: "kafka-cluster.empresa.internal:9092",
    latencyMs: 6,
    uptimePercent: 99.999,
    successRatePercent: 99.99,
    totalCallsToday: 145000,
    lastSyncTime: "Tempo Real (0ms)",
    endpoints: [
      {
        id: "publish-topic",
        method: "POST",
        path: "/topics/crm.pedidos.faturados",
        description: "Publicação de evento de faturamento para microsserviços"
      }
    ],
    configFields: [
      { key: "brokers", label: "Bootstrap Brokers", type: "text", value: "broker1:9092,broker2:9092,broker3:9092" },
      { key: "consumerGroup", label: "Consumer Group ID", type: "text", value: "crm-protheus-sync-group" }
    ]
  },

  // 14. Salesforce CRM Bi-Directional Bridge
  {
    id: "salesforce-bridge",
    name: "Salesforce CRM Bi-Directional Bridge",
    vendor: "Salesforce Inc.",
    category: "crm_marketing",
    categoryLabel: "CRM & Marketing Inbound",
    description: "Sincronização bidirecional de Contas Globais, Oportunidades Enterprise e Histórico de Relacionamento.",
    icon: "user-plus",
    version: "v59.0",
    protocol: "REST",
    status: "online",
    authType: "OAuth2",
    baseUrl: "https://empresa.my.salesforce.com/services/data/v59.0",
    latencyMs: 115,
    uptimePercent: 99.94,
    successRatePercent: 99.7,
    totalCallsToday: 6800,
    lastSyncTime: "Há 12 minutos",
    endpoints: [
      {
        id: "query-accounts",
        method: "GET",
        path: "/query?q=SELECT+Id,Name,AnnualRevenue+FROM+Account",
        description: "Consulta de contas globais e volume de compras"
      }
    ],
    configFields: [
      { key: "instanceUrl", label: "Salesforce Instance URL", type: "text", value: "https://empresa.my.salesforce.com" },
      { key: "consumerKey", label: "Connected App Consumer Key", type: "text", value: "3MVG9...consumerKey" }
    ]
  },

  // 15. Universal Webhook Inbound & Outbound Dispatcher
  {
    id: "universal-webhook",
    name: "Universal Webhook Dispatcher",
    vendor: "CRM Native Engine",
    category: "event_bus",
    categoryLabel: "Filas de Mensageria & Eventos",
    description: "Recepção e disparo de Webhooks universais com assinatura criptográfica HMAC-SHA256 e reenvio automático em caso de falha.",
    icon: "send",
    version: "v1.5",
    protocol: "WEBHOOK",
    status: "online",
    authType: "HMAC_SHA256",
    baseUrl: "https://crm.empresa.com.br/api/webhooks/v1",
    latencyMs: 18,
    uptimePercent: 99.99,
    successRatePercent: 99.85,
    totalCallsToday: 38200,
    lastSyncTime: "Há 1 minuto",
    endpoints: [
      {
        id: "receive-webhook",
        method: "POST",
        path: "/incoming/totvs-protheus-event",
        description: "Recepção de gatilhos automáticos do Protheus pós-gravação"
      }
    ],
    configFields: [
      { key: "secretKey", label: "Chave Secreta de Assinatura HMAC", type: "password", value: "••••••••••••••••" },
      { key: "maxRetries", label: "Tentativas de Retry em Falhas", type: "number", value: "5" }
    ]
  },

  // 16. Omie & ContaAzul ERP Sync Bridge
  {
    id: "omie-contaazul-bridge",
    name: "Omie & ContaAzul ERP Sync Bridge",
    vendor: "Omie / ContaAzul",
    category: "erp",
    categoryLabel: "ERP & Núcleo Operacional",
    description: "Sincronização financeira e emissão de NFe para subsidiárias operacionais e empresas parceiras do grupo.",
    icon: "database",
    version: "v1.0",
    protocol: "REST",
    status: "online",
    authType: "ApiKey",
    baseUrl: "https://app.omie.com.br/api/v1",
    latencyMs: 82,
    uptimePercent: 99.91,
    successRatePercent: 99.6,
    totalCallsToday: 2100,
    lastSyncTime: "Há 18 minutos",
    endpoints: [
      {
        id: "post-cliente-omie",
        method: "POST",
        path: "/geral/clientes/",
        description: "Inclusão cadastral com validação de CNPJ"
      }
    ],
    configFields: [
      { key: "appKey", label: "Omie App Key", type: "text", value: "omie_app_892348" },
      { key: "appSecret", label: "Omie App Secret", type: "password", value: "••••••••••••••••" }
    ]
  }
];
