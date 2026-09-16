/**
 * Utility functions for reliable PDF & Document printing across modals, iframes, and mobile devices.
 */

export interface PrintOptions {
  title?: string;
  paperSize?: "a4" | "letter" | "legal" | "a5";
  orientation?: "portrait" | "landscape";
  marginMm?: number;
}

export function printElement(
  elementOrSelector: HTMLElement | string | null,
  optionsOrTitle: PrintOptions | string = "Documento"
): void {
  let targetEl: HTMLElement | null = null;
  const options: PrintOptions = typeof optionsOrTitle === "string" 
    ? { title: optionsOrTitle } 
    : optionsOrTitle;

  const title = options.title || "Documento";
  const paperSize = options.paperSize || "a4";
  const orientation = options.orientation || "portrait";
  const marginMm = options.marginMm ?? 12;

  let pageCssSize = "A4 portrait";
  if (paperSize === "a4") pageCssSize = `A4 ${orientation}`;
  else if (paperSize === "letter") pageCssSize = `letter ${orientation}`;
  else if (paperSize === "legal") pageCssSize = `legal ${orientation}`;
  else if (paperSize === "a5") pageCssSize = `A5 ${orientation}`;

  if (typeof elementOrSelector === "string") {
    const raw = elementOrSelector.trim();
    const cleanId = raw.replace(/^#/, "");
    targetEl =
      document.getElementById(cleanId) ||
      document.querySelector(`#${cleanId}`) ||
      document.querySelector(`.${cleanId}`) ||
      document.querySelector(raw) ||
      document.querySelector(".printable-area") ||
      document.querySelector("[id^='printable-']");
  } else if (elementOrSelector) {
    targetEl = elementOrSelector;
  }

  // Fallback if target element is not found
  if (!targetEl) {
    window.print();
    return;
  }

  // Open a clean print popup window (100% reliable across all browsers and iframe contexts)
  const printWindow = window.open("", "_blank", "width=900,height=750,scrollbars=yes");
  if (!printWindow) {
    window.print();
    return;
  }

  const headStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((style) => style.outerHTML)
    .join("\n");

  const clonedHtml = targetEl.outerHTML;

  const htmlDocument = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        ${headStyles}
        <style>
          @page {
            size: ${pageCssSize};
            margin: ${marginMm}mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 16px !important;
            width: 100% !important;
            height: auto !important;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          .print-wrapper {
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
          .print\\:hidden, button, .no-print, [role="button"] {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${clonedHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlDocument);
  printWindow.document.close();
}

/**
 * Direct print trigger fallback for general windows
 */
export function triggerDirectPrint(): void {
  try {
    window.print();
  } catch (err) {
    console.warn("Direct print failed:", err);
  }
}
