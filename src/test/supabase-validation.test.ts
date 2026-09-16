import { describe, it, expect } from "vitest";
import { checkSupabaseHealth, isSupabaseConfigured, SUPABASE_URL } from "@/lib/supabase";
import { supabaseDb } from "@/lib/supabase-db";

describe("Supabase End-to-End & Health Validation", () => {
  it("should have Supabase credentials configured", () => {
    expect(isSupabaseConfigured()).toBe(true);
    expect(SUPABASE_URL).toContain("supabase.co");
  });

  it("should perform health check against Supabase endpoint", async () => {
    const health = await checkSupabaseHealth();
    console.log("Supabase Health Check Result:", JSON.stringify(health, null, 2));

    expect(typeof health.connected).toBe("boolean");
    expect(typeof health.latencyMs).toBe("number");
    expect(health.tables).toBeDefined();
    expect(health.connected).toBe(true);
  });

  it("should test database operations (getCustomers / getProducts)", async () => {
    const customers = await supabaseDb.getCustomers();
    console.log("Supabase getCustomers result:", customers ? `${customers.length} customers fetched` : "null");

    const products = await supabaseDb.getProducts();
    console.log("Supabase getProducts result:", products ? `${products.length} products fetched` : "null");

    expect(Array.isArray(customers)).toBe(true);
    expect(Array.isArray(products)).toBe(true);
  });

  it("should successfully upsert and fetch a test customer (RLS & CRUD validation)", async () => {
    const testCustomerId = "test-cust-" + Date.now();
    const testCustomer = {
      id: testCustomerId,
      razaoSocial: "Cliente Teste RLS E2E",
      cnpj: "00.000.000/0001-99",
      email: "teste@vendasprotheus.com",
      telefone: "(11) 99999-9999",
      cidade: "São Paulo",
      uf: "SP",
      endereco: "Av. Paulista, 1000",
      condicaoPagamento: "30 dias",
      totalCompras: 1500.00,
      ultimaCompra: new Date().toISOString(),
    };

    const success = await supabaseDb.upsertCustomer(testCustomer);
    expect(success).toBe(true);

    const customers = await supabaseDb.getCustomers();
    const found = customers?.find(c => c.id === testCustomerId);
    expect(found).toBeDefined();
    expect(found?.razaoSocial).toBe("Cliente Teste RLS E2E");

    const deleted = await supabaseDb.deleteCustomer(testCustomerId);
    expect(deleted).toBe(true);
  });

  it("should successfully upsert, fetch, and delete CRM opportunities (oportunidades_crm)", async () => {
    const testOppId = "test-opp-" + Date.now();
    const testOpp = {
      id: testOppId,
      titulo: "Oportunidade Teste CRM E2E",
      cliente: "Cerâmica E2E Ltda",
      contato: "Carlos Gerente",
      telefone: "(11) 98888-7777",
      email: "carlos@ceramica.com",
      canal: "whatsapp" as const,
      estagio: "qualificacao" as const,
      valor: 45000.00,
      probabilidade: 60,
      vendedor: "Ana Vendas",
      dataCriacao: new Date().toISOString(),
      previsaoFechamento: new Date(Date.now() + 864000000).toISOString(),
      proximoPasso: "Enviar catálogo atualizado via WhatsApp",
      origemDescricao: "Campanha WhatsApp API",
    };

    // Upsert opportunity
    const success = await supabaseDb.upsertOpportunity(testOpp);
    expect(success).toBe(true);

    // Fetch and verify
    const opportunities = await supabaseDb.getOpportunities();
    expect(Array.isArray(opportunities)).toBe(true);
    const found = opportunities?.find(o => o.id === testOppId);
    expect(found).toBeDefined();
    expect(found?.titulo).toBe("Oportunidade Teste CRM E2E");
    expect(found?.canal).toBe("whatsapp");
    expect(found?.valor).toBe(45000.00);

    // Delete opportunity
    const deleted = await supabaseDb.deleteOpportunity(testOppId);
    expect(deleted).toBe(true);
  });
});
