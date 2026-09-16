import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, FileText, Download } from "lucide-react";
import {
  DocumentPrintLayout,
  DocumentPrintLayoutProps,
} from "./DocumentPrintLayout";
import { Quote, Order, Product } from "@/lib/mock-data";
import { QuoteDocumentData } from "@/types/document-template";
import { AppSettings } from "@/lib/settings-store";

export interface PrintDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  quote?: Quote | null;
  order?: Order | null;
  data?: QuoteDocumentData;
  settings?: AppSettings;
  products?: Product[];
  title?: string;
  defaultArchetype?: "moderno" | "classico" | "minimalista" | "executivo" | "tecnico";
}

export const PrintDocumentDialog: React.FC<PrintDocumentDialogProps> = ({
  isOpen,
  onClose,
  quote,
  order,
  data,
  settings,
  products = [],
  title,
  defaultArchetype = "moderno",
}) => {
  if (!isOpen) return null;

  const docTitle =
    title ||
    (order
      ? `Impressão do Pedido #${order.numero}`
      : quote
      ? `Impressão da Proposta #${quote.numero}`
      : data
      ? `Impressão do Documento #${data.numero}`
      : "Visualização e Impressão de Documento");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-screen h-screen max-w-none sm:rounded-none p-0 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Header da Janela Modal */}
        <div className="bg-white dark:bg-slate-900 px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shrink-0 shadow-xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                {docTitle}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Layout de alta fidelidade calibrado para folha A4 e exportação PDF
              </DialogDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Corpo do Documento com Scroll e Toolbar Integrada */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <DocumentPrintLayout
            quote={quote || undefined}
            order={order || undefined}
            data={data}
            settings={settings}
            products={products}
            archetype={defaultArchetype}
            showToolbar={true}
            className="my-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
