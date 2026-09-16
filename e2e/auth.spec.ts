import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  // Wait for form to be visible
  await expect(page.getByLabel("Email Corporativo")).toBeVisible({ timeout: 5000 });
  await page.getByLabel("Email Corporativo").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  // Wait for button to be enabled
  await page.getByRole("button", { name: "Entrar no Portal" }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole("button", { name: "Entrar no Portal" }).click();
  // Wait for 2FA view
  await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
  // Type OTP via keyboard
  await page.keyboard.type("123456");
  await page.getByRole("button", { name: "Verificar e Entrar" }).click();
  // Should land on dashboard
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

test.describe("Auth — Login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("should display login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();
    await expect(page.getByLabel("Email Corporativo")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("should require email and password fields", async ({ page }) => {
    // HTML5 required validation prevents submission — check required attribute
    await expect(page.getByLabel("Email Corporativo")).toHaveAttribute("required", "");
    await expect(page.locator("#password")).toHaveAttribute("required", "");
  });

  test("should reject invalid credentials", async ({ page }) => {
    await page.getByLabel("Email Corporativo").fill("wrong@email.com");
    await page.locator("#password").fill("wrongpass");
    await page.getByRole("button", { name: "Entrar no Portal" }).click();
    await expect(page.getByText("Credenciais inválidas", { exact: true })).toBeVisible({ timeout: 3000 });
  });

  test("should accept valid credentials and show 2FA", async ({ page }) => {
    await page.getByLabel("Email Corporativo").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Entrar no Portal" }).click();
    await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
  });

  test("should complete 2FA and navigate to dashboard", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should toggle password visibility", async ({ page }) => {
    const passwordInput = page.locator("#password");
    await expect(passwordInput).toHaveAttribute("type", "password");

    await page.getByLabel("Mostrar senha").click();
    await expect(passwordInput).toHaveAttribute("type", "text");
  });
});

// ─── Auth: Logout ─────────────────────────────────────────

test.describe("Auth — Logout", () => {
  test("should logout and redirect to login", async ({ page }) => {
    await loginAsAdmin(page);

    // Wait for user menu to be visible
    await expect(page.getByLabel("Menu do usuário")).toBeVisible({ timeout: 10000 });

    // Open user menu dropdown
    await page.getByLabel("Menu do usuário").click();

    // Click the "Sair" button in the dropdown
    await page.getByText("Sair").click();

    await page.waitForURL("**/login");
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible({ timeout: 10000 });
  });
});

// ─── Auth: Protected routes ──────────────────────────────

test.describe("Auth — Protected routes", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login");
  });
});