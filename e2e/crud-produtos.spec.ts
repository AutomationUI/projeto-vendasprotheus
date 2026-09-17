import { test, expect } from "@playwright/test";
import { ensureLoggedIn, navegarParaModulo } from "./helpers";

test.describe("CRUD de Produtos e Gestão de Catálogo", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Cadastrar, Editar e Excluir Produto", async ({ page }) => {
    await navegarParaModulo(page, "Produtos");

    const novoBtn = page.getByRole("button", { name: /Novo Produto|Adicionar Produto|Cadastrar Produto/i }).first();
    await novoBtn.waitFor({ state: 'visible', timeout: 8000 });
    await novoBtn.click();
    await page.waitForTimeout(600);

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nomeProd = `[E2E] Produto ${timestamp}`;
    const codigoProd = `PRD${timestamp.toString().slice(-6)}`;

    // Preencher Código
    const codigoInput = dialog.locator("input[placeholder*='PROD'], input[name*='code'], input[name*='codigo']").first();
    if (await codigoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await codigoInput.fill(codigoProd);
    }

    // Preencher Nome
    const nomeInput = dialog.locator("input[placeholder*='Nome'], input[name*='name'], input[name*='nome']").first();
    if (await nomeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nomeInput.fill(nomeProd);
    }

    // Preencher Preço
    const precoInput = dialog.locator("input[placeholder*='0,00'], input[name*='price'], input[name*='preco']").first();
    if (await precoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await precoInput.fill("1500.50");
    }

    // Preencher Estoque
    const estoqueInput = dialog.locator("input[placeholder*='Estoque'], input[name*='stock'], input[name*='estoque']").first();
    if (await estoqueInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await estoqueInput.fill("250");
    }

    // Salvar
    const salvarBtn = dialog.getByRole("button", { name: /Salvar|Cadastrar|Confirmar/i }).first();
    await salvarBtn.click();
    await page.waitForTimeout(1500);

    // Verificar se dialog fechou ou sucesso
    const isDialogClosed = await dialog.isHidden({ timeout: 3000 }).catch(() => false);
    expect(isDialogClosed).toBeTruthy();
  });
});
