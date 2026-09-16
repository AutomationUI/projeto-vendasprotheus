import { useState } from "react";
import {
  MessageSquare,
  Database,
  ShoppingBag,
  Globe,
  Share2,
  MoreHorizontal,
  ChevronRight,
  Plus,
  ArrowRight,
  CheckCircle,
  FileText,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localDB } from "@/lib/local-db";
import { useToast } from "@/components/ui/use-toast";
import { type CrmOpportunity, type CrmStage, type CrmChannel } from "@/lib/mock-data";
import { WhatsAppModal } from "./WhatsAppModal";
import { NewOpportunityModal } from "./NewOpportunityModal";
import { useNavigate } from "react-router-dom";

interface CrmOpportunitiesViewProps {
  opportunities: CrmOpportunity[];
  selectedChannel: string;
  selectedStage: string;
  onRefresh: () => void;
}

const CHANNEL_CONFIG: Record<CrmChannel, { label: string; icon: typeof MessageSquare; color: string; badgeClass: string }> = {
  whatsapp: {
    label: "WhatsApp API",
    icon: MessageSquare,
    color: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  protheus: {
    label: "Protheus ERP",
    icon: Database,
    color: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  ecommerce: {
    label: "E-commerce",
    icon: ShoppingBag,
    color: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  web: {
    label: "Portal Comercial",
    icon: Globe,
    color: "text-sky-600 dark:text-sky-400",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  indicacao: {
    label: "Indicação",
    icon: Share2,
    color: "text-rose-600 dark:text-rose-400",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
};

const STAGE_CONFIG: Record<CrmStage, { label: string; next?: CrmStage; nextLabel?: string; color: string }> = {
  lead: { label: "1. Lead", next: "qualificacao", nextLabel: "Qualificar Lead", color: "bg-sky-500" },
  qualificacao: { label: "2. Qualificação", next: "proposta", nextLabel: "Criar Proposta", color: "bg-indigo-500" },
  proposta: { label: "3. Proposta Enviada", next: "negociacao", nextLabel: "Iniciar Negociação", color: "bg-amber-500" },
  negociacao: { label: "4. Em Negociação", next: "ganho", nextLabel: "Fechar como Ganho", color: "bg-purple-500" },
  ganho: { label: "5. Ganho / Fechado", color: "bg-emerald-500" },
  perdido: { label: "Perdido", color: "bg-rose-500" },
};

const DEFAULT_STAGE = { label: "1. Lead", color: "bg-sky-500" };

const fmt = (v?: number | null) =>
  (typeof v === "number" && !isNaN(v) ? v : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CrmOpportunitiesView({
  opportunities = [],
  selectedChannel,
  selectedStage,
  onRefresh,
}: CrmOpportunitiesViewProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [activeWhatsAppOpp, setActiveWhatsAppOpp] = useState<CrmOpportunity | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Filter opportunities
  const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];
  const filtered = safeOpportunities.filter((opp) => {
    if (!opp) return false;
    if (selectedChannel !== "all" && opp.canal !== selectedChannel) return false;
    if (selectedStage !== "all" && opp.estagio !== selectedStage) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (opp.titulo || "").toLowerCase().includes(q);
      const matchClient = (opp.cliente || "").toLowerCase().includes(q);
      const matchSeller = (opp.vendedor || "").toLowerCase().includes(q);
      if (!matchTitle && !matchClient && !matchSeller) return false;
    }
    return true;
  });

  const handleAdvanceStage = (opp: CrmOpportunity) => {
    const current = opp.estagio ? STAGE_CONFIG[opp.estagio] : null;
    if (!current?.next) return;

    localDB.updateOpportunity(opp.id, {
      estagio: current.next,
      probabilidade:
        current.next === "ganho" ? 100 :
        current.next === "negociacao" ? 85 :
        current.next === "proposta" ? 70 : 50,
    });

    const nextStage = STAGE_CONFIG[current.next];
    toast({
      title: "Estágio Atualizado",
      description: `"${opp.titulo}" avançou para ${nextStage?.label || current.next}.`,
    });
    onRefresh();
  };

  const handleDelete = (opp: CrmOpportunity) => {
    localDB.deleteOpportunity(opp.id);
    toast({
      title: "Oportunidade Removida",
      description: `"${opp.titulo}" foi excluída do CRM.`,
    });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Buscar por oportunidade, cliente ou vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 px-3 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === "cards" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === "table" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Visualização em Tabela"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsNewModalOpen(true)}
            className="h-8 text-xs gap-1.5 font-medium shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      {/* Cards View */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((opp) => {
            const ch = CHANNEL_CONFIG[opp.canal] || CHANNEL_CONFIG.protheus;
            const ChannelIcon = ch.icon;
            const stage = (opp.estagio && STAGE_CONFIG[opp.estagio]) || DEFAULT_STAGE;

            return (
              <Card
                key={opp.id}
                className="card-premium border-0 overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="p-3.5 pb-2 border-b border-border/40 flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium ${ch.badgeClass}`}>
                          <ChannelIcon className="h-2.5 w-2.5 mr-1" />
                          {ch.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                          {opp.vendedor}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {opp.titulo}
                      </h4>
                      <p className="text-[11px] font-semibold text-muted-foreground truncate">
                        {opp.cliente}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs w-48">
                        <DropdownMenuLabel>Ações Comerciais</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setActiveWhatsAppOpp(opp)}>
                          <MessageSquare className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                          Enviar WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/orcamentos")}>
                          <FileText className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                          Gerar Orçamento Formal
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {stage.next && (
                          <DropdownMenuItem onClick={() => handleAdvanceStage(opp)}>
                            <ArrowRight className="h-3.5 w-3.5 mr-2 text-amber-600" />
                            {stage.nextLabel}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(opp)}
                          className="text-rose-600 dark:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Remover Oportunidade
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Body Info */}
                  <div className="p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-muted-foreground text-[10px] block">Valor Previsto</span>
                        <span className="text-sm font-bold text-foreground">{fmt(opp.valor)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground text-[10px] block">Probabilidade</span>
                        <span className="font-semibold text-foreground text-xs">{opp.probabilidade}%</span>
                      </div>
                    </div>

                    {/* Stage Pill */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Estágio atual:</span>
                        <span className="font-semibold text-foreground">{stage.label}</span>
                      </div>
                      <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stage.color}`}
                          style={{ width: `${opp.probabilidade}%` }}
                        />
                      </div>
                    </div>

                    {/* Next step / follow up */}
                    {opp.proximoPasso && (
                      <div className="bg-muted/40 p-2 rounded-lg border border-border/40 text-[11px] space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary" /> Próximo Passo:
                        </span>
                        <p className="text-foreground/90 font-medium leading-tight">{opp.proximoPasso}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Quick Action Buttons */}
                <div className="p-2.5 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveWhatsAppOpp(opp)}
                    className="h-7 text-[11px] gap-1 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                  >
                    <MessageSquare className="h-3 w-3 text-emerald-500" />
                    WhatsApp
                  </Button>

                  {stage.next ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAdvanceStage(opp)}
                      className="h-7 text-[11px] gap-1 ml-auto font-medium"
                    >
                      <span>Avançar</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 ml-auto bg-emerald-500/5">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Negócio Fechado
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-xl border border-dashed border-border/80">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm font-semibold text-foreground">Nenhuma oportunidade encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente alterar os filtros de canal e estágio, ou crie uma nova oportunidade.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsNewModalOpen(true)}
                className="mt-3 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar Oportunidade
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="card-premium border-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Oportunidade & Cliente</th>
                  <th className="py-2.5 px-3">Canal</th>
                  <th className="py-2.5 px-3">Estágio</th>
                  <th className="py-2.5 px-3">Valor</th>
                  <th className="py-2.5 px-3">Probabilidade</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((opp) => {
                  const ch = CHANNEL_CONFIG[opp.canal] || CHANNEL_CONFIG.protheus;
                  const ChannelIcon = ch.icon;
                  const stage = (opp.estagio && STAGE_CONFIG[opp.estagio]) || DEFAULT_STAGE;

                  return (
                    <tr key={opp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground">{opp.titulo}</div>
                        <div className="text-[11px] text-muted-foreground">{opp.cliente} {opp.contato ? `· ${opp.contato}` : ""}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={`text-[10px] ${ch.badgeClass}`}>
                          <ChannelIcon className="h-2.5 w-2.5 mr-1" />
                          {ch.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-foreground">{stage.label}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {fmt(opp.valor)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium">{opp.probabilidade}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {opp.vendedor}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveWhatsAppOpp(opp)}
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                            title="WhatsApp"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          {stage.next && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdvanceStage(opp)}
                              className="h-7 text-[11px] text-primary hover:bg-primary/10"
                            >
                              Avançar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <WhatsAppModal
        open={!!activeWhatsAppOpp}
        onOpenChange={(open) => !open && setActiveWhatsAppOpp(null)}
        opportunity={activeWhatsAppOpp}
      />

      <NewOpportunityModal
        open={isNewModalOpen}
        onOpenChange={setIsNewModalOpen}
        onSuccess={onRefresh}
      />
    </div>
  );
}
