import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import DashboardPage from "@/pages/Dashboard";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /dashboard - Dashboard Principal", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o cabeçalho e título do dashboard", async () => {
    renderWithProviders(<DashboardPage />, { initialRoute: "/dashboard" });

    expect(screen.getByText(/Nexus CRM & Hub Comercial/i)).toBeInTheDocument();
  });

  it("renderiza os cards de indicadores (KPIs)", async () => {
    renderWithProviders(<DashboardPage />, { initialRoute: "/dashboard" });

    await waitFor(() => {
      expect(screen.getByText(/Pipeline Ativo/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Oportunidades Ativas/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Taxa de Conversão/i)[0]).toBeInTheDocument();
    });

    const analyticsTabButton = screen.getByRole("button", { name: /Indicadores & ERP/i });
    fireEvent.click(analyticsTabButton);

    await waitFor(() => {
      expect(screen.getByText(/Total de Vendas/i)).toBeInTheDocument();
      expect(screen.getByText(/Ticket Médio/i)).toBeInTheDocument();
    });
  });

  it("renderiza atalhos rápidos e histórico recente", async () => {
    renderWithProviders(<DashboardPage />, { initialRoute: "/dashboard" });

    const analyticsTabButton = screen.getByRole("button", { name: /Indicadores & ERP/i });
    fireEvent.click(analyticsTabButton);

    const activityTitle = await screen.findByText(/Atividade Recente/i, {}, { timeout: 3000 });
    const alertsTitle = await screen.findByText(/Atenção Necessária/i, {}, { timeout: 3000 });

    expect(activityTitle).toBeInTheDocument();
    expect(alertsTitle).toBeInTheDocument();
  });
});
