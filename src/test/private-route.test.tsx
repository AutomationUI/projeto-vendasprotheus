import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AuthProvider } from "@/hooks/use-auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MainLayout } from "@/components/MainLayout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

describe("PrivateRoute render tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("should render unauthenticated redirect without throwing", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={["/dashboard"]}>
              <Routes>
                <Route path="/login" element={<div>Página de Login</div>} />
                <Route element={<MainLayout />}>
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute module="dashboard">
                        <div>Dashboard Secreto</div>
                      </PrivateRoute>
                    }
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Página de Login")).toBeInTheDocument();
  });

  it("should render PedidosPage when authenticated", async () => {
    sessionStorage.setItem("protheus_user", JSON.stringify({
      id: "usr-admin",
      nome: "Administrador",
      email: "admin@protheus.com.br",
      role: "admin",
      ativo: true,
    }));

    const Pedidos = (await import("@/pages/Pedidos")).default;

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={["/pedidos"]}>
              <Routes>
                <Route path="/login" element={<div>Página de Login</div>} />
                <Route element={<MainLayout />}>
                  <Route
                    path="/pedidos"
                    element={
                      <PrivateRoute module="pedidos">
                        <Pedidos />
                      </PrivateRoute>
                    }
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Pedidos de Venda")).toBeInTheDocument();
  });

  it("should render DashboardPage when authenticated", async () => {
    sessionStorage.setItem("protheus_user", JSON.stringify({
      id: "usr-admin",
      nome: "Administrador",
      email: "admin@protheus.com.br",
      role: "admin",
      ativo: true,
    }));

    const Dashboard = (await import("@/pages/Dashboard")).default;

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={["/dashboard"]}>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute module="dashboard">
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it("should handle denied access (e.g. cliente trying to access pedidos)", async () => {
    sessionStorage.setItem("protheus_user", JSON.stringify({
      id: "usr-cliente-1",
      nome: "Carlos Silva",
      email: "carlos@cliente.com.br",
      role: "cliente",
      ativo: true,
    }));

    const Pedidos = (await import("@/pages/Pedidos")).default;

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={["/pedidos"]}>
              <Routes>
                <Route path="/dashboard" element={<div>Dashboard Permitido</div>} />
                <Route element={<MainLayout />}>
                  <Route
                    path="/pedidos"
                    element={
                      <PrivateRoute module="pedidos">
                        <Pedidos />
                      </PrivateRoute>
                    }
                  />
                </Route>
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Dashboard Permitido")).toBeInTheDocument();
  });
});
