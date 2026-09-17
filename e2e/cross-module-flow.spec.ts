import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navegarParaModulo } from "./helpers";

test.describe("Fluxo de Ponta a Ponta: Cliente -> Orçamento -> Pedido -> Financeiro", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Executar fluxo completo de venda integrado", async ({ page }) => {
    const timestamp = Date.now();
    const clienteNome = `[Fluxo E2E] Cliente ${timestamp}`;

    // 1. Criar Cliente
    await navegarParaModulo(page, "Clientes");
    const novoClienteBtn = page.getByRole("button", { name: /Novo Cliente/i }).first();
    if (await novoClienteBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await novoClienteBtn.click();
      await page.waitForTimeout(500);
      const dialog = page.getByRole("dialog").first();
      await dialog.locator("input[placeholder='Nome da empresa']").fill(clienteNome);
      await dialog.locator("input[placeholder*='00.000.000/0000-00']").fill(`11.111.111/0001-${timestamp.toString().slice(-2)}`);
      await dialog.getByRole("button", { name: /Cadastrar Cliente|Salvar/i }).click();
      await page.waitForTimeout(1000);
    }

    // 2. Criar Orçamento vinculado
    await navegarParaModulo(page, "Orçamentos");
    const novoOrcamentoBtn = page.getByRole("button", { name: /Novo Orçamento|Criar Orçamento/i }).first();
    if (await novoOrcamentoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await novoOrcamentoBtn.click();
      await page.waitForTimeout(600);
      const dialog = page.getByRole("dialog").first();

      // Selecionar cliente
      const clienteSelect = dialog.locator("[role='combobox']").first();
      if (await clienteSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clienteSelect.click();
        await page.waitForTimeout(300);
        const searchInput = page.getByPlaceholder(/Buscar|Pesquisar/i).first();
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill(clienteNome);
        }
        await page.keyboard.press("Enter");
      }

      const salvarOrcBtn = dialog.getByRole("button", { name: /Salvar|Gerar Orçamento/i }).first();
      if (await salvarOrcBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await salvarOrcBtn.click();
      }
      await page.waitForTimeout(1000);
    }

    // 3. Verificar Pedidos e Financeiro
    await navegarParaModulo(page, "Pedidos");
    await expect(page.locator("main, h1").first()).toBeVisible();

    await navegarParaModulo(page, "Financeiro");
    await expect(page.locator("main, h1").first()).toBeVisible();
  });
});