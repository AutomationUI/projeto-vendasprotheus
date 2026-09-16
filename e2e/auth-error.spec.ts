import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";
const WRONG_PASSWORD = "senhaerrada123";
const INEXISTENT_EMAIL = "inexistente@teste.com";
const INACTIVE_EMAIL = "ana@vendas.com"; // usuário inativo (u5)

async function gotoLogin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

async function fillLogin(page: Page, email: string, password: string) {
  const emailInput = page.getByLabel("Email Corporativo");
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.click();
  await page.waitForTimeout(200);
  await emailInput.fill(email);
  await page.waitForTimeout(300);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.click();
  await page.waitForTimeout(200);
  await passwordInput.fill(password);
  await page.waitForTimeout(300);
}

async function submitLogin(page: Page) {
  const loginBtn = page.getByRole("button", { name: "Entrar no Portal" });
  await loginBtn.waitFor({ state: 'visible' });
  await loginBtn.click();
  await page.waitForTimeout(500);
}

async function fill2FA(page: Page, code: string = "123456") {
  const twoFaHeading = page.getByRole("heading", { name: "Verificação em 2 Etapas" });
  await twoFaHeading.waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(400);
  await page.keyboard.type(code, { delay: 80 });
  await page.waitForTimeout(400);

  const verifyBtn = page.getByRole("button", { name: "Verificar e Entrar" });
  await verifyBtn.waitFor({ state: 'visible' });
  await verifyBtn.click();

  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

async function ensureLoggedOut(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  const userMenu = page.locator('button[aria-label="Menu do usuário"]');
  if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
    await userMenu.click();
    await page.waitForTimeout(300);
    const logoutItem = page.getByRole("menuitem", { name: "Sair" });
    if (await logoutItem.isVisible({ timeout: 1000 }).catch(() => false)) {
      await logoutItem.click();
      await page.waitForTimeout(300);
      const confirmBtn = page.getByRole("button", { name: "Sair da conta" });
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
    await page.waitForURL("**/login", { timeout: 5000 });
  }
}

test.describe("Auth - Cenários de Erro e Segurança (Mock Behavior)", () => {

  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test("1 — Login com email válido e QUALQUER senha deve prosseguir para 2FA (mock behavior)", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, ADMIN_EMAIL, WRONG_PASSWORD); // Mock aceita qualquer senha
    await submitLogin(page);

    // Deve ir para tela de 2FA (sucesso no login)
    await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 10000 });
  });

  test("2 — Login com email inexistente deve falhar", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, INEXISTENT_EMAIL, ADMIN_PASSWORD);
    await submitLogin(page);

    // Deve permanecer na tela de login e mostrar erro
    await expect(page).toHaveURL(/.*login/);
    
    const errorMsg = page.getByText(/não encontrado|inativo|inválidas/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test("3 — Login com usuário inativo deve falhar", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, INACTIVE_EMAIL, ADMIN_PASSWORD);
    await submitLogin(page);

    // Deve permanecer na tela de login e mostrar erro
    await expect(page).toHaveURL(/.*login/);
    
    const errorMsg = page.getByText(/não encontrado|inativo|inválidas/i).first();
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test("4 — Deve redirecionar para login ao acessar rota protegida sem autenticação", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel("Email Corporativo")).toBeVisible({ timeout: 5000 });
  });

  test("5 — Deve redirecionar para login ao acessar módulos específicos sem auth", async ({ page }) => {
    const modulosProtegidos = [
      "/orcamentos", "/pedidos", "/clientes", "/produtos", "/producao",
      "/financeiro", "/relatorios", "/configuracoes", "/usuarios", "/auditoria",
      "/governance", "/representantes", "/aprovacoes", "/integracao-erp",
      "/integracao-bancaria", "/crm-flow"
    ];

    for (const modulo of modulosProtegidos) {
      await page.goto(modulo);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      
      await expect(page).toHaveURL(/.*login/);
      await page.waitForTimeout(200);
    }
  });

  test("6 — Deve rejeitar código 2FA inválido (não numérico ou tamanho errado)", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await submitLogin(page);

    await page.getByRole("heading", { name: "Verificação em 2 Etapas" }).waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(400);

    // Código inválido: letras
    await page.keyboard.type("abcdef", { delay: 80 });
    await page.waitForTimeout(400);

    const verifyBtn = page.getByRole("button", { name: "Verificar e Entrar" });
    await verifyBtn.waitFor({ state: 'visible' });
    await verifyBtn.click();

    // Deve permanecer na tela de 2FA
    await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
    
    const error2FA = page.locator('text=/código inválido|incorreto/i').first();
    await expect(error2FA).toBeVisible({ timeout: 5000 });
  });

  test("7 — Deve rejeitar código 2FA com tamanho incorreto", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await submitLogin(page);

    await page.getByRole("heading", { name: "Verificação em 2 Etapas" }).waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(400);

    // Código muito curto
    await page.keyboard.type("123", { delay: 80 });
    await page.waitForTimeout(400);

    const verifyBtn = page.getByRole("button", { name: "Verificar e Entrar" });
    await verifyBtn.waitFor({ state: 'visible' });
    await expect(verifyBtn).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 5000 });
  });

  test("8 — Login completo com credenciais válidas deve chegar ao dashboard", async ({ page }) => {
    await gotoLogin(page);
    await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await submitLogin(page);
    await fill2FA(page);
    
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test("9 — Rate limiting: múltiplas tentativas com usuário inexistente não devem travar interface", async ({ page }) => {
    await gotoLogin(page);

    for (let i = 1; i <= 3; i++) {
      await fillLogin(page, INEXISTENT_EMAIL, WRONG_PASSWORD);
      await submitLogin(page);
      await page.waitForTimeout(500);
      
      await page.getByLabel("Email Corporativo").clear();
      await page.locator("#password").clear();
      await page.waitForTimeout(200);
    }

    // Interface deve continuar responsiva
    const loginBtn = page.getByRole("button", { name: "Entrar no Portal" });
    await expect(loginBtn).toBeEnabled();
  });

  test("10 — Campos vazios: submissão sem preencher deve ser bloqueada pelo HTML5", async ({ page }) => {
    await gotoLogin(page);
    
    const loginBtn = page.getByRole("button", { name: "Entrar no Portal" });
    await loginBtn.waitFor({ state: 'visible' });
    await loginBtn.click();
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByLabel("Email Corporativo")).toBeVisible();
  });
});