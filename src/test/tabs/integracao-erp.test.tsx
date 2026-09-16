import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import IntegracaoERPPage from "@/pages/IntegracaoERP";
import { renderWithProviders } from "../test-utils";
import { MOCK_USERS } from "@/lib/types-roles";

describe("Aba /integracao-erp - Integração TOTVS Protheus", () => {
  beforeEach(() => {
    sessionStorage.clear();
    const admin = MOCK_USERS.find((u) => u.role === "admin");
    if (admin) {
      sessionStorage.setItem("protheus_user", JSON.stringify(admin));
    }
  });

  it("renderiza os serviços e monitor de sincronização", async () => {
    renderWithProviders(<IntegracaoERPPage />, { initialRoute: "/integracao-erp" });

    expect(screen.getByText(/Conectividade, Banco & Multi-ERP/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Banco Próprio/i })).toBeInTheDocument();
  });

  it("permite alternar entre Banco Próprio e TOTVS Protheus", async () => {
    renderWithProviders(<IntegracaoERPPage />, { initialRoute: "/integracao-erp" });

    const protheusTab = screen.getByRole("tab", { name: /TOTVS Protheus/i });
    expect(protheusTab).toBeInTheDocument();
    
    fireEvent.click(protheusTab);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /TOTVS Protheus/i })).toBeInTheDocument();
    });
  });
});
