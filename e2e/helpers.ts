import { test, expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@vendas.com";
export const ADMIN_PASSWORD = "admin123";

export const REP_EMAIL = "carlos.silva@vendas.com";
export const REP_PASSWORD = "admin123";

export const CLIENT_EMAIL = "cliente@vendas.com";
export const CLIENT_PASSWORD = "admin123";

export async function loginAs(page: Page, email: string = ADMIN_EMAIL, password: string = ADMIN_PASSWORD) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel("Email Corporativo")).toBeVisible({ timeout: 10000 });

  await page.getByLabel("Email Corporativo").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar no Portal" }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole("button", { name: "Entrar no Portal" }).click();

  // 2FA is required in this app's auth flow
  await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 10000 });
  await page.keyboard.type("123456");
  await page.getByRole("button", { name: "Verificar e Entrar" }).click();

  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

export async function ensureLoggedIn(page: Page, email: string = ADMIN_EMAIL) {
  if (page.url().includes("/login") || await page.getByLabel("Email Corporativo").isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginAs(page, email);
  } else if (page.url().includes("/dashboard")) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } else {
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');
    if (page.url().includes("/login") || await page.getByLabel("Email Corporativo").isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginAs(page, email);
    }
  }
}

export async function closeAnyOpenDialog(page: Page) {
  const dialog = page.getByRole("dialog").first();
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    if (await dialog.isVisible({ timeout: 500 }).catch(() => false)) {
      const cancelBtn = dialog.getByRole("button", { name: /Cancelar|Fechar/i }).first();
      if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await cancelBtn.click();
      }
    }
  }
}

export async function navegarParaModulo(page: Page, tituloModulo: string) {
  await closeAnyOpenDialog(page);
  const btn = page.locator(`button[aria-label="${tituloModulo}"]`).first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await btn.hover();
  await page.waitForTimeout(300);
  await btn.click();
  await page.waitForTimeout(500);

  const dropdown = page.locator("[data-radix-dropdown-menu-content], [role='menu']").first();
  if (await dropdown.isVisible({ timeout: 1500 }).catch(() => false)) {
    const firstItem = dropdown.locator("[role='menuitem']").first();
    if (await firstItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await firstItem.click();
    }
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}
