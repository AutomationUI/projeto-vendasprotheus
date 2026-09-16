import { describe, it, expect, beforeEach } from "vitest";
import { localDB } from "@/lib/local-db";
import { type Order, type Quote } from "@/lib/mock-data";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Rotina de Aprovações - Pedidos e Orçamentos", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("cria pedido com desconto alto (>10%) e deve gerar aprovação com status Pendente", () => {
    const newOrderData: Omit<Order, "id"> = {
      numero: "PV-TEST-001",
      cliente: "Cliente Teste Ltda",
      valor: 10000,
      condicaoPagamento: "30/60/90",
      vendedor: "Vendedor Teste",
      data: "2026-09-04",
      status: "Pendente",
      itens: [
        {
          produto: "Disco Abrasivo",
          codigo: "DISC-001",
          quantidade: 100,
          precoUnitario: 120,
          desconto: 16.6,
          total: 10000,
        },
      ],
    };

    const saved = localDB.saveOrder(newOrderData);

    expect(saved.status).toBe("Aprovar");

    const approvals = localDB.getApprovals();
    const approval = approvals.find((a) => a.numero === saved.numero && a.tipo === "Pedido");

    expect(approval).toBeDefined();
    expect(approval?.tipo).toBe("Pedido");
    expect(approval?.status).toBe("Pendente");
    expect(approval?.motivo).toMatch(/Desconto acima de/i);
  });

  it("cria pedido com valor alto (>50.000) e deve gerar aprovação por Alçada de Valor", () => {
    const newOrderData: Omit<Order, "id"> = {
      numero: "PV-TEST-002",
      cliente: "Grande Construtora S/A",
      valor: 65000,
      condicaoPagamento: "30/60/90",
      vendedor: "Vendedor Teste",
      data: "2026-09-04",
      status: "Pendente",
      itens: [
        {
          produto: "Lixa Industrial",
          codigo: "LIXA-001",
          quantidade: 1000,
          precoUnitario: 65,
          desconto: 0,
          total: 65000,
        },
      ],
    };

    const saved = localDB.saveOrder(newOrderData);

    expect(saved.status).toBe("Aprovar");

    const approvals = localDB.getApprovals();
    const approval = approvals.find((a) => a.numero === saved.numero && a.tipo === "Pedido");

    expect(approval).toBeDefined();
    expect(approval?.tipo).toBe("Pedido");
    expect(approval?.status).toBe("Pendente");
    expect(approval?.motivo).toContain("Valor acima de R$ 50.000");
  });

  it("aprovação do pedido atualiza o status do pedido para Aprovado", () => {
    const saved = localDB.saveOrder({
      numero: "PV-TEST-003",
      cliente: "Cliente Teste 3",
      valor: 75000,
      condicaoPagamento: "30 dias",
      vendedor: "Vendedor Teste",
      data: "2026-09-04",
      status: "Pendente",
      itens: [],
    });

    const approvals = localDB.getApprovals();
    const approval = approvals.find((a) => a.numero === saved.numero && a.tipo === "Pedido");
    expect(approval).toBeDefined();

    localDB.approveItem(approval!.id, "Aprovado pelo Diretor");

    const updatedOrder = localDB.getOrderById(saved.id);
    expect(updatedOrder?.status).toBe("Aprovado");

    const updatedApproval = localDB.getApprovals().find((a) => a.id === approval!.id);
    expect(updatedApproval?.status).toBe("Aprovado");
  });

  it("rejeição do pedido atualiza o status do pedido para Cancelado", () => {
    const saved = localDB.saveOrder({
      numero: "PV-TEST-004",
      cliente: "Cliente Teste 4",
      valor: 10000,
      condicaoPagamento: "30 dias",
      vendedor: "Vendedor Teste",
      data: "2026-09-04",
      status: "Pendente",
      itens: [
        {
          produto: "Rebolo",
          codigo: "REB-01",
          quantidade: 10,
          precoUnitario: 1000,
          desconto: 25,
          total: 7500,
        },
      ],
    });

    const approvals = localDB.getApprovals();
    const approval = approvals.find((a) => a.numero === saved.numero && a.tipo === "Pedido");
    expect(approval).toBeDefined();

    localDB.rejectItem(approval!.id, "Margem insuficiente");

    const updatedOrder = localDB.getOrderById(saved.id);
    expect(updatedOrder?.status).toBe("Cancelado");

    const updatedApproval = localDB.getApprovals().find((a) => a.id === approval!.id);
    expect(updatedApproval?.status).toBe("Rejeitado");
  });

  it("conversão de orçamento com desconto alto para pedido gera aprovação para o pedido", () => {
    const quote: Quote = {
      id: "orc-test-conv",
      numero: "ORC-TEST-001",
      cliente: "Cliente Conversão",
      contato: "João",
      validade: "2026-10-01",
      valor: 40000,
      status: "Pendente",
      vendedor: "Vendedor Teste",
      condicaoPagamento: "28 DDL",
      observacoes: "",
      itens: [
        {
          produto: "Lixa Especial",
          codigo: "LIX-99",
          quantidade: 40,
          precoUnitario: 1000,
          desconto: 15, // > 10%
          total: 34000,
        },
      ],
    };

    const savedQuote = localDB.saveQuote(quote);

    const result = localDB.convertQuoteToOrder(savedQuote.id);
    expect(result.order.status).toBe("Aprovar");

    const approvals = localDB.getApprovals();
    const orderApproval = approvals.find((a) => a.numero === result.order.numero && a.tipo === "Pedido");
    expect(orderApproval).toBeDefined();
    expect(orderApproval?.tipo).toBe("Pedido");
    expect(orderApproval?.status).toBe("Pendente");
  });
});
