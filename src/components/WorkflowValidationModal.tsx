import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Trash2,
  CheckCircle2,
  Wand2,
  LocateFixed,
  ArrowRight,
  ShieldAlert,
  Download,
  Save,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { WorkflowValidationResult, WorkflowValidationIssue } from "@/lib/workflow-engine";

export interface WorkflowValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validationResult: WorkflowValidationResult;
  actionType: "save" | "export";
  flowName: string;
  onFocusNode: (nodeId: string) => void;
  onFocusEdge: (edgeId: string) => void;
  onProceedAnyway: () => void;
  onAutoFixAll?: () => void;
  onAutoFixIssue?: (issue: WorkflowValidationIssue) => void;
}

export function WorkflowValidationModal({
  open,
  onOpenChange,
  validationResult,
  actionType,
  flowName,
  onFocusNode,
  onFocusEdge,
  onProceedAnyway,
  onAutoFixAll,
  onAutoFixIssue
}: WorkflowValidationModalProps) {
  const { errorsCount, warningsCount, issues, cycleNodeIds, unreachableNodeIds, missingConfigNodeIds } = validationResult;

  const cycleIssues = issues.filter((i) => i.category === "cycle");
  const unreachableIssues = issues.filter((i) => i.category === "unreachable");
  const missingConfigIssues = issues.filter((i) => i.category === "missing_config" || i.category === "missing_trigger");
  const otherIssues = issues.filter(
    (i) => i.category !== "cycle" && i.category !== "unreachable" && i.category !== "missing_config" && i.category !== "missing_trigger"
  );

  const isSave = actionType === "save";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with High-Contrast Alert Banner */}
        <div className="p-5 border-b border-rose-200/80 dark:border-rose-950/60 bg-gradient-to-r from-rose-50 via-rose-100/40 to-amber-50/50 dark:from-rose-950/40 dark:via-neutral-900 dark:to-amber-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-rose-700 dark:text-rose-400 uppercase bg-rose-200/60 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                    {isSave ? "Bloqueio de Salvamento" : "Bloqueio de Exportação"}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Fluxo: <strong className="text-neutral-800 dark:text-neutral-200">{flowName}</strong>
                  </span>
                </div>
                <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                  {isSave
                    ? "Inconsistências Críticas Detectadas no Fluxo"
                    : "Validação Pré-Exportação Obrigatória"}
                </DialogTitle>
                <DialogDescription className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                  O motor identificou dependências circulares, nós inalcançáveis ou parâmetros mandatórios vazios que impedem a execução.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 bg-white/80 dark:bg-neutral-900 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/50">
                <AlertCircle className="h-4 w-4" /> {errorsCount} Erro(s) Crítico(s)
              </span>
              {warningsCount > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 bg-white/80 dark:bg-neutral-900 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  <AlertTriangle className="h-4 w-4" /> {warningsCount} Alerta(s)
                </span>
              )}
            </div>

            {onAutoFixAll && (
              <button
                type="button"
                onClick={onAutoFixAll}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Tenta resolver automaticamente ciclos órfãos, conexões inválidas e preenche parâmetros padrão"
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-Corrigir Tudo
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Issues List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* 1. Circular Dependencies Section */}
          {cycleIssues.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="h-4 w-4" /> 1. Dependências Circulares (Loops Infinitos) ({cycleIssues.length})
                </div>
                <span className="text-[10px] text-neutral-400">Impede execução linear</span>
              </div>
              <div className="space-y-2">
                {cycleIssues.map((issue) => (
                  <ValidationIssueRow
                    key={issue.id}
                    issue={issue}
                    onFocusNode={onFocusNode}
                    onFocusEdge={onFocusEdge}
                    onDismissModal={() => onOpenChange(false)}
                    onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. Unreachable Nodes Section */}
          {unreachableIssues.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="h-4 w-4" /> 2. Nós Inalcançáveis & Desconexos ({unreachableIssues.length})
                </div>
                <span className="text-[10px] text-neutral-400">Sem caminho a partir do gatilho</span>
              </div>
              <div className="space-y-2">
                {unreachableIssues.map((issue) => (
                  <ValidationIssueRow
                    key={issue.id}
                    issue={issue}
                    onFocusNode={onFocusNode}
                    onFocusEdge={onFocusEdge}
                    onDismissModal={() => onOpenChange(false)}
                    onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 3. Missing Mandatory Configurations Section */}
          {missingConfigIssues.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> 3. Configurações Obrigatórias Ausentes ({missingConfigIssues.length})
                </div>
                <span className="text-[10px] text-neutral-400">Parâmetros essenciais em branco</span>
              </div>
              <div className="space-y-2">
                {missingConfigIssues.map((issue) => (
                  <ValidationIssueRow
                    key={issue.id}
                    issue={issue}
                    onFocusNode={onFocusNode}
                    onFocusEdge={onFocusEdge}
                    onDismissModal={() => onOpenChange(false)}
                    onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 4. Other Issues (e.g. Dangling edges) */}
          {otherIssues.length > 0 && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" /> Outras Inconsistências ({otherIssues.length})
              </div>
              <div className="space-y-2">
                {otherIssues.map((issue) => (
                  <ValidationIssueRow
                    key={issue.id}
                    issue={issue}
                    onFocusNode={onFocusNode}
                    onFocusEdge={onFocusEdge}
                    onDismissModal={() => onOpenChange(false)}
                    onAutoFix={onAutoFixIssue ? () => onAutoFixIssue(issue) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer with Action Buttons */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs">
            {isSave ? (
              <span>Corrija as inconsistências para garantir a execução no TOTVS Protheus.</span>
            ) : (
              <span>Fluxos com loops ou nós sem configuração podem falhar ao serem importados.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Revisar no Canvas
            </button>

            {/* Force / Draft option */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onProceedAnyway();
              }}
              className="px-3.5 py-2 text-xs font-bold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl transition-colors flex items-center gap-1.5"
              title={isSave ? "Salva as alterações como rascunho com aviso" : "Exporta o arquivo JSON com indicador de rascunho incompleto"}
            >
              {isSave ? <Save className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              {isSave ? "Salvar como Rascunho" : "Forçar Exportação"}
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

interface ValidationIssueRowProps {
  issue: WorkflowValidationIssue;
  onFocusNode: (nodeId: string) => void;
  onFocusEdge: (edgeId: string) => void;
  onDismissModal: () => void;
  onAutoFix?: () => void;
}

function ValidationIssueRow({
  issue,
  onFocusNode,
  onFocusEdge,
  onDismissModal,
  onAutoFix
}: ValidationIssueRowProps) {
  const isError = issue.type === "error";

  const handleLocate = () => {
    if (issue.nodeId) {
      onFocusNode(issue.nodeId);
      onDismissModal();
    } else if (issue.edgeId) {
      onFocusEdge(issue.edgeId);
      onDismissModal();
    }
  };

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
        isError
          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40"
          : "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isError ? (
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          )}
          <span className="font-bold text-neutral-900 dark:text-neutral-100">
            {issue.title}
          </span>
          {issue.nodeLabel && (
            <span className="font-mono text-[10px] bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300">
              {issue.nodeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {issue.canAutoFix && onAutoFix && (
            <button
              type="button"
              onClick={onAutoFix}
              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-200/60 dark:border-indigo-900/40 flex items-center gap-1 shadow-2xs transition-colors"
              title="Aplica a correção recomendada para esta inconformidade"
            >
              <Wand2 className="h-3 w-3 text-indigo-500" /> Corrigir
            </button>
          )}

          {(issue.nodeId || issue.edgeId) && (
            <button
              type="button"
              onClick={handleLocate}
              className="px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg border border-neutral-200 dark:border-neutral-800 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
              title="Focar este elemento no canvas visual"
            >
              <LocateFixed className="h-3 w-3 text-primary" /> Focar
            </button>
          )}
        </div>
      </div>

      <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-[11px]">
        {issue.message}
      </p>

      {issue.suggestion && (
        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1 font-medium pt-0.5">
          <ArrowRight className="h-3 w-3 text-primary shrink-0" />
          <span>{issue.suggestion}</span>
        </div>
      )}
    </div>
  );
}
