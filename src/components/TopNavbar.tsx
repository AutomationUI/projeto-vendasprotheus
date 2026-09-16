import * as React from "react";
import {
  Search,
  LayoutDashboard,
  Users,
  Tag,
  FileText,
  ShoppingCart,
  CheckSquare,
  Settings,
  Shield,
  LogOut,
  UserCog,
  Scale,
  Zap,
  Factory,
  Link2,
  BarChart3,
  Landmark,
  Briefcase,
  DollarSign,
  Bell,
  CreditCard,
  Receipt,
  UserCheck,
  PhoneCall,
  ArrowRightLeft,
  GitBranch,
  AlertCircle,
  Clock,
  Package,
  TrendingUp,
  UserPlus,
  ClipboardList,
  CheckCheck,
  Boxes,
  FileSpreadsheet,
  SlidersHorizontal,
  Layers,
  Activity,
  Globe
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, getRoleLabel } from "@/lib/types-roles";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNavbarData, type NavbarCounters } from "@/hooks/use-navbar-data";
import { OmniCommandPalette } from "@/components/OmniCommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ModuleColor {
  icon: string;
  activeBg: string;
  activeBorder: string;
  activeShadow: string;
}

interface DropdownItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  variant?: "default" | "destructive" | "warning" | "success";
}

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
  color: ModuleColor;
  counterKey?: keyof NavbarCounters;
  dropdownItems?: DropdownItem[];
}

