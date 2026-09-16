import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeString(val: unknown, fallback: string = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "symbol") return val.description || fallback;
  if (typeof val === "object") {
    try {
      const obj = val as any;
      if (typeof obj.name === "string") return obj.name;
      if (typeof obj.id === "string") return obj.id;
      if (typeof obj.module === "string") return obj.module;
      if (typeof obj.value === "string") return obj.value;
      if (typeof obj.label === "string") return obj.label;
      return JSON.stringify(obj);
    } catch {
      return fallback;
    }
  }
  try {
    return String(val);
  } catch {
    return fallback;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback if permission denied or document not focused
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn("Copy to clipboard failed:", err);
    return false;
  }
}
