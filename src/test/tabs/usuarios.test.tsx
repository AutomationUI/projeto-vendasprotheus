import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import UsuariosPage from "@/pages/Usuarios";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /usuarios - Gestão de Usuários e Permissões", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza a página de gestão de usuários e botão Novo Usuário", async () => {
    renderWithProviders(<UsuariosPage />, { initialRoute: "/usuarios" });

    expect(screen.getByText(/Perfis & Usuários/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Usuário/i })).toBeInTheDocument();
  });

  it("renderiza a lista de usuários do sistema", async () => {
    renderWithProviders(<UsuariosPage />, { initialRoute: "/usuarios" });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar usuário/i)).toBeInTheDocument();
    });
  });
});
