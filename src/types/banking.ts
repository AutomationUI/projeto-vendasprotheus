export type BankCode = "341" | "237" | "001" | "033" | "756" | "077" | "104" | "422" | "070";

export interface BankAccount {
  id: string;
  bancoCodigo: BankCode;
  bancoNome: string;
  agencia: string;
  agenciaDigito?: string;
  conta: string;
  contaDigito: string;
  titularNome: string;
  cnpjTitular: string;
  chavePix?: string;
  convenioCnab?: string;
  carteiraCnab?: string;
  saldoAtual: number;
  saldoConciliado: number;
  status: "Ativa" | "Inativa" | "Em Homologação";
  tipoConta: "Corrente" | "Pagamento" | "Investimento";
  ambienteApi: "Sandbox" | "Producao";
  clientIdApi?: string;
  webhookUrl?: string;
  dataUltimaSincronizacao: string;
}

export interface CnabBatch {
  id: string;
  tipo: "Remessa" | "Retorno";
  padrao: "CNAB240" | "CNAB400";
  bancoCodigo: BankCode;
  bancoNome: string;
  dataGeracao: string;
  quantidadeTitulos: number;
  valorTotal: number;
  status: "Processado" | "Pendente" | "Com Erros" | "Transmitido";
  nomeArquivo: string;
  conteudoArquivo: string;
}

export interface BankTransaction {
  id: string;
  contaId: string;
  data: string;
  historico: string;
  documento: string;
  valor: number;
  tipo: "credito" | "debito";
  statusConciliacao: "conciliado" | "pendente" | "divergente";
  sugestaoTituloId?: string;
  sugestaoTituloNumero?: string;
}

export interface PixBoletoRecord {
  id: string;
  tituloId: string;
  tituloNumero: string;
  clienteNome: string;
  nossoNumero: string;
  txidPix: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
  linhaDigitavel: string;
  status: "Ativo" | "Pago" | "Cancelado" | "Vencido";
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  bancoEmissor: string;
}

export interface BankWebhookLog {
  id: string;
  banco: string;
  evento: "pix.recebido" | "boleto.liquidado" | "cnab.retorno" | "transferencia.enviada" | "falha.autenticacao";
  payload: string;
  statusHttp: number;
  timestamp: string;
  processadoSucesso: boolean;
  mensagem: string;
}
