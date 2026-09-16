import { BankAccount, CnabBatch, BankTransaction, PixBoletoRecord, BankWebhookLog, BankCode } from "@/types/banking";
import { financialService } from "./financial-service";

export const BANK_INFO_MAP: Record<BankCode, { name: string; ispb: string; cnabDefaults: string[] }> = {
  "341": { name: "Itaú Unibanco S.A.", ispb: "60701190", cnabDefaults: ["CNAB240", "CNAB400"] },
  "237": { name: "Banco Bradesco S.A.", ispb: "60746948", cnabDefaults: ["CNAB240", "CNAB400"] },
  "001": { name: "Banco do Brasil S.A.", ispb: "00000000", cnabDefaults: ["CNAB240", "CNAB400"] },
  "033": { name: "Banco Santander (Brasil) S.A.", ispb: "90400888", cnabDefaults: ["CNAB240"] },
  "756": { name: "Banco Cooperativo Sicoob S.A.", ispb: "02819512", cnabDefaults: ["CNAB240"] },
  "077": { name: "Banco Inter S.A.", ispb: "00416968", cnabDefaults: ["CNAB240"] },
  "104": { name: "Caixa Econômica Federal", ispb: "00360305", cnabDefaults: ["CNAB240"] },
  "422": { name: "Banco Safra S.A.", ispb: "58160789", cnabDefaults: ["CNAB240", "CNAB400"] },
  "070": { name: "BRB - Banco de Brasília S.A.", ispb: "00000208", cnabDefaults: ["CNAB240"] },
};

let mockBankAccounts: BankAccount[] = [
  {
    id: "acc-itau-01",
    bancoCodigo: "341",
    bancoNome: "Itaú Unibanco S.A.",
    agencia: "1234",
    agenciaDigito: "5",
    conta: "98765",
    contaDigito: "4",
    titularNome: "Refractarios Industriales S.A.",
    cnpjTitular: "12.345.678/0001-90",
    chavePix: "financeiro@refratarios.com.br",
    convenioCnab: "341987654",
    carteiraCnab: "109",
    saldoAtual: 845230.50,
    saldoConciliado: 840100.00,
    status: "Ativa",
    tipoConta: "Corrente",
    ambienteApi: "Producao",
    clientIdApi: "itau_client_prod_99812",
    webhookUrl: "https://api.refratarios.com.br/webhooks/itau",
    dataUltimaSincronizacao: "2026-09-06 18:30",
  },
  {
    id: "acc-bradesco-02",
    bancoCodigo: "237",
    bancoNome: "Banco Bradesco S.A.",
    agencia: "4321",
    agenciaDigito: "0",
    conta: "12345",
    contaDigito: "6",
    titularNome: "Refractarios Industriales S.A.",
    cnpjTitular: "12.345.678/0001-90",
    chavePix: "12345678000190",
    convenioCnab: "23712345",
    carteiraCnab: "09",
    saldoAtual: 312450.00,
    saldoConciliado: 312450.00,
    status: "Ativa",
    tipoConta: "Corrente",
    ambienteApi: "Producao",
    clientIdApi: "brad_client_prod_44120",
    webhookUrl: "https://api.refratarios.com.br/webhooks/bradesco",
    dataUltimaSincronizacao: "2026-09-06 17:15",
  },
  {
    id: "acc-bb-03",
    bancoCodigo: "001",
    bancoNome: "Banco do Brasil S.A.",
    agencia: "0890",
    agenciaDigito: "X",
    conta: "55432",
    contaDigito: "1",
    titularNome: "Refractarios Industriales S.A.",
    cnpjTitular: "12.345.678/0001-90",
    chavePix: "+5511988776655",
    convenioCnab: "1234567",
    carteiraCnab: "17",
    saldoAtual: 189700.80,
    saldoConciliado: 185000.00,
    status: "Ativa",
    tipoConta: "Corrente",
    ambienteApi: "Producao",
    clientIdApi: "bb_oauth_prod_7712",
    webhookUrl: "https://api.refratarios.com.br/webhooks/bb",
    dataUltimaSincronizacao: "2026-09-06 16:00",
  },
  {
    id: "acc-inter-04",
    bancoCodigo: "077",
    bancoNome: "Banco Inter S.A.",
    agencia: "0001",
    conta: "7765432",
    contaDigito: "0",
    titularNome: "Refractarios Industriales S.A.",
    cnpjTitular: "12.345.678/0001-90",
    chavePix: "pix-inter@refratarios.com.br",
    convenioCnab: "INT07788",
    carteiraCnab: "112",
    saldoAtual: 95400.00,
    saldoConciliado: 95400.00,
    status: "Em Homologação",
    tipoConta: "Pagamento",
    ambienteApi: "Sandbox",
    clientIdApi: "inter_sandbox_key_1120",
    webhookUrl: "https://api.refratarios.com.br/webhooks/inter",
    dataUltimaSincronizacao: "2026-09-05 10:00",
  },
];

