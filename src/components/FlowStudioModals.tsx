import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { FlowCategory } from "@/types/crm-flow";
import { Plus, Upload, Trash2, Edit3, Sparkles, FileText, CheckCircle2 } from "lucide-react";

interface CreateFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    category: FlowCategory;
    categoryLabel: string;
    description: string;
    templateType: "blank" | "standard";
    tags: string[];
    erpTable: string;
  }) => void;
}

export function CreateFlowModal({ open, onOpenChange, onCreate }: CreateFlowModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FlowCategory>("crm");
  const [description, setDescription] = useState("");
  const [templateType, setTemplateType] = useState<"blank" | "standard">("standard");
  const [tagsInput, setTagsInput] = useState("Vendas, CRM");
  const [erpTable, setErpTable] = useState("SC5 - Pedidos de Venda");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const categoryMap: Record<FlowCategory, string> = {
      todos: "Geral",
      crm: "Comercial & CRM",
      governance: "Governança & Comissões",
      erp: "ERP TOTVS & Integrações",
      finance: "Financeiro & Crédito",
      cs: "Pós-Venda & CS",
      pcp: "Engenharia & PCP"
    };

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate({
      name: name.trim(),
      category,
      categoryLabel: categoryMap[category] || "Comercial & CRM",
      description: description.trim() || "Fluxo comercial operacional customizado.",
      templateType,
      tags,
      erpTable
    });

    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Criador de Fluxos
          </div>
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Desenhar Novo Fluxo de Processo
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Configure os dados do novo fluxo de automação para desenhar no canvas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Nome do Fluxo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Alçada de Desconto Especial ou Roteamento de Oportunidades"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Categoria do Processo
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FlowCategory)}
                className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
              >
                <option value="crm">Comercial & CRM</option>
                <option value="governance">Governança & Comissões</option>
                <option value="erp">ERP TOTVS & Integrações</option>
                <option value="finance">Financeiro & Crédito</option>
                <option value="cs">Pós-Venda & CS</option>
                <option value="pcp">Engenharia & PCP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Tabela Protheus Principal
              </label>
              <select
                value={erpTable}
                onChange={(e) => setErpTable(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
              >
                <option value="SA1 - Clientes">SA1 - Clientes</option>
                <option value="SC5 - Pedidos de Venda">SC5 - Pedidos de Venda</option>
                <option value="SC6 - Itens do Pedido">SC6 - Itens do Pedido</option>
                <option value="SE1 - Contas a Receber">SE1 - Contas a Receber</option>
                <option value="DA0 - Tabela de Preços">DA0 - Tabela de Preços</option>
                <option value="SA3 - Vendedores">SA3 - Vendedores</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Descrição Operacional
            </label>
            <textarea
              rows={2}
              placeholder="Descreva o objetivo e as regras centrais deste processo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Estrutura Inicial do Canvas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTemplateType("standard")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  templateType === "standard"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <span className="font-bold text-xs block">Estrutura Guiada</span>
                <span className="text-[10px] opacity-75">Gatilho + Decisão + Ações</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplateType("blank")}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  templateType === "blank"
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-neutral-50 dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <span className="font-bold text-xs block">Em Branco (Zero)</span>
                <span className="text-[10px] opacity-75">Apenas nó inicial de disparo</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tags (Separadas por vírgula)
            </label>
            <input
              type="text"
              placeholder="Ex: Comercial, Descontos, Aprovação"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs disabled:opacity-50"
            >
              Criar e Abrir no Canvas
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditFlowMetaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    name: string;
    category: FlowCategory;
    description: string;
    tags: string[];
    erpTables?: string[];
  };
  onSave: (data: {
    name: string;
    category: FlowCategory;
    categoryLabel: string;
    description: string;
    tags: string[];
    erpTables: string[];
  }) => void;
}

