import { test, expect, type Page } from "@playwright/test";
import * as fs from "fs";

const ADMIN_EMAIL = "admin@vendas.com";
const ADMIN_PASSWORD = "admin123";

interface MenuItem {
  label: string;
  url?: string;
  isDropdown: boolean;
  subItems?: MenuItem[];
}

interface NavigationResult {
  module: string;
  item: string;
  expectedUrl: string;
  actualUrl: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  pageRendered: boolean;
  consoleErrors: string[];
  networkErrors: string[];
  error?: string;
}

const allResults: NavigationResult[] = [];

async function ensureLoggedIn(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  // Check if we're on login page
  const isLoginPage = page.url().includes("/login") ||
    await page.getByLabel("Email Corporativo").isVisible({ timeout: 1500 }).catch(() => false);

  if (isLoginPage) {
    console.log("[Auth] Logging in...");
    const emailInput = page.getByLabel("Email Corporativo");
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill(ADMIN_EMAIL);

    const passwordInput = page.locator("#password");
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.fill(ADMIN_PASSWORD);

    const loginBtn = page.getByRole("button", { name: "Entrar no Portal" });
    await loginBtn.waitFor({ state: "visible" });
    await loginBtn.click();

    const twoFaHeading = page.getByRole("heading", { name: "Verificação em 2 Etapas" });
    await twoFaHeading.waitFor({ state: "visible", timeout: 15000 });
    await page.keyboard.type("123456", { delay: 100 });

    const verifyBtn = page.getByRole("button", { name: "Verificar e Entrar" });
    await verifyBtn.waitFor({ state: "visible" });
    await verifyBtn.click();

    await page.waitForURL("**/dashboard", { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    console.log("[Auth] Login successful");
  }
}

test.use({ storageState: { cookies: [], origins: [] } });

async function discoverHeaderStructure(page: Page): Promise<MenuItem[]> {
  console.log("[Discover] Analyzing header structure...");

  // Wait for header to be ready
  const header = page.locator("header").first();
  await header.waitFor({ state: "visible", timeout: 10000 });

  // Find all menu triggers in the navbar
  const menuButtons = await page.locator('header [role="button"], header button[aria-haspopup="menu"], header button[aria-expanded]').all();

  const menus: MenuItem[] = [];

  for (const btn of menuButtons) {
    try {
      const label = await btn.getAttribute("aria-label") ||
        await btn.textContent() ||
        await btn.getAttribute("title") ||
        "unknown";

      const cleanLabel = label.trim();
      if (!cleanLabel || cleanLabel.length < 2) continue;

      // Check if it's a dropdown
      const hasPopup = await btn.getAttribute("aria-haspopup");
      const isDropdown = hasPopup === "menu" || hasPopup === "true";

      let subItems: MenuItem[] = [];

      if (isDropdown) {
        // Click to open dropdown
        await btn.click();
        await page.waitForTimeout(300);

        // Find dropdown content
        const dropdown = page.locator('[role="menu"], [data-radix-dropdown-menu-content-wrapper], [data-radix-popper-content-wrapper]').last();
        await dropdown.waitFor({ state: "visible", timeout: 5000 });

        // Get all menu items
        const menuItems = await dropdown.locator('[role="menuitem"], [data-radix-collection-item]').all();

        for (const item of menuItems) {
          const itemLabel = await item.textContent();
          const itemHref = await item.getAttribute("href");
          const itemOnClick = await item.getAttribute("onclick");

          if (itemLabel?.trim()) {
            subItems.push({
              label: itemLabel.trim(),
              url: itemHref || undefined,
              isDropdown: false
            });
          }
        }

        // Close dropdown by clicking outside
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }

      menus.push({
        label: cleanLabel,
        isDropdown,
        subItems
      });
    } catch (e) {
      console.log(`[Discover] Error processing button: ${e}`);
    }
  }

  console.log(`[Discover] Found ${menus.length} main menus`);
  menus.forEach(m => {
    console.log(`  - ${m.label} ${m.isDropdown ? `(${m.subItems?.length || 0} subitems)` : ""}`);
    m.subItems?.forEach(s => console.log(`    • ${s.label} -> ${s.url || "no url"}`));
  });

  return menus;
}

async function navigateAndValidate(page: Page, module: string, item: MenuItem, expectedUrl: string): Promise<NavigationResult> {
  const consoleErrors: string[] = [];
  const networkErrors: string[] = [];

  // Capture console errors
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleErrors.push(`[Console] ${msg.text()}`);
    }
  });

  // Capture network errors
  page.on("response", response => {
    if (response.status() >= 400 && response.url().includes("localhost")) {
      networkErrors.push(`[Network ${response.status()}] ${response.url()}`);
    }
  });

  let actualUrl = "";
  let pageRendered = false;
  let status: NavigationResult["status"] = "FAIL";
  let error: string | undefined;

  try {
    console.log(`[Nav] ${module} > ${item.label} -> ${expectedUrl}`);

    // Navigate directly to URL for reliability
    await page.goto(expectedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    actualUrl = page.url();

    // Wait for main content to render
    await page.waitForSelector("main, [role='main'], .page-content, .container", { timeout: 15000 }).catch(() => {});

    // Check if page rendered (not blank, not 404, not error)
    const bodyText = await page.locator("body").textContent();
    const isBlank = !bodyText || bodyText.trim().length < 50;
    const is404 = bodyText?.includes("404") || bodyText?.includes("Not Found") || bodyText?.includes("Página não encontrada");
    const isError = bodyText?.includes("Something went wrong") || bodyText?.includes("Erro") || consoleErrors.some(e => e.includes("Error"));

    pageRendered = !isBlank && !is404 && !isError;

    if (pageRendered) {
      status = "PASS";
    } else {
      error = isBlank ? "Página em branco" : is404 ? "404 Not Found" : "Erro de renderização";
      status = "FAIL";
    }

    // Check URL matches expected pattern
    const urlMatches = new RegExp(expectedUrl.replace(/\//g, "\\/").replace(/\?/g, "\\?")).test(actualUrl);
    if (!urlMatches) {
      console.log(`[Nav] URL mismatch - Expected: ${expectedUrl}, Got: ${actualUrl}`);
    }

  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    status = "BLOCKED";
    console.log(`[Nav] Navigation failed: ${error}`);
  }

  return {
    module,
    item: item.label,
    expectedUrl,
    actualUrl,
    status,
    pageRendered,
    consoleErrors: consoleErrors.slice(-10), // Last 10 errors
    networkErrors: networkErrors.slice(-10),
    error
  };
}

async function buildNavigationMatrix(menus: MenuItem[]): Promise<Array<{module: string, item: MenuItem, expectedUrl: string}>> {
  // Route mapping based on App.tsx routes
  const routeMap: Record<string, string> = {
    // Dashboard
    "Dashboard": "/dashboard",
    "Visão Geral (KPIs)": "/dashboard?tab=analytics",
    "Funil Comercial & Metas": "/dashboard?tab=crm",

    // Clientes
    "Clientes": "/clientes",
    "Carteira de Clientes": "/clientes",
    "Novo Cliente": "/clientes/new",

    // Produtos
    "Produtos": "/produtos",
    "Catálogo de Produtos": "/produtos",
    "Novo Produto": "/produtos/new",
    "Alerta de Estoque Baixo": "/produtos?filter=low-stock",

    // Orçamentos
    "Orçamentos": "/orcamentos",
    "Propostas Comerciais": "/orcamentos",
    "Novo Orçamento": "/orcamentos/new",
    "Aguardando Resposta": "/orcamentos?status=aguardando",

    // Pedidos
    "Pedidos": "/pedidos",
    "Esteira de Pedidos": "/pedidos",
    "Novo Pedido": "/pedidos/new",
    "Aguardando Liberação": "/pedidos?status=Aprovar",
    "Pedidos Faturados": "/pedidos?status=Faturado",
    "Converter de Orçamento": "/pedidos/from-quote",

    // Aprovações
    "Aprovações": "/aprovacoes",
    "Fila de Aprovações": "/aprovacoes",
    "Pendências de Alçada": "/aprovacoes?status=Pendente",
    "Histórico de Decisões": "/aprovacoes?status=historico",

    // Integração & Multi-ERP
    "Integração & Multi-ERP": "/integracao-erp",
    "Hub Multi-ERP (Protheus, SAP, Omie)": "/integracao-erp?tab=multierp",
    "Monitor de Conectores": "/integracao-erp",
    "Sincronização & Tabelas": "/integracao-erp?tab=sync",
    "Logs & Diagnósticos": "/integracao-erp?tab=logs",

    // Integração Bancária
    "Integração Bancária": "/integracao-bancaria",
    "Contas & Saldos Bancários": "/integracao-bancaria/contas",
    "Remessa & Retorno CNAB": "/integracao-bancaria/cnab",
    "Conciliação de Extratos": "/integracao-bancaria/conciliacao",
    "Gateways PIX & Boletos": "/integracao-bancaria/pix-boletos",
    "Logs & Webhooks": "/integracao-bancaria/webhooks",

    // Produção
    "Produção": "/producao",
    "Ordens de Produção (OP)": "/producao",
    "Lotes Atrasados": "/producao?filter=atrasados",
    "Lotes em Andamento": "/producao/lotes",
    "OEE & Indicadores": "/producao/oee",

    // Representantes
    "Representantes": "/representantes",
    "Força de Vendas & Equipe": "/representantes?tab=equipe",
    "Carteira de Contas": "/representantes?tab=carteira",
    "Metas & Performance": "/representantes?tab=metas",
    "Extrato de Comissões": "/representantes/comissoes",

    // Governance Studio
    "Governance Studio": "/governance",
    "Matriz de Governança": "/governance?tab=overview",
    "Alçadas & Regras de Desconto": "/governance?tab=rules",
    "Políticas de Comissionamento": "/governance?tab=policies",
    "Biblioteca de Normas & Políticas": "/governance?tab=documents",
    "Regras Comerciais": "/governance/regras",
    "Políticas de Comissão": "/governance/comissoes",
    "Documentos": "/governance/documentos",

    // Flow Studio (CRM)
    "Flow Studio (CRM)": "/crm-flow",
    "Editor Visual de Workflows": "/crm-flow?tab=canvas",
    "Fluxos de Automação Ativos": "/crm-flow?tab=analytics",
    "Simulação & Testes": "/crm-flow?tab=simulation",
    "Hub de Conectores": "/crm-flow?tab=connectors",
    "Meus Fluxos": "/crm-flow/meus",
    "Templates": "/crm-flow/templates",

    // Relatórios
    "Relatórios": "/relatorios",
    "Visão Geral": "/relatorios",
    "Vendas": "/relatorios/vendas",
    "Financeiro": "/financeiro",

    // Financeiro
    "Financeiro": "/financeiro",
    "Contas a Receber": "/financeiro/receber",
    "Contas a Pagar": "/financeiro/pagar",
    "Fluxo de Caixa": "/financeiro/fluxo-caixa",
    "Análise de Crédito": "/financeiro/analise-credito",
    "Cobrança": "/financeiro/cobranca",
    "Conciliação": "/financeiro/conciliacao",

    // Configurações
    "Configurações": "/configuracoes",
    "Visão Geral": "/configuracoes",
    "Perfis & Usuários": "/usuarios",
    "Auditoria": "/auditoria",
    "Parâmetros do Sistema": "/configuracoes/parametros",

    // Auditoria
    "Auditoria": "/auditoria",
    "Logs de Acesso": "/auditoria/acessos",
    "Alterações de Dados": "/auditoria/dados",

    // Usuários
    "Usuários": "/usuarios",
    "Novo Usuário": "/usuarios/new",
    "Perfis & Permissões": "/usuarios/perfis",
  };

  const matrix: Array<{module: string, item: MenuItem, expectedUrl: string}> = [];

  for (const menu of menus) {
    const mainUrl = routeMap[menu.label] || `/${menu.label.toLowerCase()}`;
    matrix.push({ module: menu.label, item: { ...menu, url: mainUrl }, expectedUrl: mainUrl });

    if (menu.subItems) {
      for (const sub of menu.subItems) {
        const subUrl = routeMap[sub.label] || sub.url || mainUrl;
        matrix.push({ module: menu.label, item: sub, expectedUrl: subUrl });
      }
    }
  }

  return matrix;
}

test.describe("Full Navigation Audit - All Modules", () => {
  test.setTimeout(300000); // 5 minutes for full audit

  test("Discover header and test all navigation", async ({ page }) => {
    // Ensure logged in first
    await ensureLoggedIn(page);

    // Step 1: Discover header structure
    const menus = await discoverHeaderStructure(page);

    // Step 2: Build navigation matrix
    const navMatrix = await buildNavigationMatrix(menus);

    console.log(`\n[Matrix] Total navigation items to test: ${navMatrix.length}`);
    navMatrix.forEach((m, i) => console.log(`  ${i + 1}. ${m.module} > ${m.item.label} -> ${m.expectedUrl}`));

    // Step 3: Test each navigation
    for (const nav of navMatrix) {
      // Skip theme and user menus as they don't navigate to pages
      if (nav.module === "Alternar tema" || nav.module === "Menu do usuário") {
        console.log(`  Skipping ${nav.module} - not a navigation menu`);
        continue;
      }

      const result = await navigateAndValidate(page, nav.module, nav.item, nav.expectedUrl);
      allResults.push(result);

      console.log(`  Result: ${result.status} | URL: ${result.actualUrl} | Rendered: ${result.pageRendered}`);
      if (result.error) console.log(`  Error: ${result.error}`);
      if (result.consoleErrors.length > 0) console.log(`  Console Errors: ${result.consoleErrors.length}`);
      if (result.networkErrors.length > 0) console.log(`  Network Errors: ${result.networkErrors.length}`);

      // Small delay between navigations
      await page.waitForTimeout(300);
    }

    // Generate final report
    console.log("\n========================================");
    console.log("RELATÓRIO FINAL DE NAVEGAÇÃO E2E");
    console.log("========================================\n");

    const pass = allResults.filter(r => r.status === "PASS").length;
    const fail = allResults.filter(r => r.status === "FAIL").length;
    const blocked = allResults.filter(r => r.status === "BLOCKED").length;

    console.log(`Total testados: ${allResults.length}`);
    console.log(`PASS: ${pass}`);
    console.log(`FAIL: ${fail}`);
    console.log(`BLOCKED: ${blocked}`);
    console.log("");

    // Group by module
    const byModule = allResults.reduce((acc, r) => {
      if (!acc[r.module]) acc[r.module] = [];
      acc[r.module].push(r);
      return acc;
    }, {} as Record<string, NavigationResult[]>);

    for (const [module, results] of Object.entries(byModule)) {
      const modulePass = results.filter(r => r.status === "PASS").length;
      const moduleFail = results.filter(r => r.status === "FAIL").length;
      const moduleBlocked = results.filter(r => r.status === "BLOCKED").length;
      const status = moduleFail === 0 && moduleBlocked === 0 ? "PASS" : "FAIL";
      console.log(`${module.padEnd(25)} ${status} (${modulePass}P/${moduleFail}F/${moduleBlocked}B)`);

      for (const r of results) {
        const icon = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "⊘";
        console.log(`  ${icon} ${r.item.padEnd(40)} ${r.actualUrl || "N/A"}`);
        if (r.error) console.log(`      ERROR: ${r.error}`);
      }
    }

    console.log("\n========================================");

    // Save detailed results to file
    const reportPath = "e2e-navigation-report.json";
    fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
    console.log(`Detailed report saved to: ${reportPath}`);
  });
});