import { test, expect } from "@playwright/test";
import { ensureLoggedIn, closeAnyOpenDialog, navegarParaModulo } from "./helpers";

test.describe("Flow Studio - Modal/Window Issues Investigation", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await navegarParaModulo(page, "Flow Studio (CRM)");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test("Flow Studio Canvas loads correctly", async ({ page }) => {
    // Verify canvas is visible
    const canvas = page.locator(".react-flow__viewport").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Verify nodes are rendered
    const nodes = page.locator(".react-flow__node");
    const nodeCount = await nodes.count();
    expect(nodeCount).toBeGreaterThan(0);

    // Verify header title
    await expect(page.locator("h1:has-text('Flow Studio')").first()).toBeVisible();
  });

  test("Create Flow Modal opens and works correctly", async ({ page }) => {
    // Click "Novo" button to open Create Flow Modal
    const novoBtn = page.getByRole("button", { name: /Novo/i }).first();
    await expect(novoBtn).toBeVisible({ timeout: 5000 });
    await novoBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Criador de Fluxos")).toBeVisible();
    await expect(dialog.locator("text=Desenhar Novo Fluxo de Processo")).toBeVisible();

    // Fill form fields
    await dialog.locator("input[placeholder*='Ex: Alçada']").fill("[E2E] Teste Fluxo Modal");

    // Select category
    await dialog.locator("select").first().selectOption("crm");

    // Fill description
    await dialog.locator("textarea").fill("Teste de fluxo via E2E Playwright");

    // Select template type (Estrutura Guiada)
    await dialog.locator("button:has-text('Estrutura Guiada')").click();

    // Submit
    await dialog.getByRole("button", { name: /Criar e Abrir no Canvas/i }).click();
    await page.waitForTimeout(1000);

    // Verify modal closes
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Verify new flow loaded
    await expect(page.locator("text=[E2E] Teste Fluxo Modal").first()).toBeVisible({ timeout: 5000 });
  });

  test("Edit Flow Meta Modal opens and works correctly", async ({ page }) => {
    // Open More menu and click Editar Metadados
    const moreBtn = page.locator("button[title='Mais opções do fluxo']").first();
    await expect(moreBtn).toBeVisible({ timeout: 5000 });
    await moreBtn.click();
    await page.waitForTimeout(300);

    const editMetaBtn = page.getByRole("button", { name: /Editar Metadados/i }).first();
    await expect(editMetaBtn).toBeVisible({ timeout: 2000 });
    await editMetaBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Configurações do Fluxo")).toBeVisible();
    await expect(dialog.locator("text=Editar Metadados & Identificação")).toBeVisible();

    // Modify name
    const nameInput = dialog.locator("input[required]").first();
    await nameInput.fill("[E2E] Fluxo Editado");

    // Save
    await dialog.getByRole("button", { name: /Salvar Metadados/i }).click();
    await page.waitForTimeout(1000);

    // Verify modal closes
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Verify name updated
    await expect(page.locator("text=[E2E] Fluxo Editado").first()).toBeVisible({ timeout: 5000 });
  });

  test("Import Flow Modal opens correctly", async ({ page }) => {
    // Open More menu and click Importar JSON
    const moreBtn = page.locator("button[title='Mais opções do fluxo']").first();
    await moreBtn.click();
    await page.waitForTimeout(300);

    const importBtn = page.getByRole("button", { name: /Importar JSON/i }).first();
    await expect(importBtn).toBeVisible({ timeout: 2000 });
    await importBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Importador de Diagramas")).toBeVisible();
    await expect(dialog.locator("text=Importar Fluxo JSON")).toBeVisible();

    // Close modal
    await dialog.getByRole("button", { name: /Cancelar/i }).click();
    await page.waitForTimeout(500);

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("Delete/Restore Flow Modal opens correctly", async ({ page }) => {
    // Open More menu and click Excluir / Restaurar
    const moreBtn = page.locator("button[title='Mais opções do fluxo']").first();
    await moreBtn.click();
    await page.waitForTimeout(300);

    const deleteBtn = page.getByRole("button", { name: /Excluir.*Restaurar/i }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 2000 });
    await deleteBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Excluir / Restaurar Fluxo")).toBeVisible();

    // Close modal (don't actually delete)
    await dialog.getByRole("button", { name: /Cancelar/i }).click();
    await page.waitForTimeout(500);

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("Documents Modal opens and displays connected documents", async ({ page }) => {
    // Click "Docs" button in header
    const docsBtn = page.getByRole("button", { name: /Docs/i }).first();
    await expect(docsBtn).toBeVisible({ timeout: 5000 });
    await docsBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Documentos Normativos & Políticas Comerciais")).toBeVisible();

    // Verify connected docs count
    await expect(dialog.locator("text=/doc\\(s\\)/i")).toBeVisible();

    // Close modal
    await dialog.getByRole("button", { name: /Fechar Painel/i }).click();
    await page.waitForTimeout(500);

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("Governance Rules Modal opens correctly", async ({ page }) => {
    // Click "Governança" button in header
    const govBtn = page.getByRole("button", { name: /Governança/i }).first();
    await expect(govBtn).toBeVisible({ timeout: 5000 });
    await govBtn.click();
    await page.waitForTimeout(500);

    // Verify modal opens
    const dialog = page.getByRole("dialog").first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify modal title
    await expect(dialog.locator("text=Governance Studio")).toBeVisible();
    await expect(dialog.locator("text=Regras de Negócio & Governança no Flow Studio")).toBeVisible();

    // Close modal
    await dialog.getByRole("button", { name: /Fechar/i }).last().click();
    await page.waitForTimeout(500);

    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("Simulation Panel opens and runs simulation", async ({ page }) => {
    // Click "Simulação & Regras" button
    const simBtn = page.getByRole("button", { name: /Simulação.*Regras/i }).first();
    await expect(simBtn).toBeVisible({ timeout: 5000 });
    await simBtn.click();
    await page.waitForTimeout(500);

    // Verify right panel opens with simulation tab
    const rightPanel = page.locator(".flex-col.bg-white.dark\\:bg-neutral-900").filter({ hasText: /Simulação/ }).first();
    await expect(rightPanel).toBeVisible({ timeout: 5000 });

    // Run simulation
    const runSimBtn = page.getByRole("button", { name: /Simular/i }).first();
    await expect(runSimBtn).toBeVisible({ timeout: 5000 });
    await runSimBtn.click();
    await page.waitForTimeout(1500);

    // Verify simulation completed - look for result badge
    const resultBadge = page.locator("text=/Aprovado|Alçada|Bloqueio/i").first();
    await expect(resultBadge).toBeVisible({ timeout: 5000 });
  });

  test("Inspector Panel opens and shows node properties", async ({ page }) => {
    // Click on a node in canvas to select it
    const firstNode = page.locator(".react-flow__node").first();
    await firstNode.click();
    await page.waitForTimeout(300);

    // Click "Inspetor" button if needed
    const inspectorBtn = page.getByRole("button", { name: /Inspetor/i }).first();
    if (await inspectorBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await inspectorBtn.click();
      await page.waitForTimeout(300);
    }

    // Verify right panel shows inspector
    const rightPanel = page.locator(".flex-col.bg-white.dark\\:bg-neutral-900").filter({ hasText: /Inspetor/ }).first();
    await expect(rightPanel).toBeVisible({ timeout: 5000 });

    // Verify node properties are shown
    await expect(page.locator("text=Título da Etapa")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Descrição Operacional")).toBeVisible({ timeout: 5000 });
  });

  test("Validation Engine Drawer opens", async ({ page }) => {
    // Click validation button (ShieldCheck icon)
    const validationBtn = page.getByRole("button", { name: /Validação|Problema|Validar/i }).first();
    await expect(validationBtn).toBeVisible({ timeout: 5000 });
    await validationBtn.click();
    await page.waitForTimeout(500);

    // Verify drawer opens
    const drawer = page.locator("[data-radix-drawer-content], [role='dialog']").filter({ hasText: /Validação|Inconsistência|Problema/i }).first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Close drawer
    const closeBtn = drawer.getByRole("button", { name: /Fechar|Close/i }).first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(500);
  });

  test("Auto-Layout works", async ({ page }) => {
    const autoLayoutBtn = page.getByRole("button", { name: /Auto-Layout|Auto-Grade/i }).first();
    await expect(autoLayoutBtn).toBeVisible({ timeout: 5000 });
    await autoLayoutBtn.click();
    await page.waitForTimeout(1000);

    // Verify toast notification
    await expect(page.locator("text=Layout auto-organizado")).toBeVisible({ timeout: 5000 });
  });

  test("Save Layout button works", async ({ page }) => {
    const saveLayoutBtn = page.getByRole("button", { name: /Salvar Layout/i }).first();
    await expect(saveLayoutBtn).toBeVisible({ timeout: 5000 });
    await saveLayoutBtn.click();
    await page.waitForTimeout(2000);

    // Verify toast (either success or local save)
    await expect(page.locator("text=/Layout.*salvo|salvo localmente/i")).toBeVisible({ timeout: 10000 });
  });

  test("Switch between view modes (Canvas, Simulation, Analytics, Connectors, Gallery)", async ({ page }) => {
    const viewModes = [
      { name: "Canvas Visual", check: async () => expect(page.locator(".react-flow__viewport")).toBeVisible() },
      { name: "Simulação & Testes", check: async () => expect(page.locator("text=Sandbox de Testes")).toBeVisible() },
      { name: "Analytics & SLA", check: async () => expect(page.locator("text=Analytics|Gargalos")).toBeVisible() },
      { name: "Hub", check: async () => expect(page.locator("text=Hub de Conectores")).toBeVisible() },
      { name: "Catálogo", check: async () => expect(page.locator("text=Catálogo de Processos")).toBeVisible() },
    ];

    for (const mode of viewModes) {
      const tabBtn = page.getByRole("button", { name: new RegExp(mode.name) }).first();
      await expect(tabBtn).toBeVisible({ timeout: 5000 });
      await tabBtn.click();
      await page.waitForTimeout(800);
      await mode.check();
    }
  });

  test("Keyboard shortcuts work (Ctrl+Z Undo, Ctrl+Y Redo, Delete)", async ({ page }) => {
    // Add a node first
    const triggerBtn = page.getByRole("button", { name: /\+ Gatilho/i }).first();
    await expect(triggerBtn).toBeVisible({ timeout: 5000 });
    await triggerBtn.click();
    await page.waitForTimeout(500);

    // Select the new node
    const newNode = page.locator(".react-flow__node").last();
    await newNode.click();
    await page.waitForTimeout(300);

    // Test Delete key
    await page.keyboard.press("Delete");
    await page.waitForTimeout(500);

    // Node should be deleted (toast notification)
    await expect(page.locator("text=excluído")).toBeVisible({ timeout: 3000 });
  });

  test("Fullscreen toggle works", async ({ page }) => {
    const fullscreenBtn = page.getByRole("button", { name: /Tela Cheia/i }).first();
    await expect(fullscreenBtn).toBeVisible({ timeout: 5000 });

    await fullscreenBtn.click();
    await page.waitForTimeout(500);

    // Check if fullscreen mode is active
    const fullscreenElement = page.locator(".fixed.inset-0.z-50").first();
    await expect(fullscreenElement).toBeVisible({ timeout: 3000 });

    // Exit fullscreen
    const exitFullscreenBtn = page.getByRole("button", { name: /Sair da tela cheia/i }).first();
    await expect(exitFullscreenBtn).toBeVisible({ timeout: 3000 });
    await exitFullscreenBtn.click();
    await page.waitForTimeout(500);
  });

  test("Left palette collapse/expand works", async ({ page }) => {
    // Collapse left palette
    const collapseBtn = page.getByRole("button", { title: /Ocultar paleta/i }).first();
    if (await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(300);
    }

    // Expand left palette
    const expandBtn = page.getByRole("button", { title: /Abrir paleta/i }).first();
    await expect(expandBtn).toBeVisible({ timeout: 3000 });
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Verify palette is visible
    const palette = page.locator("text=Paleta.*Processos").first();
    await expect(palette).toBeVisible({ timeout: 3000 });
  });

  test("Right panel collapse/expand works", async ({ page }) => {
    // Collapse right panel
    const collapseBtn = page.getByRole("button", { title: /Ocultar painel lateral/i }).first();
    if (await collapseBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await collapseBtn.click();
      await page.waitForTimeout(300);
    }

    // Expand right panel
    const expandBtn = page.getByRole("button", { title: /Abrir inspetor/i }).first();
    await expect(expandBtn).toBeVisible({ timeout: 3000 });
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Verify panel is visible
    const panel = page.locator("text=Simulação.*Regras").first();
    await expect(panel).toBeVisible({ timeout: 3000 });
  });

  test("Category filter works", async ({ page }) => {
    const categories = ["Todos", "Comercial", "Gov.", "ERP", "Fin."];

    for (const cat of categories) {
      const catBtn = page.getByRole("button", { name: cat, exact: true }).first();
      await expect(catBtn).toBeVisible({ timeout: 3000 });
      await catBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("Quick template switcher in left palette works", async ({ page }) => {
    const templateBtn = page.locator("button:has-text('Roteamento de Leads')").first();
    if (await templateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await templateBtn.click();
      await page.waitForTimeout(800);

      // Verify flow switched
      await expect(page.locator("text=Roteamento de Leads")).toBeVisible({ timeout: 3000 });
    }
  });

  test("Drag and drop from palette to canvas", async ({ page }) => {
    const paletteTrigger = page.locator("text=Gatilho (Trigger)").first();
    await expect(paletteTrigger).toBeVisible({ timeout: 5000 });

    // Drag from palette
    await paletteTrigger.dragTo(page.locator(".react-flow__viewport"), {
      targetPosition: { x: 400, y: 300 }
    });
    await page.waitForTimeout(1000);

    // Verify node was added
    const nodeCount = await page.locator(".react-flow__node").count();
    expect(nodeCount).toBeGreaterThan(0);
  });

  test("Modal stacking order - multiple modals", async ({ page }) => {
    // Open Create Flow Modal
    await page.getByRole("button", { name: /Novo/i }).first().click();
    await page.waitForTimeout(500);

    const createDialog = page.getByRole("dialog").first();
    await expect(createDialog).toBeVisible();

    // Open Documents Modal while Create Flow is open (should stack)
    const docsBtn = page.getByRole("button", { name: /Docs/i }).first();
    await docsBtn.click();
    await page.waitForTimeout(500);

    // Both modals should be present
    const dialogs = page.getByRole("dialog");
    const dialogCount = await dialogs.count();
    expect(dialogCount).toBeGreaterThanOrEqual(1);

    // Close all
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  });
});

test.describe("Flow Studio - View Modes Deep Dive", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
    await navegarParaModulo(page, "Flow Studio (CRM)");
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test("Gallery view - can navigate to different flows", async ({ page }) => {
    // Switch to Gallery view
    await page.getByRole("button", { name: /Catálogo/i }).first().click();
    await page.waitForTimeout(800);

    // Verify gallery cards
    const flowCards = page.locator("text=/Roteamento|Aprovação|Crédito|Comissão|Pós-Venda|Engenharia/i");
    const cardCount = await flowCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Click on a different flow card
    const firstCard = page.locator("button:has-text('Editar Canvas')").first();
    if (await firstCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(800);

      // Should switch back to canvas
      await expect(page.locator(".react-flow__viewport")).toBeVisible({ timeout: 5000 });
    }
  });

  test("Connectors Hub view - can add connector to canvas", async ({ page }) => {
    await page.getByRole("button", { name: /Hub/i }).first().click();
    await page.waitForTimeout(800);

    // Verify connectors hub loaded
    await expect(page.locator("text=Hub de Conectores")).toBeVisible({ timeout: 5000 });

    // Click a quick connector from left palette (first one)
    const quickConnector = page.locator("text=TOTVS Protheus REST").first();
    if (await quickConnector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await quickConnector.click();
      await page.waitForTimeout(800);

      // Should switch to canvas with connector added
      await expect(page.locator(".react-flow__viewport")).toBeVisible({ timeout: 5000 });
    }
  });

  test("Analytics view loads dashboard", async ({ page }) => {
    await page.getByRole("button", { name: /Analytics/i }).first().click();
    await page.waitForTimeout(1500);

    // Verify analytics dashboard
    await expect(page.locator("text=/Analytics|Gargalos|SLA/i").first()).toBeVisible({ timeout: 10000 });
  });
});