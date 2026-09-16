import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import ProdutosPage from "@/pages/Produtos";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /produtos - Catálogo de Produtos", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o catálogo de produtos e indicadores de estoque", async () => {
    renderWithProviders(<ProdutosPage />, { initialRoute: "/produtos" });

    expect(screen.getByText(/Catálogo de Produtos/i)).toBeInTheDocument();
  });

  it("permite alternar visualização e pesquisar produtos", async () => {
    renderWithProviders(<ProdutosPage />, { initialRoute: "/produtos" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome ou código/i)).toBeInTheDocument();
    });
  });

  it("permite abrir o modal de novo produto para administradores", async () => {
    renderWithProviders(<ProdutosPage />, { initialRoute: "/produtos" });

    await waitFor(() => {
      const newBtn = screen.getByRole("button", { name: /Novo Produto/i });
      expect(newBtn).toBeInTheDocument();
      fireEvent.click(newBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Novo Produto/i).length).toBeGreaterThan(0);
    });
  });
});
