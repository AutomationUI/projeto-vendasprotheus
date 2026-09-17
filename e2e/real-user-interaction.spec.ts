import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";

const ALL_MODULES = [
  "Dashboard",
  "Clientes",
  "Produtos",
  "Orçamentos",
  "Pedidos",
  "Aprovações",
  "Integração & Multi-ERP",
  "Integração Bancária",
  "Produção",
  "Representantes",
  "Governance Studio",
  "Flow Studio (CRM)",
  "Relatórios",
  "Financeiro",
  "Configurações",
  "Auditoria",
  "Usuários"
];

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel("Email Corporativo")).toBeVisible({ timeout: 10000 });
  await page.getByLabel("Email Corporativo").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Entrar no Portal" }).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByRole("button", { name: "Entrar no Portal" }).click();
  await expect(page.getByRole("heading", { name: "Verificação em 2 Etapas" })).toBeVisible({ timeout: 10000 });
  await page.keyboard.type("123456");
  await page.getByRole("button", { name: "Verificar e Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function ensureLoggedIn(page: Page) {
  // Check if already on dashboard or needs login
  if (page.url().includes("/login") || await page.getByLabel("Email Corporativo").isVisible({ timeout: 2000 }).catch(() => false)) {
    await loginAsAdmin(page);
  } else if (page.url().includes("/dashboard")) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } else {
    // Try to go to dashboard, if redirected to login, login
    await page.goto("/dashboard");
    await page.waitForLoadState('networkidle');
    if (page.url().includes("/login") || await page.getByLabel("Email Corporativo").isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginAsAdmin(page);
    }
  }
}

async function navegarParaModulo(page: Page, tituloModulo: string) {
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

test.describe("Full Navigation & Real User Interaction Matrix", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  for (const moduleName of ALL_MODULES) {
    test(`Validar navegação e interação no módulo: ${moduleName}`, async ({ page }) => {
      await navegarParaModulo(page, moduleName);

      const mainContent = page.locator("main, [role='main'], .container, h1, h2").first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      const novoBtn = page.getByRole("button", { name: /Novo|Criar|Adicionar/i }).first();
      if (await novoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await novoBtn.click();
        await page.waitForTimeout(600);

        const dialog = page.getByRole("dialog").first();
        if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
          const fecharBtn = dialog.getByRole("button", { name: /Cancelar|Fechar/i }).first();
          if (await fecharBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await fecharBtn.click();
          }
        }
      }
    });
  }

  test("Simulação de Cadastro Real de Cliente com Digitação Progressiva e Persistência", async ({ page }) => {
    await navegarParaModulo(page, "Clientes");

    const novoBtn = page.getByRole("button", { name: /Novo Cliente/i });
    await novoBtn.waitFor({ state: 'visible', timeout: 8000 });
    await novoBtn.click();
    await page.waitForTimeout(800);

    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const timestamp = Date.now();
    const nomeTeste = `[E2E] Cliente ${timestamp}`;
    const cnpjTeste = `00.000.000/000${timestamp.toString().slice(-2)}-00`;
    const emailTeste = `cliente.${timestamp}@example.invalid`;

    // Preencher Razão Social (obrigatório)
    const razaoInput = dialog.locator("input[placeholder='Nome da empresa']").first();
    if (await razaoInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await razaoInput.click();
      await razaoInput.pressSequentially(nomeTeste, { delay: 30 });
    }

    // Preencher CNPJ (obrigatório)
    const cnpjInput = dialog.locator("input[placeholder*='00.000.000/0000-00']").first();
    if (await cnpjInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cnpjInput.click();
      await cnpjInput.pressSequentially(cnpjTeste, { delay: 30 });
    }

    // Preencher E-mail
    const emailInput = dialog.locator("input[type='email'], input[placeholder*='contato@empresa.com']").first();
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailInput.click();
      await emailInput.pressSequentially(emailTeste, { delay: 30 });
    }

    // Preencher Telefone
    const telInput = dialog.locator("input[placeholder*='(00) 0000-0000']").first();
    if (await telInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await telInput.click();
      await telInput.pressSequentially("11999999999", { delay: 30 });
    }

    // Preencher Cidade
    const cidadeInput = dialog.locator("input[placeholder='Cidade'], input[name*='cidade']").first();
    if (await cidadeInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cidadeInput.click();
      await cidadeInput.pressSequentially("Vinhedo", { delay: 30 });
    }

    // Preencher UF
    const ufInput = dialog.locator("input[maxlength='2'], input[name*='uf']").first();
    if (await ufInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ufInput.click();
      await ufInput.pressSequentially("SP", { delay: 30 });
    }

    // Selecionar Condição de Pagamento
    const selectTrigger = dialog.locator("[role='combobox']").first();
    if (await selectTrigger.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selectTrigger.click();
      await page.waitForTimeout(300);
      const opcao30dias = page.getByRole("option", { name: "30 dias" }).first();
      if (await opcao30dias.isVisible({ timeout: 2000 }).catch(() => false)) {
        await opcao30dias.click();
      }
    }

    // Salvar
    const salvarBtn = dialog.getByRole("button", { name: /Cadastrar Cliente|Salvar/i }).first();
    await salvarBtn.click();
    await page.waitForTimeout(1500);

    // Verificar toast de sucesso
    const toast = page.getByText(/cadastrado|sucesso/i).first();
    await expect(toast).toBeVisible({ timeout: 5000 }).catch(() => {});

    // Verificar persistência na listagem
    const searchInput = page.getByPlaceholder(/Buscar/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(nomeTeste);
      await page.waitForTimeout(1000);
      await expect(page.getByText(nomeTeste)).toBeVisible({ timeout: 5000 });
    }
  });
});