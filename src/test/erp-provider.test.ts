import { describe, it, expect } from "vitest";
import { getErpProviders } from "@/lib/erp-provider";

describe("ERP Provider Pattern Abstraction", () => {
  it("should return supabase providers by default", async () => {
    const providers = getErpProviders("supabase");
    expect(providers.customerProvider).toBeDefined();
    expect(providers.orderProvider).toBeDefined();
    expect(providers.productProvider).toBeDefined();
    expect(providers.quoteProvider).toBeDefined();
    expect(providers.crmProvider).toBeDefined();

    const customers = await providers.customerProvider.getCustomers();
    expect(Array.isArray(customers)).toBe(true);
  });

  it("should return protheus REST providers when mode is protheus", async () => {
    const providers = getErpProviders("protheus");
    expect(providers.customerProvider).toBeDefined();
    expect(providers.orderProvider).toBeDefined();

    const products = await providers.productProvider.getProducts();
    expect(Array.isArray(products)).toBe(true);
  });
});
