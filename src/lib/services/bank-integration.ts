import { BankTransaction, PixBoletoRecord, CnabBatch, BankCode } from "@/types/banking";
import { FinancialTitle } from "@/types/financial";
import { financialService } from "@/lib/api/financial-service";
import { bankingService, BANK_INFO_MAP } from "@/lib/api/banking-service";

export interface BankConnectionConfig {
  accountId: string;
  bankCode: BankCode;
  environment: "Sandbox" | "Producao";
  clientId?: string;
  clientSecret?: string;
  certificatePem?: string;
  webhookSecret?: string;
  autoReconcileEnabled: boolean;
  reconciliationMatchToleranceDays: number;
}

export interface ReconciliationMatch {
  transactionId: string;
  transactionDocument: string;
  transactionAmount: number;
  transactionDate: string;
  transactionDescription: string;
  titleId: string;
  titleNumber: string;
  titleCustomerSupplier: string;
  titleAmount: number;
  titleDueDate: string;
  confidenceScore: number; // 0 to 100
  matchReason: string; // "exact_document" | "amount_and_date" | "fuzzy_name_and_amount"
  status: "matched" | "settled" | "flagged_for_review";
}

export interface AutoReconciliationReport {
  accountId: string;
  bankName: string;
  processedAt: string;
  totalTransactionsProcessed: number;
  autoReconciledCount: number;
  totalAmountReconciled: number;
  pendingReviewCount: number;
  matches: ReconciliationMatch[];
  unmatchedTransactions: BankTransaction[];
}

export interface BankSyncResult {
  accountId: string;
  bankName: string;
  syncTimestamp: string;
  newTransactionsFetched: number;
  updatedBalance: number;
  status: "success" | "partial" | "error";
  errorMessage?: string;
}

export interface BankApiWebhookEvent {
  eventId: string;
  bankCode: BankCode;
  eventType: "pix.recebido" | "boleto.liquidado" | "cnab.retorno" | "transferencia.enviada" | "falha.autenticacao";
  timestamp: string;
  txid?: string;
  nossoNumero?: string;
  amount: number;
  payerCnpjCpf?: string;
  payerName?: string;
  rawPayload: Record<string, unknown>;
}

class BankIntegrationService {
  /**
   * Tests API Connectivity & Authentication with Bank (OAuth 2.0 / mTLS)
   */
  async testConnection(accountId: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    return bankingService.testBankConnection(accountId);
  }

  /**
   * Syncs bank statement transactions from the banking API
   */
  async syncAccountStatement(accountId: string, _dateRange?: { startDate: string; endDate: string }): Promise<BankSyncResult> {
    const accounts = await bankingService.getBankAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return {
        accountId,
        bankName: "Desconhecido",
        syncTimestamp: new Date().toISOString(),
        newTransactionsFetched: 0,
        updatedBalance: 0,
        status: "error",
        errorMessage: `Conta bancária ID ${accountId} não encontrada.`,
      };
    }

    // Simulate fetching fresh statement entries from Open Banking API
    const existingTransactions = await bankingService.getBankTransactions(accountId);
    
    // Update account last sync time
    const updatedSyncTime = new Date().toISOString().replace("T", " ").substring(0, 16);
    await bankingService.updateBankAccount(accountId, {
      dataUltimaSincronizacao: updatedSyncTime,
    });

