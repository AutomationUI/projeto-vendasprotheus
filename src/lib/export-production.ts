import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProductionBatch } from "@/hooks/use-production-websocket";
import { getSettings } from "@/lib/settings-store";

const HEADERS = [
  "Lote",
  "Produto",
  "Tipo",
  "Granulação",
  "Quantidade",
  "Unidade",
  "Status",
  "Operador",
  "Início",
  "Previsão",
  "Prioridade",
];

function toRow(b: ProductionBatch) {
  return [
    b.lote,
    b.produto,
    b.tipo,
    b.granulacao,
    b.quantidade,
    b.unidade,
    b.status,
    b.operador,
    new Date(b.inicio).toLocaleDateString("pt-BR"),
    new Date(b.previsao).toLocaleDateString("pt-BR"),
    b.prioridade,
  ];
}

export function exportToExcel(batches: ProductionBatch[], filename = "producao") {
  const settings = getSettings();
  const { templateConfig: tc } = settings;

  const headerRows = [
    [tc.logoText || "EMPRESA"],
    [`CNPJ: ${tc.empresaCnpj} | Tel: ${tc.empresaTelefone} | E-mail: ${tc.empresaEmail}`],
    [tc.empresaEndereco || ""],
    [""],
    ["RELATÓRIO DE PRODUÇÃO E LOTES"],
    [`Gerado em ${new Date().toLocaleString("pt-BR")} • Total de Lotes: ${batches.length}`],
    [""],
    HEADERS,
  ];

  const data = [...headerRows, ...batches.map(toRow)];
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws["!cols"] = HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produção");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(batches: ProductionBatch[], filename = "producao") {
  const settings = getSettings();
  const { templateConfig: tc } = settings;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16) || 15,
      parseInt(h.substring(2, 4), 16) || 23,
      parseInt(h.substring(4, 6), 16) || 42,
    ];
  };
  const primary = hexToRgb(tc.primaryColor || "#0f172a");

  // ─── Header bar ──────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(tc.logoText || "EMPRESA", margin, 10);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const companyInfo = [tc.empresaCnpj, tc.empresaTelefone, tc.empresaEmail]
    .filter(Boolean)
    .join("  •  ");
  doc.text(companyInfo, margin, 16);
  if (tc.empresaEndereco) {
    doc.text(tc.empresaEndereco, margin, 21);
  }

  // ─── Title & Subtitle ────────────────────────────────
  let y = 33;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("RELATÓRIO DE PRODUÇÃO E LOTES", margin, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}  •  ${batches.length} lotes`, pageW - margin, y, { align: "right" });
  y += 4;

  autoTable(doc, {
    startY: y + 2,
    head: [HEADERS],
    body: batches.map(toRow),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      4: { halign: "right" },
    },
    margin: { left: margin, right: margin, bottom: 20 },
    didDrawPage: (data) => {
      // ─── Footer on every page ────────────────────────
      const footerY = pageH - 12;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const footerText = tc.textoRodape || "";
      if (footerText) {
        doc.text(footerText, pageW / 2, footerY, { align: "center", maxWidth: pageW - margin * 2 });
      }

      doc.setFontSize(6);
      doc.text(
        `Página ${data.pageNumber} • ${tc.logoText || "VendasProtheus"}`,
        pageW - margin,
        pageH - 6,
        { align: "right" }
      );
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")}`,
        margin,
        pageH - 6
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