const navIcons: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    module: "dashboard",
    color: {
      icon: "text-blue-500",
      activeBg: "bg-blue-500/10",
      activeBorder: "border-blue-500/40",
      activeShadow: "shadow-sm shadow-blue-500/10"
    },
    dropdownItems: [
      { title: "Visão Geral (KPIs)", url: "/dashboard?tab=analytics", icon: LayoutDashboard },
      { title: "Funil Comercial & Metas", url: "/dashboard?tab=crm", icon: TrendingUp },
    ]
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    module: "clientes",
    color: {
      icon: "text-violet-500",
      activeBg: "bg-violet-500/10",
      activeBorder: "border-violet-500/40",
      activeShadow: "shadow-sm shadow-violet-500/10"
    },
    dropdownItems: [
      { title: "Carteira de Clientes", url: "/clientes", icon: Users },
      { title: "Novo Cliente", url: "/clientes/new", icon: UserPlus, variant: "success" },
    ]
  },
  {
    title: "Produtos",
    url: "/produtos",
    icon: Tag,
    module: "produtos",
    color: {
      icon: "text-orange-500",
      activeBg: "bg-orange-500/10",
      activeBorder: "border-orange-500/40",
      activeShadow: "shadow-sm shadow-orange-500/10"
    },
    dropdownItems: [
      { title: "Catálogo de Produtos", url: "/produtos", icon: Boxes },
      { title: "Novo Produto", url: "/produtos/new", icon: Package, variant: "success" },
      { title: "Alerta de Estoque Baixo", url: "/produtos?filter=low-stock", icon: AlertCircle, badge: "estoqueBaixo", variant: "warning" },
    ]
  },
  {
    title: "Orçamentos",
    url: "/orcamentos",
    icon: FileText,
    module: "orcamentos",
    color: {
      icon: "text-cyan-500",
      activeBg: "bg-cyan-500/10",
      activeBorder: "border-cyan-500/40",
      activeShadow: "shadow-sm shadow-cyan-500/10"
    },
    dropdownItems: [
      { title: "Propostas Comerciais", url: "/orcamentos", icon: FileSpreadsheet },
      { title: "Novo Orçamento", url: "/orcamentos/new", icon: FileText, variant: "success" },
      { title: "Aguardando Resposta", url: "/orcamentos?status=aguardando", icon: Clock, badge: "orcamentosAguardando", variant: "warning" },
    ]
  },
  {
    title: "Pedidos",
    url: "/pedidos",
    icon: ShoppingCart,
    module: "pedidos",
    color: {
      icon: "text-emerald-500",
      activeBg: "bg-emerald-500/10",
      activeBorder: "border-emerald-500/40",
      activeShadow: "shadow-sm shadow-emerald-500/10"
    },
    counterKey: "pedidosPendentes",
    dropdownItems: [
      { title: "Esteira de Pedidos", url: "/pedidos", icon: ClipboardList },
      { title: "Novo Pedido", url: "/pedidos/new", icon: ShoppingCart, variant: "success" },
      { title: "Aguardando Liberação", url: "/pedidos?status=Aprovar", icon: Clock, badge: "pedidosPendentes", variant: "destructive" },
      { title: "Pedidos Faturados", url: "/pedidos?status=Faturado", icon: CheckCheck },
    ]
  },
  {
    title: "Aprovações",
    url: "/aprovacoes",
    icon: CheckSquare,
    module: "aprovacoes",
    color: {
      icon: "text-emerald-600",
      activeBg: "bg-emerald-600/10",
      activeBorder: "border-emerald-600/40",
      activeShadow: "shadow-sm shadow-emerald-600/10"
    },
    counterKey: "aprovacoesPendentes",
    dropdownItems: [
      { title: "Fila de Aprovações", url: "/aprovacoes", icon: CheckSquare },
      { title: "Pendências de Alçada", url: "/aprovacoes?status=Pendente", icon: AlertCircle, badge: "aprovacoesPendentes", variant: "warning" },
      { title: "Histórico de Decisões", url: "/aprovacoes?status=historico", icon: TrendingUp },
    ]
  },
  {
    title: "Integração & Multi-ERP",
    url: "/integracao-erp",
    icon: Link2,
    module: "integracao-erp",
    color: {
      icon: "text-indigo-500",
      activeBg: "bg-indigo-500/10",
      activeBorder: "border-indigo-500/40",
      activeShadow: "shadow-sm shadow-indigo-500/10"
    },
    dropdownItems: [
      { title: "Hub Multi-ERP (Protheus, SAP, Omie)", url: "/integracao-erp?tab=multierp", icon: Globe },
      { title: "Monitor de Conectores", url: "/integracao-erp", icon: Link2 },
      { title: "Sincronização & Tabelas", url: "/integracao-erp?tab=sync", icon: Activity },
      { title: "Logs & Diagnósticos", url: "/integracao-erp?tab=logs", icon: Clock },
    ]
  },
  {
    title: "Integração Bancária",
    url: "/integracao-bancaria",
    icon: Landmark,
    module: "integracao-bancaria",
    color: {
      icon: "text-blue-600",
      activeBg: "bg-blue-600/10",
      activeBorder: "border-blue-600/40",
      activeShadow: "shadow-sm shadow-blue-600/10"
    },
    dropdownItems: [
      { title: "Contas & Saldos Bancários", url: "/integracao-bancaria/contas", icon: Landmark },
      { title: "Remessa & Retorno CNAB", url: "/integracao-bancaria/cnab", icon: FileText },
      { title: "Conciliação de Extratos", url: "/integracao-bancaria/conciliacao", icon: ArrowRightLeft },
      { title: "Gateways PIX & Boletos", url: "/integracao-bancaria/pix-boletos", icon: DollarSign },
      { title: "Logs & Webhooks", url: "/integracao-bancaria/webhooks", icon: Activity },
    ]
  },
  {
    title: "Produção",
    url: "/producao",
    icon: Factory,
    module: "producao",
    color: {
      icon: "text-amber-500",
      activeBg: "bg-amber-500/10",
      activeBorder: "border-amber-500/40",
      activeShadow: "shadow-sm shadow-amber-500/10"
    },
    dropdownItems: [
      { title: "Ordens de Produção (OP)", url: "/producao", icon: Factory },
      { title: "Lotes Atrasados", url: "/producao?filter=atrasados", icon: AlertCircle, badge: "producaoAtrasada", variant: "destructive" },
    ]
  },
  {
    title: "Representantes",
    url: "/representantes",
    icon: Briefcase,
    module: "representantes",
    color: {
      icon: "text-purple-500",
      activeBg: "bg-purple-500/10",
      activeBorder: "border-purple-500/40",
      activeShadow: "shadow-sm shadow-purple-500/10"
    },
    dropdownItems: [
      { title: "Força de Vendas & Equipe", url: "/representantes?tab=equipe", icon: Briefcase },
      { title: "Carteira de Contas", url: "/representantes?tab=carteira", icon: Users },
      { title: "Metas & Performance", url: "/representantes?tab=metas", icon: TrendingUp },
      { title: "Extrato de Comissões", url: "/representantes?tab=comissoes", icon: DollarSign },
    ]
  },
  {
    title: "Governance Studio",
    url: "/governance",
    icon: Scale,
    module: "governance",
    color: {
      icon: "text-violet-600",
      activeBg: "bg-violet-600/10",
      activeBorder: "border-violet-600/40",
      activeShadow: "shadow-sm shadow-violet-600/10"
    },
    dropdownItems: [
      { title: "Matriz de Governança", url: "/governance?tab=overview", icon: Scale },
      { title: "Alçadas & Regras de Desconto", url: "/governance?tab=rules", icon: SlidersHorizontal },
      { title: "Políticas de Comissionamento", url: "/governance?tab=policies", icon: DollarSign },
      { title: "Biblioteca de Normas & Políticas", url: "/governance?tab=documents", icon: FileText },
    ]
  },
  {
    title: "Flow Studio (CRM)",
    url: "/crm-flow",
    icon: GitBranch,
    module: "crm-flow",
    color: {
      icon: "text-blue-400",
      activeBg: "bg-blue-400/10",
      activeBorder: "border-blue-400/40",
      activeShadow: "shadow-sm shadow-blue-400/10"
    },
    dropdownItems: [
      { title: "Editor Visual de Workflows", url: "/crm-flow?tab=canvas", icon: GitBranch },
      { title: "Fluxos de Automação Ativos", url: "/crm-flow?tab=analytics", icon: Layers },
      { title: "Simulação & Testes", url: "/crm-flow?tab=simulation", icon: Zap },
      { title: "Hub de Conectores", url: "/crm-flow?tab=connectors", icon: Link2 },
    ]
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
    module: "relatorios",
    color: {
      icon: "text-cyan-600",
      activeBg: "bg-cyan-600/10",
      activeBorder: "border-cyan-600/40",
      activeShadow: "shadow-sm shadow-cyan-600/10"
    },
    dropdownItems: [
      { title: "Central Analítica (BI)", url: "/relatorios", icon: BarChart3 },
      { title: "Relatório de Vendas & Margem", url: "/relatorios?tipo=vendas", icon: TrendingUp },
      { title: "Relatório Financeiro & DRE", url: "/relatorios?tipo=financeiro", icon: DollarSign },
    ]
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    module: "finance",
    color: {
      icon: "text-green-500",
      activeBg: "bg-green-500/10",
      activeBorder: "border-green-500/40",
      activeShadow: "shadow-sm shadow-green-500/10"
    },
    dropdownItems: [
      { title: "Painel Financeiro (Visão Geral)", url: "/financeiro", icon: DollarSign },
      { title: "Fluxo de Caixa Projetado", url: "/financeiro/fluxo-caixa", icon: TrendingUp },
      { title: "Contas a Receber (SE1)", url: "/financeiro/receber", icon: Receipt },
      { title: "Contas a Pagar (SE2)", url: "/financeiro/pagar", icon: CreditCard },
      { title: "Análise de Crédito do Cliente", url: "/financeiro/analise-credito", icon: UserCheck },
      { title: "Régua de Cobrança", url: "/financeiro/cobranca", icon: PhoneCall },
      { title: "Conciliação Bancária", url: "/financeiro/conciliacao", icon: ArrowRightLeft },
    ]
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    module: "configuracoes",
    color: {
      icon: "text-slate-500 dark:text-slate-400",
      activeBg: "bg-slate-500/10",
      activeBorder: "border-slate-500/40",
      activeShadow: "shadow-sm shadow-slate-500/10"
    },
    dropdownItems: [
      { title: "Regras Comerciais Globais", url: "/configuracoes?tab=regras", icon: Scale },
      { title: "Segurança & 2FA", url: "/configuracoes?tab=seguranca", icon: Shield },
      { title: "Documentos & White-label", url: "/configuracoes?tab=marca", icon: FileText },
      { title: "Modelos de Mensagens & Email", url: "/configuracoes?tab=mensagens", icon: FileSpreadsheet },
    ]
  },
  {
    title: "Auditoria",
    url: "/auditoria",
    icon: Shield,
    module: "auditoria",
    color: {
      icon: "text-rose-500",
      activeBg: "bg-rose-500/10",
      activeBorder: "border-rose-500/40",
      activeShadow: "shadow-sm shadow-rose-500/10"
    },
    dropdownItems: [
      { title: "Trilha de Auditoria (Logs)", url: "/auditoria", icon: Shield },
    ]
  },
  {
    title: "Usuários",
    url: "/usuarios",
    icon: UserCog,
    module: "usuarios",
    color: {
      icon: "text-indigo-600",
      activeBg: "bg-indigo-600/10",
      activeBorder: "border-indigo-600/40",
      activeShadow: "shadow-sm shadow-indigo-600/10"
    },
    dropdownItems: [
      { title: "Gestão de Usuários", url: "/usuarios", icon: Users },
      { title: "Novo Usuário", url: "/usuarios/new", icon: UserPlus, variant: "success" },
      { title: "Perfis & Matriz RBAC", url: "/usuarios/perfis", icon: Shield },
    ]
  },
];

