export type CRMNodeType = 'trigger' | 'condition' | 'action' | 'operation' | 'validator' | 'connector' | 'businessRule';

export type FlowCategory = 'todos' | 'crm' | 'finance' | 'governance' | 'erp' | 'cs' | 'pcp';

export interface CRMNodeData {
  label: string;
  type: CRMNodeType;
  icon: string;
  description: string;
  category?: string;
  config: {
    source?: string;
    field?: string;
    operator?: string;
    value?: string;
    assigneeGroup?: string;
    emailTemplate?: string;
    delayDays?: number;
    delayHours?: number;
    slackChannel?: string;
    whatsappTemplate?: string;
    erpEndpoint?: string;
    formula?: string;
    alertSeverity?: 'INFO' | 'WARNING' | 'CRITICAL';
    scoreThreshold?: number;
    validationRule?: string;
    actionOutcome?: string;
    // Business Rule & Governance Studio Auto-Sync Properties
    governanceRuleId?: string;
    governanceRuleName?: string;
    maxDiscountPct?: number;
    maxDiscountManagerPct?: number;
    minMarginPct?: number;
    maxPaymentTermDays?: number;
    maxVolumeWithoutApproval?: number;
    approvalHierarchy?: string;
    governanceSyncStatus?: 'synced' | 'pending' | 'custom';
    governanceVersion?: number;
    governanceLastSync?: string;
    ruleExpression?: string;
    // Normative Document & Policy Auto-Connection Properties
    connectedDocumentId?: string;
    connectedDocumentTitle?: string;
    connectedClauseId?: string;
    connectedClauseNumber?: string;
    connectedClauseTitle?: string;
    complianceRule?: string;
    autoLinkedAt?: string;
    // Connector specific properties
    connectorId?: string;
    connectorVendor?: string;
    connectorProtocol?: string;
    connectorEndpoint?: string;
    connectorStatus?: string;
    connectorLatency?: number;
    // Protheus Integration Parameters
    protheusSyncEnabled?: boolean;
    protheusTable?: string;
    protheusOperation?: string;
    protheusExecBlock?: string;
    protheusCompanyCode?: string;
    protheusBranchCode?: string;
    protheusTriggerEvent?: string;
  };
}

export interface FlowTemplateMeta {
  id: string;
  name: string;
  category: FlowCategory;
  categoryLabel: string;
  description: string;
  status: 'Ativo' | 'Homologação' | 'Produção' | 'Rascunho';
  version: string;
  tags: string[];
  erpTables?: string[];
  nodesCount?: number;
  simDefaultInputs: Record<string, any>;
  calculateSimPath: (input: any) => string[];
  // Connected Normative Documents & Policies
  connectedDocuments?: Array<{
    documentId: string;
    title: string;
    category: string;
    version: string;
    scope?: string;
    isAutoConnected: boolean;
    primaryClauses: string[];
    connectedAt?: string;
  }>;
  complianceRate?: number; // e.g. 100%
  lastDocumentSync?: string;
}
