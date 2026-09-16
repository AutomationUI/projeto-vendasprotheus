import React from "react";

interface Props {
  value: "classic" | "modern" | "minimal";
  onChange: (layout: "classic" | "modern" | "minimal") => void;
}

export function DocumentLayoutSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-4 items-center">
      <label className="font-medium">Layout Padrão do Documento</label>
      <div className="flex gap-2 mt-2">
        <button
          className={`px-6 py-3 rounded-lg border ${value === "classic" ? "bg-gray-200 dark:bg-gray-700 font-bold" : "bg-transparent"}`}
          onClick={() => onChange("classic")}
          type="button"
        >
          Clássico
        </button>
        <button
          className={`px-6 py-3 rounded-lg border ${value === "modern" ? "bg-blue-200 dark:bg-blue-700 font-bold" : "bg-transparent"}`}
          onClick={() => onChange("modern")}
          type="button"
        >
          Moderno
        </button>
        <button
          className={`px-6 py-3 rounded-lg border ${value === "minimal" ? "bg-gray-100 dark:bg-gray-800 font-bold" : "bg-transparent"}`}
          onClick={() => onChange("minimal")}
          type="button"
        >
          Minimalista
        </button>
      </div>
    </div>
  );
}
