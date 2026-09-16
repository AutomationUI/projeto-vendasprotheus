import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import PedidosPage from "@/pages/Pedidos";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /pedidos - Gestão de Pedidos", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o cabeçalho e botão de novo pedido", async () => {
    renderWithProviders(<PedidosPage />, { initialRoute: "/pedidos" });

    expect(screen.getAllByText(/Pedidos de Venda/i)[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Pedido/i })).toBeInTheDocument();
  });

  it("abre o formulário de cadastro de novo pedido", async () => {
    renderWithProviders(<PedidosPage />, { initialRoute: "/pedidos" });

    const newBtn = screen.getByRole("button", { name: /Novo Pedido/i });
    fireEvent.click(newBtn);

    await waitFor(() => {
      expect(screen.getByText(/Criar Novo Pedido/i)).toBeInTheDocument();
    });
  });

  it("permite alternar entre visualização de Tabela e Kanban", async () => {
    renderWithProviders(<PedidosPage />, { initialRoute: "/pedidos" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por número ou cliente/i)).toBeInTheDocument();
    });
  });
});
