export type ConnectorCategory = 
  | 'erp' 
  | 'crm_marketing' 
  | 'messaging' 
  | 'finance_credit' 
  | 'security_docs' 
  | 'analytics_storage' 
  | 'event_bus';

export type ConnectorProtocol = 'REST' | 'ADVPL_RPC' | 'WEBHOOK' | 'CDC_STREAM' | 'GRAPHQL' | 'AMQP_KAFKA' | 'MTLS_SOAP';

export type ConnectorStatus = 'online' | 'standby' | 'degraded' | 'configuring' | 'offline';

export type ConnectorAuthType = 'OAuth2' | 'BearerToken' | 'BasicAuth' | 'ApiKey' | 'ClientCert_mTLS' | 'HMAC_SHA256';

export interface ConnectorEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'EXEC_BLOCK';
  path: string;
  description: string;
  sampleRequestPayload?: Record<string, any>;
  sampleResponsePayload?: Record<string, any>;
}

export interface ConnectorItem {
  id: string;
  name: string;
  vendor: string;
  category: ConnectorCategory;
  categoryLabel: string;
  description: string;
  icon: string;
  version: string;
  protocol: ConnectorProtocol;
  status: ConnectorStatus;
  authType: ConnectorAuthType;
  baseUrl: string;
  latencyMs: number;
  uptimePercent: number;
  successRatePercent: number;
  totalCallsToday: number;
  lastSyncTime: string;
  isOfficialTotvs?: boolean;
  protheusTables?: string[];
  endpoints: ConnectorEndpoint[];
  configFields: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'number' | 'select' | 'boolean';
    value: string;
    placeholder?: string;
    options?: string[];
  }[];
  documentationUrl?: string;
}

export interface FlowEdgeData {
  label?: string;
  conditionType?: 'sim' | 'nao' | 'aprovado' | 'reprovado' | 'fallback' | 'timeout' | 'default';
  protocol?: ConnectorProtocol;
  connectorId?: string;
  latencyMs?: number;
  animated?: boolean;
  flowType?: 'dataPipe' | 'conditional' | 'stepConnector' | 'security';
  retryPolicy?: {
    maxRetries: number;
    backoffType: 'exponential' | 'linear';
    timeoutSeconds: number;
  };
  payloadSummary?: string;
}
