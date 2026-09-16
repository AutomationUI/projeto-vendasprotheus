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

test.describe("Debug - Inspecionar UI dos Módulos", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Inspecionar botões e elementos em Orçamentos", async ({ page }) => {
    await navegarParaModulo(page, "Orçamentos");
    
    // Listar todos os botões da página
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log(`\n=== ORÇAMENTOS - Total de botões: ${count} ===`);
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const className = await btn.getAttribute('class');
      if (text?.trim() || ariaLabel) {
        console.log(`Botão ${i}: text="${text?.trim()}", aria-label="${ariaLabel}", title="${title}", class="${className?.substring(0, 50)}"`);
      }
    }
    
    // Listar inputs
    const inputs = page.locator('input, select');
    const inputCount = await inputs.count();
    console.log(`\n=== Inputs/Selects: ${inputCount} ===`);
    for (let i = 0; i < inputCount; i++) {
      const inp = inputs.nth(i);
      const placeholder = await inp.getAttribute('placeholder');
      const type = await inp.getAttribute('type');
      const name = await inp.getAttribute('name');
      console.log(`Input ${i}: placeholder="${placeholder}", type="${type}", name="${name}"`);
    }
    
    await page.waitForTimeout(5000);
  });

  test("Inspecionar botões e elementos em Pedidos", async ({ page }) => {
    await navegarParaModulo(page, "Pedidos");
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log(`\n=== PEDIDOS - Total de botões: ${count} ===`);
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      if (text?.trim() || ariaLabel) {
        console.log(`Botão ${i}: text="${text?.trim()}", aria-label="${ariaLabel}", title="${title}"`);
      }
    }
    
    await page.waitForTimeout(5000);
  });

  test("Inspecionar botões e elementos em Clientes", async ({ page }) => {
    await navegarParaModulo(page, "Clientes");
    
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log(`\n=== CLIENTES - Total de botões: ${count} ===`);
    
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      if (text?.trim() || ariaLabel) {
        console.log(`Botão ${i}: text="${text?.trim()}", aria-label="${ariaLabel}", title="${title}"`);
      }
    }
    
    await page.waitForTimeout(5000);
  });
});