import { logger } from "../lib/logger.js";
import type { DeliveryLogEntry } from "../types/index.js";

const recentLogs: DeliveryLogEntry[] = [];
const MAX_IN_MEMORY = 500;

export function recordDelivery(entry: Omit<DeliveryLogEntry, "timestamp">): DeliveryLogEntry {
  const logEntry: DeliveryLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  logger.info(
    { quoteId: entry.quoteId, channel: entry.channel, status: entry.status, recipient: entry.recipient, messageId: entry.messageId },
    "Delivery recorded"
  );

  recentLogs.unshift(logEntry);
  if (recentLogs.length > MAX_IN_MEMORY) {
    recentLogs.length = MAX_IN_MEMORY;
  }

  return logEntry;
}

export function getDeliveryLogByQuote(quoteId: string): DeliveryLogEntry[] {
  return recentLogs.filter((e) => e.quoteId === quoteId);
}

export function getRecentDeliveryLogs(limit = 100): DeliveryLogEntry[] {
  return recentLogs.slice(0, limit);
}