export function EditFlowMetaModal({ open, onOpenChange, initialData, onSave }: EditFlowMetaModalProps) {
  const [name, setName] = useState(initialData.name);
  const [category, setCategory] = useState<FlowCategory>(initialData.category || "crm");
  const [description, setDescription] = useState(initialData.description || "");
  const [tagsInput, setTagsInput] = useState(initialData.tags?.join(", ") || "");
  const [erpTable, setErpTable] = useState(initialData.erpTables?.[0] || "SC5 - Pedidos de Venda");

  // Sync with initialData when opened
  React.useEffect(() => {
    if (open) {
      setName(initialData.name);
      setCategory(initialData.category || "crm");
      setDescription(initialData.description || "");
      setTagsInput(initialData.tags?.join(", ") || "");
      setErpTable(initialData.erpTables?.[0] || "SC5 - Pedidos de Venda");
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const categoryMap: Record<FlowCategory, string> = {
      todos: "Geral",
      crm: "Comercial & CRM",
      governance: "Governança & Comissões",
      erp: "ERP TOTVS & Integrações",
      finance: "Financeiro & Crédito",
      cs: "Pós-Venda & CS",
      pcp: "Engenharia & PCP"
    };

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      name: name.trim(),
      category,
      categoryLabel: categoryMap[category] || "Comercial & CRM",
      description: description.trim(),
      tags,
      erpTables: erpTable ? [erpTable] : []
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Edit3 className="h-4 w-4" /> Configurações do Fluxo
          </div>
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Editar Metadados & Identificação
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Altere o título, categoria, descrição e tags do fluxo atual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Nome do Fluxo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FlowCategory)}
                className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
              >
                <option value="crm">Comercial & CRM</option>
                <option value="governance">Governança & Comissões</option>
                <option value="erp">ERP TOTVS & Integrações</option>
                <option value="finance">Financeiro & Crédito</option>
                <option value="cs">Pós-Venda & CS</option>
                <option value="pcp">Engenharia & PCP</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Tabela ERP Associada
              </label>
              <select
                value={erpTable}
                onChange={(e) => setErpTable(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
              >
                <option value="SA1 - Clientes">SA1 - Clientes</option>
                <option value="SC5 - Pedidos de Venda">SC5 - Pedidos de Venda</option>
                <option value="SC6 - Itens do Pedido">SC6 - Itens do Pedido</option>
                <option value="SE1 - Contas a Receber">SE1 - Contas a Receber</option>
                <option value="DA0 - Tabela de Preços">DA0 - Tabela de Preços</option>
                <option value="SA3 - Vendedores">SA3 - Vendedores</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Descrição Operacional
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Tags
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-primary"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs"
            >
              Salvar Metadados
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ImportFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (jsonString: string) => void;
}

export function ImportFlowModal({ open, onOpenChange, onImport }: ImportFlowModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (!jsonText.trim()) return;
    onImport(jsonText.trim());
    setJsonText("");
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Upload className="h-4 w-4" /> Importador de Diagramas
          </div>
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Importar Fluxo JSON
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            Carregue um arquivo .json exportado anteriormente ou cole a estrutura JSON do fluxo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {/* File Upload Box */}
          <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-primary/50 rounded-2xl p-4 text-center transition-colors">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
              id="flow-json-upload"
            />
            <label htmlFor="flow-json-upload" className="cursor-pointer flex flex-col items-center gap-1.5">
              <Upload className="h-6 w-6 text-primary" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {fileName ? fileName : "Clique para selecionar arquivo .json"}
              </span>
              <span className="text-[10px] text-neutral-400">
                Suporta esquemas exportados pelo Nexus Flow Studio
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px bg-neutral-200 dark:border-neutral-800 flex-1" />
            <span className="text-[10px] uppercase font-bold text-neutral-400">ou cole o código JSON</span>
            <div className="h-px bg-neutral-200 dark:border-neutral-800 flex-1" />
          </div>

          <textarea
            rows={6}
            placeholder='{ "meta": { "name": "..." }, "nodes": [...], "edges": [...] }'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full p-3 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono focus:outline-primary"
          />
        </div>

        <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!jsonText.trim()}
            className="px-4 py-2 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs disabled:opacity-50"
          >
            Importar para o Canvas
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFlowConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowName: string;
  isCustom: boolean;
  onConfirm: () => void;
}

export function DeleteFlowConfirmModal({ open, onOpenChange, flowName, isCustom, onConfirm }: DeleteFlowConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider">
            <Trash2 className="h-4 w-4" /> Excluir / Restaurar Fluxo
          </div>
          <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {isCustom ? "Excluir Fluxo Personalizado?" : "Restaurar Fluxo ao Padrão?"}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500">
            {isCustom
              ? `Tem certeza que deseja apagar o fluxo "${flowName}"? Esta ação removerá o diagrama e todos os nós do armazenamento local.`
              : `O fluxo "${flowName}" é um template corporativo. Ao confirmar, suas alterações e nós customizados serão restaurados ao estado original de fábrica.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-3 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isCustom ? "Sim, Excluir Fluxo" : "Restaurar Padrão"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
