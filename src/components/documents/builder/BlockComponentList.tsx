import React from "react";
import { 
  Type, 
  Heading, 
  Image as ImageIcon, 
  MousePointerClick, 
  CreditCard, 
  Building2, 
  QrCode, 
  ShieldCheck, 
  FileText, 
  Table, 
  Calculator, 
  Minus, 
  MoveVertical, 
  Code, 
  Footprints, 
  Plus, 
  GripVertical,
  LayoutTemplate,
  Users
} from "lucide-react";
import { DocumentBlockType } from "@/types/document-template";

interface ComponentDefinition {
  type: DocumentBlockType;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "conteudo" | "comercial" | "financeiro" | "layout";
}

const AVAILABLE_COMPONENTS: ComponentDefinition[] = [
  // Conteúdo & Tipografia
  { type: "heading", name: "Título / Cabeçalho", description: "Título com suporte a tags {{...}}", icon: Heading, category: "conteudo" },
  { type: "text", name: "Parágrafo / Texto", description: "Texto livre com formatação", icon: Type, category: "conteudo" },
  { type: "variables_grid", name: "Variáveis Lado a Lado (Grid)", description: "Múltiplos campos com variáveis dispostos em 2, 3 ou 4 colunas", icon: LayoutTemplate, category: "conteudo" },
  { type: "variables_inline", name: "Variáveis na Mesma Linha", description: "Sequência horizontal de variáveis sem molduras", icon: Type, category: "conteudo" },
  { type: "card", name: "Card em Destaque", description: "Caixa de destaque com fundo e bordas", icon: LayoutTemplate, category: "conteudo" },
  { type: "image", name: "Imagem / Banner", description: "Banner visual ou foto promocional", icon: ImageIcon, category: "conteudo" },
  { type: "button", name: "Botão Call-to-Action", description: "Botão com link de aprovação", icon: MousePointerClick, category: "conteudo" },
  { type: "custom_html", name: "Código HTML", description: "Bloco HTML personalizado", icon: Code, category: "conteudo" },

  // Comercial & Cliente
  { type: "header", name: "Cabeçalho Principal", description: "Logo, empresa e número da proposta", icon: Building2, category: "comercial" },
  { type: "client_info", name: "Dados do Cliente", description: "CNPJ, endereço e consultor", icon: Users, category: "comercial" },
  { type: "products_table", name: "Tabela de Produtos", description: "Itens, quantidades, fotos e totais", icon: Table, category: "comercial" },
  { type: "products_grid", name: "Grade de Produtos (Vitrine)", description: "Vitrine visual de produtos com cards", icon: LayoutTemplate, category: "comercial" },
  { type: "commercial_terms", name: "Garantia & Prazos", description: "Termos de garantia e entrega", icon: ShieldCheck, category: "comercial" },
  { type: "notes", name: "Observações da Proposta", description: "Instruções e anotações gerais", icon: FileText, category: "comercial" },

  // Financeiro & Fechamento
  { type: "totals_summary", name: "Resumo & Totais", description: "Subtotal, descontos, frete e total", icon: Calculator, category: "financeiro" },
  { type: "pix_payment", name: "QR Code PIX", description: "Pagamento instantâneo com QR code", icon: QrCode, category: "financeiro" },
  { type: "bank_details", name: "Dados Bancários", description: "Conta corrente para TED/Depósito", icon: CreditCard, category: "financeiro" },
  { type: "signatures", name: "Assinaturas & Aceite", description: "Linhas de assinatura e termo", icon: FileText, category: "financeiro" },
  { type: "digital_stamp", name: "Selo Digital SHA-256", description: "Autenticação e integridade", icon: ShieldCheck, category: "financeiro" },

  // Estrutura & Layout
  { type: "divider", name: "Linha Divisória", description: "Separador horizontal sólido ou tracejado", icon: Minus, category: "layout" },
  { type: "spacer", name: "Espaçador", description: "Espaço em branco regulável", icon: MoveVertical, category: "layout" },
  { type: "footer", name: "Rodapé Institucional", description: "Numeração e contatos da empresa", icon: Footprints, category: "layout" },
];

interface BlockComponentListProps {
  onAddBlock: (type: DocumentBlockType) => void;
}

export function BlockComponentList({ onAddBlock }: BlockComponentListProps) {
  const categories = [
    { id: "comercial", label: "Comercial & Proposta" },
    { id: "financeiro", label: "Financeiro & Fechamento" },
    { id: "conteudo", label: "Conteúdo & Elementos" },
    { id: "layout", label: "Estrutura & Layout" },
  ];

  const handleDragStart = (e: React.DragEvent, type: DocumentBlockType) => {
    e.dataTransfer.setData("application/document-block-type", type);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="space-y-5">
      <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-300">
        <p className="font-semibold flex items-center gap-1.5 mb-1">
          <GripVertical className="w-3.5 h-3.5 text-indigo-600" />
          Como utilizar o Construtor:
        </p>
        <p className="opacity-90">
          <strong>Arraste</strong> os blocos para o documento ao lado ou clique no botão <strong>+</strong> para inseri-los no final do layout.
        </p>
      </div>

      {categories.map((cat) => {
        const items = AVAILABLE_COMPONENTS.filter((c) => c.category === cat.id);
        return (
          <div key={cat.id} className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {cat.label}
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onClick={() => onAddBlock(item.type)}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-grab active:cursor-grabbing transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddBlock(item.type);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 shrink-0"
                      title="Inserir bloco"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
