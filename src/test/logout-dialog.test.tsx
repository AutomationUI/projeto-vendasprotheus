import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { MOCK_USERS } from "@/lib/types-roles";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

describe("Diálogo de confirmação de logout (AlertDialog)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza o diálogo de confirmação de logout e permite cancelar", async () => {
    const handleLogout = () => {
      sessionStorage.removeItem("protheus_user");
    };

    renderWithProviders(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>Sua sessão atual será finalizada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sair da conta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    expect(screen.getByText("Deseja realmente sair?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sair da conta/i })).toBeInTheDocument();

    // Clica em Cancelar
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(sessionStorage.getItem("protheus_user")).not.toBeNull();
  });

  it("executa o logout ao confirmar no diálogo", async () => {
    const handleLogout = () => {
      sessionStorage.removeItem("protheus_user");
    };

    renderWithProviders(
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>Sua sessão atual será finalizada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sair da conta</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );

    fireEvent.click(screen.getByRole("button", { name: /Sair da conta/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem("protheus_user")).toBeNull();
    });
  });
});