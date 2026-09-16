import type { Customer, Order, Quote, CrmOpportunity, ProductionBatch } from "../lib/types-roles";
import { HubCustomerProvider } from "../providers/customer";
import { HubOrderProvider } from "../providers/order";
import { HubQuoteProvider } from "../providers/quote";
import { HubCrmProvider } from "../providers/crm";
import { HubProductionProvider } from "../providers/production";

export interface Customer360 {
  // Dados básico do cliente
  customer: Customer | null;

  // Estatísticas resumidas
  stats: {
    totalCompras: number;
    totalGasto: number;
    ultimoCompra: string | null;
    qtdOportunidades: number;
    qtdOportunidadesGanhas: number;
    qtdOrcamentos: number;
    qtdOrcamentosAprovados: number;
    qtdPedidos: number;
    qtdPedidosFaturados: number;
    qtdLotesProducao: number;
    statusAtual: "Ativo" | "Inativo" | "Prospecto";
  };

  // Últimas oportunidades CRM
  ultimasOportunidades: CrmOpportunity[];

  // Últimos orçamentos
  ultimosOrcamentos: Quote[];

  // Últimos pedidos
  ultimosPedidos: Order[];

  // Lotes de produção em andamento
  lotesProducaoAtivos: ProductionBatch[];

  // Histórico de interações (sumário)
  ultimoContato: string | null;
  totalInteracoes: number;
}

/**
 * Monta o perfil Customer 360 para uma organização.
 * Requer a organizationId como parâmetro obrigatório.
 */
export async function buildCustomer360(
  organizationId: string,
  customerProvider?: HubCustomerProvider,
  orderProvider?: HubOrderProvider,
  quoteProvider?: HubQuoteProvider,
  crmProvider?: HubCrmProvider,
  productionProvider?: HubProductionProvider
): Promise<Customer360> {
  // Injetar provedores se não fornecidos (padrão: nova instância com a organizationId)
  const cp = customerProvider ?? new HubCustomerProvider(organizationId);
  const op = orderProvider ?? new HubOrderProvider(organizationId);
  const qp = quoteProvider ?? new HubQuoteProvider(organizationId);
  const crm = crmProvider ?? new HubCrmProvider(organizationId);
  const pp = productionProvider ?? new HubProductionProvider(organizationId);

  // 1. Buscar dados do cliente
  const [customer, ultimasOportunidades, ultimosOrcamentos, ultimosPedidos, lotesProducaoAtivos] =
    await Promise.all([
      cp.get("root-customer-id", organizationId), // placeholder - em produção viria do frontend/contexto
      crm.list({ onlyOpen: false }),
      qp.list({ onlyOpen: false }),
      op.list({ onlyOpen: false }),
      pp.list({ status: "Mistura" }) // lotes na mistura = em produção
    ]);

  // 2. Calcular estatísticas a partir dos dados retornados
  const stats = {
    totalCompras: customer?.totalCompras ?? 0,
    totalGasto: 0, // seria soma dos pedidos faturados - simplificado
    ultimoCompra: customer?.ultimaCompra ?? null,
    qtdOportunidades: ultimasOportunidades.length,
    qtdOportunidadesGanhas: (ultimasOportunidades.filter((o: any) => o.estagio === "ganho").length),
    qtdOrcamentos: ultimosOrcamentos.length,
    qtdOrcamentosAprovados: (ultimosOrcamentos.filter((o: any) => o.status === "Aprovado").length),
    qtdPedidos: ultimosPedidos.length,
    qtdPedidosFaturados: (ultimosPedidos.filter((o: any) => o.status === "Faturado").length),
    qtdLotesProducao: lotesProducaoAtivos.length,
    statusAtual: customer?.ativo === false ? "Inativo" : customer?.status ?? "Ativo",
  };

  // 3. Determinar último contato e total de interações
  // (em um sistema completo, viria da tabela de interacoes_mensageria + histórico)
  const ultimoContato: string | null = null; // placeholder
  const totalInteracoes: number = stats.qtdOportunidades + stats.qtdOrcamentos + stats.qtdPedidos;

  return {
    customer,
    stats,
    ultimasOportunidades,
    ultimosOrcamentos,
    ultimosPedidos,
    lotesProducaoAtivos,
    ultimoContato,
    totalInteracoes,
  };
}