const mockCnabBatches: CnabBatch[] = [
  {
    id: "cnab-rem-001",
    tipo: "Remessa",
    padrao: "CNAB240",
    bancoCodigo: "341",
    bancoNome: "Itaú Unibanco S.A.",
    dataGeracao: "2026-09-06 09:15",
    quantidadeTitulos: 14,
    valorTotal: 284500.00,
    status: "Transmitido",
    nomeArquivo: "CB060901.REM",
    conteudoArquivo: `01REMESSA01COBRANCA       000000000000034110900012345987654   REFRACTARIOS INDUSTRIALES S.A.  341BANCO ITAU SA      060926000001
1010000134110900012345987654   0000000001DUP0001000000015000000060926000000028450000000000000
90100001341000014000000028450000000000016`,
  },
  {
    id: "cnab-ret-002",
    tipo: "Retorno",
    padrao: "CNAB240",
    bancoCodigo: "237",
    bancoNome: "Banco Bradesco S.A.",
    dataGeracao: "2026-09-06 14:00",
    quantidadeTitulos: 8,
    valorTotal: 142800.00,
    status: "Processado",
    nomeArquivo: "CB060901.RET",
    conteudoArquivo: `02RETORNO01COBRANCA       000000000000023700000004321123456   REFRACTARIOS INDUSTRIALES S.A.  237BRADESCO           060926000002
10100001237000000020100000001500000006092600000001428000000000000006092602LIQUIDACAO AUTOMATICA
90100001237000008000000014280000000000010`,
  },
];

const mockBankTransactions: BankTransaction[] = [
  {
    id: "tx-001",
    contaId: "acc-itau-01",
    data: "2026-09-06",
    historico: "LIQ. DUPLICATA 8841-A STEEL S.A.",
    documento: "8841-A",
    valor: 45000.00,
    tipo: "credito",
    statusConciliacao: "conciliado",
    sugestaoTituloId: "tit-101",
    sugestaoTituloNumero: "8841",
  },
  {
    id: "tx-002",
    contaId: "acc-itau-01",
    data: "2026-09-06",
    historico: "PIX RECEBIDO - TECNO REFRATARIOS",
    documento: "PIX-998123",
    valor: 82300.00,
    tipo: "credito",
    statusConciliacao: "pendente",
    sugestaoTituloId: "tit-102",
    sugestaoTituloNumero: "8842",
  },
  {
    id: "tx-003",
    contaId: "acc-itau-01",
    data: "2026-09-05",
    historico: "PAGTO FORNECEDOR MAGNESITA S.A.",
    documento: "NFE-5541",
    valor: 124000.00,
    tipo: "debito",
    statusConciliacao: "conciliado",
    sugestaoTituloId: "tit-201",
    sugestaoTituloNumero: "5541",
  },
  {
    id: "tx-004",
    contaId: "acc-bradesco-02",
    data: "2026-09-06",
    historico: "TAR. COBRANCA TITULOS B2B",
    documento: "TAR-341",
    valor: 125.40,
    tipo: "debito",
    statusConciliacao: "pendente",
  },
];

