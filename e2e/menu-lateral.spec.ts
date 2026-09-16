import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  await page.getByLabel("Email Corporativo").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar no Portal" }).click();
  await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
  await page.keyboard.type("123456");
  await page.getByRole("button", { name: "Verificar e Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Menu Lateral - Navegação Simples", () => {
  test("deve navegar para Dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("deve navegar para Pedidos", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/pedidos");
    await expect(page).toHaveURL(/.*pedidos/);
  });

  test("deve navegar para Orçamentos", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/orcamentos");
    await expect(page.getByRole("heading", { name: "Orçamentos" })).toBeVisible();
  });

  test("deve navegar para Clientes", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/clientes");
    await expect(page.getByRole("heading", { name: "Leads & Clientes" })).toBeVisible();
  });

  test("deve navegar para Produção", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/producao");
    await expect(page.getByRole("heading", { name: /.*Acompanhamento da Produção.*/ })).toBeVisible();
  });

  test("deve navegar para Relatórios", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/relatorios");
    await expect(page.getByRole("heading", { name: "Relatórios", exact: true })).toBeVisible();
  });
});