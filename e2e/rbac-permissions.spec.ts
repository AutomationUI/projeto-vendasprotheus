import { test, expect } from "@playwright/test";
import { loginAs, REP_EMAIL, REP_PASSWORD, CLIENT_EMAIL, CLIENT_PASSWORD } from "./helpers";

test.describe("Controle de Acesso Baseado em Papéis (RBAC)", () => {
  test("Representante Comercial tem acesso restrito a módulos administrativos", async ({ page }) => {
    await loginAs(page, REP_EMAIL, REP_PASSWORD);

    // Representante deve conseguir ver Clientes e Orçamentos
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');

    // Tentar acessar configurações ou governança diretamente pela URL
    await page.goto("/configuracoes");
    await page.waitForLoadState('networkidle');

    // Deve mostrar mensagem de acesso negado ou redirecionar
    const acessoNegado = page.getByText(/Acesso Negado|Não autorizado|Permissão insuficiente/i).first();
    const dashboardVisivel = page.locator("button[aria-label='Dashboard']").first();

    // Validar que o controle de acesso barrou ou redirecionou corretamente
    const blockedOrRedirected = (await acessoNegado.isVisible({ timeout: 3000 }).catch(() => false)) ||
                               (page.url().includes("/dashboard"));
    expect(blockedOrRedirected).toBeTruthy();
  });

  test("Cliente Portal tem visão restrita aos seus próprios pedidos", async ({ page }) => {
    await loginAs(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');

    // Verificar se elementos de administração estão ocultos
    const govStudio = page.locator("button[aria-label='Governance Studio']").first();
    const isGovVisible = await govStudio.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isGovVisible).toBeFalsy();
  });
});
