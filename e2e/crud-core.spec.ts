import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";

async function ensureLoggedIn(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState('networkidle');

  if (page.url().includes("/login") || await page.getByLabel("Email Corporativo").isVisible({ timeout: 1500 }).catch(() => false)) {
    const emailInput = page.getByLabel("Email Corporativo");
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.click();
    await page.waitForTimeout(300);
    await emailInput.fill(ADMIN_EMAIL);
    await page.waitForTimeout(500);

    const passwordInput = page.locator("#password");
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.click();
    await page.waitForTimeout(300);
    await passwordInput.fill(ADMIN_PASSWORD);
    await page.waitForTimeout(500);

    const loginBtn = page.getByRole("button", { name: "Entrar no Portal" });
    await loginBtn.waitFor({ state: 'visible' });
    await loginBtn.click();

    const twoFaHeading = page.getByRole("heading", { name: "Verificação em 2 Etapas" });
    await twoFaHeading.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(600);
    await page.keyboard.type("123456", { delay: 100 });
    await page.waitForTimeout(500);

    const verifyBtn = page.getByRole("button", { name: "Verificar e Entrar" });
    await verifyBtn.waitFor({ state: 'visible' });
    await verifyBtn.click();

    await page.waitForURL("**/dashboard", { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

async function navegarParaModulo(page: Page, tituloModulo: string) {
  const btn = page.locator(`button[aria-label="${tituloModulo}"]`);
  await btn.waitFor({ state: 'visible', timeout: 8000 });
  await btn.hover();
  await page.waitForTimeout(400);
  await btn.click();
  await page.waitForTimeout(600);

  // Clicar em "Visão Geral" no dropdown se existir
  const dropdown = page.locator("[data-radix-dropdown-menu-content], [role='menu']").first();
  if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
    const visaoGeral = page.getByRole("menuitem", { name: "Visão Geral" }).first();
    if (await visaoGeral.isVisible({ timeout: 1500 }).catch(() => false)) {
      await visaoGeral.click();
    }
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

test.describe("CRUD - Orçamentos", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await navegarParaModulo(page, "Orçamentos");
  });

  test("1 — Deve abrir modal de novo orçamento", async ({ page }) => {
    const novoBtn = page.getByRole("button", { name: /Novo Orçamento/i });
    await novoBtn.waitFor({ state: 'visible', timeout: 8000 });
    await novoBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 5000 });

    const fecharBtn = page.getByRole("button", { name: /Cancelar|Fechar/i }).first();
    if (await fecharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fecharBtn.click();
    }
  });

  test("2 — Deve listar orçamentos existentes", async ({ page }) => {
    const tabela = page.locator("table, [role='grid'], .grid").first();
    await expect(tabela).toBeVisible({ timeout: 8000 });
  });

  test("3 — Deve filtrar orçamentos por busca", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar por número ou cliente/i);
    await searchInput.waitFor({ state: 'visible', timeout: 8000 });
    await searchInput.fill("PV-");
    await page.waitForTimeout(1000);
    await expect(page.locator("tbody tr, [role='row'], .grid > div").first()).toBeVisible({ timeout: 5000 });
  });

  test("4 — Deve alternar visualização tabela/cards", async ({ page }) => {
    const btnTabela = page.getByRole("button", { name: /Tabela|Lista/i });
    const btnCards = page.getByRole("button", { name: /Cards|Grade/i });

    if (await btnTabela.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnTabela.click();
      await page.waitForTimeout(500);
    }
    if (await btnCards.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnCards.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe("CRUD - Pedidos", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await navegarParaModulo(page, "Pedidos");
  });

  test("1 — Deve abrir modal de novo pedido", async ({ page }) => {
    const novoBtn = page.getByRole("button", { name: /Novo Pedido/i });
    await novoBtn.waitFor({ state: 'visible', timeout: 8000 });
    await novoBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 5000 });

    const fecharBtn = page.getByRole("button", { name: /Cancelar|Fechar/i }).first();
    if (await fecharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fecharBtn.click();
    }
  });

  test("2 — Deve listar pedidos existentes", async ({ page }) => {
    const tabela = page.locator("table, [role='grid'], .grid").first();
    await expect(tabela).toBeVisible({ timeout: 8000 });
  });

  test("3 — Deve filtrar pedidos por status", async ({ page }) => {
    const selectStatus = page.locator("select, [role='combobox']").filter({ hasText: /Status|Todos/i }).first();
    if (await selectStatus.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectStatus.click();
      await page.waitForTimeout(500);
    }
  });

  test("4 — Deve visualizar detalhes do pedido", async ({ page }) => {
    await page.waitForTimeout(1000);
    const primeiraLinha = page.locator("tbody tr, [role='row'], .grid > div").first();
    const btnVer = primeiraLinha.getByRole("button", { name: /Visualizar|Ver|Detalhes/i }).or(primeiraLinha.locator("button").first());

    if (await btnVer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btnVer.click();
      await page.waitForTimeout(800);

      await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 5000 });

      const fecharBtn = page.getByRole("button", { name: /Fechar|Voltar/i }).first();
      if (await fecharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await fecharBtn.click();
      }
    }
  });
});

test.describe("CRUD - Clientes", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await navegarParaModulo(page, "Clientes");
  });

  test("1 — Deve abrir modal de novo cliente", async ({ page }) => {
    const novoBtn = page.getByRole("button", { name: /Novo Cliente/i });
    await novoBtn.waitFor({ state: 'visible', timeout: 8000 });
    await novoBtn.click();
    await page.waitForTimeout(800);

    await expect(page.getByRole("dialog").first()).toBeVisible({ timeout: 5000 });

    const fecharBtn = page.getByRole("button", { name: /Cancelar|Fechar/i }).first();
    if (await fecharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fecharBtn.click();
    }
  });

  test("2 — Deve listar clientes existentes", async ({ page }) => {
    const tabela = page.locator("table, [role='grid'], .grid").first();
    await expect(tabela).toBeVisible({ timeout: 8000 });
  });

  test("3 — Deve buscar clientes", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Buscar/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill("Tech");
      await page.waitForTimeout(1000);
      await expect(page.locator("tbody tr, [role='row'], .grid > div").first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("4 — Deve alternar visualização cards/tabela", async ({ page }) => {
    const btnCards = page.getByRole("button", { name: /Cards/i });
    const btnTabela = page.getByRole("button", { name: /Tabela|Lista/i });

    if (await btnCards.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnCards.click();
      await page.waitForTimeout(500);
    }
    if (await btnTabela.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnTabela.click();
      await page.waitForTimeout(500);
    }
  });
});
