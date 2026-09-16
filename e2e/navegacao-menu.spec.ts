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

async function clickTopNavbarMenu(page: Page, menuTitle: string, submenuTitle?: string) {
  // Clicar no trigger do menu (botão com aria-label do título do módulo)
  const menuTrigger = page.locator(`[aria-label="${menuTitle}"]`).first();
  await menuTrigger.waitFor({ state: 'visible', timeout: 10000 });
  await menuTrigger.hover();
  await page.waitForTimeout(300);
  await menuTrigger.click();
  await page.waitForTimeout(500);

  if (submenuTitle) {
    // Clicar no item do dropdown
    const dropdownItem = page.getByRole("menuitem", { name: submenuTitle }).first();
    await dropdownItem.waitFor({ state: 'visible', timeout: 5000 });
    await dropdownItem.click();
    await page.waitForTimeout(500);
  }
}

// Definição completa de todos os módulos e seus submenus do TopNavbar
const modulosComSubmenus = [
  {
    title: "Dashboard",
    mainUrl: "/dashboard",
    mainUrlRegex: /.*dashboard/,
    submenus: [] // Dashboard não tem dropdown
  },
  {
    title: "Clientes",
    mainUrl: "/clientes",
    mainUrlRegex: /.*clientes/,
    submenus: [
      { title: "Visão Geral", url: "/clientes", urlRegex: /.*clientes/ },
      { title: "Minhas Contas", url: "/clientes", urlRegex: /.*clientes/ },
      { title: "Novo Cliente", url: "/clientes/new", urlRegex: /.*clientes\/new/ },
    ]
  },
  {
    title: "Produtos",
    mainUrl: "/produtos",
    mainUrlRegex: /.*produtos/,
    submenus: [
      { title: "Visão Geral", url: "/produtos", urlRegex: /.*produtos$/ },
      { title: "Novo Produto", url: "/produtos/new", urlRegex: /.*produtos\/new/ },
      { title: "Estoque Baixo", url: "/produtos?filter=low-stock", urlRegex: /.*produtos.*low-stock/ },
    ]
  },
  {
    title: "Orçamentos",
    mainUrl: "/orcamentos",
    mainUrlRegex: /.*orcamentos/,
    submenus: [
      { title: "Visão Geral", url: "/orcamentos", urlRegex: /.*orcamentos$/ },
      { title: "Novo Orçamento", url: "/orcamentos/new", urlRegex: /.*orcamentos\/new/ },
      { title: "Aguardando Aprovação", url: "/orcamentos?status=aguardando", urlRegex: /.*orcamentos.*aguardando/ },
    ]
  },
  {
    title: "Pedidos",
    mainUrl: "/pedidos",
    mainUrlRegex: /.*pedidos/,
    submenus: [
      { title: "Visão Geral", url: "/pedidos", urlRegex: /.*pedidos$/ },
      { title: "Novo Pedido", url: "/pedidos/new", urlRegex: /.*pedidos\/new/ },
      { title: "Pendentes de Aprovação", url: "/pedidos?status=Aprovar", urlRegex: /.*pedidos.*Aprovar/ },
      { title: "Converter de Orçamento", url: "/pedidos/from-quote", urlRegex: /.*pedidos\/from-quote/ },
    ]
  },
  {
    title: "Aprovações",
    mainUrl: "/aprovacoes",
    mainUrlRegex: /.*aprovacoes/,
    submenus: [
      { title: "Visão Geral", url: "/aprovacoes", urlRegex: /.*aprovacoes$/ },
      { title: "Pendentes", url: "/aprovacoes?status=Pendente", urlRegex: /.*aprovacoes.*Pendente/ },
      { title: "Histórico", url: "/aprovacoes?status=historico", urlRegex: /.*aprovacoes.*historico/ },
    ]
  },
  {
    title: "Integração ERP",
    mainUrl: "/integracao-erp",
    mainUrlRegex: /.*integracao-erp/,
    submenus: [
      { title: "Visão Geral", url: "/integracao-erp", urlRegex: /.*integracao-erp$/ },
      { title: "Status de Sincronização", url: "/integracao-erp/sync", urlRegex: /.*integracao-erp\/sync/ },
      { title: "Logs de Erro", url: "/integracao-erp/logs", urlRegex: /.*integracao-erp\/logs/ },
    ]
  },
  {
    title: "Integração Bancária",
    mainUrl: "/integracao-bancaria",
    mainUrlRegex: /.*integracao-bancaria/,
    submenus: [
      { title: "Visão Geral", url: "/integracao-bancaria", urlRegex: /.*integracao-bancaria$/ },
      { title: "Contas Bancárias", url: "/integracao-bancaria/contas", urlRegex: /.*integracao-bancaria\/contas/ },
      { title: "Conciliação", url: "/integracao-bancaria/conciliacao", urlRegex: /.*integracao-bancaria\/conciliacao/ },
      { title: "PIX / Boletos", url: "/integracao-bancaria/pix-boletos", urlRegex: /.*integracao-bancaria\/pix-boletos/ },
    ]
  },
  {
    title: "Produção",
    mainUrl: "/producao",
    mainUrlRegex: /.*producao/,
    submenus: [
      { title: "Visão Geral", url: "/producao", urlRegex: /.*producao$/ },
      { title: "Lotes em Andamento", url: "/producao/lotes", urlRegex: /.*producao\/lotes/ },
      { title: "Atrasados", url: "/producao?filter=atrasados", urlRegex: /.*producao.*atrasados/ },
      { title: "OEE & Indicadores", url: "/producao/oee", urlRegex: /.*producao\/oee/ },
    ]
  },
  {
    title: "Representantes",
    mainUrl: "/representantes",
    mainUrlRegex: /.*representantes/,
    submenus: [
      { title: "Visão Geral", url: "/representantes", urlRegex: /.*representantes$/ },
      { title: "Meu Ambiente", url: "/dashboard", urlRegex: /.*dashboard/ },
      { title: "Metas & Desempenho", url: "/governance", urlRegex: /.*governance/ },
      { title: "Comissões", url: "/representantes/comissoes", urlRegex: /.*representantes\/comissoes/ },
    ]
  },
  {
    title: "Governance Studio",
    mainUrl: "/governance",
    mainUrlRegex: /.*governance/,
    submenus: [
      { title: "Visão Geral", url: "/governance", urlRegex: /.*governance$/ },
      { title: "Regras Comerciais", url: "/governance/regras", urlRegex: /.*governance\/regras/ },
      { title: "Políticas de Comissão", url: "/governance/comissoes", urlRegex: /.*governance\/comissoes/ },
      { title: "Documentos", url: "/governance/documentos", urlRegex: /.*governance\/documentos/ },
    ]
  },
  {
    title: "Flow Studio (CRM)",
    mainUrl: "/crm-flow",
    mainUrlRegex: /.*crm-flow/,
    submenus: [
      { title: "Visão Geral", url: "/crm-flow", urlRegex: /.*crm-flow$/ },
      { title: "Meus Fluxos", url: "/crm-flow/meus", urlRegex: /.*crm-flow\/meus/ },
      { title: "Templates", url: "/crm-flow/templates", urlRegex: /.*crm-flow\/templates/ },
    ]
  },
  {
    title: "Relatórios",
    mainUrl: "/relatorios",
    mainUrlRegex: /.*relatorios/,
    submenus: [
      { title: "Visão Geral", url: "/relatorios", urlRegex: /.*relatorios$/ },
      { title: "Vendas", url: "/relatorios/vendas", urlRegex: /.*relatorios\/vendas/ },
      { title: "Financeiro", url: "/financeiro", urlRegex: /.*financeiro/ },
      { title: "Produção", url: "/producao/oee", urlRegex: /.*producao\/oee/ },
    ]
  },
  {
    title: "Financeiro",
    mainUrl: "/financeiro",
    mainUrlRegex: /.*financeiro/,
    submenus: [
      { title: "Visão Geral", url: "/financeiro", urlRegex: /.*financeiro$/ },
      { title: "Contas a Receber", url: "/financeiro/receber", urlRegex: /.*financeiro\/receber/ },
      { title: "Contas a Pagar", url: "/financeiro/pagar", urlRegex: /.*financeiro\/pagar/ },
      { title: "Fluxo de Caixa", url: "/financeiro/fluxo-caixa", urlRegex: /.*financeiro\/fluxo-caixa/ },
    ]
  },
  {
    title: "Configurações",
    mainUrl: "/configuracoes",
    mainUrlRegex: /.*configuracoes/,
    submenus: [
      { title: "Visão Geral", url: "/configuracoes", urlRegex: /.*configuracoes$/ },
      { title: "Perfis & Usuários", url: "/usuarios", urlRegex: /.*usuarios/ },
      { title: "Auditoria", url: "/auditoria", urlRegex: /.*auditoria/ },
      { title: "Parâmetros do Sistema", url: "/configuracoes/parametros", urlRegex: /.*configuracoes\/parametros/ },
    ]
  },
  {
    title: "Auditoria",
    mainUrl: "/auditoria",
    mainUrlRegex: /.*auditoria/,
    submenus: [
      { title: "Visão Geral", url: "/auditoria", urlRegex: /.*auditoria$/ },
      { title: "Logs de Acesso", url: "/auditoria/acessos", urlRegex: /.*auditoria\/acessos/ },
      { title: "Alterações de Dados", url: "/auditoria/dados", urlRegex: /.*auditoria\/dados/ },
    ]
  },
  {
    title: "Usuários",
    mainUrl: "/usuarios",
    mainUrlRegex: /.*usuarios/,
    submenus: [
      { title: "Visão Geral", url: "/usuarios", urlRegex: /.*usuarios$/ },
      { title: "Novo Usuário", url: "/usuarios/new", urlRegex: /.*usuarios\/new/ },
      { title: "Perfis & Permissões", url: "/usuarios/perfis", urlRegex: /.*usuarios\/perfis/ },
    ]
  },
];

test.describe("Navegação Completa pelo TopNavbar - Todos os Submenus", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  for (const mod of modulosComSubmenus) {
    // Teste do menu principal (apenas para módulos sem dropdown ou para validar URL base)
    if (mod.submenus.length === 0) {
      test(`${mod.title}: navegar para página principal`, async ({ page }) => {
        await ensureLoggedIn(page);
        await page.goto(mod.mainUrl);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        await expect(page).toHaveURL(mod.mainUrlRegex);
      });
    } else {
      // Testes para cada submenu
      for (const submenu of mod.submenus) {
        test(`${mod.title} > ${submenu.title}: navegar`, async ({ page }) => {
          await ensureLoggedIn(page);
          
          // Clicar no menu principal e no submenu
          await clickTopNavbarMenu(page, mod.title, submenu.title);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);
          
          await expect(page).toHaveURL(submenu.urlRegex);
        });
      }
    }
  }
});