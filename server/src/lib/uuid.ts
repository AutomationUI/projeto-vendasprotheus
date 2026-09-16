// ─── Gerador de UUIDs (Node built-in) ─────────────────────────────────────
import { randomUUID } from "node:crypto";

export function uuidv4(): string {
  return randomUUID();
}