const mockPixBoletos: PixBoletoRecord[] = [
  {
    id: "pb-101",
    tituloId: "tit-101",
    tituloNumero: "8841-01",
    clienteNome: "Steel Industry S.A.",
    nossoNumero: "3419876543210",
    txidPix: "refratarios341884101pix2026",
    pixCopiaECola: "00020126580014br.gov.bcb.pix0136financeiro@refratarios.com.br520400005303986540845000.005802BR5930REFRACTARIOS INDUSTRIALES SA6009SAO PAULO62070503***6304A1F2",
    qrCodeBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ffffff'/><rect x='10' y='10' width='30' height='30' fill='%23000000'/><rect x='60' y='10' width='30' height='30' fill='%23000000'/><rect x='10' y='60' width='30' height='30' fill='%23000000'/><rect x='50' y='50' width='20' height='20' fill='%23000000'/></svg>",
    linhaDigitavel: "34191.09008 12345.987654 32100.000004 1 98450004500000",
    status: "Ativo",
    valor: 45000.00,
    dataEmissao: "2026-08-20",
    dataVencimento: "2026-09-20",
    bancoEmissor: "Itaú Unibanco S.A.",
  },
];

const mockWebhookLogs: BankWebhookLog[] = [
  {
    id: "wh-001",
    banco: "Itaú Unibanco S.A.",
    evento: "pix.recebido",
    payload: JSON.stringify({ pix: [{ endToEndId: "E60701190202609061830123456789", txid: "refratarios341884101pix2026", valor: "45000.00", horario: "2026-09-06T18:30:00Z" }] }, null, 2),
    statusHttp: 200,
    timestamp: "2026-09-06 18:30:02",
    processadoSucesso: true,
    mensagem: "Notificação de Pix recebido via Webhook processada. Título 8841-01 liquidado.",
  },
  {
    id: "wh-002",
    banco: "Banco Bradesco S.A.",
    evento: "boleto.liquidado",
    payload: JSON.stringify({ boleto: { nossoNumero: "2371234567890", valorPago: 142800.00, dataPagamento: "2026-09-06" } }, null, 2),
    statusHttp: 200,
    timestamp: "2026-09-06 14:00:15",
    processadoSucesso: true,
    mensagem: "Boleto registrado baixado via arquivo de retorno CNAB240.",
  },
  {
    id: "wh-003",
    banco: "Banco do Brasil S.A.",
    evento: "falha.autenticacao",
    payload: JSON.stringify({ error: "invalid_grant", error_description: "Refresh token expired or revoked" }, null, 2),
    statusHttp: 401,
    timestamp: "2026-09-06 11:20:00",
    processadoSucesso: false,
    mensagem: "Erro de autenticação na API do Banco do Brasil. Renovação de token requerida.",
  },
];

