import React from "react";
import { getVariableTheme } from "./document-variables";

export const DRAG_VARIABLE_MIME = "application/document-variable-tag";

// Estender Window para armazenar a tag sendo arrastada no momento
declare global {
  interface Window {
    __activeDraggedVariableTag?: string | null;
  }
}

/**
 * Obtém a tag da variável sendo arrastada no momento
 */
export function getActiveDraggedVariableTag(): string | null {
  if (typeof window !== "undefined" && window.__activeDraggedVariableTag) {
    return window.__activeDraggedVariableTag;
  }
  return null;
}

/**
 * Cria um 'Ghost Element' visualmente rico e customizado para ser exibido durante o arraste da variável.
 * Inclui sombra profunda (shadow-2xl), borda brilhante e o nome/código da tag.
 */
export function createVariableDragGhost(
  e: React.DragEvent,
  tag: string,
  label?: string
) {
  const theme = getVariableTheme(tag);

  // Registrar a tag ativa globalmente para os alvos de drop (Ghost Elements nos formulários)
  if (typeof window !== "undefined") {
    window.__activeDraggedVariableTag = tag;
    
    const clearActiveTag = () => {
      window.__activeDraggedVariableTag = null;
      window.removeEventListener("dragend", clearActiveTag);
      window.removeEventListener("mouseup", clearActiveTag);
    };
    
    window.addEventListener("dragend", clearActiveTag, { once: true });
    window.addEventListener("mouseup", clearActiveTag, { once: true });
  }

  // Criar elemento container invisível temporário no DOM
  const ghost = document.createElement("div");
  ghost.style.position = "absolute";
  ghost.style.top = "-9999px";
  ghost.style.left = "-9999px";
  ghost.style.pointerEvents = "none";
  ghost.style.zIndex = "999999";

  // HTML interno do elemento fantasma
  ghost.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      background: #0f172a;
      color: #ffffff;
      border: 2px solid ${theme.accentColor || "#6366f1"};
      border-radius: 12px;
      box-shadow: 0 20px 30px -10px rgba(15, 23, 42, 0.5), 0 0 20px ${theme.accentColor || "#6366f1"}90;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      transform: scale(1.05);
    ">
      <span style="
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background-color: ${theme.accentColor || "#6366f1"};
        box-shadow: 0 0 8px ${theme.accentColor || "#6366f1"};
      "></span>
      <span style="
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        color: #818cf8;
      ">${tag}</span>
      ${label ? `<span style="opacity: 0.8; font-weight: 500;">• ${label}</span>` : ""}
      <span style="
        font-size: 10px;
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 7px;
        border-radius: 6px;
        margin-left: 4px;
        letter-spacing: 0.5px;
      ">⚡ Solte para encaixar</span>
    </div>
  `;

  document.body.appendChild(ghost);

  if (e.dataTransfer) {
    e.dataTransfer.setData(DRAG_VARIABLE_MIME, tag);
    e.dataTransfer.setData("text/plain", tag);
    e.dataTransfer.effectAllowed = "copy";
    // Define a imagem de arraste usando o nó criado
    e.dataTransfer.setDragImage(ghost.firstElementChild as HTMLElement, 20, 20);
  }

  // Remover o elemento temporário do DOM após a renderização do frame de arraste
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 50);
  });
}

