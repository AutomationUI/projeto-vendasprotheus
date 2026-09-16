export type PaperSizeFormat = "a4" | "letter" | "legal" | "a5";
export type PaperOrientation = "portrait" | "landscape";

export interface PaperSizeConfig {
  id: PaperSizeFormat;
  name: string;
  dimensionsMm: string;
  marketShare: string;
  description: string;
  widthMm: number;
  heightMm: number;
}

export const PAPER_SIZES_CONFIG: Record<PaperSizeFormat, PaperSizeConfig> = {
  a4: {
    id: "a4",
    name: "A4 (210 × 297 mm)",
    dimensionsMm: "210 × 297 mm",
    marketShare: "95% do Mercado BR & Global",
    description: "Padrão absoluto ISO 216 no Brasil, América Latina e Europa. Utilizado em 95%+ dos orçamentos, contratos e propostas corporativas.",
    widthMm: 210,
    heightMm: 297,
  },
  letter: {
    id: "letter",
    name: "Carta / US Letter (216 × 279 mm)",
    dimensionsMm: "215.9 × 279.4 mm",
    marketShare: "Padrão EUA e América do Norte",
    description: "Padrão ANSI/ASME nos Estados Unidos, Canadá e México. Ideal para propostas enviadas a clientes multinacionais norte-americanos.",
    widthMm: 215.9,
    heightMm: 279.4,
  },
  legal: {
    id: "legal",
    name: "Ofício / US Legal (216 × 356 mm)",
    dimensionsMm: "215.9 × 355.6 mm",
    marketShare: "Contratos e Documentos Jurídicos",
    description: "Formato longo expandido. Muito utilizado no mercado financeiro, escritórios de advocacia, contratos com extensas cláusulas e tabelas extensas.",
    widthMm: 215.9,
    heightMm: 355.6,
  },
  a5: {
    id: "a5",
    name: "A5 (148 × 210 mm)",
    dimensionsMm: "148 × 210 mm",
    marketShare: "Comprovantes & Ordens de Serviço",
    description: "Formato compacto (metade do A4). Excelente para talões de pedidos rápidos, ordens de serviço de campo, comprovantes de entrega e recibos.",
    widthMm: 148,
    heightMm: 210,
  },
};

/**
 * Calcula dimensões CSS precisas considerando orientação e margem
 */
export function getPaperStyleDimensions(
  format: PaperSizeFormat = "a4",
  orientation: PaperOrientation = "portrait"
) {
  const config = PAPER_SIZES_CONFIG[format] || PAPER_SIZES_CONFIG.a4;
  const isLandscape = orientation === "landscape";

  const width = isLandscape ? `${config.heightMm}mm` : `${config.widthMm}mm`;
  const minHeight = isLandscape ? `${config.widthMm}mm` : `${config.heightMm}mm`;

  return {
    width,
    minHeight,
    config,
  };
}
