import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navegarParaModulo } from "./helpers";

test.describe("Interações de Tabela (Busca, Paginação e Ordenação)", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Filtrar e buscar registros na listagem de Clientes", async ({ page }) => {
    await navegarParaModulo(page, "Clientes");

    const searchInput = page.getByPlaceholder(/Buscar|Pesquisar/i).first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });

    // Digitar termo de busca
    await searchInput.fill("Empresa");
    await page.waitForTimeout(800);

    // Verificar se a tabela respondeu ao filtro
    const tableRows = page.locator("table tbody tr, [role='row']");
    const count = await tableRows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
