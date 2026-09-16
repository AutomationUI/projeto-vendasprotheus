import React from "react";
import { DocumentPrintLayout } from "@/components/documents/DocumentPrintLayout";
import { DocumentLayoutArchetype } from "@/types/document-template";

interface Props {
  layout: "classic" | "modern" | "minimal" | "executivo" | "tecnico";
  showToolbar?: boolean;
}

export function DocumentPreview({ layout, showToolbar = false }: Props) {
  const archetypeMap: Record<string, DocumentLayoutArchetype> = {
    classic: "classico",
    modern: "moderno",
    minimal: "minimalista",
    executivo: "executivo",
    tecnico: "tecnico",
  };

  return (
    <div className="w-full flex justify-center py-4">
      <DocumentPrintLayout
        archetype={archetypeMap[layout] || "moderno"}
        showToolbar={showToolbar}
        className="max-w-4xl"
      />
    </div>
  );
}
