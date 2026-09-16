import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { PrivateRoute } from "@/components/PrivateRoute";
import { MainLayout } from "@/components/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";

// Safe serialization tracer for debugging 'Cannot convert object to primitive value'
function safeInspect(obj: any, label: string) {
  try {
    const seen = new WeakSet();
    const json = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      if (typeof value === 'bigint') {
        return value.toString() + 'n';
      }
      return value;
    }, 2);
    console.log(`[App State Serialization Trace - ${label}] Success:`, json?.slice(0, 300));
  } catch (err: any) {
    console.error(`[App State Serialization Trace - ${label}] ERROR converting to primitive value:`, err);
    // Deep property inspection
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        try {
          JSON.stringify(obj[k]);
        } catch (subErr) {
          console.error(`[App State Serialization Trace] Faulty key detected -> "${k}":`, obj[k], subErr);
        }
      }
    }
  }
}

// Lazy-loaded pages for code splitting with retry logic for dev server restarts
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        pageHasAlreadyBeenForceRefreshed = JSON.parse(
          window.sessionStorage.getItem("page-has-been-force-refreshed") || "false"
        );
      }
    } catch {
      pageHasAlreadyBeenForceRefreshed = false;
    }

    try {
      const componentModule = await componentImport();
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          window.sessionStorage.setItem("page-has-been-force-refreshed", "false");
        }
      } catch {
        // ignore
      }
      if (componentModule && typeof componentModule === "object") {
        if ("default" in componentModule && componentModule.default) {
          return componentModule;
        }
        const firstExport = Object.values(componentModule).find(
          (val) => typeof val === "function" || (typeof val === "object" && val !== null)
        );
        if (firstExport) {
          return { default: firstExport };
        }
      }
      return componentModule;
    } catch (error: any) {
      if (!pageHasAlreadyBeenForceRefreshed && error?.message?.includes("Failed to fetch dynamically imported module")) {
        try {
          if (typeof window !== "undefined" && window.sessionStorage) {
            window.sessionStorage.setItem("page-has-been-force-refreshed", "true");
          }
          window.location.reload();
        } catch {
          // ignore
        }
        // Return a promise that never resolves to prevent rendering while reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });

const LoginPage = lazyWithRetry(() => import("@/pages/Login"));
const DashboardPage = lazyWithRetry(() => import("@/pages/Dashboard"));
const PedidosPage = lazyWithRetry(() => import("@/pages/Pedidos"));
const ClientesPage = lazyWithRetry(() => import("@/pages/Clientes"));
const ProdutosPage = lazyWithRetry(() => import("@/pages/Produtos"));
const OrcamentosPage = lazyWithRetry(() => import("@/pages/Orcamentos"));
const AprovacoesPage = lazyWithRetry(() => import("@/pages/Aprovacoes"));
const IntegracaoERPPage = lazyWithRetry(() => import("@/pages/IntegracaoERP"));
const IntegracaoBancariaPage = lazyWithRetry(() => import("@/pages/IntegracaoBancaria"));
const RelatoriosPage = lazyWithRetry(() => import("@/pages/Relatorios"));
const FinanceiroPage = lazyWithRetry(() => import("@/pages/Financeiro"));
const ConfiguracoesPage = lazyWithRetry(() => import("@/pages/Configuracoes"));
const AuditoriaPage = lazyWithRetry(() => import("@/pages/Auditoria"));
const ProducaoPage = lazyWithRetry(() => import("@/pages/Producao"));
const RepresentantesPage = lazyWithRetry(() => import("@/pages/Representantes"));
const UsuariosPage = lazyWithRetry(() => import("@/pages/Usuarios"));
const GovernanceStudioPage = lazyWithRetry(() => import("@/pages/GovernanceStudio"));
const FlowStudioPage = lazyWithRetry(() => import("@/pages/FlowStudio"));
const PublicApprovalPage = lazyWithRetry(() => import("@/pages/PublicApproval"));
const DemoPage = lazyWithRetry(() => import("@/pages/Demo"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    safeInspect(queryClient, 'QueryClient State');
    try {
      safeInspect(localStorage, 'localStorage');
      safeInspect(sessionStorage, 'sessionStorage');
    } catch (e) {
      console.error('Storage trace error:', e);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/demo" element={<DemoPage />} />
              <Route path="/aprovar/:id" element={<PublicApprovalPage />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route element={<MainLayout />}>
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute module="dashboard">
                      <DashboardPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/clientes"
                  element={
                    <PrivateRoute module="clientes">
                      <ClientesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/clientes/new"
                  element={
                    <PrivateRoute module="clientes">
                      <ClientesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/produtos"
                  element={
                    <PrivateRoute module="produtos">
                      <ProdutosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/produtos/new"
                  element={
                    <PrivateRoute module="produtos">
                      <ProdutosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/orcamentos"
                  element={
                    <PrivateRoute module="orcamentos">
                      <OrcamentosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/orcamentos/new"
                  element={
                    <PrivateRoute module="orcamentos">
                      <OrcamentosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/pedidos"
                  element={
                    <PrivateRoute module="pedidos">
                      <PedidosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/pedidos/new"
                  element={
                    <PrivateRoute module="pedidos">
                      <PedidosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/pedidos/from-quote"
                  element={
                    <PrivateRoute module="pedidos">
                      <PedidosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/aprovacoes"
                  element={
                    <PrivateRoute module="aprovacoes">
                      <AprovacoesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-erp"
                  element={
                    <PrivateRoute module="integracao-erp">
                      <IntegracaoERPPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-erp/sync"
                  element={
                    <PrivateRoute module="integracao-erp">
                      <IntegracaoERPPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-erp/logs"
                  element={
                    <PrivateRoute module="integracao-erp">
                      <IntegracaoERPPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria/contas"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria/conciliacao"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria/pix-boletos"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria/cnab"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/integracao-bancaria/webhooks"
                  element={
                    <PrivateRoute module="integracao-bancaria">
                      <IntegracaoBancariaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <PrivateRoute module="relatorios">
                      <RelatoriosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/relatorios/vendas"
                  element={
                    <PrivateRoute module="relatorios">
                      <RelatoriosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/receber"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/pagar"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/fluxo-caixa"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/analise-credito"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/cobranca"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/financeiro/conciliacao"
                  element={
                    <PrivateRoute module="finance">
                      <FinanceiroPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/configuracoes"
                  element={
                    <PrivateRoute module="configuracoes">
                      <ConfiguracoesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/configuracoes/parametros"
                  element={
                    <PrivateRoute module="configuracoes">
                      <ConfiguracoesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/auditoria"
                  element={
                    <PrivateRoute module="auditoria">
                      <AuditoriaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/auditoria/acessos"
                  element={
                    <PrivateRoute module="auditoria">
                      <AuditoriaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/auditoria/dados"
                  element={
                    <PrivateRoute module="auditoria">
                      <AuditoriaPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/producao"
                  element={
                    <PrivateRoute module="producao">
                      <ProducaoPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/producao/oee"
                  element={
                    <PrivateRoute module="producao">
                      <ProducaoPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/producao/lotes"
                  element={
                    <PrivateRoute module="producao">
                      <ProducaoPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/representantes"
                  element={
                    <PrivateRoute module="representantes">
                      <RepresentantesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/representantes/comissoes"
                  element={
                    <PrivateRoute module="representantes">
                      <RepresentantesPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance"
                  element={
                    <PrivateRoute module="governance">
                      <GovernanceStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance/regras"
                  element={
                    <PrivateRoute module="governance">
                      <GovernanceStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance/comissoes"
                  element={
                    <PrivateRoute module="governance">
                      <GovernanceStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/governance/documentos"
                  element={
                    <PrivateRoute module="governance">
                      <GovernanceStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/crm-flow"
                  element={
                    <PrivateRoute module="crm-flow">
                      <FlowStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/crm-flow/meus"
                  element={
                    <PrivateRoute module="crm-flow">
                      <FlowStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/crm-flow/templates"
                  element={
                    <PrivateRoute module="crm-flow">
                      <FlowStudioPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <PrivateRoute module="usuarios">
                      <UsuariosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/usuarios/new"
                  element={
                    <PrivateRoute module="usuarios">
                      <UsuariosPage />
                    </PrivateRoute>
                  }
                />
                <Route
                  path="/usuarios/perfis"
                  element={
                    <PrivateRoute module="usuarios">
                      <UsuariosPage />
                    </PrivateRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
