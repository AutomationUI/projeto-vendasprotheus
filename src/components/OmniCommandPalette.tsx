import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, 
  ShoppingCart, 
  Users, 
  Tag, 
  FileText, 
  Zap, 
  CheckSquare, 
  Link2, 
  Scale, 
  BarChart3, 
  Settings, 
  Shield, 
  Plus, 
  ArrowRight, 
  Command, 
  Database,
  Sparkles,
  Calculator,
  RefreshCw,
  Building2,
  PackageCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { customers, products, recentOrders, quotes } from "@/lib/mock-data";
import { toast } from "sonner";
import { useUIStore } from "@/store/use-ui-store";

interface OmniCommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenCopilot?: () => void;
}

export function OmniCommandPalette({ open: propOpen, onOpenChange: propOnOpenChange, onOpenCopilot }: OmniCommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { isCommandOpen, setCommandOpen, setCopilotOpen } = useUIStore();

  const open = propOpen !== undefined ? propOpen : isCommandOpen;
  const onOpenChange = propOnOpenChange !== undefined ? propOnOpenChange : setCommandOpen;

  // Global shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // System Action Items
  const systemActions = [
    {
      id: "act-new-order",
      title: "Novo Pedido de Venda Express",
      subtitle: "Criar novo pedido e enviar para aprovação no CRM ou ERP",
      icon: ShoppingCart,
      category: "Ações Comerciais",
      action: () => {
        onOpenChange(false);
        navigate("/pedidos?novo=1");
        toast.info("Abrindo formulário de Novo Pedido...");
      },
    },
    {
      id: "act-new-quote",
      title: "Novo Orçamento / Proposta Comercial",
      subtitle: "Gerar cotação com cálculo automático de impostos e margem",
      icon: FileText,
      category: "Ações Comerciais",
      action: () => {
        onOpenChange(false);
        navigate("/orcamentos?novo=1");
        toast.info("Abrindo Novo Orçamento...");
      },
    },
    {
      id: "act-flow-studio",
      title: "Flow Studio — Orquestrador BPMN & IA",
      subtitle: "Configurar gatilhos, conectores e automações visuais",
      icon: Zap,
      category: "Módulos & Ferramentas",
      action: () => {
        onOpenChange(false);
        navigate("/crm-flow");
      },
    },
    {
      id: "act-governance",
      title: "Governance Studio — Regras & Comissões",
      subtitle: "Gestão de territórios, regras contratuais e alçadas",
      icon: Scale,
      category: "Módulos & Ferramentas",
      action: () => {
        onOpenChange(false);
        navigate("/governance");
      },
    },
    {
      id: "act-erp-sync",
      title: "Sincronização & Conectores ERP",
      subtitle: "Gerenciar banco de dados nativo e conectores TOTVS, SAP e Omie",
      icon: RefreshCw,
      category: "Conectividade & Nuvem",
      action: () => {
        onOpenChange(false);
        navigate("/integracao-erp");
        toast.success("Abrindo painel de Conectividade & Multi-ERP");
      },
    },
    {
      id: "act-copilot",
      title: "Copilot Comercial & Simulador de Vendas",
      subtitle: "Simular margens, checar regras fiscais e limites de crédito",
      icon: Sparkles,
      category: "Inteligência Comercial",
      action: () => {
        onOpenChange(false);
        if (onOpenCopilot) {
          onOpenCopilot();
        } else {
          setCopilotOpen(true);
        }
      },
    },
  ];

  // Search filter
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        actions: systemActions,
        customers: customers.slice(0, 3),
        products: products.slice(0, 3),
        orders: recentOrders.slice(0, 3),
      };
    }

    const filteredActions = systemActions.filter(
      a => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );

    const filteredCustomers = customers.filter(
      c => c.razaoSocial.toLowerCase().includes(q) || c.cnpj.includes(q) || (c.cidade && c.cidade.toLowerCase().includes(q))
    ).slice(0, 4);

    const filteredProducts = products.filter(
      p => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
    ).slice(0, 4);

    const filteredOrders = recentOrders.filter(
      o => o.numero.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q) || o.status.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      actions: filteredActions,
      customers: filteredCustomers,
      products: filteredProducts,
      orders: filteredOrders,
    };
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50">
          <Search className="h-5 w-5 text-neutral-400 shrink-0 mr-3" />
          <input
            type="text"
            placeholder="Digite para buscar clientes, produtos, pedidos, ou comandos (ex: novo pedido, protheus)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground focus:ring-0"
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold bg-neutral-200/80 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[420px] overflow-y-auto p-3 space-y-4">
          
          {/* Quick Actions */}
          {filteredResults.actions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 block">
                Ações Rápidas & Módulos
              </span>
              <div className="space-y-1">
                {filteredResults.actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={act.action}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <h5 className="text-xs font-bold text-foreground truncate">{act.title}</h5>
                          <p className="text-[11px] text-muted-foreground truncate">{act.subtitle}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clientes */}
          {filteredResults.customers.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 block">
                Clientes & Contas (SA1)
              </span>
              <div className="space-y-1">
                {filteredResults.customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/clientes");
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-foreground truncate block">{c.razaoSocial}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{c.cnpj} • {c.cidade}/{c.uf} • Total Compras: R$ {c.totalCompras?.toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full shrink-0">
                      Ativo
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Produtos */}
          {filteredResults.products.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 block">
                Catálogo & Estoque (SB1/SB2)
              </span>
              <div className="space-y-1">
                {filteredResults.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/produtos");
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                        <Tag className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-foreground truncate block">{p.nome}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">Cód: {p.codigo} • Estoque: {p.estoque} {p.unidade} • Categoria: {p.categoria}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary font-mono shrink-0">
                      R$ {p.preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pedidos Recentes */}
          {filteredResults.orders.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-2 block">
                Pedidos de Venda (SC5)
              </span>
              <div className="space-y-1">
                {filteredResults.orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      onOpenChange(false);
                      navigate("/pedidos");
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
                        <PackageCheck className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-semibold text-foreground truncate block">{o.numero} — {o.cliente}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{o.data} • {o.condicaoPagamento || "30/60 DD"}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-foreground font-mono block">
                        R$ {o.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] font-semibold text-neutral-500">{o.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredResults.actions.length === 0 && 
           filteredResults.customers.length === 0 && 
           filteredResults.products.length === 0 && 
           filteredResults.orders.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Nenhum resultado encontrado para "{query}".</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><strong>Navegar:</strong> ↑ ↓</span>
            <span><strong>Selecionar:</strong> Enter</span>
            <span><strong>Fechar:</strong> Esc</span>
          </div>
          <div className="flex items-center gap-1.5 text-primary font-medium">
            <Zap className="h-3 w-3" /> Nexus Spotlight
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
