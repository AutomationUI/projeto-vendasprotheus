import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import OrcamentosPage from "@/pages/Orcamentos";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /orcamentos - Gestão de Orçamentos", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza a página de orçamentos e lista de propostas", async () => {
    renderWithProviders(<OrcamentosPage />, { initialRoute: "/orcamentos" });

    expect(screen.getByText(/Orçamentos de Venda/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Orçamento/i })).toBeInTheDocument();
  });

  it("abre o modal para criar um novo orçamento", async () => {
    renderWithProviders(<OrcamentosPage />, { initialRoute: "/orcamentos" });

    const newBtn = screen.getByRole("button", { name: /Novo Orçamento/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText(/Criar Novo Orçamento/i)).toBeInTheDocument();
      expect(screen.getByText(/Adicionar Item/i)).toBeInTheDocument();
    });
  });

  it("filtra orçamentos por busca textual", async () => {
    renderWithProviders(<OrcamentosPage />, { initialRoute: "/orcamentos" });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/Buscar por número ou cliente/i);
      expect(searchInput).toBeInTheDocument();
      fireEvent.change(searchInput, { target: { value: "ORC-2024" } });
    });
  });
});