export const bankingService = {
  // Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...mockBankAccounts]), 200));
  },

  async addBankAccount(data: Omit<BankAccount, "id" | "dataUltimaSincronizacao">): Promise<BankAccount> {
    const newAcc: BankAccount = {
      ...data,
      id: `acc-${Date.now()}`,
      dataUltimaSincronizacao: new Date().toISOString().replace("T", " ").substring(0, 16),
    };
    mockBankAccounts.unshift(newAcc);
    return newAcc;
  },

  async updateBankAccount(id: string, data: Partial<BankAccount>): Promise<BankAccount> {
    const idx = mockBankAccounts.findIndex((a) => a.id === id);
    if (idx < 0) throw new Error("Conta não encontrada");
    mockBankAccounts[idx] = { ...mockBankAccounts[idx], ...data };
    return mockBankAccounts[idx];
  },

  async deleteBankAccount(id: string): Promise<void> {
    mockBankAccounts = mockBankAccounts.filter((a) => a.id !== id);
  },

  // CNAB Batches
  async getCnabBatches(): Promise<CnabBatch[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...mockCnabBatches]), 200));
  },

  async generateCnabRemessa(
    bancoCodigo: BankCode,
    padrao: "CNAB240" | "CNAB400",
    titleIds: string[]
  ): Promise<CnabBatch> {
    const allTitles = await financialService.getTitles();
    const selectedTitles = allTitles.filter((t) => titleIds.includes(t.id));

    const banco = BANK_INFO_MAP[bancoCodigo] || { name: "Banco Genérico" };
    const dateStr = new Date().toISOString().replace(/-/g, "").substring(0, 8);
    const dateFormatted = new Date().toISOString().replace("T", " ").substring(0, 16);

    const valorTotal = selectedTitles.reduce((acc, t) => acc + t.saldo, 0);

    const header = `01REMESSA01COBRANCA       0000000000000${bancoCodigo}000000000000000   REFRACTARIOS INDUSTRIALES S.A.  ${banco.name.substring(0, 15).padEnd(15, " ")}060926000001`;
    const rows = selectedTitles.map((t, idx) =>
      `101${String(idx + 1).padStart(5, "0")}${bancoCodigo}00000000000${t.prefixo}${t.numero.padStart(10, "0")}0000000${t.dataVencimento.replace(/-/g, "")}${String(Math.round(t.saldo * 100)).padStart(13, "0")}00000000000`
    ).join("\n");
    const footer = `90100001${bancoCodigo}${String(selectedTitles.length + 2).padStart(6, "0")}${String(Math.round(valorTotal * 100)).padStart(15, "0")}`;

    const fileContent = `${header}\n${rows}\n${footer}`;
    const batch: CnabBatch = {
      id: `cnab-${Date.now()}`,
      tipo: "Remessa",
      padrao,
      bancoCodigo,
      bancoNome: banco.name,
      dataGeracao: dateFormatted,
      quantidadeTitulos: selectedTitles.length || 1,
      valorTotal: valorTotal || 15000,
      status: "Pendente",
      nomeArquivo: `CB${dateStr.substring(4)}.REM`,
      conteudoArquivo: fileContent,
    };

    mockCnabBatches.unshift(batch);
    return batch;
  },

  async processCnabRetorno(
    fileContent: string,
    bancoCodigo: BankCode
  ): Promise<{ batch: CnabBatch; titlesUpdated: number; totalLiquidado: number }> {
    const banco = BANK_INFO_MAP[bancoCodigo] || { name: "Banco Genérico" };
    const dateFormatted = new Date().toISOString().replace("T", " ").substring(0, 16);

    // Get current unpaid titles to simulate automatic settlement
    const titles = await financialService.getTitles();
    const unpaid = titles.filter((t) => t.status !== "pago");
    const countToSettle = Math.min(3, unpaid.length);
    let totalLiquidado = 0;

    for (let i = 0; i < countToSettle; i++) {
      const t = unpaid[i];
      await financialService.settleTitle(t.id, {
        valorPago: t.saldo,
        dataPagamento: new Date().toISOString().split("T")[0],
        formaPagamento: "Boleto",
        observacao: `Liquidação Automática via Retorno CNAB - ${banco.name}`,
      });
      totalLiquidado += t.saldo;
    }

    const batch: CnabBatch = {
      id: `ret-${Date.now()}`,
      tipo: "Retorno",
      padrao: "CNAB240",
      bancoCodigo,
      bancoNome: banco.name,
      dataGeracao: dateFormatted,
      quantidadeTitulos: countToSettle || 1,
      valorTotal: totalLiquidado || 50000,
      status: "Processado",
      nomeArquivo: `RET_${Date.now().toString().substring(8)}.RET`,
      conteudoArquivo: fileContent,
    };

    mockCnabBatches.unshift(batch);

    // Add Webhook log
    mockWebhookLogs.unshift({
      id: `wh-${Date.now()}`,
      banco: banco.name,
      evento: "cnab.retorno",
      payload: JSON.stringify({ batchId: batch.id, titulosBaixados: countToSettle, total: totalLiquidado }, null, 2),
      statusHttp: 200,
      timestamp: dateFormatted,
      processadoSucesso: true,
      mensagem: `Arquivo de retorno CNAB processado. ${countToSettle} títulos liquidados automaticamente.`,
    });

    return { batch, titlesUpdated: countToSettle, totalLiquidado };
  },

  // Pix & Boleto Direct API
  async getPixBoletos(): Promise<PixBoletoRecord[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...mockPixBoletos]), 200));
  },

  async generatePixBoleto(tituloId: string, bankAccountId: string): Promise<PixBoletoRecord> {
    const titles = await financialService.getTitles();
    const title = titles.find((t) => t.id === tituloId) || titles[0];
    const account = mockBankAccounts.find((a) => a.id === bankAccountId) || mockBankAccounts[0];

    const randomTxid = `ref${title.prefixo}${title.numero}pix${Date.now().toString().substring(8)}`;
    const mockPixCopy = `00020126580014br.gov.bcb.pix0136${account.chavePix || "financeiro@refratarios.com.br"}520400005303986540${title.saldo.toFixed(2)}5802BR5930${account.titularNome.substring(0, 25)}6009SAO PAULO62070503***6304${Math.floor(1000 + Math.random() * 9000)}`;

    const newRecord: PixBoletoRecord = {
      id: `pb-${Date.now()}`,
      tituloId: title.id,
      tituloNumero: `${title.prefixo}-${title.numero}`,
      clienteNome: title.clienteFornecedorNome,
      nossoNumero: `${account.bancoCodigo}${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      txidPix: randomTxid,
      pixCopiaECola: mockPixCopy,
      qrCodeBase64: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ffffff'/><rect x='10' y='10' width='30' height='30' fill='%230f172a'/><rect x='60' y='10' width='30' height='30' fill='%230f172a'/><rect x='10' y='60' width='30' height='30' fill='%230f172a'/><rect x='45' y='45' width='25' height='25' fill='%2310b981'/></svg>",
      linhaDigitavel: `${account.bancoCodigo}91.${Math.floor(10000 + Math.random() * 89999)} ${Math.floor(10000 + Math.random() * 89999)}.${Math.floor(100000 + Math.random() * 899999)} ${Math.floor(100000 + Math.random() * 899999)}.${Math.floor(100000 + Math.random() * 899999)} 1 ${Math.floor(90000000000000 + Math.random() * 999999999999)}`,
      status: "Ativo",
      valor: title.saldo,
      dataEmissao: new Date().toISOString().split("T")[0],
      dataVencimento: title.dataVencimento,
      bancoEmissor: account.bancoNome,
    };

    mockPixBoletos.unshift(newRecord);
    return newRecord;
  },

  // Bank Reconciliation
  async getBankTransactions(contaId?: string): Promise<BankTransaction[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!contaId) resolve([...mockBankTransactions]);
        else resolve(mockBankTransactions.filter((t) => t.contaId === contaId));
      }, 200);
    });
  },

  async reconcileBankTransactions(matches: Array<{ transactionId: string; tituloId: string }>): Promise<void> {
    for (const m of matches) {
      const tx = mockBankTransactions.find((t) => t.id === m.transactionId);
      if (tx) {
        tx.statusConciliacao = "conciliado";
        tx.sugestaoTituloId = m.tituloId;
      }
    }
  },

  // Webhook Logs
  async getWebhookLogs(): Promise<BankWebhookLog[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...mockWebhookLogs]), 200));
  },

  // Open Banking API Tester
  async testBankConnection(contaId: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const acc = mockBankAccounts.find((a) => a.id === contaId);
    if (!acc) throw new Error("Conta não encontrada");

    const latency = Math.floor(45 + Math.random() * 120);

    if (acc.status === "Inativa") {
      return { success: false, latencyMs: latency, message: "A conta bancária está inativa no cadastro." };
    }

    acc.dataUltimaSincronizacao = new Date().toISOString().replace("T", " ").substring(0, 16);

    return {
      success: true,
      latencyMs: latency,
      message: `Conexão OAuth 2.0 / Mutual TLS estabelecida com sucesso com ${acc.bancoNome}. API de Pix e Extrato responsiva.`,
    };
  },
};
