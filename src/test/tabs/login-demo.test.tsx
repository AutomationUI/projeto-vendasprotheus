import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import LoginPage from "@/pages/Login";
import DemoPage from "@/pages/Demo";
import { renderWithProviders } from "../test-utils";

describe("Telas de Acesso - /login e /demo", () => {
  it("renderiza a página de login com campos de credenciais", async () => {
    renderWithProviders(<LoginPage />, { initialRoute: "/login" });

    expect(screen.getByLabelText(/Email Corporativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Senha$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Entrar no Portal/i })).toBeInTheDocument();
  });

  it("renderiza a página de apresentação /demo com personas e destaques", async () => {
    renderWithProviders(<DemoPage />, { initialRoute: "/demo" });

    await waitFor(() => {
      expect(screen.getByText(/Ambiente de Demonstração Interativa/i)).toBeInTheDocument();
    });
  });
});
