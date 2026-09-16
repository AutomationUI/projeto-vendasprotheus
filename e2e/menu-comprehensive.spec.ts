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

const MENU_ITEMS = [
  { name: "Dashboard", urlPattern: /\/dashboard/ },
  { name: "Clientes", urlPattern: /\/clientes/ },
  { name: "Produtos", urlPattern: /\/produtos/ },
  { name: "Orçamentos", urlPattern: /\/orcamentos/ },
  { name: "Pedidos", urlPattern: /\/pedidos/ },
  { name: "Aprovações", urlPattern: /\/aprovacoes/ },
  { name: "Integração ERP", urlPattern: /\/integracao-erp/ },
  { name: "Integração Bancária", urlPattern: /\/integracao-bancaria/ },
  { name: "Produção", urlPattern: /\/producao/ },
  { name: "Representantes", urlPattern: /\/representantes/ },
  { name: "Governance Studio", urlPattern: /\/governance/ },
  { name: "Flow Studio (CRM)", urlPattern: /\/crm-flow/ },
  { name: "Relatórios", urlPattern: /\/relatorios/ },
  { name: "Financeiro", urlPattern: /\/financeiro/ },
  { name: "Configurações", urlPattern: /\/configuracoes/ },
  { name: "Auditoria", urlPattern: /\/auditoria/ },
  { name: "Usuários", urlPattern: /\/usuarios/ },
];

test.describe("Comprehensive Navigation Menu Inspection & Test", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  for (const item of MENU_ITEMS) {
    test(`Inspect and test navigation item: ${item.name}`, async ({ page }) => {
      // 1. Inspecionar e Localizar o elemento no DOM
      const triggerBtn = page.locator(`button[aria-label="${item.name}"]`);
      await triggerBtn.waitFor({ state: 'visible', timeout: 8000 });
      await expect(triggerBtn).toBeVisible();
      await expect(triggerBtn).toBeEnabled();

      // 2. Hover para abrir dropdown ou tooltip
      await triggerBtn.hover();
      await page.waitForTimeout(400);

      // 3. Clicar no botão do menu principal
      await triggerBtn.click();
      await page.waitForTimeout(600);

      // 4. Se houver dropdown, clicar em "Visão Geral" ou o primeiro subitem correspondente
      const dropdown = page.locator("[data-radix-dropdown-menu-content], [role='menu']").first();
      if (await dropdown.isVisible({ timeout: 1500 }).catch(() => false)) {
        const visaoGeral = page.getByRole("menuitem", { name: "Visão Geral" }).first();
        if (await visaoGeral.isVisible({ timeout: 1000 }).catch(() => false)) {
          await visaoGeral.click();
        } else {
          // Clica fora ou no próprio trigger para fechar se não houver Visão Geral
          await page.keyboard.press("Escape");
        }
      }

      // 5. Aguardar navegação estabilizar e validar URL destino
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await expect(page).toHaveURL(item.urlPattern);

      // 6. Validar conteúdo principal da página
      const mainHeading = page.locator("h1, h2, [role='heading']").first();
      await expect(mainHeading).toBeVisible({ timeout: 5000 });
    });
  }
});
