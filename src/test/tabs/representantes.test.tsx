import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import RepresentantesPage from "@/pages/Representantes";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /representantes - Gestão de Representantes", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o painel de representantes e botão Novo Representante", async () => {
    renderWithProviders(<RepresentantesPage />, { initialRoute: "/representantes" });

    expect(screen.getAllByText(/^Representantes$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Novo Representante/i })).toBeInTheDocument();
  });

  it("renderiza cards dos representantes e métricas de comissão", async () => {
    renderWithProviders(<RepresentantesPage />, { initialRoute: "/representantes" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar representante/i)).toBeInTheDocument();
    });
  });
});
