import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Tag,
  FileText,
  ShoppingCart,
  CheckSquare,
  Link2,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Factory,
  Briefcase,
  UserCog,
  Zap,
  DollarSign,
  Scale,
  Landmark,
  GitFork,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { type Order } from "@/lib/mock-data";
import { ordersService } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// ─── Menu Groups ──────────────────────────────────────

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  module: string;
  badge?: "pendentes" | "aprovacoes";
}

const menuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: "Comercial",
    items: [
      { title: "CRM & Dashboard",   url: "/dashboard",    icon: LayoutDashboard, module: "dashboard"    },
      { title: "Leads & Clientes", url: "/clientes",    icon: Users,           module: "clientes"     },
      { title: "Produtos & Preços",url: "/produtos",    icon: Tag,             module: "produtos"     },
      { title: "Orçamentos",       url: "/orcamentos",  icon: FileText,        module: "orcamentos"   },
      { title: "Pedidos",          url: "/pedidos",     icon: ShoppingCart,    module: "pedidos",     badge: "pendentes" },
      { title: "Aprovações",       url: "/aprovacoes",  icon: CheckSquare,     module: "aprovacoes",  badge: "aprovacoes" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Integração & Multi-ERP",   url: "/integracao-erp", icon: Link2,    module: "integracao-erp" },
      { title: "Integração Bancária", url: "/integracao-bancaria", icon: Landmark, module: "integracao-bancaria" },
      { title: "Produção",         url: "/producao",       icon: Factory,  module: "producao"         },
      { title: "Flow Studio (CRM)",url: "/crm-flow",       icon: GitFork,  module: "crm-flow"         },
    ],
  },
  {
    label: "Gestão",
    items: [
      { title: "Representantes",   url: "/representantes", icon: Briefcase, module: "representantes"  },
      { title: "Governance Studio",url: "/governance",     icon: Scale,     module: "governance"      },
      { title: "Perfis & Usuários",url: "/usuarios",       icon: UserCog,   module: "usuarios"         },
      { title: "Relatórios",       url: "/relatorios",     icon: BarChart3, module: "relatorios"       },
      { title: "Faturamento & Crédito", url: "/financeiro", icon: DollarSign, module: "finance"       },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Configurações",    url: "/configuracoes",  icon: Settings, module: "configuracoes"    },
      { title: "Auditoria",        url: "/auditoria",      icon: Shield,   module: "auditoria"        },
    ],
  },
];

// Menu do representante (ambiente isolado)
const repMenuGroups: { label: string; items: MenuItem[] }[] = [
  {
    label: "Meu Ambiente",
    items: [
      { title: "Dashboard",         url: "/dashboard",    icon: LayoutDashboard, module: "dashboard"    },
      { title: "Minha Carteira",    url: "/clientes",    icon: Users,           module: "clientes"     },
      { title: "Produtos Liberados",url: "/produtos",    icon: Tag,             module: "produtos"     },
      { title: "Orçamentos",        url: "/orcamentos",  icon: FileText,        module: "orcamentos"   },
      { title: "Pedidos",           url: "/pedidos",     icon: ShoppingCart,    module: "pedidos"      },
    ],
  },
  {
    label: "Minha Área",
    items: [
      { title: "Metas & Desempenho", url: "/representantes?tab=metas", icon: Scale,     module: "representantes" },
      { title: "Documentos",         url: "/governance/documentos",    icon: FileText,  module: "governance" },
    ],
  },
];

// ─── Component ────────────────────────────────────────

export function AppSidebar() {
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission, logout } = useAuth();
  const isRepresentante = user?.role === "representante";
  const groups = isRepresentante ? repMenuGroups : menuGroups;
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const handleLogout = () => {
    setShowLogoutDialog(false);
    logout();
    navigate("/login");
  };
  
  // Carrega dados para badges
  const [orders, setOrders] = useState<Order[]>([]);
  
  useEffect(() => {
    let active = true;
    ordersService.getAll()
      .then((r) => { if (active) setOrders(r?.data ?? []); })
      .catch(() => { if (active) setOrders([]); });
    return () => { active = false; };
  }, []);

  const pendingOrdersCount = orders.filter((o) => o.status === "Pendente").length;
  const pendingApprovalsCount = 0; // TODO: integrar com serviço de aprovações do Protheus

  function getBadgeCount(badge?: "pendentes" | "aprovacoes"): number {
    if (badge === "pendentes")  return pendingOrdersCount;
    if (badge === "aprovacoes") return pendingApprovalsCount;
    return 0;
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* ── Logo ── */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border/60">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg text-white font-bold text-sm">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-sidebar-foreground leading-none">
                  Nexus
                </span>
                <span className="text-sm font-semibold text-primary leading-none">
                  CRM
                </span>
              </div>
              <span className="text-[10px] text-sidebar-foreground/50 mt-0.5 font-medium tracking-wider">
                {isRepresentante ? "Meu Ambiente" : "Hub Multiplataforma"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* ── Menu Groups ── */}
      <SidebarContent className="px-2 py-2 scrollbar-thin">
        {groups.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) =>
            hasPermission(item.module, "view")
          );
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="py-1">
              {!collapsed && (
                <div className="sidebar-group-label">{group.label}</div>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const badgeCount = getBadgeCount(item.badge);
                    const isActive = location.pathname === item.url;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.title}
                          className="relative"
                        >
                          <NavLink
                            to={item.url}
                            end
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                            onClick={() => {
                              if (isMobile) {
                                setOpenMobile(false);
                              } else {
                                setOpen(false);
                              }
                            }}
                          >
                            <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                            {!collapsed && (
                              <>
                                <span className="flex-1 truncate">{item.title}</span>
                                {badgeCount > 0 && (
                                  <Badge className="h-4 min-w-4 px-1 text-[10px] font-bold bg-sidebar-primary text-white border-0 rounded-full">
                                    {badgeCount}
                                  </Badge>
                                )}
                              </>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
              {gIdx < menuGroups.length - 1 && (
                <SidebarSeparator className="mt-2 bg-sidebar-border/40" />
              )}
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="px-2 pb-3 border-t border-sidebar-border/60">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              id="sidebar-logout-button"
              tooltip="Sair"
              className="text-sidebar-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              onClick={() => setShowLogoutDialog(true)}
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Confirmação de Logout */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent id="sidebar-logout-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle id="sidebar-logout-confirm-title">Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription id="sidebar-logout-confirm-description">
              Sua sessão atual será finalizada e você precisará realizar login novamente para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel id="sidebar-logout-confirm-cancel-btn">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              id="sidebar-logout-confirm-action-btn"
              onClick={handleLogout}
              className={cn(buttonVariants({ variant: "destructive" }), "gap-1.5")}
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