const dropdownCache: Record<string, React.ReactElement[]> = {};

function getModuleDropdownItems(module: string, navigate: (path: string) => void, counters: NavbarCounters): React.ReactElement[] {
  const menuItem = navIcons.find(item => item.module === module);
  const dropdownItems = menuItem?.dropdownItems || [];

  const items: React.ReactElement[] = [];

  if (dropdownItems.length === 0) {
    items.push(
      <DropdownMenuItem key="placeholder" className="px-3 py-2 text-sm text-muted-foreground">
        <span className="line-clamp-2">Nenhum sub-item específico.</span>
      </DropdownMenuItem>
    );
  } else {
    dropdownItems.forEach((item) => {
      const badgeValue = item.badge ? counters[item.badge as keyof NavbarCounters] : undefined;

      items.push(
        <DropdownMenuItem
          key={item.title}
          onClick={() => navigate(item.url)}
          className="px-3 py-2 cursor-pointer hover:bg-accent/20 text-xs flex items-center justify-between gap-2"
        >
          <span className="line-clamp-1 flex items-center gap-2">
            {item.icon && <item.icon className="h-3.5 w-3.5 text-muted-foreground" />}
            {item.title}
          </span>
          {badgeValue !== undefined && badgeValue !== null && badgeValue > 0 && (
            <span className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold border-0",
              item.variant === "destructive" && "bg-rose-500 text-white",
              item.variant === "warning" && "bg-amber-500 text-white",
              item.variant === "success" && "bg-emerald-500 text-white",
              item.variant === "default" && "bg-primary text-primary-foreground"
            )}>
              {badgeValue > 99 ? "99+" : badgeValue}
            </span>
          )}
        </DropdownMenuItem>
      );
    });
  }

  return items;
}

