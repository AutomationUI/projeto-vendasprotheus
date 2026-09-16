import { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { ProtheusLiveStatus } from "@/components/ProtheusLiveStatus";
import { OmniCommandPalette } from "@/components/OmniCommandPalette";
import { ProtheusCopilotDrawer } from "@/components/ProtheusCopilotDrawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronRight, Settings, LogOut, Search, Sparkles, LayoutDashboard, GitFork, ShieldCheck, ShoppingCart, Factory } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/store/use-ui-store";
import { ROLE_LABELS, getRoleLabel } from "@/lib/types-roles";
import { cn } from "@/lib/utils";

// Route label map for breadcrumbs
const routeLabels: Record<string, string> = {
  dashboard:      "Dashboard",
  clientes:       "Leads & Clientes",
  produtos:       "Produtos & Preços",
  orcamentos:     "Orçamentos",
  pedidos:        "Pedidos de Venda",
  aprovacoes:     "Aprovações",
  "integracao-erp": "Integração ERP",
  producao:       "Produção",
  representantes: "Representantes",
  usuarios:       "Perfis & Usuários",
  relatorios:     "Relatorios",
  configuracoes:  "Configurações",
  auditoria:      "Auditoria",
  "crm-flow":     "Flow Studio",
  governance:     "Governance Studio",
};

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const {
    isCommandOpen,
    isCopilotOpen,
    showLogoutDialog,
    setCommandOpen: setIsCommandOpen,
    setCopilotOpen: setIsCopilotOpen,
    setLogoutDialogOpen: setShowLogoutDialog,
  } = useUIStore();

  const activeTab = location.pathname.split("/")[1] || "dashboard";

  const initials = user?.nome
    ? user.nome.split(" ").map((n) => n?.[0] || "").join("").slice(0, 2).toUpperCase()
    : "??";

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 overflow-x-auto no-scrollbar">
        <SidebarTrigger className="shrink-0" />

        {/* Quick Tabs Bar for Full Visualization Experience */}
        <div className="hidden md:flex items-center">
          <Tabs value={activeTab} onValueChange={(val) => navigate(`/${val}`)} className="h-9">
            <TabsList className="bg-muted/50 p-1 h-9 gap-1 border border-border/40">
              <TabsTrigger value="dashboard" className="text-xs h-7 px-2.5 gap-1.5 font-medium">
                <LayoutDashboard className="h-3.5 w-3.5 text-blue-500" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="crm-flow" className="text-xs h-7 px-2.5 gap-1.5 font-medium">
                <GitFork className="h-3.5 w-3.5 text-indigo-500" />
                Flow Studio
              </TabsTrigger>
              <TabsTrigger value="governance" className="text-xs h-7 px-2.5 gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Governança
              </TabsTrigger>
              <TabsTrigger value="pedidos" className="text-xs h-7 px-2.5 gap-1.5 font-medium">
                <ShoppingCart className="h-3.5 w-3.5 text-amber-500" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger value="producao" className="text-xs h-7 px-2.5 gap-1.5 font-medium">
                <Factory className="h-3.5 w-3.5 text-rose-500" />
                Produção
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Global Spotlight Search Trigger */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground text-xs font-medium border border-border/60 transition-all w-40 sm:w-56 justify-between group shadow-2xs"
          title="Buscar clientes, produtos, pedidos ou ações rápidas (Ctrl+K)"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
            <span className="truncate">Buscar ou comando...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold bg-background/80 px-1.5 py-0.5 rounded border text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          
          {/* Protheus ERP Live Status */}
          <ProtheusLiveStatus />

          {/* Copilot & Sales Intelligence Trigger */}
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary/10 via-primary/15 to-indigo-500/10 hover:from-primary/20 hover:to-indigo-500/20 text-primary border border-primary/20 shadow-xs transition-all"
            title="Abrir Assistente de Vendas, Margens & Inteligência Comercial"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span className="hidden sm:inline">Copilot Comercial</span>
          </button>

          <ThemeToggle />
          <NotificationBell />

          {/* Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                id="user-menu-dropdown-trigger"
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 ml-1"
                aria-label="Menu do usuário"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md">
                  {initials}
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56" id="user-menu-dropdown-content">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                    {initials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {user?.nome ?? "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user ? getRoleLabel(user.role) : ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                id="user-menu-settings-item"
                onClick={() => navigate("/configuracoes")}
                className="gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem
                id="user-menu-logout-item"
                onClick={() => setShowLogoutDialog(true)}
                className="gap-2 text-rose-500 focus:text-rose-500 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Confirmação de Logout */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent id="logout-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle id="logout-confirm-title">Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription id="logout-confirm-description">
              Sua sessão atual será finalizada e você precisará realizar login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="logout-confirm-cancel-btn">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              id="logout-confirm-action-btn"
              onClick={handleLogout}
              className={cn(buttonVariants({ variant: "destructive" }), "gap-1.5")}
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global Spotlight / Omni Command Palette */}
      <OmniCommandPalette 
        open={isCommandOpen} 
        onOpenChange={setIsCommandOpen} 
        onOpenCopilot={() => setIsCopilotOpen(true)}
      />

      {/* Protheus Sales Copilot & Simulator Drawer */}
      <ProtheusCopilotDrawer 
        open={isCopilotOpen} 
        onOpenChange={setIsCopilotOpen} 
      />
    </>
  );
}
