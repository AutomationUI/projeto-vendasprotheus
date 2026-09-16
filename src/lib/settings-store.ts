import { API_CONFIG } from "@/lib/api/config";
import { DocumentTemplatePreset } from "@/types/document-template";
import { DOCUMENT_PRESETS, DEFAULT_DOCUMENT_SECTIONS } from "@/lib/document-presets";

// ─── App-wide Settings Store (pub/sub, in-memory) ───

export interface AppSettings {
  /** When true, the "cliente" role is available and clients can request quotes directly. */
  permitirClienteOrcamento: boolean;
  /** Rules for sales process integrated with Flow Studio */
  regrasVenda: {
    descontoMaximoSemAprovacao: number;
    valorAprovacaoObrigatoria: number;
    bloquearVendaSemEstoque: boolean;
    // Flow Studio integration
    usarMotorFlowStudio: boolean;
    flowId: string;
    flowName?: string;
    alçadaGerenciaDesconto: number;
    alçadaDiretoriaDesconto: number;
    margemMinimaContribuicao: number;
    notificarWhatsAppAprovador?: boolean;
  };
  /** ERP Integration settings */
  erpConfig: {
    ativo: boolean;
    origemProdutos: "erp" | "proprio";
    urlBase: string;
    empresa: string;
    filial: string;
    token: string;
    sincronizacaoAutomatica: boolean;
  };
  /** Global settings for printing templates (A4/PDF) */
  templateConfig: {
    primaryColor: string;
    secondaryColor?: string;
    accentColor?: string;
    headerBgColor?: string;
    headerTextColor?: string;
    layout: "classico" | "moderno" | "minimalista" | "executivo" | "tecnico";
    fontFamily?: "sans" | "serif" | "mono";
    radius?: "none" | "sm" | "md" | "lg";
    density?: "compact" | "comfortable" | "spacious";
    logoText: string;
    logoImage: string;
    empresaRazaoSocial?: string;
    empresaNomeFantasia?: string;
    empresaCnpj: string;
    empresaInscricaoEstadual?: string;
    empresaTelefone: string;
    empresaEmail: string;
    empresaEndereco: string;
    empresaCidadeEstado?: string;
    empresaSite?: string;
    textoRodape: string;
    activePresetId?: string;
  };
  /** Configuration for standard forms and document display */
  documentConfig: {
    mostrarMargem: boolean;
    mostrarImpostos: boolean;
    mostrarDescontoItem: boolean;
    mostrarObservacoes: boolean;
    mostrarDadosBancarios: boolean;
    dadosBancarios: string;
    prazoEntregaPadrao: string;
    // Dynamic document builder sections
    sections?: typeof DEFAULT_DOCUMENT_SECTIONS;
    // Form fields toggle
    camposObrigatorios: string[]; // e.g. ["condicaoPagamento", "validade"]
  };
  /** Custom Saved Presets for Document Layouts */
  savedPresets?: DocumentTemplatePreset[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  permitirClienteOrcamento: false,
  regrasVenda: {
    descontoMaximoSemAprovacao: 8,
    valorAprovacaoObrigatoria: 50000,
    bloquearVendaSemEstoque: true,
    usarMotorFlowStudio: true,
    flowId: "discount-approval",
    flowName: "Aprovação de Descontos & Alçadas Comerciais",
    alçadaGerenciaDesconto: 8,
    alçadaDiretoriaDesconto: 15,
    margemMinimaContribuicao: 25,
    notificarWhatsAppAprovador: true,
  },
  erpConfig: {
    ativo: false,
    origemProdutos: "proprio",
    urlBase: "https://erp.empresa.com.br/api",
    empresa: "01",
    filial: "01",
    token: "",
    sincronizacaoAutomatica: true,
  },
  templateConfig: {
    primaryColor: "#0f172a",
    secondaryColor: "#334155",
    accentColor: "#0284c7",
    headerBgColor: "#0f172a",
    headerTextColor: "#ffffff",
    layout: "executivo",
    fontFamily: "sans",
    radius: "md",
    density: "comfortable",
    logoText: "VENDAS PROTHEUS ERP",
    logoImage: "",
    empresaRazaoSocial: "VendasProtheus Automação Comercial S/A",
    empresaNomeFantasia: "VendasProtheus ERP Solutions",
    empresaCnpj: "12.345.678/0001-90",
    empresaInscricaoEstadual: "110.234.567.890",
    empresaTelefone: "(11) 3456-8000",
    empresaEmail: "comercial@vendasprotheus.com.br",
    empresaEndereco: "Av. Paulista, 1000 - 14º Andar - Bela Vista",
    empresaCidadeEstado: "São Paulo - SP | CEP: 01310-100",
    empresaSite: "www.vendasprotheus.com.br",
    textoRodape: "Proposta gerada eletronicamente pelo Sistema de Gestão Comercial e ERP Protheus. Documento confidencial.",
    activePresetId: "preset-executivo",
  },
  documentConfig: {
    mostrarMargem: true,
    mostrarImpostos: true,
    mostrarDescontoItem: true,
    mostrarObservacoes: true,
    mostrarDadosBancarios: true,
    dadosBancarios: "Banco do Brasil (001)\nAgência: 1234-5 | C/C: 98765-4\nFavorecido: VendasProtheus S/A | Chave PIX: 12.345.678/0001-90",
    prazoEntregaPadrao: "10 a 15 dias úteis",
    sections: { ...DEFAULT_DOCUMENT_SECTIONS },
    camposObrigatorios: ["cliente", "vendedor", "condicaoPagamento"],
  },
  savedPresets: DOCUMENT_PRESETS,
};

const STORAGE_KEY = "vendasprotheus_settings";

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(stored);
    // Basic merge with defaults to ensure new fields are always present
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      regrasVenda: { ...DEFAULT_SETTINGS.regrasVenda, ...(parsed.regrasVenda || {}) },
      erpConfig: { ...DEFAULT_SETTINGS.erpConfig, ...(parsed.erpConfig || {}) },
      templateConfig: { ...DEFAULT_SETTINGS.templateConfig, ...(parsed.templateConfig || {}) },
      documentConfig: { 
        ...DEFAULT_SETTINGS.documentConfig, 
        ...(parsed.documentConfig || {}),
        sections: {
          ...DEFAULT_DOCUMENT_SECTIONS,
          ...(parsed.documentConfig?.sections || {})
        }
      },
      savedPresets: parsed.savedPresets && parsed.savedPresets.length > 0 
        ? parsed.savedPresets 
        : DOCUMENT_PRESETS,
    };
  } catch (e) {
    console.error("Error loading settings from localStorage", e);
    return DEFAULT_SETTINGS;
  }
}

