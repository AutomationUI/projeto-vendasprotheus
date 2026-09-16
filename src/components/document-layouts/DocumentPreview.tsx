import React from "react";
import { DocumentLayoutClassic } from "./DocumentLayoutClassic";
import { DocumentLayoutModern } from "./DocumentLayoutModern";
import { DocumentLayoutMinimal } from "./DocumentLayoutMinimal";

interface Props {
  layout: "classic" | "modern" | "minimal";
}

export function DocumentPreview({ layout }: Props) {
  const sampleContent = (
    <div>
      <h2 className="text-lg font-bold mb-2">Resumo do Documento</h2>
      <ul className="list-disc pl-5 text-sm mb-4">
        <li>Cliente: Tech Solutions Ltda</li>
        <li>Data: 14/03/2026</li>
        <li>Status: <span className="text-green-600 font-semibold">Aprovado</span></li>
      </ul>
      <table className="w-full text-xs border-collapse mb-2">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="p-2 border">Produto</th>
            <th className="p-2 border">Qtd</th>
            <th className="p-2 border">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 border">Notebook Pro 15</td>
            <td className="p-2 border">2</td>
            <td className="p-2 border">R$ 8.000,00</td>
          </tr>
          <tr>
            <td className="p-2 border">Mouse Wireless</td>
            <td className="p-2 border">5</td>
            <td className="p-2 border">R$ 500,00</td>
          </tr>
        </tbody>
      </table>
      <div className="text-right font-bold">Total: R$ 8.500,00</div>
    </div>
  );

  if (layout === "classic") return <DocumentLayoutClassic>{sampleContent}</DocumentLayoutClassic>;
  if (layout === "modern") return <DocumentLayoutModern>{sampleContent}</DocumentLayoutModern>;
  return <DocumentLayoutMinimal>{sampleContent}</DocumentLayoutMinimal>;
}
