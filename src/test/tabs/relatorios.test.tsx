import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import RelatoriosPage from "@/pages/Relatorios";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /relatorios - Relatórios e Análises", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o cabeçalho de relatórios e botões de exportação", async () => {
    renderWithProviders(<RelatoriosPage />, { initialRoute: "/relatorios" });

    expect(screen.getByText(/Relatórios/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar Excel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar PDF/i })).toBeInTheDocument();
  });

  it("renderiza métricas financeiras acumuladas", async () => {
    renderWithProviders(<RelatoriosPage />, { initialRoute: "/relatorios" });

    await waitFor(() => {
      expect(screen.getByText(/Vendas no Período/i)).toBeInTheDocument();
      expect(screen.getByText(/Categorias/i)).toBeInTheDocument();
      expect(screen.getByText(/Ticket Médio/i)).toBeInTheDocument();
    });
  });
});
