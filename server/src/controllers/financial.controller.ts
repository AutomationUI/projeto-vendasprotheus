import { Request, Response, NextFunction } from "express";
import { supabase } from "../lib/supabase";

type FinancialRecordType = "receber" | "pagar";
type FinancialStatus = "pendente" | "pago" | "parcial" | "atrasado" | "cancelado";

interface TitleFormData {
  prefixo?: string;
  numero?: string;
  parcela?: string;
  tipo?: FinancialRecordType;
  clienteFornecedorId: string;
  clienteFornecedorNome: string;
  cnpjCpf?: string;
  pedidoId?: string;
  orcamentoId?: string;
  faturamentoId?: string;
  categoriaGerencial?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  formaPagamento?: "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro";
  historico?: string;
}

interface SettleFormData {
  valorPago: number;
  dataPagamento: string;
  formaPagamento?: "Boleto" | "Pix" | "Cartão" | "Transferência" | "Dinheiro";
  desconto?: number;
  jurosMulta?: number;
  observacao?: string;
}

interface CreditAnalysisFormData {
  statusCredito?: "liberado" | "bloqueado" | "em_analise";
  limiteCredito?: number;
  motivoBloqueio?: string;
}

interface CollectionFormData {
  tituloId: string;
  tituloNumero: string;
  clienteId: string;
  clienteNome: string;
  dataHora: string;
  tipo: "ligacao" | "whatsapp" | "email" | "reuniao";
  responsavel: string;
  observacao: string;
  promessaData?: string;
  valorPrometido?: number;
  resultado?: "promessa_pagamento" | "em_negociacao" | "sem_sucesso" | "acordo_fechado" | "quitado";
}

interface ReconciliationFormData {
  id: string;
  tituloId: string;
  descricao: string;
  valor: number;
  tipo: "entrada" | "saida";
  status?: "pendente" | "conciliado";
}

export class FinancialController {
  public static async getTitles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const { tipo, status, search } = req.query;

      let query = supabase.from("faturas").select(`
        *,
        clientes!inner (razao_social, cnpj)
      `).eq("organization_id", organizationId).order("data_emissao", { ascending: false });

