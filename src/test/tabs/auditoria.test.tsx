import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import AuditoriaPage from "@/pages/Auditoria";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /auditoria - Logs de Auditoria", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza a trilha de auditoria e filtros", async () => {
    renderWithProviders(<AuditoriaPage />, { initialRoute: "/auditoria" });

    expect(screen.getByText(/Auditoria do Sistema/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descrição ou usuário/i)).toBeInTheDocument();
  });

  it("permite filtrar registros por evento", async () => {
    renderWithProviders(<AuditoriaPage />, { initialRoute: "/auditoria" });

    await waitFor(() => {
      expect(screen.getByText(/Todos os eventos/i)).toBeInTheDocument();
    });
  });
});