export function TopNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission, logout } = useAuth();
  const { counters } = useNavbarData();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
    navigate("/login");
  };

  const getBadgeContent = (item: MenuItem): string | null => {
    if (item.counterKey) {
      const value = counters[item.counterKey];
      if (value !== undefined && value !== null && value > 0) {
        return value > 99 ? "99+" : String(value);
      }
    }
    return null;
  };

  const getBadgeClass = (item: MenuItem): string | null => {
    if (item.counterKey) {
      const value = counters[item.counterKey];
      if (value !== undefined && value !== null && value > 0) {
        return cn(
          "absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold border-2 border-background",
          "bg-rose-500 text-white"
        );
      }
    }
    return null;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <header className={cn(
        "sticky top-0 z-50 h-14 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-xl px-4 w-full shadow-sm"
      )}>
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md text-white font-bold text-sm">
            <Zap className="h-4 w-4" />
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span className="text-sm font-bold text-foreground">Nexus</span>
            <span className="text-xs font-semibold text-primary">CRM</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hidden px-2 py-1">
          {navIcons.map((item, idx) => {
            const isActive = location.pathname === item.url || location.pathname.startsWith(item.url + "/");
            const permitted = !item.module || hasPermission(item.module, "view");

            if (!permitted) return null;

            return (
              <DropdownMenu key={idx}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                      "border border-border/60 bg-background/60",
                      "hover:shadow-md hover:-translate-y-0.5 hover:border-current/20",
                      isActive && cn(
                        item.color.activeBg,
                        item.color.activeBorder,
                        item.color.activeShadow
                      )
                    )}
                    title={item.title}
                    aria-label={item.title}
                  >
                    <item.icon className={cn(
                      "h-5 w-5",
                      item.color.icon
                    )} />
                    {getBadgeContent(item) && (
                      <span className={getBadgeClass(item)}>
                        {getBadgeContent(item)}
                      </span>
                    )}
                    <span className="sr-only">{item.title}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={8}
                  className={cn(
                    "min-w-[190px] p-1 rounded-xl shadow-xl bg-card/95 backdrop-blur-md border-border/60",
                    "border-t-2",
                    item.color.activeBorder
                  )}
                >
                  <DropdownMenuLabel
                    onClick={() => navigate(item.url)}
                    className="px-3 py-1.5 text-xs font-semibold text-foreground flex items-center gap-2 cursor-pointer hover:bg-accent/40 rounded-md transition-colors"
                  >
                    <item.icon className={cn("h-4 w-4", item.color.icon)} />
                    {item.title}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-border/40" />
                  {getModuleDropdownItems(item.module, navigate, counters)}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="h-6 w-px bg-border/60 hidden sm:block" />

          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-muted/60 hover:bg-muted px-2.5 py-1.5 text-xs font-medium border border-border/60 transition-all text-muted-foreground hover:text-foreground"
            title="Buscar (Ctrl+K)"
            aria-label="Buscar"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline text-[10px] font-mono font-bold bg-background/80 px-1 py-0.5 rounded border">Ctrl+K</span>
          </button>

          <NotificationBell />

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 ml-1 focus-visible-ring-0"
                aria-label="Menu do usuário"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-md">
                  {user?.nome?.[0]?.toUpperCase() ?? "U"}
                </div>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/60">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                    {user?.nome?.[0]?.toUpperCase() ?? "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {user?.nome ?? "Usuário"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user ? getRoleLabel(user.role) : ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/configuracoes")}
                className="gap-2 cursor-pointer text-xs py-2"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="gap-2 text-rose-500 focus:text-rose-500 cursor-pointer text-xs py-2"
              >
                <LogOut className="h-4 w-4 text-rose-500" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <OmniCommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </TooltipProvider>
  );
}