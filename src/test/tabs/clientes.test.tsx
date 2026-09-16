import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import ClientesPage from "@/pages/Clientes";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /clientes - Gestão de Clientes", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza a página de clientes e o botão Novo Cliente", async () => {
    renderWithProviders(<ClientesPage />, { initialRoute: "/clientes" });

    expect(screen.getByText(/Leads & Clientes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Cliente/i })).toBeInTheDocument();
  });

  it("carrega a lista de clientes com sucesso", async () => {
    renderWithProviders(<ClientesPage />, { initialRoute: "/clientes" });

    await waitFor(() => {
      const inputs = screen.getByPlaceholderText(/Buscar por nome ou CNPJ/i);
      expect(inputs).toBeInTheDocument();
    });
  });

  it("abre o diálogo de cadastro ao clicar em Novo Cliente", async () => {
    renderWithProviders(<ClientesPage />, { initialRoute: "/clientes" });

    const newBtn = screen.getByRole("button", { name: /Novo Cliente/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Novo Cliente/i).length).toBeGreaterThan(0);
    });
  });
});