    return {
      accountId: account.id,
      bankName: account.bancoNome,
      syncTimestamp: updatedSyncTime,
      newTransactionsFetched: existingTransactions.length,
      updatedBalance: account.saldoAtual,
      status: "success",
    };
  }

  /**
   * Automatic Reconciliation Engine
   * Matches pending bank transactions against ERP Financial Titles based on:
   * 1. Exact document/nossoNumero/ref match (100% confidence)
   * 2. Exact amount + date within tolerance (90% confidence)
   * 3. Fuzzy customer/supplier name + exact amount match (75% confidence)
   */
  async runAutoReconciliation(
    accountId: string,
    options?: { autoSettleErpTitles?: boolean; maxToleranceDays?: number }
  ): Promise<AutoReconciliationReport> {
    const autoSettle = options?.autoSettleErpTitles ?? true;
    const toleranceDays = options?.maxToleranceDays ?? 3;

    const accounts = await bankingService.getBankAccounts();
    const account = accounts.find((a) => a.id === accountId) || accounts[0];
    
    const transactions = await bankingService.getBankTransactions(accountId);
    const pendingTransactions = transactions.filter((t) => t.statusConciliacao === "pendente");
    
    const allTitles = await financialService.getTitles();
    const openTitles = allTitles.filter((t) => t.status !== "pago");

    const matches: ReconciliationMatch[] = [];
    const unmatchedTransactions: BankTransaction[] = [];
    let autoReconciledCount = 0;
    let totalAmountReconciled = 0;

    const usedTitleIds = new Set<string>();

    for (const tx of pendingTransactions) {
      let bestMatch: { title: FinancialTitle; score: number; reason: string } | null = null;

      // Extract document numbers from historical description
      const txDocClean = tx.documento.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const txHistClean = tx.historico.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

      for (const title of openTitles) {
        if (usedTitleIds.has(title.id)) continue;

        // Verify credit/debit alignment (Credit = Receber, Debit = Pagar)
        const isMatchDirection =
          (tx.tipo === "credito" && title.tipo === "receber") ||
          (tx.tipo === "debito" && title.tipo === "pagar");

        if (!isMatchDirection) continue;

        const titleNumClean = title.numero.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        const titlePrefClean = `${title.prefixo}${title.numero}`.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

        // 1. Exact document match
        const hasDocMatch =
          (txDocClean.length > 2 && (txDocClean.includes(titleNumClean) || titleNumClean.includes(txDocClean))) ||
          (txHistClean.includes(titleNumClean) || txHistClean.includes(titlePrefClean));

        const amountDiff = Math.abs(tx.valor - title.saldo);
        const isExactAmount = amountDiff < 0.01;

        if (hasDocMatch && isExactAmount) {
          bestMatch = { title, score: 100, reason: "Correspondência exata por Número de Documento e Valor" };
          break;
        }

        // 2. Exact amount + date within tolerance
        if (isExactAmount) {
          const txDate = new Date(tx.data).getTime();
          const titleDueDate = new Date(title.dataVencimento).getTime();
          const diffDays = Math.abs(txDate - titleDueDate) / (1000 * 3600 * 24);

          if (diffDays <= toleranceDays) {
            const score = Math.max(80, 95 - Math.round(diffDays * 3));
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { title, score, reason: `Valor exato e data aproximada (${Math.round(diffDays)} dias de diferença)` };
            }
          }
        }

        // 3. Fuzzy customer/supplier name + amount match
        const entityName = title.clienteFornecedorNome.toLowerCase();
        const firstWord = entityName.split(" ")[0];
        if (firstWord.length > 3 && tx.historico.toLowerCase().includes(firstWord) && isExactAmount) {
          if (!bestMatch || 75 > bestMatch.score) {
            bestMatch = { title, score: 75, reason: "Correspondência por Razão Social/Nome e Valor" };
          }
        }
      }

      if (bestMatch && bestMatch.score >= 75) {
        usedTitleIds.add(bestMatch.title.id);
        const status = bestMatch.score >= 85 && autoSettle ? "settled" : "matched";

        matches.push({
          transactionId: tx.id,
          transactionDocument: tx.documento,
          transactionAmount: tx.valor,
          transactionDate: tx.data,
          transactionDescription: tx.historico,
          titleId: bestMatch.title.id,
          titleNumber: `${bestMatch.title.prefixo}-${bestMatch.title.numero}`,
          titleCustomerSupplier: bestMatch.title.clienteFornecedorNome,
          titleAmount: bestMatch.title.saldo,
          titleDueDate: bestMatch.title.dataVencimento,
          confidenceScore: bestMatch.score,
          matchReason: bestMatch.reason,
          status,
        });

        // Automatically settle title in ERP core if configured and score is high
        if (status === "settled") {
          try {
            await financialService.settleTitle(bestMatch.title.id, {
              valorPago: tx.valor,
              dataPagamento: tx.data,
              formaPagamento: tx.historico.includes("PIX") ? "Pix" : "Boleto",
              observacao: `Baixa Automática via Conciliação Bancária - ${account?.bancoNome || "Open Banking"}`,
            });
            autoReconciledCount++;
            totalAmountReconciled += tx.valor;
          } catch {
            // Log fallback
          }
        }

        // Update transaction status in banking mock
        await bankingService.reconcileBankTransactions([
          { transactionId: tx.id, tituloId: bestMatch.title.id }
        ]);
      } else {
        unmatchedTransactions.push(tx);
      }
    }

    return {
      accountId: account?.id || accountId,
      bankName: account?.bancoNome || "Banco Conectado",
      processedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
      totalTransactionsProcessed: pendingTransactions.length,
      autoReconciledCount,
      totalAmountReconciled,
      pendingReviewCount: matches.filter((m) => m.status === "matched").length,
      matches,
      unmatchedTransactions,
    };
  }

  /**
   * Issue Pix & Boleto Hybrid via Direct Bank API
   */
  async createPixBoleto(tituloId: string, accountId: string): Promise<PixBoletoRecord> {
    return bankingService.generatePixBoleto(tituloId, accountId);
  }

  /**
   * Process incoming Webhook notification from Bank Open Banking API
   */
  async handleWebhookNotification(event: BankApiWebhookEvent): Promise<{ handled: boolean; message: string }> {
    const bankInfo = BANK_INFO_MAP[event.bankCode] || { name: `Banco ${event.bankCode}` };

    if (event.eventType === "pix.recebido" || event.eventType === "boleto.liquidado") {
      const titles = await financialService.getTitles({ tipo: "receber" });
      
      // Match by txid or nossoNumero if available
      let matchedTitle = titles.find((t) => 
        (event.nossoNumero && t.numero.includes(event.nossoNumero)) ||
        (event.txid && t.numero.includes(event.txid))
      );

      // Fallback: match by amount if exact
      if (!matchedTitle) {
        matchedTitle = titles.find((t) => t.status !== "pago" && Math.abs(t.saldo - event.amount) < 0.01);
      }

      if (matchedTitle) {
        await financialService.settleTitle(matchedTitle.id, {
          valorPago: event.amount,
          dataPagamento: new Date().toISOString().split("T")[0],
          formaPagamento: event.eventType === "pix.recebido" ? "Pix" : "Boleto",
          observacao: `Liquidação Instantânea via Webhook Bancário ${bankInfo.name}`,
        });

        return {
          handled: true,
          message: `Webhook processado com sucesso. Título ${matchedTitle.prefixo}-${matchedTitle.numero} de R$ ${event.amount.toFixed(2)} liquidado no ERP.`,
        };
      }
    }

    return {
      handled: true,
      message: `Webhook ${event.eventType} registrado para processamento assíncrono.`,
    };
  }

  /**
   * Transmit CNAB Remessa Batch
   */
  async transmitCnabRemessa(
    bankCode: BankCode,
    pattern: "CNAB240" | "CNAB400",
    titleIds: string[]
  ): Promise<CnabBatch> {
    return bankingService.generateCnabRemessa(bankCode, pattern, titleIds);
  }

  /**
   * Process CNAB Retorno File content
   */
  async processCnabRetornoFile(
    fileContent: string,
    bankCode: BankCode
  ): Promise<{ batch: CnabBatch; titlesUpdated: number; totalLiquidado: number }> {
    return bankingService.processCnabRetorno(fileContent, bankCode);
  }
}

export const bankIntegrationService = new BankIntegrationService();
