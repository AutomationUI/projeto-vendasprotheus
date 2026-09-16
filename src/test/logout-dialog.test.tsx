import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { AppHeader } from "@/components/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { renderWithProviders } from "./test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Diálogo de confirmação de logout (AlertDialog)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("abre o diálogo de confirmação ao clicar em Sair no menu do usuário", async () => {
    renderWithProviders(
      <SidebarProvider>
        <AppHeader />
      </SidebarProvider>
    );

    // Encontra o trigger do menu do usuário (avatar)
    const userMenuTrigger = screen.getByRole("button", { name: /Menu do usuário/i });
    expect(userMenuTrigger).toBeInTheDocument();
    
    // Radix UI dropdown opens on ArrowDown
    fireEvent.keyDown(userMenuTrigger, { key: "ArrowDown" });

    // O item Sair deve estar visível no DropdownMenu
    const logoutMenuItem = await screen.findByRole("menuitem", { name: /Sair/i });
    expect(logoutMenuItem).toBeInTheDocument();

    // Clica em Sair
    fireEvent.click(logoutMenuItem);

    // O AlertDialog deve aparecer na tela
    await waitFor(() => {
      expect(screen.getByText("Deseja realmente sair?")).toBeInTheDocument();
      expect(
        screen.getByText(/Sua sessão atual será finalizada/i)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sair da conta/i })).toBeInTheDocument();
    });
  });

  it("cancela o logout ao clicar em Cancelar no diálogo", async () => {
    renderWithProviders(
      <SidebarProvider>
        <AppHeader />
      </SidebarProvider>
    );

    const userMenuTrigger = screen.getByRole("button", { name: /Menu do usuário/i });
    fireEvent.keyDown(userMenuTrigger, { key: "ArrowDown" });

    const logoutMenuItem = await screen.findByRole("menuitem", { name: /Sair/i });
    fireEvent.click(logoutMenuItem);

    const cancelBtn = await screen.findByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    // O usuário ainda deve permanecer autenticado no storage
    await waitFor(() => {
      expect(sessionStorage.getItem("protheus_user")).not.toBeNull();
    });
  });

  it("executa o logout ao confirmar no diálogo", async () => {
    renderWithProviders(
      <SidebarProvider>
        <AppHeader />
      </SidebarProvider>
    );

    const userMenuTrigger = screen.getByRole("button", { name: /Menu do usuário/i });
    fireEvent.keyDown(userMenuTrigger, { key: "ArrowDown" });

    const logoutMenuItem = await screen.findByRole("menuitem", { name: /Sair/i });
    fireEvent.click(logoutMenuItem);

    const confirmActionBtn = await screen.findByRole("button", { name: /Sair da conta/i });
    fireEvent.click(confirmActionBtn);

    // O usuário foi deslogado (sessão limpa)
    await waitFor(() => {
      expect(sessionStorage.getItem("protheus_user")).toBeNull();
    });
  });
});
