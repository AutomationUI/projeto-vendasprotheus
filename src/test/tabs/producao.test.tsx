import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import ProducaoPage from "@/pages/Producao";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /producao - Acompanhamento de Produção Cerâmica", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o painel de produção e estágios do processo", async () => {
    renderWithProviders(<ProducaoPage />, { initialRoute: "/producao" });

    expect(screen.getByText(/Acompanhamento da Produção/i)).toBeInTheDocument();
  });

  it("renderiza lista de lotes e filtros de busca", async () => {
    renderWithProviders(<ProducaoPage />, { initialRoute: "/producao" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar lote ou produto/i)).toBeInTheDocument();
    });
  });
});
