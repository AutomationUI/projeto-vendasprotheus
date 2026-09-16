import React from "react";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Wand2, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  LocateFixed, 
  Info,
  RefreshCw
} from "lucide-react";
import { WorkflowValidationResult, WorkflowValidationIssue } from "@/lib/workflow-engine";

interface WorkflowValidationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: WorkflowValidationResult;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onAutoLayout: () => void;
  onCleanDanglingEdges?: () => void;
  onAutoFixAll?: () => void;
  onAutoFixIssue?: (issue: WorkflowValidationIssue) => void;
  onRemoveUnreachableNodes?: () => void;
  onBreakCycles?: () => void;
}

export const WorkflowValidationDrawer: React.FC<WorkflowValidationDrawerProps> = ({
  isOpen,
  onClose,
  validationResult,
  onSelectNode,
  onSelectEdge,
  onAutoLayout,
  onCleanDanglingEdges,
  onAutoFixAll,
  onAutoFixIssue,
  onRemoveUnreachableNodes,
  onBreakCycles
}) => {
  const [activeCategory, setActiveCategory] = React.useState<"all" | "cycle" | "unreachable" | "missing_config">("all");

  if (!isOpen) return null;

  const { isValid, errorsCount, warningsCount, issues, validatedAt, cycleNodeIds, unreachableNodeIds } = validationResult;

  const filteredIssues = issues.filter((i) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "cycle") return i.category === "cycle";
    if (activeCategory === "unreachable") return i.category === "unreachable";
    if (activeCategory === "missing_config") return i.category === "missing_config" || i.category === "missing_trigger";
    return true;
  });

  const errors = filteredIssues.filter((i) => i.type === "error");
  const warnings = filteredIssues.filter((i) => i.type === "warning");

  const cycleCount = issues.filter((i) => i.category === "cycle").length;
  const unreachableCount = issues.filter((i) => i.category === "unreachable").length;
  const missingConfigCount = issues.filter((i) => i.category === "missing_config" || i.category === "missing_trigger").length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              isValid 
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" 
                : errorsCount > 0 
                ? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400" 
                : "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
            }`}>
              {isValid && warningsCount === 0 ? (
                <ShieldCheck className="h-5 w-5" />
              ) : errorsCount > 0 ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Motor de Validação de Fluxo
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Verificação de dependências, conectividade e parâmetros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status Summary Banner */}
        <div className="p-3.5 bg-neutral-100/60 dark:bg-neutral-950/40 border-b border-neutral-200/80 dark:border-neutral-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-4 w-4" /> {errorsCount} Erro(s)
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" /> {warningsCount} Alerta(s)
            </span>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">
            Auditado às {validatedAt}
          </span>
        </div>

        {/* Action Quick Bar */}
        <div className="p-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 flex items-center gap-1.5 flex-wrap">
          {onAutoFixAll && errorsCount > 0 && (
            <button
              onClick={onAutoFixAll}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Wand2 className="h-3.5 w-3.5" /> Auto-Corrigir
            </button>
          )}

          <button
            onClick={onAutoLayout}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-indigo-200/50 transition-colors"
          >
            Auto-Layout
          </button>

          {onRemoveUnreachableNodes && unreachableCount > 0 && (
            <button
              onClick={onRemoveUnreachableNodes}
              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-rose-200/50 transition-colors"
              title="Exclui todos os nós que não têm caminho a partir do gatilho"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" /> Limpar Inalcançáveis
            </button>
          )}

          {onBreakCycles && cycleCount > 0 && (
            <button
              onClick={onBreakCycles}
              className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 border border-amber-200/50 transition-colors"
              title="Remove as conexões que geram ciclos fechados"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-500" /> Quebrar Loops
            </button>
          )}

          {onCleanDanglingEdges && (
            <button
              onClick={onCleanDanglingEdges}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              Limpar Órfãs
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/50 text-[11px] font-semibold px-2 pt-1 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-2.5 py-1.5 rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
              activeCategory === "all"
                ? "border-primary text-primary font-bold bg-white dark:bg-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Todos ({issues.length})
          </button>
          <button
            onClick={() => setActiveCategory("cycle")}
            className={`px-2.5 py-1.5 rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
              activeCategory === "cycle"
                ? "border-rose-500 text-rose-600 font-bold bg-white dark:bg-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Loops ({cycleCount})
          </button>
          <button
            onClick={() => setActiveCategory("unreachable")}
            className={`px-2.5 py-1.5 rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
              activeCategory === "unreachable"
                ? "border-rose-500 text-rose-600 font-bold bg-white dark:bg-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Inalcançáveis ({unreachableCount})
          </button>
          <button
            onClick={() => setActiveCategory("missing_config")}
            className={`px-2.5 py-1.5 rounded-t-lg transition-colors border-b-2 flex items-center gap-1 ${
              activeCategory === "missing_config"
                ? "border-amber-500 text-amber-600 font-bold bg-white dark:bg-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            Configurações ({missingConfigCount})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Zero Issues State */}
          {issues.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Fluxo Validado com Sucesso!
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                  Sem dependências circulares, nós inalcançáveis ou configurações pendentes. Pronto para homologação e execução no Protheus.
                </p>
              </div>
            </div>
          )}

          {/* Filtered empty state */}
          {issues.length > 0 && filteredIssues.length === 0 && (
            <div className="py-8 text-center text-xs text-neutral-500">
              Nenhuma inconsistência nesta categoria selecionada.
            </div>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Erros Críticos ({errors.length})
              </div>
              {errors.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onSelectNode={onSelectNode}
                  onSelectEdge={onSelectEdge}
                  onClose={onClose}
                  onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                />
              ))}
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Avisos & Recomendações ({warnings.length})
              </div>
              {warnings.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onSelectNode={onSelectNode}
                  onSelectEdge={onSelectEdge}
                  onClose={onClose}
                  onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Fechar Painel
          </button>
        </div>

      </div>
    </div>
  );
};

interface IssueCardProps {
  issue: WorkflowValidationIssue;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClose: () => void;
  onAutoFix?: () => void;
}

const IssueCard: React.FC<IssueCardProps> = ({ issue, onSelectNode, onSelectEdge, onClose, onAutoFix }) => {
  const isError = issue.type === "error";

  const handleLocate = () => {
    if (issue.nodeId) {
      onSelectNode(issue.nodeId);
      onClose();
    } else if (issue.edgeId) {
      onSelectEdge(issue.edgeId);
      onClose();
    }
  };

  return (
    <div className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
      isError 
        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50" 
        : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
          {isError ? (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span>{issue.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {issue.canAutoFix && onAutoFix && (
            <button
              onClick={onAutoFix}
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Corrigir automaticamente"
            >
              <Wand2 className="h-3 w-3 text-indigo-500" /> Corrigir
            </button>
          )}

          {(issue.nodeId || issue.edgeId) && (
            <button
              onClick={handleLocate}
              className="px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              title="Selecionar e focar elemento no canvas"
            >
              <LocateFixed className="h-3 w-3 text-indigo-500" /> Focar
            </button>
          )}
        </div>
      </div>

      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
        {issue.message}
      </p>

      {issue.suggestion && (
        <div className="pt-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-start gap-1">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>{issue.suggestion}</span>
        </div>
      )}
    </div>
  );
};
