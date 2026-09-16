import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import ConfiguracoesPage from "@/pages/Configuracoes";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /configuracoes - Configurações do Sistema", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza a página de configurações e abas gerais", async () => {
    renderWithProviders(<ConfiguracoesPage />, { initialRoute: "/configuracoes" });

    expect(screen.getByText(/Configurações do Sistema/i)).toBeInTheDocument();
  });

  it("permite navegar entre as abas de configuração", async () => {
    renderWithProviders(<ConfiguracoesPage />, { initialRoute: "/configuracoes" });

    const regrasTab = screen.getByRole("tab", { name: /Regras de Venda/i });
    expect(regrasTab).toBeInTheDocument();
    fireEvent.click(regrasTab);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Regras de Venda/i })).toHaveAttribute("data-state", "active");
    });
  });
});
