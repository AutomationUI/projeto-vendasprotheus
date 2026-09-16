import { DocumentBlock } from "@/types/document-template";
import { SnapGuide } from "./SnappingGuidesOverlay";

export interface ColumnSnapTarget {
  percent: number;
  label: string;
  sublabel: string;
  isCenter?: boolean;
}

export const STANDARD_COLUMN_SNAPS: ColumnSnapTarget[] = [
  { percent: 20, label: "20%", sublabel: "Coluna 1/5" },
  { percent: 25, label: "25%", sublabel: "Coluna 1/4" },
  { percent: 33.333, label: "33.3%", sublabel: "Coluna 1/3" },
  { percent: 40, label: "40%", sublabel: "Coluna 2/5" },
  { percent: 50, label: "50%", sublabel: "Centro do Documento (1/2)", isCenter: true },
  { percent: 60, label: "60%", sublabel: "Coluna 3/5" },
  { percent: 66.666, label: "66.7%", sublabel: "Coluna 2/3" },
  { percent: 75, label: "75%", sublabel: "Coluna 3/4" },
  { percent: 80, label: "80%", sublabel: "Coluna 4/5" },
  { percent: 100, label: "100%", sublabel: "Largura Total" },
];

export const STANDARD_HEIGHT_STEPS = [60, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400, 500];

/**
 * Calcula o encaixe magnético (snapping) para largura percentual
 */
export function calculateWidthSnapping({
  rawPercent,
  currentBlockId,
  blocks,
  thresholdPercent = 2.4,
}: {
  rawPercent: number;
  currentBlockId: string;
  blocks: DocumentBlock[];
  thresholdPercent?: number;
}): {
  snappedPercent: number;
  isSnapped: boolean;
  guides: SnapGuide[];
  snapLabel?: string;
} {
  // Coletar alvos padrão de coluna
  const targets: ColumnSnapTarget[] = [...STANDARD_COLUMN_SNAPS];

  // Adicionar larguras dos blocos irmãos para alinhamento contextual
  blocks.forEach((otherBlock) => {
    if (otherBlock.id === currentBlockId) return;

    const otherPercent = otherBlock.style?.customWidthPercent || 
      (otherBlock.style?.width === "1/2" ? 50 :
       otherBlock.style?.width === "1/3" ? 33.333 :
       otherBlock.style?.width === "2/3" ? 66.666 :
       otherBlock.style?.width === "1/4" ? 25 :
       otherBlock.style?.width === "3/4" ? 75 :
       otherBlock.style?.width === "1/5" ? 20 :
       otherBlock.style?.width === "2/5" ? 40 :
       otherBlock.style?.width === "3/5" ? 60 :
       otherBlock.style?.width === "4/5" ? 80 : 100);

    const blockTitle = otherBlock.title || otherBlock.type;

    // 1. Alinhamento de largura idêntica com o irmão
    if (!targets.some(t => Math.abs(t.percent - otherPercent) < 0.5)) {
      targets.push({
        percent: otherPercent,
        label: `${Math.round(otherPercent)}%`,
        sublabel: `Igual a "${blockTitle}"`,
      });
    }

    // 2. Complemento de linha (ex: 100% - 35% = 65% para caberem juntos na mesma linha)
    const complementPercent = Math.round((100 - otherPercent) * 10) / 10;
    if (complementPercent >= 15 && complementPercent <= 85) {
      if (!targets.some(t => Math.abs(t.percent - complementPercent) < 0.5)) {
        targets.push({
          percent: complementPercent,
          label: `${Math.round(complementPercent)}%`,
          sublabel: `Complemento de linha com "${blockTitle}"`,
        });
      }
    }
  });

  // Encontrar o alvo mais próximo dentro do limiar de snapping
  let closestTarget: ColumnSnapTarget | null = null;
  let minDiff = Infinity;

  for (const target of targets) {
    const diff = Math.abs(rawPercent - target.percent);
    if (diff <= thresholdPercent && diff < minDiff) {
      minDiff = diff;
      closestTarget = target;
    }
  }

  if (closestTarget) {
    return {
      snappedPercent: closestTarget.percent,
      isSnapped: true,
      guides: [
        {
          id: `snap-width-${closestTarget.percent}`,
          type: "vertical",
          positionPercent: closestTarget.percent,
          label: closestTarget.label,
          sublabel: closestTarget.sublabel,
          isCenter: closestTarget.isCenter,
        }
      ],
      snapLabel: `${closestTarget.label} (${closestTarget.sublabel})`,
    };
  }

  return {
    snappedPercent: rawPercent,
    isSnapped: false,
    guides: [],
  };
}

/**
 * Calcula o encaixe magnético (snapping) para altura do bloco
 */
export function calculateHeightSnapping({
  rawHeightPx,
  currentBlockId,
  blocks,
  thresholdPx = 10,
}: {
  rawHeightPx: number;
  currentBlockId: string;
  blocks: DocumentBlock[];
  thresholdPx?: number;
}): {
  snappedHeightPx: number;
  isSnapped: boolean;
  guides: SnapGuide[];
  snapLabel?: string;
} {
  interface HeightTarget {
    heightPx: number;
    label: string;
    sublabel: string;
  }

  const targets: HeightTarget[] = [];

  // 1. Alvos com base em outros blocos no DOM ou configurados
  blocks.forEach((otherBlock) => {
    if (otherBlock.id === currentBlockId) return;

    let targetHeight = otherBlock.style?.minHeight;
    if (!targetHeight) {
      const el = document.getElementById(`canvas-block-${otherBlock.id}`);
      if (el) {
        targetHeight = Math.round(el.getBoundingClientRect().height);
      }
    }

    if (targetHeight && targetHeight > 40) {
      const blockTitle = otherBlock.title || otherBlock.type;
      if (!targets.some(t => Math.abs(t.heightPx - targetHeight) < 4)) {
        targets.push({
          heightPx: targetHeight,
          label: `${targetHeight}px`,
          sublabel: `Alinhado com "${blockTitle}"`,
        });
      }
    }
  });

  // 2. Degraus padrão confortáveis
  STANDARD_HEIGHT_STEPS.forEach((step) => {
    if (!targets.some(t => Math.abs(t.heightPx - step) < 4)) {
      targets.push({
        heightPx: step,
        label: `${step}px`,
        sublabel: "Padrão de Grade",
      });
    }
  });

  let closestTarget: HeightTarget | null = null;
  let minDiff = Infinity;

  for (const target of targets) {
    const diff = Math.abs(rawHeightPx - target.heightPx);
    if (diff <= thresholdPx && diff < minDiff) {
      minDiff = diff;
      closestTarget = target;
    }
  }

  if (closestTarget) {
    // Obter posição visual absoluta do topo do bloco atual para traçar a linha horizontal
    const currentEl = document.getElementById(`canvas-block-${currentBlockId}`);
    let guideTopPx = closestTarget.heightPx;
    if (currentEl) {
      const parent = currentEl.parentElement;
      if (parent) {
        const blockRect = currentEl.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        guideTopPx = (blockRect.top - parentRect.top) + closestTarget.heightPx;
      }
    }

    return {
      snappedHeightPx: closestTarget.heightPx,
      isSnapped: true,
      guides: [
        {
          id: `snap-height-${closestTarget.heightPx}`,
          type: "horizontal",
          positionPx: guideTopPx,
          label: closestTarget.label,
          sublabel: closestTarget.sublabel,
        }
      ],
      snapLabel: `${closestTarget.label} (${closestTarget.sublabel})`,
    };
  }

  return {
    snappedHeightPx: rawHeightPx,
    isSnapped: false,
    guides: [],
  };
}
