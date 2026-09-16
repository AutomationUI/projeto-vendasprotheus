import { useState } from "react";
import { MessageSquare, Database, ShoppingBag, Globe, RefreshCw, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface ChannelInfo {
  id: string;
  name: string;
  category: string;
  status: "connected" | "syncing" | "idle";
  icon: typeof MessageSquare;
  color: string;
  bgColor: string;
  borderColor: string;
  metric1: { label: string; value: string };
  metric2: { label: string; value: string };
  lastSync: string;
}

const channelsData: ChannelInfo[] = [
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    category: "CRM & Atendimento Omnichannel",
    status: "connected",
    icon: MessageSquare,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
    metric1: { label: "Leads Inbound", value: "18 hoje" },
    metric2: { label: "Interações CRM", value: "142 ativas" },
    lastSync: "Tempo real (Webhooks)",
  },
  {
    id: "protheus",
    name: "TOTVS Protheus ERP",
    category: "Backoffice, Faturamento & Estoque",
    status: "connected",
    icon: Database,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    metric1: { label: "Tabelas Sincronizadas", value: "SB1 / SB2 / DA1" },
    metric2: { label: "Alçadas & Crédito", value: "Automático" },
    lastSync: "Sincronizado há 2 min",
  },
  {
    id: "ecommerce",
    name: "E-commerce & Marketplaces",
    category: "Shopify, Mercado Livre & VTEX",
    status: "connected",
    icon: ShoppingBag,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    metric1: { label: "Pedidos Importados", value: "24 nesta semana" },
    metric2: { label: "Catálogo Espelhado", value: "68 SKUs ativos" },
    lastSync: "Sync a cada 15 min",
  },
  {
    id: "web",
    name: "Portal Comercial & Mobile PWA",
    category: "Força de Vendas em Campo",
    status: "connected",
    icon: Globe,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/20",
    metric1: { label: "Representantes Online", value: "8 ativos" },
    metric2: { label: "Modo Offline DB", value: "Pronto" },
    lastSync: "Tempo real",
  },
];

interface CrmChannelGatewayProps {
  selectedChannel: string;
  onSelectChannel: (channelId: string) => void;
}

export function CrmChannelGateway({ selectedChannel, onSelectChannel }: CrmChannelGatewayProps) {
  const { toast } = useToast();
  const [syncingAll, setSyncingAll] = useState(false);

  const handleSyncAll = () => {
    setSyncingAll(true);
    setTimeout(() => {
      setSyncingAll(false);
      toast({
        title: "Ecossistema Multiplataforma Sincronizado",
        description: "WhatsApp, TOTVS Protheus, E-commerce e Portal Web atualizados com sucesso.",
      });
    }, 1200);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ecossistema Integrado Multiplataforma
          </span>
          <Badge variant="outline" className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5">
            <ShieldCheck className="h-3 w-3 mr-1" />
            4 Conectores Ativos
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="h-7 text-xs gap-1.5 border-border/80 hover:bg-accent"
          >
            <RefreshCw className={`h-3 w-3 ${syncingAll ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            {syncingAll ? "Sincronizando..." : "Sincronizar Todos os Canais"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {channelsData.map((ch) => {
          const isSelected = selectedChannel === ch.id;
          const Icon = ch.icon;

          return (
            <Card
              key={ch.id}
              onClick={() => onSelectChannel(isSelected ? "all" : ch.id)}
              className={`cursor-pointer transition-all duration-200 border relative overflow-hidden ${
                isSelected
                  ? "ring-2 ring-primary border-primary bg-primary/5 shadow-sm"
                  : "hover:border-border/80 hover:shadow-sm bg-card"
              }`}
            >
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ch.bgColor} ${ch.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{ch.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ch.category}</p>
                    </div>
                  </div>
                  <span className="flex h-2 w-2 relative shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11px]">
                  <div>
                    <span className="text-muted-foreground text-[10px] block">{ch.metric1.label}</span>
                    <span className="font-semibold text-foreground">{ch.metric1.value}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block">{ch.metric2.label}</span>
                    <span className="font-semibold text-foreground">{ch.metric2.value}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 pt-0.5">
                  <span>{ch.lastSync}</span>
                  {isSelected && (
                    <span className="font-semibold text-primary flex items-center gap-0.5">
                      Filtrado <ArrowUpRight className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
