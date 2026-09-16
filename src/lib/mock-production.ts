// Mock data for Abrasive Manufacturing Production

export type ProductionStatus =
  | "Mistura"
  | "Moldagem"
  | "Prensado"
  | "Secagem"
  | "Aguardando Queima"
  | "Em Queima"
  | "Queimado"
  | "Acabamento"
  | "Inspeção"
  | "Expedição";

export const productionStatuses: { status: ProductionStatus; color: string; description: string }[] = [
  { status: "Mistura", color: "bg-amber-500", description: "Preparação de grãos abrasivos e ligantes" },
  { status: "Moldagem", color: "bg-orange-500", description: "Conformação do produto no molde" },
  { status: "Prensado", color: "bg-yellow-600", description: "Compactação sob alta pressão" },
  { status: "Secagem", color: "bg-sky-400", description: "Remoção de umidade residual" },
  { status: "Aguardando Queima", color: "bg-slate-400", description: "Fila para entrada no forno" },
  { status: "Em Queima", color: "bg-red-500", description: "Sinterização no forno" },
  { status: "Queimado", color: "bg-rose-700", description: "Saída do forno, resfriamento" },
  { status: "Acabamento", color: "bg-violet-500", description: "Retífica e balanceamento" },
  { status: "Inspeção", color: "bg-blue-500", description: "Controle de qualidade e testes" },
  { status: "Expedição", color: "bg-emerald-500", description: "Embalagem e despacho" },
];

export interface ProductionBatch {
  id: string;
  lote: string;
  produto: string;
  tipo: string;
  granulacao: string;
  quantidade: number;
  unidade: string;
  status: ProductionStatus;
  inicio: string;
  previsao: string;
  operador: string;
  prioridade: "Alta" | "Média" | "Baixa";
  observacoes?: string;
}

export const productionBatches: ProductionBatch[] = [
  { id: "1", lote: "LOT-2026-0101", produto: "Rebolo Reto 300x50x127", tipo: "Rebolo", granulacao: "A46", quantidade: 120, unidade: "PÇ", status: "Mistura", inicio: "2026-02-25", previsao: "2026-03-02", operador: "José Ferreira", prioridade: "Alta" },
  { id: "2", lote: "LOT-2026-0102", produto: "Disco de Corte 12\"", tipo: "Disco de Corte", granulacao: "A30", quantidade: 500, unidade: "PÇ", status: "Prensado", inicio: "2026-02-23", previsao: "2026-02-28", operador: "Marcos Lima", prioridade: "Alta" },
  { id: "3", lote: "LOT-2026-0103", produto: "Rebolo Copo 150x65x32", tipo: "Rebolo", granulacao: "A60", quantidade: 80, unidade: "PÇ", status: "Aguardando Queima", inicio: "2026-02-22", previsao: "2026-02-27", operador: "Carlos Souza", prioridade: "Média" },
  { id: "4", lote: "LOT-2026-0104", produto: "Disco de Desbaste 7\"", tipo: "Disco de Desbaste", granulacao: "A24", quantidade: 1000, unidade: "PÇ", status: "Em Queima", inicio: "2026-02-21", previsao: "2026-02-26", operador: "Rafael Alves", prioridade: "Alta" },
  { id: "5", lote: "LOT-2026-0105", produto: "Rebolo Reto 200x25x76", tipo: "Rebolo", granulacao: "A80", quantidade: 200, unidade: "PÇ", status: "Queimado", inicio: "2026-02-20", previsao: "2026-02-25", operador: "José Ferreira", prioridade: "Média" },
  { id: "6", lote: "LOT-2026-0106", produto: "Disco Flap 4.5\"", tipo: "Disco Flap", granulacao: "A40", quantidade: 2000, unidade: "PÇ", status: "Secagem", inicio: "2026-02-24", previsao: "2026-03-01", operador: "Marcos Lima", prioridade: "Baixa" },
  { id: "7", lote: "LOT-2026-0107", produto: "Rebolo Copo 100x50x20", tipo: "Rebolo", granulacao: "A36", quantidade: 150, unidade: "PÇ", status: "Moldagem", inicio: "2026-02-25", previsao: "2026-03-03", operador: "Carlos Souza", prioridade: "Média" },
  { id: "8", lote: "LOT-2026-0108", produto: "Disco de Corte 14\"", tipo: "Disco de Corte", granulacao: "A24", quantidade: 300, unidade: "PÇ", status: "Inspeção", inicio: "2026-02-18", previsao: "2026-02-24", operador: "Rafael Alves", prioridade: "Alta" },
  { id: "9", lote: "LOT-2026-0109", produto: "Rebolo Reto 250x32x76", tipo: "Rebolo", granulacao: "A100", quantidade: 60, unidade: "PÇ", status: "Acabamento", inicio: "2026-02-19", previsao: "2026-02-25", operador: "José Ferreira", prioridade: "Baixa" },
  { id: "10", lote: "LOT-2026-0110", produto: "Disco de Desbaste 9\"", tipo: "Disco de Desbaste", granulacao: "A16", quantidade: 800, unidade: "PÇ", status: "Expedição", inicio: "2026-02-17", previsao: "2026-02-23", operador: "Marcos Lima", prioridade: "Alta" },
  { id: "11", lote: "LOT-2026-0111", produto: "Rebolo Segmentado 400", tipo: "Rebolo", granulacao: "A46", quantidade: 40, unidade: "PÇ", status: "Mistura", inicio: "2026-02-25", previsao: "2026-03-05", operador: "Carlos Souza", prioridade: "Média" },
  { id: "12", lote: "LOT-2026-0112", produto: "Disco Flap 7\"", tipo: "Disco Flap", granulacao: "A60", quantidade: 1500, unidade: "PÇ", status: "Prensado", inicio: "2026-02-24", previsao: "2026-03-01", operador: "Rafael Alves", prioridade: "Baixa" },
];

export const initialProductionBatches = productionBatches;
