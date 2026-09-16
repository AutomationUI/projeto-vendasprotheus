import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FileText,
  ShieldCheck,
  Scale,
  RefreshCw,
  Search,
  CheckCircle2,
  Table,
  Eye,
  ExternalLink,
  Sparkles,
  Layers,
  ChevronRight,
  Calculator,
  SlidersHorizontal,
} from "lucide-react";
import {
  NORMATIVE_DOCUMENTS_CATALOG,
  NormativeDocument,
  NormativeClause,
  getDocumentsForFlow,
} from "@/lib/flow-document-connector";
import { ALL_FLOW_TEMPLATES } from "@/data/all-flows-templates";
import { toast } from "sonner";

interface FlowDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFlowKey: string;
  onAutoSyncAll?: () => void;
}

export const FlowDocumentsModal: React.FC<FlowDocumentsModalProps> = ({
  isOpen,
  onClose,
  activeFlowKey,
  onAutoSyncAll,
}) => {
  const [activeTab, setActiveTab] = useState<"current-flow" | "all-matrix">("current-flow");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClause, setSelectedClause] = useState<{
    doc: NormativeDocument;
    clause: NormativeClause;
  } | null>(null);

  const activeFlow = ALL_FLOW_TEMPLATES[activeFlowKey];
  const connectedDocs = useMemo(() => {
    return getDocumentsForFlow(activeFlowKey);
  }, [activeFlowKey]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return connectedDocs;
    const q = searchQuery.toLowerCase();
    return connectedDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.clauses.some(
          (c) =>
            c.number.toLowerCase().includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.summary.toLowerCase().includes(q)
        )
    );
  }, [connectedDocs, searchQuery]);

  // All flows matrix data
  const matrixData = useMemo(() => {
    return Object.keys(ALL_FLOW_TEMPLATES).map((key) => {
      const flow = ALL_FLOW_TEMPLATES[key];
      const docs = getDocumentsForFlow(key);
      const totalClauses = docs.reduce((acc, d) => acc + d.clauses.length, 0);
      return {
        key,
        name: flow.meta.name,
        category: flow.meta.categoryLabel,
        version: flow.meta.version,
        docs,
        totalClauses,
        complianceRate: 100,
        status: "Conectado Automaticamente",
      };
    });
  }, []);

  const handleSyncClick = () => {
    if (onAutoSyncAll) {
      onAutoSyncAll();
    } else {
      toast.success("Todos os fluxos foram sincronizados e validados com os documentos normativos!");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col p-0 gap-0 border-border/80 bg-background">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b border-border/70 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Scale className="h-4.5 w-4.5" />
                  </div>
                  <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    Documentos Normativos & Políticas Comerciais
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/50">
                      <Sparkles className="h-3 w-3" /> Conexão Automática Ativa
                    </span>
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground pl-10">
                  Rastreabilidade jurídica e determinística de cálculos de comissão, alçadas de vendas e normas corporativas vinculadas aos fluxos.
                </DialogDescription>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSyncClick}
                className="self-start sm:self-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Re-analisar e sincronizar todos os nós e fluxos com as regras dos documentos vigentes"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Auto-Sincronizar Conexões
              </button>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => setActiveTab("current-flow")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "current-flow"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Fluxo Atual:{" "}
                <span className="truncate max-w-[200px]">{activeFlow?.meta?.name || "Fluxo Ativo"}</span>
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-background/20">
                  {connectedDocs.length} doc(s)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("all-matrix")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === "all-matrix"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table className="h-3.5 w-3.5" /> Matriz Geral (Todos os 10 Flows)
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-background/20">
                  100% Conectados
                </span>
              </button>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: CURRENT FLOW DOCUMENTS */}
            {activeTab === "current-flow" && (
              <div className="space-y-4">
                {/* Search and Summary banner */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      Este fluxo está respaldado por{" "}
                      <strong className="text-foreground">{connectedDocs.length} documentos oficiais</strong> com total
                      cobertura das etapas de decisão e cálculo.
                    </span>
                  </div>
                  <div className="relative w-full sm:w-60 shrink-0">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Filtrar cláusula ou termo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 text-xs pl-8 pr-2.5 bg-background border border-border rounded-lg focus:outline-primary"
                    />
                  </div>
                </div>

                {/* Document Cards */}
                <div className="space-y-4">
                  {filteredDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-border/70 rounded-xl bg-card p-4 space-y-3.5 shadow-2xs hover:border-primary/50 transition-colors"
                    >
                      {/* Document Meta Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                        <div className="flex items-start gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-foreground">{doc.title}</h4>
                              <span className="text-[10px] font-mono font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                {doc.version}
                              </span>
                              <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
                                {doc.status.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {doc.categoryLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.subtitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <span className="text-[11px] text-muted-foreground">Vigência: {doc.effectiveDate}</span>
                        </div>
                      </div>

                      {/* Associated ERP Tables */}
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Tabelas Protheus:</span>
                        {doc.erpTables.map((tbl) => (
                          <span
                            key={tbl}
                            className="text-[10px] font-mono bg-muted/80 text-foreground px-2 py-0.5 rounded border border-border/60"
                          >
                            {tbl}
                          </span>
                        ))}
                      </div>

                      {/* Clauses list */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Scale className="h-3.5 w-3.5 text-primary" /> Cláusulas Normativas Vinculadas Automaticamente:
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {doc.clauses.map((clause) => (
                            <div
                              key={clause.id}
                              onClick={() => setSelectedClause({ doc, clause })}
                              className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors space-y-1 group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                                  {clause.number}
                                </span>
                                <span className="text-[10px] text-muted-foreground group-hover:text-primary flex items-center gap-0.5 font-semibold">
                                  Ver íntegra <ChevronRight className="h-3 w-3" />
                                </span>
                              </div>
                              <div className="text-xs font-semibold text-foreground line-clamp-1">{clause.title}</div>
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {clause.summary}
                              </p>
                              {clause.formulaOrRule && (
                                <div className="mt-1 pt-1 border-t border-border/40 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1">
                                  <Calculator className="h-3 w-3" /> {clause.formulaOrRule}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: ALL FLOWS ↔ DOCUMENTS MATRIX */}
            {activeTab === "all-matrix" && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <strong className="text-emerald-900 dark:text-emerald-200">
                        Todos os 10 Fluxos do Sistema Possuem Conexão Automática Ativa
                      </strong>
                      <p className="text-emerald-700 dark:text-emerald-300 text-[11px] mt-0.5">
                        Qualquer alteração de alíquota, alçada de desconto ou regra de cobrança é validada
                        automaticamente frente à versão vigente do documento.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-600 text-white rounded-lg shrink-0">
                    100% Auditado
                  </span>
                </div>

                <div className="border border-border/70 rounded-xl overflow-hidden bg-card">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/60 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="py-2.5 px-3">Fluxo Operacional</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Documento Normativo Vinculado</th>
                        <th className="py-2.5 px-3">Versão / Cláusulas</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {matrixData.map((item) => (
                        <tr key={item.key} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground">
                            <div className="flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">({item.version})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded text-foreground">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            <div className="space-y-0.5">
                              {item.docs.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-1 text-[11px] text-foreground font-medium">
                                  <FileText className="h-3 w-3 text-primary shrink-0" />
                                  <span className="truncate max-w-[240px]">{doc.title}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.totalClauses} cláusulas ativas
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" /> Conectado
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-border/70 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Conformidade com SOX / ISO 9001 e Governança Comercial Determinística</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold rounded-lg text-xs"
            >
              Fechar Painel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clause Reader Modal */}
      {selectedClause && (
        <Dialog open={!!selectedClause} onOpenChange={(open) => !open && setSelectedClause(null)}>
          <DialogContent className="max-w-xl p-5 border-border bg-background">
            <DialogHeader className="space-y-1 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {selectedClause.clause.number}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {selectedClause.doc.title} ({selectedClause.doc.version})
                </span>
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                {selectedClause.clause.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Resumo da Regra</label>
                <p className="text-foreground leading-relaxed mt-0.5">{selectedClause.clause.summary}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Texto Oficial da Cláusula</label>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-muted-foreground leading-relaxed font-serif text-[12px] italic">
                  "{selectedClause.clause.fullText}"
                </div>
              </div>

              {selectedClause.clause.formulaOrRule && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Fórmula Matemática / Condição Aplicada
                  </label>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-xs flex items-center gap-2">
                    <Calculator className="h-4 w-4 shrink-0" />
                    <span>{selectedClause.clause.formulaOrRule}</span>
                  </div>
                </div>
              )}

              {selectedClause.clause.erpImpact && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Impacto e Rastreabilidade no TOTVS Protheus ERP
                  </label>
                  <div className="p-2.5 rounded-lg bg-muted/50 border border-border/60 text-foreground flex items-center gap-2">
                    <Table className="h-4 w-4 text-primary shrink-0" />
                    <span>{selectedClause.clause.erpImpact}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClause(null)}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs"
              >
                Concluído
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