      if (tipo && tipo !== "all") {
        query = query.eq("tipo", String(tipo));
      }
      if (status) {
        query = query.eq("status", String(status));
      }
      if (search) {
        const q = String(search).toLowerCase();
        query = query.ilike("clientes.razao_social", `%${q}%`).or(`ilike.numero.%${q}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const titles = (data || []).map((f: any) => ({
        id: f.id,
        prefixo: f.prefixo,
        numero: f.numero,
        parcela: FinancialController.getParcelaFromFatura(f),
        tipo: f.tipo,
        clienteFornecedorId: f.cliente_id,
        clienteFornecedorNome: f.clientes?.razao_social || "Cliente",
        cnpjCpf: f.clientes?.cnpj,
        pedidoId: f.pedido_id,
        orcamentoId: f.orcamento_id,
        faturamentoId: f.id,
        categoriaGerencial: f.categoria_gerencial || "Operacional",
        dataEmissao: f.data_emissao ? new Date(f.data_emissao).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        dataVencimento: f.data_vencimento ? new Date(f.data_vencimento).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        valorOriginal: Number(f.valor_total || 0),
        valorPagoTotal: Number(f.valor_pago || 0),
        saldo: Number(f.saldo || 0),
        status: f.status,
        formaPagamento: f.metodo_pagamento || "Boleto",
        historico: f.historico_observacoes,
        protheusRecno: f.protheus_recno,
      }));

      res.json({ success: true, data: titles });
    } catch (error) {
      next(error);
    }
  }

  private static getParcelaFromFatura(fatura: any): string {
    const parcelas = fatura.fatura_parcelas || [];
    if (parcelas.length === 0) return "01/01";
    const primeira = parcelas[0];
    return `${primeira.numero_parcela}/${parcelas.length}`;
  }

  public static async createTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const data = req.body as TitleFormData;

      // Auto-resolve cliente_id from CNPJ if not provided
      let clienteId = data.clienteFornecedorId;
      if (!clienteId && data.cnpjCpf) {
        const { data: client } = await supabase.from("clientes").select("id").eq("cnpj", data.cnpjCpf).eq("organization_id", organizationId).single();
        clienteId = client?.id;
      }

      const titleData = {
        prefixo: data.prefixo || (data.tipo === "receber" ? "FAT" : "FIN"),
        numero: data.numero || `${Math.floor(100000 + Math.random() * 900000)}`,
        parcela: data.parcela || "01/01",
        tipo: data.tipo || "receber",
        cliente_id: clienteId || data.clienteFornecedorId,
        valor_total: Number(data.valorOriginal || 0),
        data_emissao: data.dataEmissao || new Date().toISOString().split("T")[0],
        data_vencimento: data.dataVencimento || new Date().toISOString().split("T")[0],
        status: "ABERTA",
        metodo_pagamento: data.formaPagamento || "Boleto",
        categoria_gerencial: data.categoriaGerencial || "Operacional",
        organization_id: organizationId,
      };

      const { data: newFatura, error } = await supabase
        .from("faturas")
        .insert(titleData)
        .select()
        .single();

      if (error) throw error;

      // Create parcelas if multiple parcels requested
      const parcelaInfo = data.parcela || "01/01";
      const parcelaCount = parseInt(parcelaInfo.split("/")[1] || "1");
      if (parcelaCount > 1 && !isNaN(parcelaCount)) {
        const valorParcela = Number(newFatura.valor_total) / parcelaCount;
        for (let i = 1; i <= parcelaCount; i++) {
          const vencimento = new Date(newFatura.data_vencimento);
          vencimento.setMonth(vencimento.getMonth() + i);
          await supabase.from("fatura_parcelas").insert({
            fatura_id: newFatura.id,
            organization_id: organizationId,
            numero_parcela: i,
            valor_parcela: Number(valorParcela.toFixed(2)),
            data_vencimento: vencimento.toISOString().split("T")[0],
            status_status: "PENDENTE",
          });
        }
      }

      res.json({ success: true, data: { id: newFatura.id, ...titleData } });
    } catch (error) {
      next(error);
    }
  }

  public static async settleTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const { valorPago, dataPagamento, formaPagamento, desconto, jurosMulta, observacao } = req.body;

      // Get current fatura
      const { data: fatura, error: faturaError } = await supabase.from("faturas").select("valor_total, valor_pago, status").eq("id", id).single();

      if (faturaError) throw faturaError;

      const valorPagoNum = Number(valorPago);
      const novoSaldo = Math.max(0, Number(fatura.valor_total) - (Number(fatura.valor_pago || 0) + valorPagoNum));

      // Update fatura
      const updateData: any = {
        valor_pago: Number(fatura.valor_pago || 0) + valorPagoNum,
      };

      if (novoSaldo === 0) {
        updateData.status = "PAGA";
      } else if (novoSaldo < Number(fatura.valor_total)) {
        updateData.status = "PARCIAL";
      }

      const { error: updateError } = await supabase.from("faturas").update(updateData).eq("id", id);

      if (updateError) throw updateError;

      // Record payment in fatura_parcelas
      const parcelaData: any = {
        fatura_id: id,
        organization_id: organizationId,
        data_pagamento: dataPagamento,
        status_status: novoSaldo === 0 ? "PAGA" : "PENDENTE",
        valor_pago: valorPagoNum,
      };

      if (desconto !== undefined) parcelaData.desconto = Number(desconto);
      if (jurosMulta !== undefined) parcelaData.juros = Number(jurosMulta);

      await supabase.from("fatura_parcelas").insert(parcelaData);

      // Register audit log
      await supabase.from("auditoria").insert({
        organization_id: organizationId,
        usuario: req.headers["x-user"] as string || "system",
        evento: "title_settle",
        descricao: `Título ${id} recebido pagamento de R$ ${valorPagoNum.toFixed(2)}. Saldo restante: R$ ${novoSaldo.toFixed(2)}`,
        modulo: "financial",
        ip: req.ip || "",
      });

      res.json({ success: true, data: { id, novoSaldo, status: updateData.status } });
    } catch (error) {
      next(error);
    }
  }

  public static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;

      const { data: titles } = await supabase.from("faturas").select("*, clientes!inner(razao_social, cnpj), fatura_parcelas(*)").eq("organization_id", organizationId);

      const aReceber = (titles || []).filter((t: any) => t.tipo === "receber" && t.status !== "PAGA");
      const aPagar = (titles || []).filter((t: any) => t.tipo === "pagar" && t.status !== "PAGA");
      const recebidos = (titles || []).filter((t: any) => t.tipo === "receber" && t.status === "PAGA");
      const pagos = (titles || []).filter((t: any) => t.tipo === "pagar" && t.status === "PAGA");
      const atrasados = (titles || []).filter((t: any) => t.tipo === "receber" && t.status === "ATRASADO");

      const totalAReceber = (aReceber.reduce((acc: number, t: any) => acc + Number(t.valor_total), 0));
      const totalAPagar = (aPagar.reduce((acc: number, t: any) => acc + Number(t.valor_total), 0));
      const recebidoMes = (recebidos.reduce((acc: number, t: any) => acc + Number(t.valor_pago || 0), 0));
      const pagoMes = (pagos.reduce((acc: number, t: any) => acc + Number(t.valor_total), 0));
      const totalInadimplencia = (atrasados.reduce((acc: number, t: any) => acc + Number(t.valor_total), 0));

      let taxaInadimplencia = 0;
      if (totalAReceber + recebidoMes > 0) {
        taxaInadimplencia = Number(((totalInadimplencia / (totalAReceber + recebidoMes)) * 100).toFixed(1));
      }

      // Calculating aging
      const hoje = new Date();
      const aVencer: number = (aReceber.reduce((acc: number, t: any) => {
        const vencimento = new Date(t.data_vencimento);
        const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? acc + Number(t.valor_total) : acc;
      }, 0));

      const vencido1a30: number = (aReceber.reduce((acc: number, t: any) => {
        const vencimento = new Date(t.data_vencimento);
        const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= -30 && diffDays > -60 ? acc + Number(t.valor_total) : acc;
      }, 0));

      const vencido31a60: number = (aReceber.reduce((acc: number, t: any) => {
        const vencimento = new Date(t.data_vencimento);
        const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= -60 && diffDays > -90 ? acc + Number(t.valor_total) : acc;
      }, 0));

      const vencido61a90: number = (aReceber.reduce((acc: number, t: any) => {
        const vencimento = new Date(t.data_vencimento);
        const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= -90 && diffDays > -120 ? acc + Number(t.valor_total) : acc;
      }, 0));

      const vencidoMais90: number = (aReceber.reduce((acc: number, t: any) => {
        const vencimento = new Date(t.data_vencimento);
        const diffDays = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= -120 ? acc + Number(t.valor_total) : acc;
      }, 0));

      const metrics = {
        totalAReceber: Number(totalAReceber.toFixed(2)),
        totalAPagar: Number(totalAPagar.toFixed(2)),
        saldoPrevisto: Number((totalAReceber - totalAPagar).toFixed(2)),
        recebidoMes: Number(recebidoMes.toFixed(2)),
        pagoMes: Number(pagoMes.toFixed(2)),
        totalInadimplencia: Number(totalInadimplencia.toFixed(2)),
        taxaInadimplencia: Number(taxaInadimplencia.toFixed(1)),
        titulosVencidosCount: atrasados.length,
        prazoMedioRecebimentoDias: 29,
        aging: {
          aVencer: Number(aVencer.toFixed(2)),
          vencido1a30: Number(vencido1a30.toFixed(2)),
          vencido31a60: Number(vencido31a60.toFixed(2)),
          vencido61a90: Number(vencido61a90.toFixed(2)),
          vencidoMais90: Number(vencidoMais90.toFixed(2)),
          totalGeral: Number(totalAReceber.toFixed(2)),
        },
      };

      res.json({ success: true, data: metrics });
    } catch (error) {
      next(error);
    }
  }

  public static async getCashFlow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;

      // Get titles with their parcels and status
      const { data: titles } = await supabase.from("faturas").select(`
        *,
        fatura_parcelas (*),
        clientes!inner (razao_social)
      `).eq("organization_id", organizationId).order("data_emissao", { ascending: false });

      // Build monthly periods from the last 6 months
      const now = new Date();
      const periodsMap = new Map<string, any>();

      if (titles) {
        titles.forEach((f: any) => {
          // Use fatura emission month for entradas, parcel due date for saidas
          const emisMonth = f.data_emissao ? f.data_emissao.slice(0, 7) : "unknown";

          if (!periodsMap.has(emisMonth)) {
            periodsMap.set(emisMonth, {
              entradasPrevistas: 0,
              entradasRealizadas: 0,
              saidasPrevistas: 0,
              saidasRealizadas: 0,
            });
          }

          const period = periodsMap.get(emisMonth);

          // Entradas previstas = total value of titles emitted
          period.entradasPrevistas = period.entradasPrevistas + Number(f.valor_total || 0);

          // Entradas realizadas = payments received
          const pagas = (f.fatura_parcelas || []).filter((p: any) => p.status_status === "PAGA");
          period.entradasRealizadas = period.entradasRealizadas + pagas.reduce((acc: number, p: any) => acc + Number(p.valor_pago || 0), 0);

          // Saidas previstas = total value of pagar titles
          if (f.tipo === "pagar") {
            period.saidasPrevistas = period.saidasPrevistas + Number(f.valor_total || 0);
          }

          // Saidas realizadas = payments made on pagar titles
          const pagasPagar = (f.fatura_parcelas || []).filter((p: any) => p.status_status === "PAGA");
          period.saidasRealizadas = period.saidasRealizadas + pagasPagar.reduce((acc: number, p: any) => acc + Number(p.valor_pago || 0), 0);
        });
      }

      // Format periods - last 6 months including current
      const fluxo: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(now.getMonth() - i);
        const mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const period = periodsMap.get(mesKey) || {
          entradasPrevistas: 0,
          entradasRealizadas: 0,
          saidasPrevistas: 0,
          saidasRealizadas: 0,
        };

        const periodoLabel = i === 0 ? "Atual" : String(date.toLocaleString("pt-BR", { month: "short", year: "2-digit" }));

        fluxo.push({
          periodo: periodoLabel,
          entradasPrevistas: Number(period.entradasPrevistas.toFixed(2)),
          entradasRealizadas: Number(period.entradasRealizadas.toFixed(2)),
          saidasPrevistas: Number(period.saidasPrevistas.toFixed(2)),
          saidasRealizadas: Number(period.saidasRealizadas.toFixed(2)),
          saldoLiquidado: Number((period.entradasRealizadas - period.saidasRealizadas).toFixed(2)),
          saldoProjetado: Number((period.entradasPrevistas - period.saidasPrevistas).toFixed(2)),
        });
      }

      res.json({ success: true, data: fluxo });
    } catch (error) {
      next(error);
    }
  }

  public static async getCreditAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const { clienteId } = req.query;

      let query = supabase.from("clientes").select(`
        *,
        usuarios!inner (nome, role, meta_mensal, comissao)
      `).eq("organization_id", organizationId);

      if (clienteId) {
        query = query.eq("id", String(clienteId));
      }

      const { data, error } = await query;

      if (error) throw error;

      const { data: orgTitles } = await supabase
        .from("faturas")
        .select("id, cliente_id, status, valor_total")
        .eq("organization_id", organizationId);
      const titles = orgTitles || [];

      const clientes = (data || []).map((c: any) => {
        const limiteCredito = Number(c.meta_mensal || 0) * 6;
        const valorUtilizado = Number((c.total_compras || 0));
        const disponivel = limiteCredito - valorUtilizado;
        const statusCredito = disponivel > 0 ? "liberado" : "bloqueado";
        const classeRisco = disponivel > 0.7 * limiteCredito ? "A - Baixo" : disponivel > 0.4 * limiteCredito ? "B - Médio" : "C - Alto";

        // Count titles from this client
        const clientTitles = titles.filter((t: any) => t.cliente_id === c.id || (typeof t.cliente_id === "object" && t.cliente_id?.id === c.id));
        const titulosAbertoCount = clientTitles.filter((t: any) => t.status !== "PAGA").length;
        const titulosVencidosCount = clientTitles.filter((t: any) => t.status === "ATRASADO").length;
        const valorVencidoTotal = clientTitles.filter((t: any) => t.status === "ATRASADO").reduce((acc: number, t: any) => acc + Number(t.valor_total || 0), 0);

        return {
          clienteId: c.id,
          clienteNome: c.razao_social,
          cnpjCpf: c.cnpj,
          limiteCredito: Number(limiteCredito.toFixed(2)),
          creditoUtilizado: Number(valorUtilizado.toFixed(2)),
          creditoDisponivel: Number(disponivel.toFixed(2)),
          titulosAbertoCount,
          titulosVencidosCount,
          valorVencidoTotal: Number(valorVencidoTotal.toFixed(2)),
          statusCredito,
          motivoBloqueio: disponivel <= 0 ? "Limite esgotado" : undefined,
          classeRisco,
          prazoMedioPagamentoDias: 30,
        };
      });

      res.json({ success: true, data: clientes });
    } catch (error) {
      next(error);
    }
  }

  public static async updateCreditAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const { clienteId } = req.params;
      const { statusCredito, limiteCredito, motivoBloqueio } = req.body;

      // Update customer metadata
      await supabase.from("clientes").update({
        meta_mensal: limiteCredito ? Number(limiteCredito) : undefined,
      }).eq("id", clienteId).eq("organization_id", organizationId);

      // Register audit log
      await supabase.from("auditoria").insert({
        organization_id: organizationId,
        usuario: req.headers["x-user"] as string || "system",
        evento: "credit_analysis_update",
        descricao: `Análise de crédito atualizada para cliente ${clienteId}: status=${statusCredito}, limite=R$ ${limiteCredito || "não alterado"}`,
        modulo: "financial",
        ip: req.ip || "",
      });

      res.json({ success: true, message: "Análise de crédito atualizada" });
    } catch (error) {
      next(error);
    }
  }

  public static async getCollections(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;

      // Get collection actions from audit log
      const { data, error } = await supabase.from("auditoria").select("*").eq("organization_id", organizationId).ilike("evento", "%collection%").order("data_hora", { ascending: false });

      if (error) throw error;

      const collections = (data || []).map((a: any) => ({
        id: a.id,
        tituloId: a.descricao?.match(/título (\S+)/)?.[1] || a.organization_id,
        tituloNumero: "unknown",
        clienteId: a.organization_id || "unknown",
        clienteNome: "Cliente",
        dataHora: a.data_hora.toString(),
        tipo: "auditoria",
        responsavel: a.usuario || "System",
        observacao: a.descricao,
        resultado: "registrado",
      }));

      res.json({ success: true, data: collections });
    } catch (error) {
      next(error);
    }
  }

  public static async addCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const data = req.body as CollectionFormData;

      await supabase.from("auditoria").insert({
        organization_id: organizationId,
        usuario: req.headers["x-user"] as string || "system",
        evento: "collection_action",
        descricao: `Ação de cobrança no título ${data.tituloId}: ${data.tipo} - resultado: ${data.resultado || "registrado"}`,
        modulo: "financial",
        ip: req.ip || "",
      });

      res.json({ success: true, message: "Interação de cobrança registrada" });
    } catch (error) {
      next(error);
    }
  }

  public static async getReconciliations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;

      // Get reconciliation events from audit log
      const { data, error } = await supabase.from("auditoria").select("*").eq("organization_id", organizationId).ilike("evento", "%reconciliation%").order("data_hora", { ascending: false });

      if (error) throw error;

      const reconciliations = (data || []).map((a: any) => ({
        id: a.id,
        dataMovimento: a.data_hora.toString(),
        descricao: a.descricao,
        valor: 0,
        tipo: "entrada",
        status: "conciliado",
        sugestaoTituloId: "unknown",
        sugestaoTituloNumero: "unknown",
        tituloConciliadoId: a.organization_id,
        dataConciliacao: a.data_hora.toString(),
      }));

      res.json({ success: true, data: reconciliations });
    } catch (error) {
      next(error);
    }
  }

  public static async matchReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = (req as any).organizationId;
      const { id } = req.params;
      const { tituloId } = req.body;

      await supabase.from("auditoria").insert({
        organization_id: organizationId,
        usuario: req.headers["x-user"] as string || "system",
        evento: "reconciliation_match",
        descricao: `Conciliação realizada: item ${id} vinculado ao título ${tituloId}`,
        modulo: "financial",
        ip: req.ip || "",
      });

      res.json({ success: true, message: "Conciliação registrada" });
    } catch (error) {
      next(error);
    }
  }
}