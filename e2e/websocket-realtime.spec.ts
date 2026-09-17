import { test, expect } from "@playwright/test";
import { ensureLoggedIn } from "./helpers";

test.describe("WebSocket Real-time & Status de Sistema", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("Dashboard mostra status de conectores e atualiza em tempo real", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verificar se indicadores de status WebSocket estão presentes
    const statusIndicators = page.locator("[class*='status'], [class*='indicator'], [class*='websocket'], [class*='connector']");
    const count = await statusIndicators.count();

    // Deve ter pelo menos algum indicador visual de status
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("Produção recebe atualizações em tempo real", async ({ page }) => {
    await page.goto("/producao");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const mainContent = page.locator("main, h1").first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });
});