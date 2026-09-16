import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";

export interface EventHubPayload {
  eventName: string;
  source?: string;
  tenantId?: string;
  rooms?: string[];
  payload: Record<string, any>;
  critical?: boolean;
}

/**
 * Dispatches domain events to the central Unified Event Hub (`websocket_full`) via HTTP POST.
 * As per architecture guidelines, backend services do NOT maintain WebSocket connections or servers;
 * they act strictly as HTTP event producers.
 */
export async function publishEvent(event: EventHubPayload): Promise<boolean> {
  const hubUrl = env.eventHub.url || "https://websocket-full.internal/events";
  const tenantId = event.tenantId || env.eventHub.tenantId || "vendasprotheus-saas";

  const body = {
    eventName: event.eventName,
    source: event.source || "backend-vendasprotheus",
    tenantId,
    rooms: event.rooms || ["default"],
    payload: event.payload,
    critical: event.critical ?? false,
  };

  try {
    const response = await fetch(hubUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.eventHub.authToken}`,
        "x-tenant-id": tenantId,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      logger.warn(
        { status: response.status, statusText: response.statusText, eventName: event.eventName },
        "Unified Event Hub delivery warning"
      );
      return false;
    }

    logger.info({ eventName: event.eventName, rooms: body.rooms }, "Event published to Unified Event Hub");
    return true;
  } catch (err) {
    logger.error({ err, eventName: event.eventName }, "Failed to publish event to Unified Event Hub");
    return false;
  }
}
