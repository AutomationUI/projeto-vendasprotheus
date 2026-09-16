import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import AprovacoesPage from "@/pages/Aprovacoes";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /aprovacoes - Central de Aprovações", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o cabeçalho e indicadores de aprovações pendentes", async () => {
    renderWithProviders(<AprovacoesPage />, { initialRoute: "/aprovacoes" });

    expect(screen.getByText(/Central de Aprovações/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pendentes de Análise/i)[0]).toBeInTheDocument();
  });

  it("permite navegar entre abas Pendentes e Histórico", async () => {
    renderWithProviders(<AprovacoesPage />, { initialRoute: "/aprovacoes" });

    const histTab = screen.getByRole("tab", { name: /Histórico/i });
    expect(histTab).toBeInTheDocument();
    fireEvent.click(histTab);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Histórico/i })).toHaveAttribute("data-state", "active");
    });
  });
});