let settings: AppSettings = loadSettings();
type Listener = () => void;
const listeners = new Set<Listener>();

export function getSettings(): AppSettings {
  return settings;
}

export function updateSettings(patch: {
  permitirClienteOrcamento?: boolean;
  regrasVenda?: Partial<AppSettings["regrasVenda"]>;
  erpConfig?: Partial<AppSettings["erpConfig"]>;
  templateConfig?: Partial<AppSettings["templateConfig"]>;
  documentConfig?: Partial<AppSettings["documentConfig"]>;
  savedPresets?: DocumentTemplatePreset[];
}) {
  settings = {
    ...settings,
    ...patch,
    regrasVenda: patch.regrasVenda 
      ? { ...settings.regrasVenda, ...patch.regrasVenda } 
      : settings.regrasVenda,
    erpConfig: patch.erpConfig 
      ? { ...settings.erpConfig, ...patch.erpConfig } 
      : settings.erpConfig,
    templateConfig: patch.templateConfig 
      ? { ...settings.templateConfig, ...patch.templateConfig } 
      : settings.templateConfig,
    documentConfig: patch.documentConfig 
      ? { 
          ...settings.documentConfig, 
          ...patch.documentConfig,
          sections: {
            ...DEFAULT_DOCUMENT_SECTIONS,
            ...(settings.documentConfig?.sections || {}),
            ...(patch.documentConfig?.sections || {})
          }
        } 
      : settings.documentConfig,
    savedPresets: patch.savedPresets || settings.savedPresets || DOCUMENT_PRESETS,
  } as AppSettings;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  listeners.forEach((fn) => fn());
}

export function subscribeSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Returns true if product catalog is being consumed via Protheus / ERP API.
 * When true, product creation, editing and deletion in the portal must be disabled/locked,
 * because ERP is the single source of truth for products and pricing.
 */
export function isERPProductSyncActive(currentSettings?: AppSettings): boolean {
  const s = currentSettings || settings;
  if (!API_CONFIG.useMock) return true;
  return Boolean(s.erpConfig?.ativo && s.erpConfig?.origemProdutos === "erp");
}

