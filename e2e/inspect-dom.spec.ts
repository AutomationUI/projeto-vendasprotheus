import { test, expect, type Page } from "@playwright/test";

test("Inspecionar DOM da tabela de orçamentos", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email Corporativo").fill("admin@vendas.com");
  await page.locator("#password").fill("admin123");
  await page.getByRole("button", { name: "Entrar no Portal" }).click();
  await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
  await page.keyboard.type("123456");
  await page.getByRole("button", { name: "Verificar e Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  await page.goto("/orcamentos");
  await page.waitForLoadState('networkidle');
  
  // Capturar HTML completo da tabela
  const tableHTML = await page.locator('table').first().innerHTML();
  console.log('=== Tabela ORçamentos HTML ===');
  console.log(tableHTML.substring(0, 3000));
  
  // Listar todos os botões da página
  const buttons = page.locator('button');
  const buttonCount = await buttons.count();
  console.log(`\n=== Total de botões: ${buttonCount} ===`);
  for (let i = 0; i < buttonCount; i++) {
    const btn = buttons.nth(i);
    const text = await btn.textContent();
    const title = await btn.getAttribute('title');
    console.log(`Botão ${i}: text="${text?.trim()}", title="${title}"`);
  }
  
  // Capturar screenshot para debug
  await page.screenshot({ path: 'dom-inspection.png' });
  console.log('\nScreenshot salvo: dom-inspection.png');
});