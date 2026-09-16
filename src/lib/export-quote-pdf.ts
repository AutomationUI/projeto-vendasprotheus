import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Quote, Customer } from "@/lib/mock-data";
import { getSettings } from "@/lib/settings-store";

/**
 * Generate a branded PDF for a quote and return both a base64 string and a Blob.
 */
export function generateQuotePDF(
  quote: Quote,
  customer?: Customer
): { pdfBase64: string; blob: Blob } {
  const settings = getSettings();
  const { templateConfig: tc, documentConfig: dc } = settings;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  // ─── Helper: parse hex colour to RGB tuple ───────────
  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  };
  const primary = hexToRgb(tc.primaryColor || "#0f172a");

  // ─── Header bar ──────────────────────────────────────
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(tc.logoText || "EMPRESA", margin, 12);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const companyInfo = [tc.empresaCnpj, tc.empresaTelefone, tc.empresaEmail]
    .filter(Boolean)
    .join("  •  ");
  doc.text(companyInfo, margin, 19);
  if (tc.empresaEndereco) {
    doc.text(tc.empresaEndereco, margin, 24);
  }

  y = 36;

  // ─── Title ───────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("PROPOSTA COMERCIAL", margin, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Nº ${quote.numero}`, pageW - margin, y, { align: "right" });
  y += 10;

  // ─── Quote info ──────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const infoLeft = [
    `Data: ${formatDate(quote.data)}`,
    `Validade: ${formatDate(quote.validade)}`,
    `Cond. Pagamento: ${quote.condicaoPagamento}`,
  ];
  const infoRight = [
    `Vendedor: ${quote.vendedor}`,
    `Status: ${quote.status}`,
  ];

  infoLeft.forEach((line, i) => {
    doc.text(line, margin, y + i * 5);
  });
  infoRight.forEach((line, i) => {
    doc.text(line, pageW / 2 + 10, y + i * 5);
  });
  y += infoLeft.length * 5 + 6;

  // ─── Client section ──────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y - 3, pageW - margin * 2, customer ? 22 : 12, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primary);
  doc.text("CLIENTE", margin + 3, y + 2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  doc.text(quote.cliente, margin + 30, y + 2);

  if (customer) {
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`CNPJ: ${customer.cnpj}`, margin + 3, y + 8);
    doc.text(`${customer.endereco} – ${customer.cidade}/${customer.uf}`, margin + 3, y + 13);
    doc.text(`Email: ${customer.email}  •  Tel: ${customer.telefone}`, margin + 3, y + 18);
    y += 26;
  } else {
    y += 16;
  }

  // ─── Items table ─────────────────────────────────────
  y += 4;

  const headers = ["Código", "Produto", "Qtd", "Preço Unit."];
  if (dc.mostrarDescontoItem) headers.push("Desc. %");
  headers.push("Total");

  const rows = quote.itens.map((item) => {
    const row: (string | number)[] = [
      item.codigo,
      item.produto,
      item.quantidade,
      formatCurrency(item.precoUnitario),
    ];
    if (dc.mostrarDescontoItem) row.push(`${item.desconto}%`);
    row.push(formatCurrency(item.total));
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "right" },
      [headers.length - 1]: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable?.finalY ?? y + 40;
  y += 6;

  // ─── Totals ──────────────────────────────────────────
  const totalX = pageW - margin - 60;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const subtotal = quote.itens.reduce((sum, i) => sum + i.precoUnitario * i.quantidade, 0);
  const totalDiscount = subtotal - quote.valor;

  doc.text("Subtotal:", totalX, y);
  doc.text(formatCurrency(subtotal), pageW - margin, y, { align: "right" });
  y += 5;

  if (totalDiscount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text("Desconto:", totalX, y);
    doc.text(`-${formatCurrency(totalDiscount)}`, pageW - margin, y, { align: "right" });
    y += 5;
  }

  doc.setTextColor(...primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalX, y);
  doc.text(formatCurrency(quote.valor), pageW - margin, y, { align: "right" });
  y += 10;

  // ─── Observations ────────────────────────────────────
  if (dc.mostrarObservacoes && quote.observacoes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Observações:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(quote.observacoes, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 6;
  }

  // ─── Bank data ───────────────────────────────────────
  if (dc.mostrarDadosBancarios && dc.dadosBancarios) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text("Dados Bancários:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const bankLines = dc.dadosBancarios.split("\n");
    bankLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 4;
    });
    y += 4;
  }

  // ─── Footer ──────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 16;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY - 4, pageW - margin, footerY - 4);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const footer = tc.textoRodape || "";
  const footerLines = doc.splitTextToSize(footer, pageW - margin * 2);
  doc.text(footerLines, pageW / 2, footerY, { align: "center" });

  doc.setFontSize(6);
  doc.text(
    `Gerado em ${new Date().toLocaleString("pt-BR")} • ${tc.logoText || "VendasProtheus"}`,
    pageW / 2,
    doc.internal.pageSize.getHeight() - 6,
    { align: "center" }
  );

  // ─── Output ──────────────────────────────────────────
  const pdfBase64 = doc.output("datauristring").split(",")[1];
  const blob = doc.output("blob");

  return { pdfBase64, blob };
}

// ─── Formatters ────────────────────────────────────────
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
